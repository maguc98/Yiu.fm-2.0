/* Yiu.fm native hub bridge
 * A narrow, versioned boundary between a future native control-center surface
 * and the existing single-page runtime. The DOM remains the source of truth:
 * no second player, renderer, or copied settings state is created here.
 */
(function () {
  'use strict';
  if (window.YiuHubBridge) return;

  var hub = document.getElementById('hub');
  if (!hub) return;

  var listeners = [];
  var queued = false;
  var notifyTimer = 0;
  var observer = null;
  var generatedIds = new WeakMap();
  var elementsByNativeId = new Map();
  var nextGeneratedId = 1;
  var svgImageCache = new Map();
  var svgImagePending = new Set();
  var nativePresentation = false;
  var nativeBridgeEnabled = false;
  var savedHubOpacity = null;
  var savedHubPointerEvents = null;

  function nativeId(el) {
    if (el.id) return el.id;
    var value = generatedIds.get(el);
    if (!value) {
      value = 'yiu-native-' + nextGeneratedId++;
      generatedIds.set(el, value);
    }
    return value;
  }

  function readControl(el) {
    if (!el) return null;
    var rect = el.getBoundingClientRect();
    var style = window.getComputedStyle(el);
    var item = {
      id: el.id || '',
      nativeId: nativeId(el),
      className: typeof el.className === 'string' ? el.className : '',
      ariaLabel: el.getAttribute('aria-label') || '',
      placeholder: el.getAttribute('placeholder') || '',
      min: el.getAttribute('min'),
      max: el.getAttribute('max'),
      step: el.getAttribute('step'),
      tag: el.tagName.toLowerCase(),
      type: el.type || '',
      disabled: !!el.disabled,
      text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 240),
      frame: {
        x: rect.x, y: rect.y, width: rect.width, height: rect.height
      },
      appearance: {
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        textAlign: style.textAlign,
        borderRadius: style.borderRadius,
        borderWidth: style.borderWidth,
        borderColor: style.borderColor,
        opacity: style.opacity,
        display: style.display,
        visibility: style.visibility,
        padding: style.padding,
        margin: style.margin,
        borderStyle: style.borderStyle,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing
      }
    };
    if ('value' in el) item.value = el.value;
    if ('checked' in el) item.checked = !!el.checked;
    if (el.getAttribute('role')) item.role = el.getAttribute('role');
    return item;
  }

  function readNode(el, parentId) {
    var rect = el.getBoundingClientRect();
    var style = window.getComputedStyle(el);
    var item = {
      nativeId: nativeId(el),
      parentNativeId: parentId || '',
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      className: typeof el.className === 'string' ? el.className : '',
      href: el.getAttribute('href') || '',
      tabIndex: typeof el.tabIndex === 'number' ? el.tabIndex : -1,
      text: Array.prototype.map.call(el.childNodes || [], function (node) {
        return node.nodeType === 3 ? (node.nodeValue || '') : '';
      }).join(' ').replace(/\s+/g, ' ').trim().slice(0, 320) || (el.getAttribute('aria-label') || ''),
      frame: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      scrollTop: el.scrollTop || 0,
      scrollLeft: el.scrollLeft || 0,
      scrollWidth: el.scrollWidth || 0,
      scrollHeight: el.scrollHeight || 0,
      min: el.getAttribute('min'),
      max: el.getAttribute('max'),
      step: el.getAttribute('step'),
      appearance: {
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        textAlign: style.textAlign,
        letterSpacing: style.letterSpacing,
        borderRadius: style.borderRadius,
        borderWidth: style.borderWidth,
        borderColor: style.borderColor,
        borderStyle: style.borderStyle,
        opacity: style.opacity,
        display: style.display,
        visibility: style.visibility,
        padding: style.padding,
        margin: style.margin,
        overflow: style.overflow,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        whiteSpace: style.whiteSpace
      }
    };
    if (el.getAttribute('role')) item.role = el.getAttribute('role');
    if (el.tagName.toLowerCase() === 'select') {
      item.options = Array.prototype.map.call(el.options || [], function (option) {
        return { label: (option.textContent || '').trim(), value: option.value, disabled: !!option.disabled };
      }).slice(0, 100);
    }
    if (el.tagName.toLowerCase() === 'svg') {
      item.svg = el.outerHTML.slice(0, 5000);
      var svgKey = item.nativeId;
      var svgSignature = el.outerHTML + "|" + style.color + "|" + style.fill + "|" +
        style.stroke + "|" + rect.width + "x" + rect.height;
      var cachedSVG = svgImageCache.get(svgKey);
      if (cachedSVG && cachedSVG.signature === svgSignature) {
        item.svgImage = cachedSVG.data;
      } else if (!svgImagePending.has(svgKey) && rect.width > 0 && rect.height > 0) {
        svgImagePending.add(svgKey);
        try {
          var clone = el.cloneNode(true);
          var sourceNodes = [el].concat(Array.prototype.slice.call(el.querySelectorAll('*')));
          var cloneNodes = [clone].concat(Array.prototype.slice.call(clone.querySelectorAll('*')));
          sourceNodes.forEach(function (source, index) {
            var target = cloneNodes[index];
            if (!target) return;
            var computed = window.getComputedStyle(source);
            ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
             'opacity', 'fill-opacity', 'stroke-opacity', 'color', 'font-family',
             'font-size', 'font-weight'].forEach(function (property) {
              var value = computed.getPropertyValue(property);
              if (value) target.style.setProperty(property, value);
            });
          });
          clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          clone.setAttribute('width', String(Math.min(512, Math.max(1, Math.ceil(rect.width * Math.min(3, window.devicePixelRatio || 1))))));
          clone.setAttribute('height', String(Math.min(512, Math.max(1, Math.ceil(rect.height * Math.min(3, window.devicePixelRatio || 1))))));
          var markup = new XMLSerializer().serializeToString(clone);
          var blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
          var objectURL = URL.createObjectURL(blob);
          var image = new Image();
          image.onload = function () {
            try {
              var canvas = document.createElement('canvas');
              canvas.width = Math.min(512, Math.max(1, Math.ceil(rect.width * Math.min(3, window.devicePixelRatio || 1))));
              canvas.height = Math.min(512, Math.max(1, Math.ceil(rect.height * Math.min(3, window.devicePixelRatio || 1))));
              var context = canvas.getContext('2d');
              if (context) {
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                var dataURL = canvas.toDataURL('image/png');
                if (dataURL.length < 180000) {
                  svgImageCache.set(svgKey, { signature: svgSignature, data: dataURL });
                }
              }
            } catch (_) {}
            URL.revokeObjectURL(objectURL);
            svgImagePending.delete(svgKey);
            scheduleNotify();
          };
          image.onerror = function () {
            URL.revokeObjectURL(objectURL);
            svgImagePending.delete(svgKey);
          };
          image.src = objectURL;
        } catch (_) {
          svgImagePending.delete(svgKey);
        }
      }
    }
    if (el.tagName.toLowerCase() === 'img') {
      item.src = el.currentSrc || el.src || '';
      item.alt = el.alt || '';
      item.objectFit = style.objectFit || 'contain';
    }
    if ('value' in el) item.value = el.value;
    if (el.getAttribute('placeholder')) item.placeholder = el.getAttribute('placeholder');
    if ('checked' in el) item.checked = !!el.checked;
    if (el.disabled !== undefined) item.disabled = !!el.disabled;
    return item;
  }

  function readTree() {
    var nodes = [];
    elementsByNativeId.clear();
    function visit(parent) {
      Array.prototype.forEach.call(parent.children || [], function (el) {
        if (nodes.length >= 1800) return;
        var parentId = parent === hub ? '' : nativeId(parent);
        var item = readNode(el, parentId);
        nodes.push(item);
        elementsByNativeId.set(item.nativeId, el);
        visit(el);
      });
    }
    visit(hub);
    return nodes;
  }

  function snapshot() {
    var rect = hub.getBoundingClientRect();
    var isOpen = document.body.classList.contains('open');
    // The native control center is irrelevant while closed. Avoid walking up to
    // 1,800 DOM nodes during background player/visualizer activity.
    var nodes = isOpen && nativeBridgeEnabled ? readTree() : [];
    var controls = isOpen && nativeBridgeEnabled ? Array.prototype.map.call(
      hub.querySelectorAll('input,select,textarea,button,[role="button"],a[href],[tabindex]:not([tabindex="-1"])'),
      function (el) {
        var item = readControl(el);
        if (item) elementsByNativeId.set(item.nativeId, el);
        return item;
      }
    ).filter(Boolean) : [];

    return {
      version: 1,
      open: isOpen,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      controls: controls,
      nodes: nodes
    };
  }

  function notify() {
    queued = false;
    var state = snapshot();
    listeners.slice().forEach(function (fn) {
      try { fn(state); } catch (error) {
        console.warn('[YiuHubBridge] subscriber failed', error);
      }
    });
    // Keep the native layer informed without creating a second source of truth.
    try {
      var handler = window.webkit && window.webkit.messageHandlers &&
        window.webkit.messageHandlers.yiuNativeHub;
      if (handler) handler.postMessage(state);
    } catch (error) {
      console.warn('[YiuHubBridge] native notification failed', error);
    }
  }

  function scheduleNotify() {
    if (queued) return;
    queued = true;
    // Coalesce bursts of DOM mutations. A 100 ms ceiling is enough for native
    // control-state synchronization and avoids rebuilding the full tree at 60 Hz.
    notifyTimer = window.setTimeout(function () {
      notifyTimer = 0;
      requestAnimationFrame(notify);
    }, 100);
  }

  function setEnabled(enabled) {
    enabled = !!enabled;
    if (enabled === nativeBridgeEnabled) return true;
    nativeBridgeEnabled = enabled;
    scheduleNotify();
    return true;
  }

  function setNativePresentation(active) {
    active = !!active;
    if (active === nativePresentation) return true;
    nativePresentation = active;
    if (active) {
      savedHubOpacity = hub.style.opacity;
      savedHubPointerEvents = hub.style.pointerEvents;
      // Hide only the original DOM paint. Computed child styles and geometry
      // remain readable so UIKit can mirror the exact foreground hierarchy.
      hub.style.opacity = '0';
      hub.style.pointerEvents = 'none';
    } else {
      hub.style.opacity = savedHubOpacity === null ? '' : savedHubOpacity;
      hub.style.pointerEvents = savedHubPointerEvents === null ? '' : savedHubPointerEvents;
      savedHubOpacity = null;
      savedHubPointerEvents = null;
    }
    return true;
  }

  function setOpen(open) {
    document.body.classList.toggle('open', !!open);
    scheduleNotify();
    return document.body.classList.contains('open');
  }

  function activate(action) {
    switch (action) {
      case 'open': return setOpen(true);
      case 'close': return setOpen(false);
      case 'toggle': return setOpen(!document.body.classList.contains('open'));
      default: return false;
    }
  }

  function activateControl(id) {
    if (typeof id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,80}$/.test(id)) return false;
    var el = document.getElementById(id) || elementsByNativeId.get(id);
    if (!el || !hub.contains(el) || el.disabled) return false;
    if (typeof el.click !== 'function') return false;
    el.click();
    scheduleNotify();
    return true;
  }

  function setScroll(id, top, left) {
    if (typeof id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,80}$/.test(id)) return false;
    var el = document.getElementById(id) || elementsByNativeId.get(id);
    if (!el || !hub.contains(el)) return false;
    el.scrollTop = Math.max(0, Number(top) || 0);
    el.scrollLeft = Math.max(0, Number(left) || 0);
    scheduleNotify();
    return true;
  }

  function setControl(id, value) {
    if (typeof id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,80}$/.test(id)) return false;
    var el = document.getElementById(id) || elementsByNativeId.get(id);
    if (!el || !hub.contains(el) || el.disabled) return false;

    if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = !!value;
    } else if ('value' in el) {
      el.value = String(value);
    } else {
      return false;
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    scheduleNotify();
    return true;
  }

  window.YiuHubBridge = Object.freeze({
    version: 1,
    snapshot: snapshot,
    activate: activate,
    activateControl: activateControl,
    setControl: setControl,
    setScroll: setScroll,
    setNativePresentation: setNativePresentation,
    setEnabled: setEnabled,
    subscribe: function (listener) {
      if (typeof listener !== 'function') return function () {};
      listeners.push(listener);
      listener(snapshot());
      return function () {
        listeners = listeners.filter(function (item) { return item !== listener; });
      };
    }
  });

  observer = new MutationObserver(scheduleNotify);
  observer.observe(hub, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'aria-expanded', 'aria-selected', 'aria-pressed', 'aria-label', 'disabled', 'hidden', 'value', 'checked', 'selected', 'src', 'alt', 'role'],
    characterData: true
  });
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  });
  window.addEventListener('resize', scheduleNotify, { passive: true });
  window.addEventListener('scroll', scheduleNotify, { passive: true, capture: true });
  hub.addEventListener('input', scheduleNotify, true);
  hub.addEventListener('change', scheduleNotify, true);
  window.addEventListener('pagehide', function () {
    if (observer) observer.disconnect();
    if (notifyTimer) window.clearTimeout(notifyTimer);
    listeners = [];
  }, { once: true });
  // Publish the first state immediately so UIKit does not wait for a later mutation.
  notify();
})();
