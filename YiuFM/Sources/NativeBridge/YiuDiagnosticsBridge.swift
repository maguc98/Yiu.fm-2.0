import Foundation
import WebKit

/// Captures JavaScript failures from the local WKWebView page.
/// Events are kept on-device (last 200) so diagnostics survive page reloads.
final class YiuDiagnosticsBridge: NSObject, WKScriptMessageHandler {
    static let shared = YiuDiagnosticsBridge()
    private let queue = DispatchQueue(label: "yiufm.web.diagnostics", qos: .utility)
    private let storageKey = "yiufm.web.diagnostics.events"
    private let maxEvents = 200

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let event = message.body as? [String: Any] else { return }

        queue.async {
            var events = UserDefaults.standard.array(forKey: self.storageKey) as? [[String: Any]] ?? []
            events.append(event)
            if events.count > self.maxEvents {
                events.removeFirst(events.count - self.maxEvents)
            }
            UserDefaults.standard.set(events, forKey: self.storageKey)

            let data = (try? JSONSerialization.data(withJSONObject: event, options: [.sortedKeys]))
                ?? Data()
            let json = String(data: data, encoding: .utf8) ?? String(describing: event)
            NSLog("[Yiu.fm][WebDiagnostics] %@", json)
        }
    }

    static func injectionScript() -> String {
        return """
        (function () {
          if (window.__yiuDiagnosticsInstalled) return;
          window.__yiuDiagnosticsInstalled = true;
          var handler = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.yiuDiagnostics;
          if (!handler) return;
          var recent = Object.create(null);
          function send(kind, detail) {
            try {
              detail = detail || {};
              var payload = {
                source: "Yiu.fm",
                kind: kind,
                message: String(detail.message || ""),
                url: String(detail.url || location.href || ""),
                line: Number(detail.line || 0),
                column: Number(detail.column || 0),
                stack: String(detail.stack || ""),
                phase: String(document.readyState || ""),
                timestamp: new Date().toISOString(),
                userAgent: String(navigator.userAgent || "")
              };
              var key = [payload.kind, payload.message, payload.url, payload.line, payload.column].join("|");
              var now = Date.now();
              if (recent[key] && now - recent[key] < 500) return;
              recent[key] = now;
              handler.postMessage(payload);
            } catch (_) {}
          }
          window.addEventListener("error", function (event) {
            var target = event && event.target;
            if (target && target !== window) {
              send("resource-error", {
                message: "Failed to load resource: " + (target.src || target.href || target.tagName || "unknown"),
                url: target.src || target.href || location.href
              });
              return;
            }
            var error = event && event.error;
            send("window-error", {
              message: event && event.message,
              url: event && event.filename,
              line: event && event.lineno,
              column: event && event.colno,
              stack: error && error.stack
            });
          }, true);
          // addEventListener('error') above already captures window errors; a second onerror hook duplicates every record.
          window.addEventListener("unhandledrejection", function (event) {
            var reason = event && event.reason;
            send("unhandled-rejection", {
              message: reason && reason.message ? reason.message : String(reason),
              stack: reason && reason.stack
            });
          });
          send("diagnostics-ready", { message: "Native JavaScript diagnostics bridge installed" });
        })();
        """
    }
}
