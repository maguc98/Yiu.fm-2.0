import UIKit

/// Native Liquid Glass surfaces for the legacy Web UI's mini player and control dock.
/// The HTML reports geometry and foreground cutouts; UIKit owns the actual material.
final class NativeLiquidGlassOverlay: UIView {
    static let webScript = """
    (function () {
      var bridge = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.yiuLiquidGlass;
      if (!bridge || window.__yiuNativeGlassInstalled) return;
      window.__yiuNativeGlassInstalled = true;
      document.documentElement.classList.add('native-liquid-glass');

      function rectOf(el) {
        var r = el.getBoundingClientRect();
        return { x:r.left, y:r.top, width:r.width, height:r.height };
      }
      function collect(el, forceVisible) {
        if (!el) return { visible:false, rect:{x:0,y:0,width:0,height:0}, holes:[] };
        var r = el.getBoundingClientRect(), cs = getComputedStyle(el);
        var visible = forceVisible && r.width > 0 && r.height > 0 &&
          cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || 1) > 0.02;
        var holes = [];
        if (visible) {
          Array.prototype.forEach.call(el.children, function (child) {
            var c = getComputedStyle(child), cr = child.getBoundingClientRect();
            if (c.display === 'none' || c.visibility === 'hidden' || Number(c.opacity || 1) < 0.02 ||
                cr.width < 1 || cr.height < 1) return;
            holes.push(rectOf(child));
          });
        }
        return { visible:!!visible, rect:{x:r.left,y:r.top,width:r.width,height:r.height}, holes:holes };
      }
      function send() {
        try {
          var mini = document.getElementById('mini');
          var cbar = document.getElementById('cbar');
          var open = !!(document.body && document.body.classList.contains('open'));
          bridge.postMessage({ mini:collect(mini,true), cbar:collect(cbar,open) });
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
        new MutationObserver(function () { schedule(); track(850); }).observe(document.body, {
          attributes:true, attributeFilter:['class']
        });
        [mini,cbar].forEach(function (el) {
          if (el) new MutationObserver(schedule).observe(el, {
            attributes:true, childList:true, subtree:true, attributeFilter:['class','style']
          });
        });
      }
      document.addEventListener('transitionrun', function (event) {
        var target = event.target;
        if (target && target.closest && target.closest('#mini,#hub,#cbar')) track(900);
      }, true);
      document.addEventListener('transitionend', schedule, true);
      window.addEventListener('resize', schedule, {passive:true});
      window.addEventListener('orientationchange', function () { track(500); }, {passive:true});
      window.addEventListener('scroll', schedule, true);
      send();
      setTimeout(send, 180);
    })();
    """

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

    // All touches pass through to the existing WKWebView controls.
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
        glass.isHidden = false
        glass.layer.cornerRadius = radius

        // Leave transparent cutouts over the album tile, labels, and buttons so
        // the native material never blurs the HTML controls underneath it.
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
                glass.effect = UIGlassEffect(style: .regular)
            } else {
                glass.effect = UIBlurEffect(style: .systemUltraThinMaterial)
            }
        }
    }
}
