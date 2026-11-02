import SwiftUI
import WebKit
import UIKit
import QuartzCore

@main
struct TextDisplayApp: App {
    init() {
        // Enable Apple's Metal Performance HUD for this app.
        // Set before the app creates its first Metal-backed view.
        UserDefaults.standard.set(true, forKey: "MetalHUDForceEnabled")
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    var body: some View {
        LocalWebView()
            .ignoresSafeArea()
            .statusBarHidden(true)
    }
}

struct LocalWebView: UIViewRepresentable {
    func makeCoordinator() -> YiuPerformanceCoordinator { YiuPerformanceCoordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.userContentController.add(context.coordinator, name: "yiuPerformance")

        // 移除了之前可能导致崩溃的 WebGL 强制开启代码

        // 音乐目录：启动时确保 Documents/Music 存在（有了它，「文件」App 里才会出现本 App 的文件夹），
        // 并把读取入口交给网页（window.webkit.messageHandlers.yiuMusic，网页端见 APP/ios-music.js）
        MusicBridge.ensureMusicDir()
        configuration.userContentController.addScriptMessageHandler(MusicBridge.shared, contentWorld: .page, name: "yiuMusic")

        let webView = WKWebView(frame: .zero, configuration: configuration)
        context.coordinator.attach(webView)

        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        if let url = Bundle.main.url(forResource: "index", withExtension: "html") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: YiuPerformanceCoordinator) {
        coordinator.stop()
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "yiuPerformance")
        coordinator.detach()
    }
}

// MARK: - Opt-in native display-link sampling
// CADisplayLink measures callback cadence, not GPU utilization or Metal execution time.
final class YiuPerformanceCoordinator: NSObject, WKScriptMessageHandler {
    private weak var webView: WKWebView?
    private var link: CADisplayLink?
    private var proxy: YiuDisplayLinkProxy?
    private var requested = false
    private var startTime: CFTimeInterval = 0
    private var lastTime: CFTimeInterval = 0
    private var callbacks = 0
    private var intervals: [Double] = []
    private var longGaps = 0
    private var backgroundToken: NSObjectProtocol?
    private var foregroundToken: NSObjectProtocol?

    override init() {
        super.init()
        backgroundToken = NotificationCenter.default.addObserver(
            forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main
        ) { [weak self] _ in self?.pause() }
        foregroundToken = NotificationCenter.default.addObserver(
            forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main
        ) { [weak self] _ in
            guard let self = self, self.requested else { return }
            self.start()
        }
    }

    deinit {
        link?.invalidate()
        if let token = backgroundToken { NotificationCenter.default.removeObserver(token) }
        if let token = foregroundToken { NotificationCenter.default.removeObserver(token) }
    }

    func attach(_ view: WKWebView) { webView = view }
    func detach() { webView = nil }

    func stop() {
        requested = false
        pause()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let op = body["op"] as? String else { return }
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if op == "start" { self.requested = true; self.start() }
            else if op == "stop" { self.stop() }
        }
    }

    private func start() {
        guard requested, link == nil else { return }
        reset()
        let target = YiuDisplayLinkProxy(owner: self)
        proxy = target
        let displayLink = CADisplayLink(target: target, selector: #selector(YiuDisplayLinkProxy.tick(_:)))
        link = displayLink
        displayLink.add(to: .main, forMode: .common)
    }

    fileprivate func didTick(_ displayLink: CADisplayLink) {
        let now = displayLink.timestamp
        if lastTime > 0 {
            let ms = (now - lastTime) * 1000
            if ms.isFinite && ms > 0 {
                intervals.append(ms)
                if ms > 33.34 { longGaps += 1 }
            }
        } else { startTime = now }
        lastTime = now
        callbacks += 1
        let elapsed = now - startTime
        guard elapsed >= 1 else { return }

        let sorted = intervals.sorted()
        let average = sorted.isEmpty ? 0 : sorted.reduce(0, +) / Double(sorted.count)
        let p95Index = sorted.isEmpty ? 0 : min(sorted.count - 1, Int(Double(sorted.count - 1) * 0.95))
        let p95 = sorted.isEmpty ? 0 : sorted[p95Index]
        send([
            "displayLinkFPS": Double(callbacks) / elapsed,
            "averageIntervalMs": average,
            "p95IntervalMs": p95,
            "gapsOver33ms": longGaps,
            "screenMaxFPS": UIScreen.main.maximumFramesPerSecond,
            "thermalState": thermalName()
        ])
        reset()
    }

    private func reset() {
        startTime = 0; lastTime = 0; callbacks = 0; longGaps = 0
        intervals.removeAll(keepingCapacity: true)
    }

    private func pause() {
        link?.invalidate()
        link = nil
        proxy = nil
        reset()
    }

    private func thermalName() -> String {
        switch ProcessInfo.processInfo.thermalState {
        case .nominal: return "正常"
        case .fair: return "轻度升温"
        case .serious: return "温度较高"
        case .critical: return "温度严重"
        @unknown default: return "未知"
        }
    }

    private func send(_ payload: [String: Any]) {
        guard let view = webView,
              let data = try? JSONSerialization.data(withJSONObject: payload, options: [.fragmentsAllowed]),
              let json = String(data: data, encoding: .utf8) else { return }
        view.evaluateJavaScript("window.__YiuNativePerf && window.__YiuNativePerf(\(json));", completionHandler: nil)
    }
}

private final class YiuDisplayLinkProxy: NSObject {
    weak var owner: YiuPerformanceCoordinator?
    init(owner: YiuPerformanceCoordinator) { self.owner = owner }
    @objc func tick(_ link: CADisplayLink) { owner?.didTick(link) }
}

// MARK: - Documents/Music 读取桥
// 网页（file:// 页面）不能直接读 App 的 Documents，所以由原生来读，通过带回复的消息交给网页。
// 请求格式：window.webkit.messageHandlers.yiuMusic.postMessage({op: ..., ...}) 返回 Promise。
//   op = "list"                         → {files: [{name, size, dir}]}
//   op = "text", name                   → {text}            （LRC 等文本；依次尝试 UTF-8 / UTF-16(带BOM) / GB18030）
//   op = "read", name, offset, length   → {data(base64), size}  （按块读音频，网页拼成 Blob）
// 只允许访问 Music 目录下的文件名（不接受带 / 的路径）。
final class MusicBridge: NSObject, WKScriptMessageHandlerWithReply {
    static let shared = MusicBridge()
    private let queue = DispatchQueue(label: "yiu.music.bridge", qos: .userInitiated)

    static var musicDir: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Music", isDirectory: true)
    }

    static func ensureMusicDir() {
        try? FileManager.default.createDirectory(at: musicDir, withIntermediateDirectories: true)
    }

    private struct BridgeError: Error { let message: String }

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard let body = message.body as? [String: Any], let op = body["op"] as? String else {
            replyHandler(nil, "bad request")
            return
        }
        queue.async {
            var value: Any? = nil
            var errorText: String? = nil
            do {
                switch op {
                case "list": value = try Self.list()
                case "text": value = try Self.text(body)
                case "read": value = try Self.read(body)
                default: throw BridgeError(message: "unknown op")
                }
            } catch let e as BridgeError {
                errorText = e.message
            } catch {
                errorText = error.localizedDescription
            }
            DispatchQueue.main.async { replyHandler(value, errorText) }
        }
    }

    // 只接受纯文件名，不允许 / 和 ..
    private static func resolve(_ body: [String: Any]) throws -> URL {
        guard let name = body["name"] as? String, !name.isEmpty,
              !name.contains("/"), name != ".", name != ".." else {
            throw BridgeError(message: "bad name")
        }
        return musicDir.appendingPathComponent(name)
    }

    private static func list() throws -> [String: Any] {
        ensureMusicDir()
        let keys: [URLResourceKey] = [.isDirectoryKey, .fileSizeKey]
        let urls = try FileManager.default.contentsOfDirectory(at: musicDir,
                                                               includingPropertiesForKeys: keys,
                                                               options: [.skipsHiddenFiles])
        let files: [[String: Any]] = urls.map { u in
            let v = try? u.resourceValues(forKeys: Set(keys))
            return ["name": u.lastPathComponent,
                    "size": v?.fileSize ?? 0,
                    "dir": v?.isDirectory ?? false]
        }
        return ["files": files]
    }

    private static func text(_ body: [String: Any]) throws -> [String: Any] {
        let data = try Data(contentsOf: try resolve(body))
        var s: String? = String(data: data, encoding: .utf8)
        if s == nil, data.count >= 2, (data[0] == 0xFF && data[1] == 0xFE) || (data[0] == 0xFE && data[1] == 0xFF) {
            s = String(data: data, encoding: .utf16)
        }
        if s == nil {
            let gb = String.Encoding(rawValue: CFStringConvertEncodingToNSStringEncoding(
                CFStringEncoding(CFStringEncodings.GB_18030_2000.rawValue)))
            s = String(data: data, encoding: gb)
        }
        return ["text": s ?? String(decoding: data, as: UTF8.self)]
    }

    private static func read(_ body: [String: Any]) throws -> [String: Any] {
        let url = try resolve(body)
        let offset = (body["offset"] as? NSNumber)?.uint64Value ?? 0
        let length = max(1, min((body["length"] as? NSNumber)?.intValue ?? 3_145_728, 8_388_608))
        let fh = try FileHandle(forReadingFrom: url)
        defer { try? fh.close() }
        let size = try fh.seekToEnd()
        var chunk = Data()
        if offset < size {
            try fh.seek(toOffset: offset)
            chunk = try fh.read(upToCount: length) ?? Data()
        }
        return ["data": chunk.base64EncodedString(), "size": Int(size)]
    }
}
