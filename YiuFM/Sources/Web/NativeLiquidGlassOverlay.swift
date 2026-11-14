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
        // Cut out every visible content region so the native material never
        // covers original UI: nested labels, controls, artwork, SVG/canvas,
        // images, badges and text all remain rendered by WKWebView.
        var holes = [], seen = new Set();
        function addRect(r) {
          if (!r || r.width < 1 || r.height < 1) return;
          var clipped = {
            x: Math.max(rect.x, r.left),
            y: Math.max(rect.y, r.top),
            right: Math.min(rect.x + rect.width, r.right),
            bottom: Math.min(rect.y + rect.height, r.bottom)
          };
          clipped.width = clipped.right - clipped.x;
          clipped.height = clipped.bottom - clipped.y;
          if (clipped.width > 0.5 && clipped.height > 0.5) {
            holes.push({ x:clipped.x, y:clipped.y, width:clipped.width, height:clipped.height });
          }
        }
        function walk(node) {
          if (!node || seen.has(node)) return;
          seen.add(node);
          if (node.nodeType === 3) {
            if (!String(node.textContent || '').trim()) return;
            try {
              var range = document.createRange();
              range.selectNode(node);
              Array.prototype.forEach.call(range.getClientRects(), addRect);
            } catch (_) {}
            return;
          }
          if (node.nodeType !== 1) return;
          var s = getComputedStyle(node);
          if (s.display === 'none' || s.visibility === 'hidden' ||
              Number(s.opacity || 1) < 0.02) return;
          var r = node.getBoundingClientRect();
          // A real box protects its entire original contents (including
          // backgrounds, images and custom controls); display:contents has no
          // box, so descend and protect its children individually.
          if (s.display !== 'contents' && r.width > 0.5 && r.height > 0.5) {
            addRect(r);
            return;
          }
          Array.prototype.forEach.call(node.childNodes || [], walk);
        }
        Array.prototype.forEach.call(el.childNodes || [], walk);

        // Merge intersecting cutouts. With an even-odd mask, overlapping
        // holes would otherwise toggle back to glass and hide content again.
        var merged = [];
        holes.forEach(function (hole) {
          var current = { x:hole.x, y:hole.y, width:hole.width, height:hole.height };
          var changed = true;
          while (changed) {
            changed = false;
            for (var i = merged.length - 1; i >= 0; i--) {
              var other = merged[i];
              var separated = current.x > other.x + other.width ||
                current.x + current.width < other.x ||
                current.y > other.y + other.height ||
                current.y + current.height < other.y;
              if (!separated) {
                var left = Math.min(current.x, other.x), top = Math.min(current.y, other.y);
                var right = Math.max(current.x + current.width, other.x + other.width);
                var bottom = Math.max(current.y + current.height, other.y + other.height);
                current = { x:left, y:top, width:right-left, height:bottom-top };
                merged.splice(i, 1);
                changed = true;
              }
            }
          }
          merged.push(current);
        });
        return merged;
      }
      function descriptor(el, id, rect, style) {
        var opacity = visibleThroughAncestors(el);
        if (!opacity || rect.width < 1 || rect.height < 1) return null;
        var radius = parsePx(style.borderTopLeftRadius, 16);
        return { id:id, visible:true, opacity:opacity, radius:radius, rect:rect, holes:holesOf(el, rect) };
      }
      function hasNativeGlassAncestor(el) {
        for (var parent = el.parentElement; parent && parent !== document.documentElement; parent = parent.parentElement) {
          var marker = parent.getAttribute('data-yiu-glass-native') || '';
          if (/(^|\\s)(self|before|after)(\\s|$)/.test(marker)) return true;
        }
        return false;
      }
      function inspectElement(el) {
        if (!el || el.nodeType !== 1) return;
        candidates = candidates.filter(function (item) { return item.el !== el; });
        var previousMarker = el.getAttribute('data-yiu-glass-native');
        // Temporarily remove our marker while measuring: native-mode CSS disables
        // the original CSS blur after a surface has been discovered.
        if (previousMarker !== null) el.removeAttribute('data-yiu-glass-native');
        var nested = hasNativeGlassAncestor(el), own = getComputedStyle(el), kinds = [];
        if (hasGlass(own)) {
          if (nested) kinds.push('flat-self');
          else {
            kinds.push('self');
            candidates.push({ el:el, pseudo:null, id:idFor(el) });
          }
        }
        var parentHasGlass = nested || kinds.indexOf('self') >= 0;
        var before = getComputedStyle(el, '::before');
        if (before && before.content !== 'none' && before.content !== 'normal' && hasGlass(before)) {
          if (parentHasGlass) kinds.push('flat-before');
          else {
            kinds.push('before');
            candidates.push({ el:el, pseudo:'::before', id:idFor(el, 'before') });
          }
        }
        var after = getComputedStyle(el, '::after');
        if (after && after.content !== 'none' && after.content !== 'normal' && hasGlass(after)) {
          if (parentHasGlass) kinds.push('flat-after');
          else {
            kinds.push('after');
            candidates.push({ el:el, pseudo:'::after', id:idFor(el, 'after') });
          }
        }
        if (kinds.length) el.setAttribute('data-yiu-glass-native', kinds.join(' '));
        if (kinds.some(function (kind) { return kind === 'self' || kind === 'before' || kind === 'after'; }) &&
            !observed.has(el) && resizeObserver) {
          observed.add(el);
          resizeObserver.observe(el);
        }
      }
      function inspectTree(root) {
        if (!root || root.nodeType !== 1) return;
        inspectElement(root);
        if (root.querySelectorAll) {
          Array.prototype.forEach.call(root.querySelectorAll('*'), inspectElement);
        }
      }
      function refreshCandidates() {
        candidates = [];
        if (document.body) inspectTree(document.body);
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
        var needsTracking = false;
        records.forEach(function (record) {
          if (record.type === 'childList') {
            Array.prototype.forEach.call(record.addedNodes, function (node) {
              if (node.nodeType === 1) inspectTree(node);
            });
            needsTracking = true;
          } else if (record.attributeName === 'class') {
            // Ancestor classes can change descendant pseudo-element materials.
            inspectTree(record.target);
            needsTracking = true;
          } else if (record.attributeName === 'style' &&
                     /backdrop-filter|--g-blur|--gb/i.test(record.target.getAttribute('style') || '')) {
            inspectTree(record.target);
            needsTracking = true;
          }
        });
        schedule();
        if (needsTracking) track(420);
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
