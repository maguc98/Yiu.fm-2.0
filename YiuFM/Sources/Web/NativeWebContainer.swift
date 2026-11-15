import UIKit
import WebKit

@MainActor
final class NativeWebContainer: UIView {
    let webView: WKWebView
    private let miniBar = YiuNativeMiniPlayerView()
    private var miniFrame = CGRect.zero
    private(set) var latestHubState: [String: Any] = [:]
    var onHubStateChanged: (([String: Any]) -> Void)?

    init(webView: WKWebView) {
        self.webView = webView
        super.init(frame: .zero)
        backgroundColor = .black
        addSubview(webView)
        addSubview(miniBar)
        miniBar.isHidden = true
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
        onHubStateChanged?(payload)
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
