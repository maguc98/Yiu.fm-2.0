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
      text: el.children.length ? '' : (el.textContent || '').trim().slice(0, 320),
      frame: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
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
        whiteSpace: style.whiteSpace
      }
    };
    if (el.getAttribute('role')) item.role = el.getAttribute('role');
    if (el.tagName.toLowerCase() === 'svg') item.svg = el.outerHTML.slice(0, 5000);
    if (el.tagName.toLowerCase() === 'img') {
      item.src = el.currentSrc || el.src || '';
      item.alt = el.alt || '';
      item.objectFit = style.objectFit || 'contain';
    }
    if ('value' in el) item.value = el.value;
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
    var nodes = isOpen ? readTree() : [];
    var controls = isOpen ? Array.prototype.map.call(
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
    attributeFilter: ['class', 'aria-expanded', 'aria-selected', 'aria-pressed', 'disabled', 'hidden'],
    characterData: true
  });
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  });
  window.addEventListener('resize', scheduleNotify, { passive: true });
  window.addEventListener('pagehide', function () {
    if (observer) observer.disconnect();
    if (notifyTimer) window.clearTimeout(notifyTimer);
    listeners = [];
  }, { once: true });
  // Publish the first state immediately so UIKit does not wait for a later mutation.
  notify();
})();
