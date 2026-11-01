import SwiftUI
import WebKit

struct LegacyVisualStage: UIViewRepresentable {
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
