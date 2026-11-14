import SwiftUI
import WebKit

@main
struct TextDisplayApp: App {
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
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true

        // 原生音乐目录读取桥。
        MusicBridge.ensureMusicDir()
        configuration.userContentController.addScriptMessageHandler(
            MusicBridge.shared,
            contentWorld: .page,
            name: "yiuMusic"
        )

        // 原生 Liquid Glass：网页只负责报告两个玻璃区域与内容避让区，
        // 材质由 UIKit 在 WKWebView 上方绘制，触摸仍完整落到网页控件。
        configuration.userContentController.add(context.coordinator, name: "yiuLiquidGlass")
        configuration.userContentController.addUserScript(
            WKUserScript(
                source: Self.nativeLiquidGlassScript,
                injectionTime: .atDocumentEnd,
                forMainFrameOnly: true
            )
        )

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        let glassOverlay = NativeLiquidGlassOverlay(frame: .zero)
        glassOverlay.translatesAutoresizingMaskIntoConstraints = false
        webView.addSubview(glassOverlay)
        NSLayoutConstraint.activate([
            glassOverlay.leadingAnchor.constraint(equalTo: webView.leadingAnchor),
            glassOverlay.trailingAnchor.constraint(equalTo: webView.trailingAnchor),
            glassOverlay.topAnchor.constraint(equalTo: webView.topAnchor),
            glassOverlay.bottomAnchor.constraint(equalTo: webView.bottomAnchor)
        ])
        context.coordinator.overlay = glassOverlay

        if let url = Bundle.main.url(forResource: "index", withExtension: "html") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.stopLoading()
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "yiuLiquidGlass")
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "yiuMusic")
        coordinator.overlay = nil
    }

    final class Coordinator: NSObject, WKScriptMessageHandler {
        weak var overlay: NativeLiquidGlassOverlay?

        func userContentController(_ userContentController: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            guard message.name == "yiuLiquidGlass",
                  let payload = message.body as? [String: Any] else { return }
            DispatchQueue.main.async { [weak self] in
                self?.overlay?.apply(payload)
            }
        }
    }

    private static let nativeLiquidGlassScript = """
    (function () {
      var bridge = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.yiuLiquidGlass;
      if (!bridge || window.__yiuNativeGlassInstalled) return;
      window.__yiuNativeGlassInstalled = true;
      document.documentElement.classList.add('native-liquid-glass');

      function rectOf(el) {
        var r = el.getBoundingClientRect();
        return { x:r.left, y:r.top, width:r.width, height:r.height };
      }
      function collect(el) {
        if (!el) return { visible:false, opacity:0, rect:{x:0,y:0,width:0,height:0}, holes:[] };
        var r = el.getBoundingClientRect(), visible = r.width > 0 && r.height > 0, opacity = 1;
        for (var node = el; node && node !== document.documentElement; node = node.parentElement) {
          var a = getComputedStyle(node);
          if (a.display === 'none' || a.visibility === 'hidden') visible = false;
          opacity *= Number(a.opacity || 1);
        }
        visible = visible && opacity > 0.02;
        var holes = [];
        if (visible) {
          Array.prototype.forEach.call(el.children, function (child) {
            var c = getComputedStyle(child), cr = child.getBoundingClientRect();
            if (c.display === 'none' || c.visibility === 'hidden' || Number(c.opacity || 1) < 0.02 ||
                cr.width < 1 || cr.height < 1) return;
            holes.push(rectOf(child));
          });
        }
        return { visible:!!visible, opacity:Math.max(0,Math.min(1,opacity)),
          rect:{x:r.left,y:r.top,width:r.width,height:r.height}, holes:holes };
      }
      function send() {
        try {
          var mini = document.getElementById('mini');
          var cbar = document.getElementById('cbar');
          bridge.postMessage({
            mini: collect(mini),
            cbar: collect(cbar)
          });
        } catch (_) {}
      }

      var trackingUntil = 0, tracking = false, pending = 0;
      function schedule() {
        if (pending) return;
        pending = requestAnimationFrame(function () { pending = 0; send(); });
      }
      function track(ms) {
        trackingUntil = Math.max(trackingUntil, performance.now() + ms);
        if (tracking) return;
        tracking = true;
        function tick() {
          send();
          if (performance.now() < trackingUntil) requestAnimationFrame(tick);
          else tracking = false;
        }
        requestAnimationFrame(tick);
      }

      var mini = document.getElementById('mini');
      var cbar = document.getElementById('cbar');
      var hub = document.getElementById('hub');
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(schedule);
        [mini,cbar,hub].forEach(function (el) { if (el) ro.observe(el); });
        [mini,cbar].forEach(function (el) {
          if (el) Array.prototype.forEach.call(el.children, function (child) { ro.observe(child); });
        });
      }
      if (window.MutationObserver) {
        var lastOpen = !!(document.body && document.body.classList.contains('open'));
        new MutationObserver(function () {
          var open = !!(document.body && document.body.classList.contains('open'));
          schedule();
          if (open !== lastOpen) { lastOpen = open; track(850); }
        }).observe(document.body, { attributes:true, attributeFilter:['class'] });
        [mini,cbar].forEach(function (el) {
          if (el) new MutationObserver(schedule).observe(el, {
            attributes:true, childList:true, subtree:true, attributeFilter:['class','style']
          });
        });
      }
      document.addEventListener('transitionrun', function (event) {
        var target = event.target;
        if (target && (target.id === 'mini' || target.id === 'hub' || target.id === 'cbar')) track(900);
      }, true);
      document.addEventListener('transitionend', schedule, true);
      window.addEventListener('resize', schedule, {passive:true});
      window.addEventListener('orientationchange', function () { track(500); }, {passive:true});
      window.addEventListener('scroll', schedule, true);
      send();
      setTimeout(send, 180);
    })();
    """
}

private final class NativeLiquidGlassOverlay: UIView {
    private let miniGlass = UIVisualEffectView(effect: nil)
    private let controlGlass = UIVisualEffectView(effect: nil)

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        isOpaque = false
        isUserInteractionEnabled = false
        [miniGlass, controlGlass].forEach { glass in
            glass.backgroundColor = .clear
            glass.contentView.backgroundColor = .clear
            glass.isUserInteractionEnabled = false
            glass.clipsToBounds = true
            glass.layer.cornerCurve = .continuous
            addSubview(glass)
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    // 玻璃层不参与命中测试，所有点击、拖动和长按继续由 WKWebView 内的原控件处理。
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? { nil }

    func apply(_ payload: [String: Any]) {
        update(miniGlass, data: payload["mini"], radius: 24)
        update(controlGlass, data: payload["cbar"], radius: 28)
    }

    private func update(_ glass: UIVisualEffectView, data: Any?, radius: CGFloat) {
        guard let value = data as? [String: Any],
              (value["visible"] as? Bool) == true,
              let rawRect = value["rect"] as? [String: Any],
              let x = (rawRect["x"] as? NSNumber)?.doubleValue,
              let y = (rawRect["y"] as? NSNumber)?.doubleValue,
              let width = (rawRect["width"] as? NSNumber)?.doubleValue,
              let height = (rawRect["height"] as? NSNumber)?.doubleValue,
              width > 0, height > 0 else {
            glass.isHidden = true
            return
        }

        let frame = CGRect(x: x, y: y, width: width, height: height)
        glass.frame = frame
        glass.alpha = CGFloat(max(0, min(1, (value["opacity"] as? NSNumber)?.doubleValue ?? 1)))
        glass.isHidden = false
        glass.layer.cornerRadius = radius

        // 避让网页里的封面、文字和按钮：玻璃只覆盖它们之间的空隙，不会把控件本身模糊掉。
        let path = UIBezierPath(roundedRect: CGRect(origin: .zero, size: frame.size),
                                cornerRadius: radius)
        if let holes = value["holes"] as? [[String: Any]] {
            for hole in holes {
                guard let hx = (hole["x"] as? NSNumber)?.doubleValue,
                      let hy = (hole["y"] as? NSNumber)?.doubleValue,
                      let hw = (hole["width"] as? NSNumber)?.doubleValue,
                      let hh = (hole["height"] as? NSNumber)?.doubleValue,
                      hw > 0, hh > 0 else { continue }
                let local = CGRect(x: hx - x, y: hy - y, width: hw, height: hh)
                    .insetBy(dx: -1.5, dy: -1.5)
                    .intersection(CGRect(origin: .zero, size: frame.size))
                if !local.isNull && !local.isEmpty {
                    path.append(UIBezierPath(roundedRect: local,
                                             cornerRadius: min(14, min(local.width, local.height) / 2)))
                }
            }
        }

        let mask = CAShapeLayer()
        mask.frame = glass.bounds
        mask.path = path.cgPath
        mask.fillRule = .evenOdd
        glass.layer.mask = mask

        if glass.effect == nil {
            if #available(iOS 26.0, *) {
                let effect = UIGlassEffect(style: .regular)
                glass.effect = effect
            } else {
                // iOS 18–25 使用系统材质回退；iOS 26+ 使用上面的真正 Liquid Glass。
                glass.effect = UIBlurEffect(style: .systemUltraThinMaterial)
            }
        }
    }
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
