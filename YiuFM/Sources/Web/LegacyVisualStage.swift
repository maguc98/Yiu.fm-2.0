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

        // The browser reports geometry; UIKit draws the actual iOS Liquid Glass material.
        configuration.userContentController.add(context.coordinator, name: "yiuLiquidGlass")
        configuration.userContentController.addUserScript(
            WKUserScript(
                source: NativeLiquidGlassOverlay.webScript,
                injectionTime: .atDocumentEnd,
                forMainFrameOnly: true
            )
        )

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false

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
}
