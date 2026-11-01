import SwiftUI
import WebKit
import AVFoundation
import CoreFoundation

@main
struct YiuFMApp: App {
    var body: some Scene {
        WindowGroup {
            YiuRootView()
                .ignoresSafeArea()
                .statusBarHidden(true)
                .preferredColorScheme(.dark)
        }
    }
}

/// Yiu.fm 2.0 的视觉层：完整加载旧版本地 Web UI，先恢复用户熟悉的界面。
/// 后续原生音频核心通过独立、版本化桥接接入，不在本阶段改写旧视觉代码。
struct YiuRootView: View {
    var body: some View {
        LegacyVisualStage()
            .background(Color.black)
            .ignoresSafeArea()
    }
}

private struct LegacyVisualStage: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true

        // Restore the original yiuMusic reply bridge so the existing music-library
        // scanner can continue working without changing any HTML/CSS/JS UI.
        YiuMusicBridge.ensureMusicDirectory()
        configuration.userContentController.addScriptMessageHandler(
            YiuMusicBridge.shared,
            contentWorld: .page,
            name: "yiuMusic"
        )

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false

        // XcodeGen 将 Resources/Web 作为资源目录复制进 App Bundle。
        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        } else if let url = Bundle.main.url(forResource: "index", withExtension: "html") {
            // 兼容 XcodeGen 将目录内容展平的资源布局。
            webView.loadFileURL(url, allowingReadAccessTo: Bundle.main.bundleURL)
        } else {
            assertionFailure("Yiu.fm local Web resources are missing from the app bundle.")
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: ()) {
        uiView.stopLoading()
        uiView.configuration.userContentController.removeAllScriptMessageHandlers()
    }
}

// MARK: - Native local audio playback
@MainActor
final class YiuAudioPlayer: ObservableObject {
    @Published private(set) var title = "选择一首本地歌曲"
    @Published private(set) var artist = ""
    @Published private(set) var isPlaying = false
    @Published private(set) var currentTime: Double = 0
    @Published private(set) var duration: Double = 0
    @Published private(set) var hasTrack = false
    @Published private(set) var errorMessage: String?
    private var player: AVAudioPlayer?
    private var progressTimer: Timer?

    func load(url: URL) throws {
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }
        let fm = FileManager.default
        let folder = fm.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("YiuMusic", isDirectory: true)
        try fm.createDirectory(at: folder, withIntermediateDirectories: true)
        let destination = folder.appendingPathComponent(url.lastPathComponent)
        if destination.standardizedFileURL != url.standardizedFileURL {
            if fm.fileExists(atPath: destination.path) { try fm.removeItem(at: destination) }
            try fm.copyItem(at: url, to: destination)
        }
        let next = try AVAudioPlayer(contentsOf: destination)
        next.prepareToPlay()
        player?.stop()
        player = next
        title = destination.deletingPathExtension().lastPathComponent
        artist = "本地文件"
        duration = next.duration
        currentTime = 0
        hasTrack = true
        isPlaying = false
        errorMessage = nil
        progressTimer?.invalidate()
        progressTimer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self, let active = self.player else { return }
                self.currentTime = active.currentTime
                self.isPlaying = active.isPlaying
                if !active.isPlaying && active.currentTime >= active.duration {
                    self.currentTime = 0
                }
            }
        }
    }

    func togglePlayback() {
        guard let player else { return }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default)
            try session.setActive(true)
            if player.isPlaying { player.pause(); isPlaying = false }
            else if player.play() { isPlaying = true }
        } catch { report(error: error) }
    }

    func seek(to value: Double) {
        guard let player else { return }
        let target = min(max(value, 0), duration)
        player.currentTime = target
        currentTime = target
    }

    func formattedTime(_ value: Double) -> String {
        guard value.isFinite, value >= 0 else { return "0:00" }
        let total = Int(value)
        return "\(total / 60):" + String(format: "%02d", total % 60)
    }

    func report(error: Error) { errorMessage = error.localizedDescription }



    deinit { progressTimer?.invalidate() }
}


// MARK: - Legacy-compatible local music bridge
/// Keeps the existing APP/ios-music.js contract intact while the audio engine is
/// migrated independently. The web UI continues to use the same yiuMusic API.

final class YiuMusicBridge: NSObject, WKScriptMessageHandlerWithReply {
    static let shared = YiuMusicBridge()
    private let queue = DispatchQueue(label: "yiufm.music.bridge", qos: .userInitiated)

    private struct BridgeError: Error {
        let message: String
    }

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
        return musicDirectory.appendingPathComponent(name)
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
        let data = try Data(contentsOf: resolve(body))
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
