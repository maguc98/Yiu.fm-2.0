import UIKit

/// Bridges eligible CSS glass surfaces to native UIKit materials.
/// iOS 26+ uses UIGlassEffect; older iOS releases use the system standard
/// material as a compatibility fallback. Surface order and geometry are
/// synchronized from the web renderer on every update.
final class NativeLiquidGlassOverlay: UIView {
    static let webScript = """
    (function () {
      var bridge = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.yiuLiquidGlass;
      if (!bridge || window.__yiuNativeGlassInstalled) return;
      window.__yiuNativeGlassInstalled = true;
      document.documentElement.classList.add('native-liquid-glass');

      var ids = new WeakMap(), nextID = 1, candidates = [], pending = 0;
      var observed = new WeakSet(), knownGlass = new WeakSet(), trackingUntil = 0, tracking = false;
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
        // Computed pseudo dimensions are in the host's untransformed CSS
        // coordinate space, while getBoundingClientRect() is post-transform.
        // Convert offsets and dimensions using the host's current scale so a
        // scaled/animating panel does not leave its native glass out of sync.
        var layoutWidth = el.offsetWidth || r.width || 1;
        var layoutHeight = el.offsetHeight || r.height || 1;
        var sx = r.width / layoutWidth, sy = r.height / layoutHeight;
        var left = parsePx(style.left, 0), right = parsePx(style.right, 0);
        var top = parsePx(style.top, 0), bottom = parsePx(style.bottom, 0);
        var width = parsePx(style.width, Math.max(0, layoutWidth - left - right));
        var height = parsePx(style.height, Math.max(0, layoutHeight - top - bottom));
        var x = r.left + left * sx, y = r.top + top * sy;
        var move = String(style.translate || '').split(/\s+/);
        x += parsePx(move[0], 0) * sx;
        y += parsePx(move[1], 0) * sy;
        return { x:x, y:y, width:width * sx, height:height * sy };
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
      function isAboveGlassPseudo(node, host, pseudo) {
        if (!pseudo) return true;
        var chain = [], current = node;
        while (current && current !== host) {
          if (current.nodeType === 1) chain.push(current);
          current = current.parentElement;
        }
        if (current !== host) return false;
        chain.reverse();

        // ::before is painted before normal-flow children; ::after is painted
        // after them. Positioned/stacking descendants are evaluated as a unit:
        // a negative stacking context stays below either pseudo surface, while
        // an auto/zero/positive context is painted above ::after.
        if (pseudo === '::before') {
          for (var i = 0; i < chain.length; i++) {
            var beforeStyle = getComputedStyle(chain[i]);
            if (!createsStackingContext(chain[i], beforeStyle)) continue;
            var beforeZ = beforeStyle.zIndex === 'auto' ? 0 : (parseInt(beforeStyle.zIndex, 10) || 0);
            if (beforeZ < 0) return false;
            break;
          }
          return true;
        }

        for (var j = 0; j < chain.length; j++) {
          var style = getComputedStyle(chain[j]);
          if (createsStackingContext(chain[j], style)) {
            var z = style.zIndex === 'auto' ? 0 : (parseInt(style.zIndex, 10) || 0);
            return z >= 0;
          }
          // Positioned descendants with z-index:auto paint in the positioned
          // phase, after the host's in-flow ::after pseudo-element.
          if (style.position !== 'static') return true;
        }
        return false;
      }
      function holesOf(el, rect, glassPseudo) {
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
          if (glassPseudo && !isAboveGlassPseudo(node, el, glassPseudo)) return;
          var s = getComputedStyle(node);
          if (s.display === 'none' || s.visibility === 'hidden' ||
              Number(s.opacity || 1) < 0.02) return;
          var r = node.getBoundingClientRect();
          // Only cut out boxes that actually paint pixels. Transparent layout
          // wrappers (for example .mi-txt / #hubGlow) must not punch giant holes
          // through the native glass. Text nodes are protected by Range rects;
          // painted artwork and controls are protected by their own boxes.
          // Computed CSS colors are normalized to rgb()/rgba() by WebKit.
          function alphaOf(color) {
            if (!color || color === 'transparent') return 0;
            var match = color.match(/^rgba?\((.*)\)$/i);
            if (!match) return 1;
            var parts = match[1].split(/[\s,\/]+/).filter(Boolean);
            return parts.length >= 4 ? Math.max(0, Math.min(1, parseFloat(parts[3]) || 0)) : 1;
          }
          var tag = String(node.tagName || '').toLowerCase();
          var nativeArtwork = /^(img|picture|video|canvas|svg|iframe|object|embed|input|textarea|select|button|progress|meter)$/.test(tag);
          var hasFill = alphaOf(s.backgroundColor) > 0.015 || (s.backgroundImage && s.backgroundImage !== 'none');
          var hasBorder = ['Top','Right','Bottom','Left'].some(function (edge) {
            return parseFloat(s['border' + edge + 'Width'] || '0') > 0 &&
              alphaOf(s['border' + edge + 'Color']) > 0.015;
          });
          var hasPaintedBox = nativeArtwork || hasFill || hasBorder ||
            (s.boxShadow && s.boxShadow !== 'none') ||
            (s.filter && s.filter !== 'none');
          if (s.display !== 'contents' && hasPaintedBox && r.width > 0.5 && r.height > 0.5) {
            addRect(r);
          }

          // Pseudo-elements are real painted foreground too, but they do not
          // appear in childNodes. Protect visible ::before/::after artwork and
          // generated labels when they sit above a detached glass background.
          ['::before', '::after'].forEach(function (pseudo) {
            var ps = getComputedStyle(node, pseudo);
            if (!ps || ps.content === 'none' || ps.content === 'normal' ||
                ps.display === 'none' || ps.visibility === 'hidden' ||
                Number(ps.opacity || 1) < 0.02) return;
            var pr = pseudoRect(node, pseudo, ps);
            if (pr.width < 0.5 || pr.height < 0.5) return;
            var pseudoPaint = alphaOf(ps.backgroundColor) > 0.015 ||
              (ps.backgroundImage && ps.backgroundImage !== 'none') ||
              (ps.boxShadow && ps.boxShadow !== 'none') ||
              (ps.filter && ps.filter !== 'none') ||
              ['Top','Right','Bottom','Left'].some(function (edge) {
                return parseFloat(ps['border' + edge + 'Width'] || '0') > 0 &&
                  alphaOf(ps['border' + edge + 'Color']) > 0.015;
              }) || (ps.content && ps.content !== '""');
            if (pseudoPaint) {
              addRect({ left:pr.x, top:pr.y, right:pr.x + pr.width, bottom:pr.y + pr.height,
                        width:pr.width, height:pr.height });
            }
          });
          Array.prototype.forEach.call(node.childNodes || [], walk);
        }
        // First protect the glass host's own foreground descendants.
        Array.prototype.forEach.call(el.childNodes || [], walk);

        // Detached material layers need an explicit foreground owner. DOM
        // order alone is not paint order: a later sibling may be behind this
        // glass because of stacking contexts, z-index, transforms or isolation.
        // Protect only the known Yiu structures whose foreground relationship
        // is intentional, rather than punching holes through arbitrary siblings.
        var foregroundRoots = [];
        if (el.id === 'hubGlass') {
          var hub = document.getElementById('hub');
          if (hub) foregroundRoots.push(hub);
        } else if (el.id === 'tpGlass') {
          var menu = document.getElementById('mediaMenu');
          if (menu) foregroundRoots.push(menu);
        } else if (el.classList && el.classList.contains('lg-bg')) {
          var nav = el.parentElement;
          if (nav) {
            Array.prototype.forEach.call(nav.children, function (child) {
              if (child !== el && (child.classList.contains('lg-thumb') ||
                                   child.classList.contains('lg-btns'))) {
                foregroundRoots.push(child);
              }
            });
          }
        }
        foregroundRoots.forEach(function (root) {
          var rr = root.getBoundingClientRect();
          if (rr.right > rect.x && rr.left < rect.x + rect.width &&
              rr.bottom > rect.y && rr.top < rect.y + rect.height) walk(root);
        });

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
      function descriptor(el, id, rect, style, pseudo) {
        // Element opacity is already included by visibleThroughAncestors().
        // Pseudo-elements have their own computed opacity and must be folded
        // into the host's effective opacity separately.
        var opacity = visibleThroughAncestors(el);
        if (pseudo) opacity *= Math.max(0, Math.min(1, Number(style.opacity || 1)));
        if (!opacity || rect.width < 1 || rect.height < 1) return null;
        // getBoundingClientRect() already includes the host transform. CSS
        // corner radii are measured in the untransformed layout coordinate
        // space, so scale the radius with the same transform before sending it
        // to UIKit. The minimum axis scale keeps circular UIKit corners inside
        // the transformed CSS corner when a non-uniform scale is used.
        var layoutWidth = el.offsetWidth || rect.width || 1;
        var layoutHeight = el.offsetHeight || rect.height || 1;
        var sx = (el.getBoundingClientRect().width || layoutWidth) / layoutWidth;
        var sy = (el.getBoundingClientRect().height || layoutHeight) / layoutHeight;
        var radius = parsePx(style.borderTopLeftRadius, 16) * Math.min(sx, sy);
        return { id:id, visible:true, opacity:opacity, radius:radius, rect:rect, holes:holesOf(el, rect, pseudo || null) };
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
        if (kinds.length) {
          knownGlass.add(el);
          el.setAttribute('data-yiu-glass-native', kinds.join(' '));
        }
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
      function createsStackingContext(node, style) {
        if (!node || !style) return false;
        var positioned = style.position === 'absolute' || style.position === 'relative' ||
          style.position === 'fixed' || style.position === 'sticky';
        var parentStyle = node.parentElement ? getComputedStyle(node.parentElement) : null;
        var flexOrGridItem = parentStyle && /^(inline-)?(flex|grid)$/.test(parentStyle.display);
        return node === document.documentElement ||
          ((style.zIndex !== 'auto') && (positioned || flexOrGridItem)) ||
          Number(style.opacity || 1) < 1 ||
          style.transform !== 'none' || style.translate !== 'none' ||
          style.rotate !== 'none' || style.scale !== 'none' ||
          style.filter !== 'none' || style.backdropFilter !== 'none' ||
          style.webkitBackdropFilter !== 'none' ||
          style.perspective !== 'none' || style.isolation === 'isolate' ||
          style.mixBlendMode !== 'normal' ||
          /(^|\\s)(paint|layout)(\\s|$)/.test(style.contain || '') ||
          /transform|opacity|filter|perspective|contain/.test(style.willChange || '');
      }
      function stackingPath(item) {
        var chain = [], node = item.el;
        while (node && node.nodeType === 1 && node !== document.documentElement) {
          chain.push(node);
          node = node.parentElement;
        }
        chain.reverse();
        var path = [];
        chain.forEach(function (entry) {
          var cs = getComputedStyle(entry);
          if (!createsStackingContext(entry, cs)) return;
          var z = cs.zIndex === 'auto' ? 0 : (parseInt(cs.zIndex, 10) || 0);
          path.push({ z:z, node:entry, pseudoOrder:0 });
        });
        if (item.pseudo) {
          var ps = getComputedStyle(item.el, item.pseudo);
          var pz = ps.zIndex === 'auto' ? 0 : (parseInt(ps.zIndex, 10) || 0);
          // A filtered pseudo-element creates its own paint layer. Keep its
          // z-index attached to the host's tree position for stable ordering.
          path.push({ z:pz, node:item.el, pseudoOrder:item.pseudo === '::before' ? -1 : 1 });
        }
        return path;
      }
      function comparePaintEntries(a, b) {
        var length = Math.min(a.path.length, b.path.length);
        for (var i = 0; i < length; i++) {
          var left = a.path[i], right = b.path[i];
          if (left.node === right.node && left.pseudoOrder !== right.pseudoOrder) {
            return left.pseudoOrder - right.pseudoOrder;
          }
          if (left.z !== right.z) return left.z - right.z;
          if (left.node !== right.node) {
            var relation = left.node.compareDocumentPosition(right.node);
            if (relation & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
            if (relation & Node.DOCUMENT_POSITION_PRECEDING) return 1;
          }
        }
        // A stacking context paints its own background before descendants.
        if (a.path.length !== b.path.length) return a.path.length - b.path.length;
        return a.index - b.index;
      }
      function send() {
        pending = 0;
        try {
          var entries = [];
          candidates.forEach(function (item, index) {
            var style = getComputedStyle(item.el, item.pseudo || null);
            var rect = item.pseudo ? pseudoRect(item.el, item.pseudo, style) : (function () {
              var r = item.el.getBoundingClientRect();
              return { x:r.left, y:r.top, width:r.width, height:r.height };
            })();
            var itemData = descriptor(item.el, item.id, rect, style, item.pseudo || null);
            if (itemData) entries.push({ itemData:itemData, path:stackingPath(item), index:index });
          });
          // Sort low-to-high so UIKit can add/reorder the final entry above
          // earlier ones. This is a stacking-context-aware approximation,
          // not a single global z-index sort: nested contexts remain grouped.
          entries.sort(comparePaintEntries);
          var surfaces = entries.map(function (entry, order) {
            entry.itemData.paintOrder = order;
            return entry.itemData;
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
          } else if (record.attributeName === 'style') {
            var inlineStyle = record.target.getAttribute('style') || '';
            var changesGlassVariable = /--g-blur|--gb/i.test(inlineStyle);
            // Keep previously discovered glass elements eligible for re-detection.
            // A drag gesture can temporarily set backdrop-filter:none and then
            // clear the inline property; the latter style string no longer
            // contains "backdrop-filter", even though the stylesheet glass returns.
            if (knownGlass.has(record.target) || /backdrop-filter/i.test(inlineStyle) ||
                changesGlassVariable) {
              if (changesGlassVariable) inspectTree(record.target);
              else inspectElement(record.target);
              needsTracking = true;
            }
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

    private var glassViews: [String: UIVisualEffectView] = [:]
    private var glassMasks: [String: UIView] = [:]
    private var glassMaskLayers: [String: CAShapeLayer] = [:]

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        isOpaque = false
        isUserInteractionEnabled = false
        // Keep each native glass surface independent. A UIGlassContainerEffect
        // around masked UIGlassEffect children can introduce a second compositing
        // pass, causing content cut-outs to be lost on some OS releases.
        // iOS 26+ still uses the system UIGlassEffect on each surface directly.
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    // All touches pass through to the existing WKWebView controls.
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? { nil }

    func apply(_ payload: [String: Any]) {
        guard let surfaces = payload["surfaces"] as? [[String: Any]] else { return }
        var activeIDs = Set<String>()
        var orderedViews: [(order: Int, view: UIVisualEffectView)] = []
        for (index, surface) in surfaces.enumerated() {
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
                addSubview(glass)
            }
            update(glass, id: id, surface: surface, x: x, y: y, width: width, height: height)
            let paintOrder = (surface["paintOrder"] as? NSNumber)?.intValue ?? index
            orderedViews.append((paintOrder, glass))
        }
        // Existing UIVisualEffectViews are not reordered by updating their
        // frames. Reapply the JS-computed low-to-high paint order every time;
        // bringSubviewToFront preserves the WKWebView as a separate lower layer.
        for entry in orderedViews.sorted(by: { $0.order < $1.order }) {
            bringSubviewToFront(entry.view)
        }
        let staleIDs = glassViews.keys.filter { !activeIDs.contains($0) }
        for id in staleIDs {
            guard let glass = glassViews.removeValue(forKey: id) else { continue }
            glass.effect = nil
            glass.mask = nil
            glassMasks.removeValue(forKey: id)
            glassMaskLayers.removeValue(forKey: id)
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
            let effect = UIGlassEffect(style: .regular)
            // Keep the system material untinted so background artwork can
            // contribute to the native refraction. Interactive response adds
            // the system's adaptive edge highlights on touch.
            effect.tintColor = nil
            effect.isInteractive = true
            glass.effect = effect
        } else {
            glass.effect = UIBlurEffect(style: .systemMaterial)
        }
        return glass
    }

    private func update(_ glass: UIVisualEffectView, id: String, surface: [String: Any],
                        x: Double, y: Double, width: Double, height: Double) {
        let frame = CGRect(x: x, y: y, width: width, height: height)
        glass.frame = frame
        // UIKit advises against changing UIVisualEffectView.alpha. Apply the
        // effective CSS opacity to the mask instead, preserving the backdrop
        // effect's own compositing pipeline.
        let opacity = CGFloat(max(0, min(1, (surface["opacity"] as? NSNumber)?.doubleValue ?? 1)))
        glass.alpha = 1
        glass.isHidden = opacity <= 0.001
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
                // Keep the complete original element box above the material.
                // Rounded cut-outs can leave corner pixels of artwork, glyphs,
                // and compact controls underneath the glass. A slightly expanded
                // rectangular cut-out also protects antialiased edges and shadows.
                let local = CGRect(x: hx - x, y: hy - y, width: hw, height: hh)
                    .insetBy(dx: -2.5, dy: -2.5)
                    .intersection(CGRect(origin: .zero, size: frame.size))
                if !local.isNull && !local.isEmpty {
                    path.append(UIBezierPath(rect: local))
                }
            }
        }
        // Reuse the UIView mask and its shape layer. Updating only the path
        // avoids allocating a new mask hierarchy during tracked animations.
        let maskView: UIView
        let mask: CAShapeLayer
        if let existingView = glassMasks[id], let existingLayer = glassMaskLayers[id] {
            maskView = existingView
            mask = existingLayer
        } else {
            maskView = UIView(frame: glass.bounds)
            maskView.backgroundColor = .clear
            maskView.isUserInteractionEnabled = false
            maskView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            mask = CAShapeLayer()
            mask.fillRule = .evenOdd
            maskView.layer.addSublayer(mask)
            glassMasks[id] = maskView
            glassMaskLayers[id] = mask
            glass.mask = maskView
        }
        maskView.frame = glass.bounds
        mask.frame = maskView.bounds
        mask.path = path.cgPath
        mask.fillColor = UIColor(white: 1, alpha: opacity).cgColor
        glass.mask = maskView
        glass.layer.mask = nil
    }
}
