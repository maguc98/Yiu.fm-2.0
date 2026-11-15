import SwiftUI
import WebKit

struct LegacyVisualStage: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> NativeWebContainer {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        YiuMusicBridge.ensureMusicDirectory()
        configuration.userContentController.addScriptMessageHandler(
            YiuMusicBridge.shared, contentWorld: .page, name: "yiuMusic"
        )
        configuration.userContentController.add(context.coordinator, contentWorld: .page, name: "yiuNativeMini")

        let hideDOMMini = WKUserScript(
            source: "(()=>{const s=document.createElement('style');s.textContent='#mini{opacity:0!important;pointer-events:none!important}';(document.documentElement||document).appendChild(s)})();",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        configuration.userContentController.addUserScript(hideDOMMini)
        configuration.userContentController.addUserScript(WKUserScript(
            source: Self.miniBridgeScript,
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true
        ))

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false

        let container = NativeWebContainer(webView: webView)
        context.coordinator.container = container
        context.coordinator.webView = webView

        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        } else if let url = Bundle.main.url(forResource: "index", withExtension: "html") {
            webView.loadFileURL(url, allowingReadAccessTo: Bundle.main.bundleURL)
        } else {
            assertionFailure("Yiu.fm local Web resources are missing from the app bundle.")
        }
        return container
    }

    func updateUIView(_ uiView: NativeWebContainer, context: Context) {}

    static func dismantleUIView(_ uiView: NativeWebContainer, coordinator: Coordinator) {
        uiView.webView.stopLoading()
        uiView.webView.configuration.userContentController.removeScriptMessageHandler(
            forName: "yiuNativeMini", contentWorld: .page
        )
        uiView.webView.configuration.userContentController.removeAllScriptMessageHandlers()
        coordinator.container = nil
        coordinator.webView = nil
    }

    final class Coordinator: NSObject, WKScriptMessageHandler {
        weak var container: NativeWebContainer?
        weak var webView: WKWebView?

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "yiuNativeMini",
                  let payload = message.body as? [String: Any] else { return }
            DispatchQueue.main.async { [weak self] in
                self?.container?.applyMiniPayload(payload)
            }
        }
    }

    private static let miniBridgeScript = #"""
    (() => {
      const start = () => {
        const mini = document.getElementById('mini');
        if (!mini || window.__yiuNativeMiniBridge) return;
        window.__yiuNativeMiniBridge = true;
        const tile = document.getElementById('miTile');
        const title = document.getElementById('miT');
        const subtitle = mini.querySelector('.mi-s');
        const status = mini.querySelector('.mi-l');
        let lastArtwork = '';
        const report = () => {
          try {
            const rect = mini.getBoundingClientRect();
            const style = getComputedStyle(mini);
            const body = document.body;
            const blockers = document.querySelectorAll(
              '#crop, #mediaMenu.show, #ddPop, #tlLens, #qpop, .pkg-menu, .pkg-dlg-mask.show, .gpop'
            );
            const obstructed = Array.from(blockers).some(el => {
              const blockerStyle = getComputedStyle(el);
              if (blockerStyle.display === 'none' || blockerStyle.visibility === 'hidden' ||
                  Number(blockerStyle.opacity) < 0.02) return false;
              const blockerRect = el.getBoundingClientRect();
              return blockerRect.width > 0 && blockerRect.height > 0 &&
                blockerRect.left < rect.right && blockerRect.right > rect.left &&
                blockerRect.top < rect.bottom && blockerRect.bottom > rect.top;
            });
            const hidden = body.classList.contains('immerse') || obstructed ||
              style.display === 'none' || style.visibility === 'hidden' ||
              rect.width < 1 || rect.height < 1;
            const artwork = tile ? getComputedStyle(tile).backgroundImage : '';
            const payload = {
              x: rect.left, y: rect.top, width: rect.width, height: rect.height,
              visible: !hidden, expanded: body.classList.contains('mx'),
              title: title ? title.textContent : '—',
              subtitle: subtitle ? subtitle.textContent : '',
              status: status ? status.textContent : '正在播放',
              coverText: tile ? tile.textContent : '文',
              // Read the media element itself instead of relying on a page-level
              // lexical variable that may not be visible to an injected WKUserScript.
              playing: (() => {
                const audio = document.getElementById('audio');
                return audio ? (!audio.paused && !audio.ended) : false;
              })()
            };
            if (artwork && artwork !== lastArtwork) {
              lastArtwork = artwork;
              payload.artwork = artwork;
            }
            window.webkit.messageHandlers.yiuNativeMini.postMessage(payload);
          } catch (_) {}
        };
        mini.style.opacity = '0';
        mini.style.pointerEvents = 'none';
        report();
        const startReporting = () => {
          if (window.__yiuNativeMiniTimer) clearInterval(window.__yiuNativeMiniTimer);
          window.__yiuNativeMiniTimer = document.hidden ? 0 : setInterval(report, 100);
        };
        window.addEventListener('resize', report, {passive:true});
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            if (window.__yiuNativeMiniTimer) clearInterval(window.__yiuNativeMiniTimer);
            window.__yiuNativeMiniTimer = 0;
          } else {
            report();
            startReporting();
          }
        }, {passive:true});
        startReporting();
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, {once:true});
      } else {
        start();
      }
      let attempts = 0;
      const retry = setInterval(() => {
        if (window.__yiuNativeMiniBridge || ++attempts > 40) { clearInterval(retry); return; }
        start();
      }, 100);
    })();
    """#
}
