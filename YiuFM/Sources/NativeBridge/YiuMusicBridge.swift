import Foundation
import WebKit
import CoreFoundation

// MARK: - Legacy-compatible local music bridge
/// Keeps the existing APP/ios-music.js contract intact while the audio engine is
/// migrated independently. The web UI continues to use the same yiuMusic API.

final class YiuMusicBridge: NSObject, WKScriptMessageHandlerWithReply {
    static let shared = YiuMusicBridge()
    private let queue = DispatchQueue(label: "yiufm.music.bridge", qos: .userInitiated)

    private struct BridgeError: Error {
        let message: String
    }

    private static let maxTextReadBytes = 8_388_608

    static var musicDirectory: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Music", isDirectory: true)
    }

    static func ensureMusicDirectory() {
        try? FileManager.default.createDirectory(
            at: musicDirectory,
            withIntermediateDirectories: true
        )
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage,
        replyHandler: @escaping (Any?, String?) -> Void
    ) {
        guard let body = message.body as? [String: Any],
              let operation = body["op"] as? String else {
            replyHandler(nil, "bad request")
            return
        }

        queue.async {
            var value: Any?
            var errorText: String?

            do {
                switch operation {
                case "list":
                    value = try Self.listFiles()
                case "text":
                    value = try Self.readText(body)
                case "read":
                    value = try Self.readChunk(body)
                default:
                    throw BridgeError(message: "unknown op")
                }
            } catch let error as BridgeError {
                errorText = error.message
            } catch {
                errorText = error.localizedDescription
            }

            DispatchQueue.main.async {
                replyHandler(value, errorText)
            }
        }
    }

    /// Only accepts a single filename; directory traversal is rejected.
    private static func resolve(_ body: [String: Any]) throws -> URL {
        guard let name = body["name"] as? String,
              !name.isEmpty,
              !name.contains("/"),
              !name.contains("\\"),
              name != ".",
              name != ".." else {
            throw BridgeError(message: "bad name")
        }
        let url = musicDirectory.appendingPathComponent(name).standardizedFileURL
        guard url.deletingLastPathComponent() == musicDirectory.standardizedFileURL.deletingLastPathComponent()
            || url.deletingLastPathComponent() == musicDirectory.standardizedFileURL else {
            throw BridgeError(message: "bad name")
        }

        let values = try url.resourceValues(forKeys: [.isSymbolicLinkKey, .isRegularFileKey])
        guard values.isSymbolicLink != true, values.isRegularFile == true else {
            throw BridgeError(message: "not a regular file")
        }
        return url
    }

    private static func listFiles() throws -> [String: Any] {
        ensureMusicDirectory()
        let keys: [URLResourceKey] = [.isDirectoryKey, .fileSizeKey]
        let urls = try FileManager.default.contentsOfDirectory(
            at: musicDirectory,
            includingPropertiesForKeys: keys,
            options: [.skipsHiddenFiles]
        )

        let files: [[String: Any]] = urls.map { url in
            let values = try? url.resourceValues(forKeys: Set(keys))
            return [
                "name": url.lastPathComponent,
                "size": values?.fileSize ?? 0,
                "dir": values?.isDirectory ?? false
            ]
        }
        return ["files": files]
    }

    private static func readText(_ body: [String: Any]) throws -> [String: Any] {
        let url = try resolve(body)
        let values = try url.resourceValues(forKeys: [.fileSizeKey])
        guard (values.fileSize ?? 0) <= maxTextReadBytes else {
            throw BridgeError(message: "text file too large")
        }
        let data = try Data(contentsOf: url, options: [.mappedIfSafe])
        var string = String(data: data, encoding: .utf8)

        if string == nil,
           data.count >= 2,
           (data[0] == 0xFF && data[1] == 0xFE)
            || (data[0] == 0xFE && data[1] == 0xFF) {
            string = String(data: data, encoding: .utf16)
        }

        if string == nil {
            let encoding = String.Encoding(
                rawValue: CFStringConvertEncodingToNSStringEncoding(
                    CFStringEncoding(CFStringEncodings.GB_18030_2000.rawValue)
                )
            )
            string = String(data: data, encoding: encoding)
        }

        return ["text": string ?? String(decoding: data, as: UTF8.self)]
    }

    private static func readChunk(_ body: [String: Any]) throws -> [String: Any] {
        let url = try resolve(body)
        let offset = (body["offset"] as? NSNumber)?.uint64Value ?? 0
        let requestedLength = (body["length"] as? NSNumber)?.intValue ?? 3_145_728
        let length = max(1, min(requestedLength, 8_388_608))

        let handle = try FileHandle(forReadingFrom: url)
        defer { try? handle.close() }

        let size = try handle.seekToEnd()
        var chunk = Data()
        if offset < size {
            try handle.seek(toOffset: offset)
            chunk = try handle.read(upToCount: length) ?? Data()
        }

        return [
            "data": chunk.base64EncodedString(),
            "size": Int(size)
        ]
    }
}
