import UIKit
import WebKit

@MainActor
final class NativeWebContainer: UIView {
    let webView: WKWebView
    private let miniBar = YiuNativeMiniPlayerView()
    private let nativeHubRenderer = YiuNativeHubRenderer()
    // Keep native rendering opt-in until the complete control set has passed visual and interaction parity checks.
    private let nativeHubRenderingEnabled = false
    private var miniFrame = CGRect.zero
    private(set) var latestHubState: [String: Any] = [:]
    var onHubStateChanged: (([String: Any]) -> Void)?

    init(webView: WKWebView) {
        self.webView = webView
        super.init(frame: .zero)
        backgroundColor = .black
        addSubview(webView)
        addSubview(miniBar)
        addSubview(nativeHubRenderer)
        miniBar.isHidden = true
        nativeHubRenderer.isHidden = true
        miniBar.onToggle = { [weak self] in
            self?.evaluate("document.getElementById('mini')?.click()")
        }
        miniBar.onPlayPause = { [weak self] in
            self?.evaluate("document.querySelector('#mini .ppb')?.click()")
        }
        miniBar.onNext = { [weak self] in
            self?.evaluate("document.querySelector('#mini .nxb')?.click()")
        }
        miniBar.onSwipeUp = { [weak self] in
            self?.evaluate("window.__yiuOpenMiniPlayerCard?.()")
        }
        miniBar.onHorizontalSwipe = { [weak self] expanded in
            self?.evaluate("document.body.classList.toggle('mx', \(expanded ? "true" : "false"))")
        }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func layoutSubviews() {
        super.layoutSubviews()
        webView.frame = bounds
        if !miniFrame.isEmpty { miniBar.frame = miniFrame }
    }

    func applyHubPayload(_ payload: [String: Any]) {
        latestHubState = payload
        if nativeHubRenderingEnabled {
            nativeHubRenderer.render(payload) { [weak self] controlID, value in
                guard let self else { return }
                if let value {
                    self.setHubControl(id: controlID, value: value)
                } else {
                    self.activateHubControl(id: controlID)
                }
            }
        } else {
            nativeHubRenderer.isHidden = true
        }
        onHubStateChanged?(payload)
    }

    /// Native controls send commands back to the existing page runtime.
    /// The web DOM remains the single source of truth for settings and actions.
    func setHubOpen(_ open: Bool) {
        evaluate("window.YiuHubBridge?.activate(\(open ? "'open'" : "'close'"))")
    }

    func activateHubControl(id: String) {
        guard let data = try? JSONSerialization.data(withJSONObject: id, options: [.fragmentsAllowed]),
              let json = String(data: data, encoding: .utf8) else { return }
        evaluate("window.YiuHubBridge?.activateControl(\(json))")
    }

    func setHubControl(id: String, value: Any) {
        guard let idData = try? JSONSerialization.data(withJSONObject: id, options: [.fragmentsAllowed]),
              let valueData = try? JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed]),
              let idJSON = String(data: idData, encoding: .utf8),
              let valueJSON = String(data: valueData, encoding: .utf8) else { return }
        evaluate("window.YiuHubBridge?.setControl(\(idJSON), \(valueJSON))")
    }

    func applyMiniPayload(_ payload: [String: Any]) {
        miniBar.isHidden = !(payload["visible"] as? Bool ?? false)
        if let x = payload["x"] as? CGFloat,
           let y = payload["y"] as? CGFloat,
           let width = payload["width"] as? CGFloat,
           let height = payload["height"] as? CGFloat {
            miniFrame = CGRect(x: x, y: y, width: width, height: height)
            miniBar.frame = miniFrame
        }
        miniBar.update(payload)
    }

    private func evaluate(_ script: String) {
        webView.evaluateJavaScript(script, completionHandler: nil)
    }
}
