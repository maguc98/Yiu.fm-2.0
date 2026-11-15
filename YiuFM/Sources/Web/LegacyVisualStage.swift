import SwiftUI
import WebKit

struct LegacyVisualStage: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true

        // Preserve the existing local music bridge.
        YiuMusicBridge.ensureMusicDirectory()
        configuration.userContentController.addScriptMessageHandler(
            YiuMusicBridge.shared,
            contentWorld: .page,
            name: "yiuMusic"
        )

        // Keep the original WebKit-rendered glass surfaces in place.
        // The previous full-page UIKit overlay sat above the entire WKWebView
        // and relied on heuristic mask cut-outs. That compositing model could
        // obscure foreground content (including nested controls and artwork).
        // Native glass will be reintroduced only for explicitly separated,
        // empty background hosts with deterministic foreground layering.
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false

        // XcodeGen copies Resources/Web into the app bundle.
        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        } else if let url = Bundle.main.url(forResource: "index", withExtension: "html") {
            webView.loadFileURL(url, allowingReadAccessTo: Bundle.main.bundleURL)
        } else {
            assertionFailure("Yiu.fm local Web resources are missing from the app bundle.")
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.stopLoading()
        uiView.configuration.userContentController.removeAllScriptMessageHandlers()
    }

    final class Coordinator: NSObject {}
}
