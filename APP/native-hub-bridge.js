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
  var observer = null;

  function readControl(el) {
    if (!el || !el.id) return null;
    var rect = el.getBoundingClientRect();
    var style = window.getComputedStyle(el);
    var item = {
      id: el.id,
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
        visibility: style.visibility
      }
    };
    if ('value' in el) item.value = el.value;
    if ('checked' in el) item.checked = !!el.checked;
    if (el.getAttribute('role')) item.role = el.getAttribute('role');
    return item;
  }

  function snapshot() {
    var rect = hub.getBoundingClientRect();
    var controls = Array.prototype.map.call(
      hub.querySelectorAll('input[id],select[id],textarea[id],button[id],[role="button"][id]'),
      readControl
    ).filter(Boolean);

    return {
      version: 1,
      open: document.body.classList.contains('open'),
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      controls: controls
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
    requestAnimationFrame(notify);
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

  function setControl(id, value) {
    if (typeof id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,80}$/.test(id)) return false;
    var el = document.getElementById(id);
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
    characterData: true
  });
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  });
  window.addEventListener('resize', scheduleNotify, { passive: true });
  window.addEventListener('pagehide', function () {
    if (observer) observer.disconnect();
    listeners = [];
  }, { once: true });
  // Publish the first state immediately so UIKit does not wait for a later mutation.
  notify();
})();
