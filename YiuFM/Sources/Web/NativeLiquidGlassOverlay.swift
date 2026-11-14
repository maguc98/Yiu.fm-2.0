import UIKit

/// Bridges eligible CSS glass surfaces to native UIKit materials.
/// iOS 26+ uses UIGlassEffect inside one UIGlassContainerEffect; older iOS
/// releases use the system standard material as a compatibility fallback.
final class NativeLiquidGlassOverlay: UIView {
    static let webScript = """
    (function () {
      var bridge = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.yiuLiquidGlass;
      if (!bridge || window.__yiuNativeGlassInstalled) return;
      window.__yiuNativeGlassInstalled = true;
      document.documentElement.classList.add('native-liquid-glass');

      var ids = new WeakMap(), nextID = 1, candidates = [], pending = 0;
      var observed = new WeakSet(), trackingUntil = 0, tracking = false;
      var filterNone = function (value) { return !value || value === 'none' || value === 'initial'; };
      function hasGlass(style) {
        return style && (!filterNone(style.backdropFilter) || !filterNone(style.webkitBackdropFilter));
      }
      function idFor(el, suffix) {
        var id = ids.get(el);
        if (!id) { id = 'yiu-glass-' + nextID++; ids.set(el, id); }
        return suffix ? id + ':' + suffix : id;
      }
      function parsePx(value, fallback) {
        if (!value || value === 'auto') return fallback;
        var n = parseFloat(value);
        return isFinite(n) ? n : fallback;
      }
      function pseudoRect(el, pseudo, style) {
        var r = el.getBoundingClientRect();
        var left = parsePx(style.left, 0), right = parsePx(style.right, 0);
        var top = parsePx(style.top, 0), bottom = parsePx(style.bottom, 0);
        var width = parsePx(style.width, Math.max(0, r.width - left - right));
        var height = parsePx(style.height, Math.max(0, r.height - top - bottom));
        var x = r.left + left, y = r.top + top;
        var move = String(style.translate || '').split(/\\s+/);
        x += parsePx(move[0], 0);
        y += parsePx(move[1], 0);
        return { x:x, y:y, width:width, height:height };
      }
      function visibleThroughAncestors(el) {
        var opacity = 1;
        for (var node = el; node && node !== document.documentElement; node = node.parentElement) {
          var s = getComputedStyle(node);
          if (s.display === 'none' || s.visibility === 'hidden') return 0;
          opacity *= Number(s.opacity || 1);
          if (opacity <= 0.02) return 0;
        }
        return Math.max(0, Math.min(1, opacity));
      }
      function holesOf(el, rect) {
        var holes = [];
        Array.prototype.forEach.call(el.children || [], function (child) {
          var s = getComputedStyle(child), cr = child.getBoundingClientRect();
          if (s.display === 'none' || s.visibility === 'hidden' ||
              Number(s.opacity || 1) < 0.02 || cr.width < 1 || cr.height < 1) return;
          holes.push({ x:cr.left, y:cr.top, width:cr.width, height:cr.height });
        });
        return holes;
      }
      function descriptor(el, id, rect, style) {
        var opacity = visibleThroughAncestors(el);
        if (!opacity || rect.width < 1 || rect.height < 1) return null;
        var radius = parsePx(style.borderTopLeftRadius, 16);
        return { id:id, visible:true, opacity:opacity, radius:radius, rect:rect, holes:holesOf(el, rect) };
      }
      function refreshCandidates() {
        candidates = [];
        var all = document.querySelectorAll('body *');
        for (var i = 0; i < all.length; i++) {
          var el = all[i], previousMarker = el.getAttribute('data-yiu-glass-native');
          // Temporarily remove our marker while measuring: the native-mode CSS
          // intentionally disables the original CSS blur after a surface is found.
          if (previousMarker !== null) el.removeAttribute('data-yiu-glass-native');
          var own = getComputedStyle(el), kinds = [];
          if (hasGlass(own)) {
            kinds.push('self');
            candidates.push({ el:el, pseudo:null, id:idFor(el) });
          }
          var before = getComputedStyle(el, '::before');
          if (before && before.content !== 'none' && before.content !== 'normal' && hasGlass(before)) {
            kinds.push('before');
            candidates.push({ el:el, pseudo:'::before', id:idFor(el, 'before') });
          }
          var after = getComputedStyle(el, '::after');
          if (after && after.content !== 'none' && after.content !== 'normal' && hasGlass(after)) {
            kinds.push('after');
            candidates.push({ el:el, pseudo:'::after', id:idFor(el, 'after') });
          }
          if (kinds.length) el.setAttribute('data-yiu-glass-native', kinds.join(' '));
        }
        candidates.forEach(function (item) {
          if (!observed.has(item.el) && window.ResizeObserver) {
            observed.add(item.el);
            resizeObserver.observe(item.el);
          }
        });
        schedule();
      }
      function send() {
        pending = 0;
        try {
          var surfaces = [];
          candidates.forEach(function (item) {
            var style = getComputedStyle(item.el, item.pseudo || null);
            var rect = item.pseudo ? pseudoRect(item.el, item.pseudo, style) : (function () {
              var r = item.el.getBoundingClientRect();
              return { x:r.left, y:r.top, width:r.width, height:r.height };
            })();
            var itemData = descriptor(item.el, item.id, rect, style);
            if (itemData) surfaces.push(itemData);
          });
          bridge.postMessage({ surfaces:surfaces });
        } catch (_) {}
      }
      function schedule() {
        if (pending) return;
        pending = requestAnimationFrame(send);
      }
      function track(ms) {
        trackingUntil = Math.max(trackingUntil, performance.now() + ms);
        if (tracking) return;
        tracking = true;
        var last = 0;
        function tick(now) {
          if (!last || now - last >= 1000 / 30) { send(); last = now; }
          if (now < trackingUntil) requestAnimationFrame(tick);
          else tracking = false;
        }
        requestAnimationFrame(tick);
      }
      var resizeObserver = window.ResizeObserver ? new ResizeObserver(schedule) : null;
      var mutationObserver = window.MutationObserver ? new MutationObserver(function (records) {
        var needsRefresh = false;
        records.forEach(function (record) {
          if (record.type === 'childList' || record.attributeName === 'class') {
            needsRefresh = true;
          } else if (record.attributeName === 'style' &&
                     /backdrop-filter/i.test(record.target.getAttribute('style') || '')) {
            needsRefresh = true;
          }
        });
        if (needsRefresh) { refreshCandidates(); track(420); }
        else schedule();
      }) : null;
      if (mutationObserver && document.body) {
        mutationObserver.observe(document.body, {
          subtree:true, childList:true, attributes:true,
          attributeFilter:['class','style']
        });
      }
      document.addEventListener('transitionrun', function (event) {
        var target = event.target;
        if (target && target.nodeType === 1) {
          var s = getComputedStyle(target);
          if (hasGlass(s) || candidates.some(function (item) { return item.el === target; })) track(700);
        }
      }, true);
      document.addEventListener('transitionend', schedule, true);
      window.addEventListener('resize', function () { refreshCandidates(); track(500); }, {passive:true});
      window.addEventListener('orientationchange', function () { refreshCandidates(); track(500); }, {passive:true});
      window.addEventListener('scroll', schedule, true);
      refreshCandidates();
      setTimeout(refreshCandidates, 180);
    })();
    """

    private let glassContainer = UIVisualEffectView(effect: nil)
    private var glassViews: [String: UIVisualEffectView] = [:]
    private var usesGlassContainer = false

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        isOpaque = false
        isUserInteractionEnabled = false
        glassContainer.frame = bounds
        glassContainer.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        glassContainer.backgroundColor = .clear
        glassContainer.contentView.backgroundColor = .clear
        glassContainer.isUserInteractionEnabled = false
        addSubview(glassContainer)

        if #available(iOS 26.0, *) {
            let effect = UIGlassContainerEffect()
            effect.spacing = 10
            glassContainer.effect = effect
            usesGlassContainer = true
        } else {
            // iOS 18–25 don't provide Liquid Glass. Keep a native system material
            // fallback instead of imitating Liquid Glass with custom CSS.
            glassContainer.isHidden = true
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    // All touches pass through to the existing WKWebView controls.
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? { nil }

    func apply(_ payload: [String: Any]) {
        guard let surfaces = payload["surfaces"] as? [[String: Any]] else { return }
        var activeIDs = Set<String>()
        for surface in surfaces {
            guard let id = surface["id"] as? String,
                  let visible = surface["visible"] as? Bool, visible,
                  let rawRect = surface["rect"] as? [String: Any],
                  let x = (rawRect["x"] as? NSNumber)?.doubleValue,
                  let y = (rawRect["y"] as? NSNumber)?.doubleValue,
                  let width = (rawRect["width"] as? NSNumber)?.doubleValue,
                  let height = (rawRect["height"] as? NSNumber)?.doubleValue,
                  width > 0, height > 0 else { continue }
            activeIDs.insert(id)
            let glass = glassViews[id] ?? makeGlassView()
            if glassViews[id] == nil {
                glassViews[id] = glass
                if usesGlassContainer {
                    glassContainer.contentView.addSubview(glass)
                } else {
                    addSubview(glass)
                }
            }
            update(glass, surface: surface, x: x, y: y, width: width, height: height)
        }
        let staleIDs = glassViews.keys.filter { !activeIDs.contains($0) }
        for id in staleIDs {
            guard let glass = glassViews.removeValue(forKey: id) else { continue }
            glass.effect = nil
            glass.removeFromSuperview()
        }
    }

    private func makeGlassView() -> UIVisualEffectView {
        let glass = UIVisualEffectView(effect: nil)
        glass.backgroundColor = .clear
        glass.contentView.backgroundColor = .clear
        glass.isUserInteractionEnabled = false
        glass.clipsToBounds = true
        glass.layer.cornerCurve = .continuous
        if #available(iOS 26.0, *) {
            glass.effect = UIGlassEffect(style: .regular)
        } else {
            glass.effect = UIBlurEffect(style: .systemMaterial)
        }
        return glass
    }

    private func update(_ glass: UIVisualEffectView, surface: [String: Any],
                        x: Double, y: Double, width: Double, height: Double) {
        let frame = CGRect(x: x, y: y, width: width, height: height)
        glass.frame = frame
        glass.alpha = CGFloat(max(0, min(1, (surface["opacity"] as? NSNumber)?.doubleValue ?? 1)))
        glass.isHidden = false
        let radius = CGFloat(max(0, (surface["radius"] as? NSNumber)?.doubleValue ?? 16))
        glass.layer.cornerRadius = min(radius, min(frame.width, frame.height) / 2)

        let path = UIBezierPath(roundedRect: CGRect(origin: .zero, size: frame.size),
                                cornerRadius: glass.layer.cornerRadius)
        if let holes = surface["holes"] as? [[String: Any]] {
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
    }
}
