import SwiftUI
import WebKit

struct LegacyVisualStage: UIViewRepresentable {
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true

        let contentController = configuration.userContentController

        // Keep the existing music bridge unchanged.
        YiuMusicBridge.ensureMusicDirectory()
        contentController.addScriptMessageHandler(
            YiuMusicBridge.shared,
            contentWorld: .page,
            name: "yiuMusic"
        )

        // Install before page scripts execute so startup exceptions are captured.
        let diagnosticsScript = WKUserScript(
            source: YiuDiagnosticsBridge.injectionScript(),
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        contentController.addUserScript(diagnosticsScript)
        contentController.add(
            YiuDiagnosticsBridge.shared,
            name: "yiuDiagnostics"
        )

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
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

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.stopLoading()
        uiView.navigationDelegate = nil
        let controller = uiView.configuration.userContentController
        controller.removeScriptMessageHandler(forName: "yiuMusic")
        controller.removeScriptMessageHandler(forName: "yiuDiagnostics")
        controller.removeAllUserScripts()
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            NSLog("[Yiu.fm][WebNavigation] didFinish: %@", webView.url?.absoluteString ?? "unknown")
        }

        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: Error
        ) {
            Self.logNavigationError("provisional", webView: webView, error: error)
        }

        func webView(
            _ webView: WKWebView,
            didFail navigation: WKNavigation!,
            withError error: Error
        ) {
            Self.logNavigationError("navigation", webView: webView, error: error)
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            NSLog("[Yiu.fm][WebNavigation] WebContent process terminated: %@", webView.url?.absoluteString ?? "unknown")
        }

        private static func logNavigationError(_ phase: String, webView: WKWebView, error: Error) {
            let nsError = error as NSError
            NSLog(
                "[Yiu.fm][WebNavigation] %@ failed (domain=%@ code=%ld): %@ | url=%@",
                phase,
                nsError.domain,
                nsError.code,
                nsError.localizedDescription,
                webView.url?.absoluteString ?? "unknown"
            )
        }
    }
}
