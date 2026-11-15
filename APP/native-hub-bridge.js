/* Yiu.fm native hub bridge
 * A narrow, versioned boundary between a future native control-center surface
 * and the existing single-page runtime. The DOM remains the source of truth:
 * no second player, renderer, or copied settings state is created here.
 */
(function () {
  'use strict';
  if (window.YiuHubBridge) return;

  var hub = document.getElementById('hub');
  var hubGlass = document.getElementById('hubGlass');
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
  var canvasImageCache = new WeakMap();
  var nativePresentation = false;
  var nativeBackPresentation = false;
  var savedBackVisibility = null;
  var savedBackOpacity = null;
  var savedBackPointerEvents = null;
  var nativeBridgeEnabled = false;
  var savedHubOpacity = null;
  var savedHubPointerEvents = null;
  var savedGlassVisibility = null;
  var savedGlassOpacity = null;
  var savedGlassPointerEvents = null;

  function nativeId(el) {
    if (el.id) return el.id;
    var value = generatedIds.get(el);
    if (!value) {
      value = 'yiu-native-' + nextGeneratedId++;
      generatedIds.set(el, value);
    }
    return value;
  }


  // Convert transformed WebKit rectangles back to the hub's stable layout
  // coordinate space. The original #hub animates with scale/translate; feeding
  // those transient visual rects to UIKit would scale the native mirror twice.
  function layoutRect(el, coordinateRoot) {
    var visual = el.getBoundingClientRect();
    var root = coordinateRoot || hub;
    var left = root.offsetLeft || 0;
    var top = root.offsetTop || 0;
    var style = window.getComputedStyle(root);
    var matrix;
    try {
      matrix = style.transform && style.transform !== 'none' ?
        new DOMMatrix(style.transform) : new DOMMatrix();
    } catch (_) {
      matrix = new DOMMatrix();
    }
    var scaleX = Math.hypot(matrix.a, matrix.b) || 1;
    var scaleY = Math.hypot(matrix.c, matrix.d) || 1;
    var origin = (style.transformOrigin || '0px 0px').split(' ');
    var originX = origin[0] && origin[0].indexOf('%') >= 0 ?
      (parseFloat(origin[0]) || 0) * root.offsetWidth / 100 : (parseFloat(origin[0]) || 0);
    var originY = origin[1] && origin[1].indexOf('%') >= 0 ?
      (parseFloat(origin[1]) || 0) * root.offsetHeight / 100 : (parseFloat(origin[1]) || 0);
    var visualOriginX = left + originX - (matrix.a * originX + matrix.c * originY) + matrix.e;
    var visualOriginY = top + originY - (matrix.b * originX + matrix.d * originY) + matrix.f;
    return {
      x: left + (visual.x - visualOriginX) / scaleX,
      y: top + (visual.y - visualOriginY) / scaleY,
      width: visual.width / scaleX,
      height: visual.height / scaleY
    };
  }

  function readControl(el) {
    if (!el) return null;
    var rect = layoutRect(el);
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
        backgroundImage: style.backgroundImage,
        backgroundSize: style.backgroundSize,
        backgroundPosition: style.backgroundPosition,
        backgroundRepeat: style.backgroundRepeat,
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

  function readNode(el, parentId, coordinateRoot) {
    var rect = layoutRect(el, coordinateRoot);
    var style = window.getComputedStyle(el);
    var item = {
      nativeId: nativeId(el),
      parentNativeId: parentId || '',
      tag: el.tagName.toLowerCase(),
      type: el.type || '',
      ariaChecked: el.getAttribute('aria-checked'),
      ariaValueMin: el.getAttribute('aria-valuemin'),
      ariaValueMax: el.getAttribute('aria-valuemax'),
      ariaValueNow: el.getAttribute('aria-valuenow'),
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
        boxShadow: style.boxShadow,
        backdropFilter: style.backdropFilter || style.webkitBackdropFilter || 'none',
        backgroundImage: style.backgroundImage,
        backgroundSize: style.backgroundSize,
        backgroundPosition: style.backgroundPosition,
        backgroundRepeat: style.backgroundRepeat,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
        textTransform: style.textTransform,
        textDecorationLine: style.textDecorationLine,
        textOverflow: style.textOverflow,
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
        whiteSpace: style.whiteSpace,
        zIndex: style.zIndex
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
    if (el.tagName.toLowerCase() === 'canvas' && el.id === 'cimg') {
      var cropVersion = el.__yiuNativeCropVersion || 0;
      var cropCache = canvasImageCache.get(el);
      if (!cropCache || cropCache.version !== cropVersion) {
        try {
          var cropData = el.toDataURL('image/jpeg', 0.82);
          if (cropData.length < 1800000) {
            cropCache = { version: cropVersion, data: cropData };
            canvasImageCache.set(el, cropCache);
          }
        } catch (_) {}
      }
      if (cropCache) item.imageData = cropCache.data;
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

  function readTree(root) {
    root = root || hub;
    var nodes = [];
    function visit(parent) {
      Array.prototype.forEach.call(parent.children || [], function (el) {
        if (nodes.length >= 1800) return;
        var parentId = parent === root ? '' : nativeId(parent);
        var item = readNode(el, parentId, root);
        nodes.push(item);
        elementsByNativeId.set(item.nativeId, el);

        // The segmented-control thumb is a CSS pseudo-element, not a DOM
        // child. Mirror its actual computed box so the selected capsule is
        // not lost when the foreground is rendered by UIKit.
        if (el.classList && el.classList.contains('glide')) {
          var pseudo = window.getComputedStyle(el, '::before');
          var pseudoContent = pseudo.content;
          var pseudoWidth = parseFloat(pseudo.width) || parseFloat(pseudo.getPropertyValue('--tw')) || 0;
          var pseudoTop = parseFloat(pseudo.top) || 0;
          var pseudoBottom = parseFloat(pseudo.bottom) || 0;
          var translateX = parseFloat(pseudo.translate) || parseFloat(window.getComputedStyle(el).getPropertyValue('--tx')) || 0;
          if (pseudoContent !== 'none' && pseudo.display !== 'none' &&
              pseudo.visibility !== 'hidden' && pseudoWidth > 0 && rect.height > pseudoTop + pseudoBottom) {
            nodes.push({
              nativeId: item.nativeId + '-before',
              parentNativeId: item.nativeId,
              tag: 'div',
              text: '',
              frame: {
                x: rect.x + translateX,
                y: rect.y + pseudoTop,
                width: pseudoWidth,
                height: rect.height - pseudoTop - pseudoBottom
              },
              appearance: {
                color: pseudo.color,
                backgroundColor: pseudo.backgroundColor,
                borderRadius: pseudo.borderRadius,
                borderWidth: pseudo.borderWidth,
                borderColor: pseudo.borderColor,
                opacity: pseudo.opacity,
                display: pseudo.display,
                visibility: pseudo.visibility,
                zIndex: pseudo.zIndex,
                overflow: pseudo.overflow
              }
            });
          }
        }
        visit(el);
      });
    }
    visit(root);
    return nodes;
  }

  function themeMenuSnapshot() {
    var menu = document.getElementById('mediaMenu');
    if (!menu || !menu.classList.contains('show') || !nativeBridgeEnabled) return { open: false, nodes: [] };
    var rect = layoutRect(menu, menu);
    var nodes = readTree(menu);
    var glass = document.getElementById('tpGlass');
    var glassStyle = glass ? window.getComputedStyle(glass) : null;
    return {
      open: true,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      surfaceAppearance: {
        backgroundColor: glassStyle ? glassStyle.backgroundColor : 'rgba(255,255,255,.14)',
        boxShadow: glassStyle ? glassStyle.boxShadow : 'none',
        borderRadius: glassStyle ? glassStyle.borderTopLeftRadius : '20px'
      },
      nodes: nodes
    };
  }

  function floatingSurfaceSnapshot(id) {
    var root = id === 'saWinCard' ? document.querySelector('#saWin.on:not(.yield) .sw-card') : document.getElementById(id);
    if (!root || !nativeBridgeEnabled) return { open: false, nodes: [] };
    var style = window.getComputedStyle(root);
    var layoutRootRect = layoutRect(root, root);
    var visualRootRect = root.getBoundingClientRect();
    var scaleX = layoutRootRect.width > 0 ? visualRootRect.width / layoutRootRect.width : 1;
    var scaleY = layoutRootRect.height > 0 ? visualRootRect.height / layoutRootRect.height : 1;
    var rect = { x: visualRootRect.left, y: visualRootRect.top,
      width: visualRootRect.width, height: visualRootRect.height };
    var nativeHidden = root.hasAttribute('data-yiu-native-opacity');
    var savedOpacity = root.getAttribute('data-yiu-native-opacity');
    var savedPointer = root.getAttribute('data-yiu-native-pointer');
    var sourceOpacity = nativeHidden ? (savedOpacity ? Number(savedOpacity) : 1) : Number(style.opacity || 1);
    var sourcePointer = nativeHidden ? savedPointer : style.pointerEvents;
    var open = rect.width > 0 && rect.height > 0 && style.display !== 'none' &&
      style.visibility !== 'hidden' && sourceOpacity > 0.01 &&
      sourcePointer !== 'none';
    if (id === 'hbTools') open = open && document.body.classList.contains('open') && root.classList.contains('is-on');
    if (id === 'cmdFab') open = open && root.classList.contains('vis');
    if (id === 'saWinCard') open = open && !!document.getElementById('saWin')?.classList.contains('on') && !document.getElementById('saWin')?.classList.contains('yield');
    if (id === 'crop' || id === 'qpop' || id === 'ddPop' || id === 'zoomPop') open = open && root.classList.contains('show');
    if (id === 'npToast') open = open && root.classList.contains('on');

    if (id === 'tlLens') open = open && root.classList.contains('show');
    if (!open) return { open: false, nodes: [] };
    return {
      open: true,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      surfaceAppearance: {
        backgroundColor: style.backgroundColor,
        boxShadow: style.boxShadow,
        borderRadius: style.borderTopLeftRadius,
        borderWidth: style.borderTopWidth,
        borderColor: style.borderTopColor
      },
      nodes: (function () {
        var children = readTree(root);
        function toViewport(node) {
          var frame = node.frame;
          if (!frame) return;
          frame.x = rect.x + (frame.x - layoutRootRect.x) * scaleX;
          frame.y = rect.y + (frame.y - layoutRootRect.y) * scaleY;
          frame.width *= scaleX;
          frame.height *= scaleY;
        }
        children.forEach(toViewport);
        if (id !== 'cmdFab') return children;
        var buttonNode = readNode(root, '', root);
        toViewport(buttonNode);
        buttonNode.appearance = Object.assign({}, buttonNode.appearance || {}, {
          backgroundColor: 'transparent',
          backdropFilter: 'none',
          boxShadow: 'none',
          borderColor: 'transparent',
          borderWidth: '0px'
        });
        elementsByNativeId.set(buttonNode.nativeId, root);
        return [buttonNode].concat(children);
      })()
    };
  }

  function snapshot() {
    // Rebuild the ID map from both live roots each time; do not retain detached theme cards.
    elementsByNativeId.clear();
    var rect = layoutRect(hub, hub);
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

    var surfaceStyle = hubGlass ? window.getComputedStyle(hubGlass) : null;
    return {
      version: 1,
      open: isOpen,
      surfaceAppearance: {
        backgroundColor: surfaceStyle ? surfaceStyle.backgroundColor : 'transparent',
        boxShadow: surfaceStyle ? surfaceStyle.boxShadow : 'none',
        borderRadius: surfaceStyle ? surfaceStyle.borderTopLeftRadius : '28px',
        openOriginX: hub.style.getPropertyValue('--hx'),
        openOriginY: hub.style.getPropertyValue('--hy'),
        closeTranslateX: hub.style.getPropertyValue('--tx'),
        closeTranslateY: hub.style.getPropertyValue('--ty')
      },
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      backButton: (function () {
        var button = document.getElementById('hback');
        if (!button) return { visible: false };
        var style = window.getComputedStyle(button);
        var rect = button.getBoundingClientRect();
        var visible = isOpen && rect.width > 0 && rect.height > 0 &&
          (nativeBackPresentation || (style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.01));
        return {
          visible: visible,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          opacity: nativeBackPresentation ? 1 : Number(style.opacity || 1),
          color: style.color,
          backgroundColor: style.backgroundColor,
          borderRadius: style.borderTopLeftRadius,
          label: button.getAttribute('aria-label') || '展开部分工具栏'
        };
      })(),
      controls: controls,
      nodes: nodes,
      themeMenu: themeMenuSnapshot(),
      floatingTools: floatingSurfaceSnapshot('hbTools'),
      commandButton: floatingSurfaceSnapshot('cmdFab'),
      splashWindow: floatingSurfaceSnapshot('saWinCard'),
      timelineLens: floatingSurfaceSnapshot('tlLens'),
      cropPanel: floatingSurfaceSnapshot('crop'),
      navigationBar: floatingSurfaceSnapshot('lg'),
      controlBar: floatingSurfaceSnapshot('cbar'),
      quickPopup: floatingSurfaceSnapshot('qpop'),
      dropdownPopup: floatingSurfaceSnapshot('ddPop'),
      zoomPopup: floatingSurfaceSnapshot('zoomPop'),
      coverToast: floatingSurfaceSnapshot('npToast'),
      settingsButton: (function () {
        var button = document.getElementById('miSet');
        if (!button) return { visible: false };
        var style = window.getComputedStyle(button);
        var rect = button.getBoundingClientRect();
        var nativeHidden = button.hasAttribute('data-yiu-native-opacity');
        var savedOpacity = button.getAttribute('data-yiu-native-opacity');
        var savedPointer = button.getAttribute('data-yiu-native-pointer');
        var sourceOpacity = nativeHidden ? (savedOpacity ? Number(savedOpacity) : 1) : Number(style.opacity || 1);
        var sourcePointer = nativeHidden ? savedPointer : style.pointerEvents;
        var visible = rect.width > 0 && rect.height > 0 &&
          style.display !== 'none' && style.visibility !== 'hidden' &&
          sourceOpacity > 0.01 && sourcePointer !== 'none';
        return {
          visible: visible,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          opacity: Number(style.opacity || 1),
          backgroundColor: style.backgroundColor,
          borderRadius: style.borderTopLeftRadius,
          color: style.color,
          pressed: button.classList.contains('ia')
        };
      })()
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
      // Remove both legacy DOM paint layers while UIKit owns this surface:
      // otherwise the old CSS backdrop blur would be sampled underneath
      // UIGlassEffect, producing a double-blurred "glass over blur" result.
      hub.style.opacity = '0';
      hub.style.pointerEvents = 'none';
      if (hubGlass) {
        savedGlassVisibility = hubGlass.style.visibility;
        savedGlassOpacity = hubGlass.style.opacity;
        savedGlassPointerEvents = hubGlass.style.pointerEvents;
        hubGlass.style.visibility = 'hidden';
        hubGlass.style.opacity = '0';
        hubGlass.style.pointerEvents = 'none';
      }
    } else {
      hub.style.opacity = savedHubOpacity === null ? '' : savedHubOpacity;
      hub.style.pointerEvents = savedHubPointerEvents === null ? '' : savedHubPointerEvents;
      savedHubOpacity = null;
      savedHubPointerEvents = null;
      if (hubGlass) {
        hubGlass.style.visibility = savedGlassVisibility === null ? '' : savedGlassVisibility;
        hubGlass.style.opacity = savedGlassOpacity === null ? '' : savedGlassOpacity;
        hubGlass.style.pointerEvents = savedGlassPointerEvents === null ? '' : savedGlassPointerEvents;
        savedGlassVisibility = null;
        savedGlassOpacity = null;
        savedGlassPointerEvents = null;
      }
    }
    return true;
  }

  var nativeThemePresentation = false;
  var savedThemeMenuState = null;
  function setNativeFloatingPresentation(id, active) {
    var root = id === 'saWinCard' ? document.querySelector('#saWin .sw-card') : document.getElementById(id);
    if (!root) return false;
    if (active) {
      if (!root.hasAttribute('data-yiu-native-opacity')) root.setAttribute('data-yiu-native-opacity', root.style.opacity || '');
      if (!root.hasAttribute('data-yiu-native-pointer')) root.setAttribute('data-yiu-native-pointer', root.style.pointerEvents || '');
      root.style.opacity = '0';
      root.style.pointerEvents = 'none';
    } else if (root.hasAttribute('data-yiu-native-opacity')) {
      var opacity = root.getAttribute('data-yiu-native-opacity');
      var pointer = root.getAttribute('data-yiu-native-pointer');
      if (opacity) root.style.opacity = opacity; else root.style.removeProperty('opacity');
      if (pointer) root.style.pointerEvents = pointer; else root.style.removeProperty('pointer-events');
      root.removeAttribute('data-yiu-native-opacity');
      root.removeAttribute('data-yiu-native-pointer');
    }
    return true;
  }

  function setNativeMirrorPresentation(id, active) {
    var root = document.getElementById(id);
    if (!root) return false;
    if (active && !root.hasAttribute('data-yiu-native-opacity')) {
      root.setAttribute('data-yiu-native-opacity', root.style.opacity || '');
      root.setAttribute('data-yiu-native-backdrop', root.style.getPropertyValue('backdrop-filter'));
      root.setAttribute('data-yiu-native-webkit-backdrop', root.style.getPropertyValue('-webkit-backdrop-filter'));
      root.style.opacity = '0';
      root.style.setProperty('backdrop-filter', 'none', 'important');
      root.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
    } else if (!active && root.hasAttribute('data-yiu-native-opacity')) {
      var opacity = root.getAttribute('data-yiu-native-opacity');
      var backdrop = root.getAttribute('data-yiu-native-backdrop');
      var webkitBackdrop = root.getAttribute('data-yiu-native-webkit-backdrop');
      if (opacity) root.style.opacity = opacity; else root.style.removeProperty('opacity');
      if (backdrop) root.style.setProperty('backdrop-filter', backdrop); else root.style.removeProperty('backdrop-filter');
      if (webkitBackdrop) root.style.setProperty('-webkit-backdrop-filter', webkitBackdrop); else root.style.removeProperty('-webkit-backdrop-filter');
      root.removeAttribute('data-yiu-native-opacity');
      root.removeAttribute('data-yiu-native-backdrop');
      root.removeAttribute('data-yiu-native-webkit-backdrop');
    }
    return true;
  }

  function setNativeThemePresentation(active) {
    active = !!active;
    if (active === nativeThemePresentation) return true;
    var menu = document.getElementById('mediaMenu');
    var glass = document.getElementById('tpGlass');
    if (!menu) return false;
    nativeThemePresentation = active;
    if (active) {
      savedThemeMenuState = {
        menuVisibility: menu.style.visibility,
        menuOpacity: menu.style.opacity,
        menuPointerEvents: menu.style.pointerEvents,
        glassVisibility: glass ? glass.style.visibility : null,
        glassOpacity: glass ? glass.style.opacity : null
      };
      // Hide only by opacity: visibility:hidden would cascade into every
      // mirrored child and make the next native snapshot discard the content.
      menu.style.opacity = '0';
      menu.style.pointerEvents = 'none';
      if (glass) glass.style.opacity = '0';
    } else {
      var saved = savedThemeMenuState || {};
      menu.style.visibility = saved.menuVisibility || '';
      menu.style.opacity = saved.menuOpacity || '';
      menu.style.pointerEvents = saved.menuPointerEvents || '';
      if (glass) {
        glass.style.visibility = saved.glassVisibility || '';
        glass.style.opacity = saved.glassOpacity || '';
      }
      savedThemeMenuState = null;
    }
    return true;
  }

  function setBackNativePresentation(active) {
    active = !!active;
    if (active === nativeBackPresentation) return true;
    nativeBackPresentation = active;
    var button = document.getElementById('hback');
    if (!button) return false;
    if (active) {
      savedBackVisibility = button.style.visibility;
      savedBackOpacity = button.style.opacity;
      savedBackPointerEvents = button.style.pointerEvents;
      button.style.visibility = 'hidden';
      button.style.opacity = '0';
      button.style.pointerEvents = 'none';
    } else {
      button.style.visibility = savedBackVisibility === null ? '' : savedBackVisibility;
      button.style.opacity = savedBackOpacity === null ? '' : savedBackOpacity;
      button.style.pointerEvents = savedBackPointerEvents === null ? '' : savedBackPointerEvents;
      savedBackVisibility = null;
      savedBackOpacity = null;
      savedBackPointerEvents = null;
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
    if (!el || !(hub.contains(el) || document.getElementById('mediaMenu')?.contains(el) || document.getElementById('hbTools')?.contains(el) || document.getElementById('cmdFab')?.contains(el) || document.getElementById('saWin')?.contains(el)) || el.disabled) return false;
    if (typeof el.click !== 'function') return false;
    el.click();
    scheduleNotify();
    return true;
  }

  function longPressControl(id) {
    if (typeof id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,80}$/.test(id)) return false;
    var el = document.getElementById(id) || elementsByNativeId.get(id);
    var menu = document.getElementById('mediaMenu');
    if (!el || !menu || !menu.contains(el)) return false;
    var card = el.closest ? el.closest('.tp-card') : null;
    if (!card || card.classList.contains('add-card')) return false;
    var api = window.__tpApi;
    if (!api || typeof api.nativeLongPress !== 'function') return false;
    var result = api.nativeLongPress(card);
    scheduleNotify();
    return !!result;
  }

  function setScroll(id, top, left) {
    if (typeof id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,80}$/.test(id)) return false;
    var el = document.getElementById(id) || elementsByNativeId.get(id);
    if (!el || !(hub.contains(el) || document.getElementById('mediaMenu')?.contains(el) || document.getElementById('saWin')?.contains(el))) return false;
    el.scrollTop = Math.max(0, Number(top) || 0);
    el.scrollLeft = Math.max(0, Number(left) || 0);
    scheduleNotify();
    return true;
  }

  function setControl(id, value) {
    if (typeof id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,80}$/.test(id)) return false;
    var el = document.getElementById(id) || elementsByNativeId.get(id);
    if (!el || !(hub.contains(el) || document.getElementById('mediaMenu')?.contains(el) || document.getElementById('saWin')?.contains(el)) || el.disabled) return false;

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
    longPressControl: longPressControl,
    setControl: setControl,
    setScroll: setScroll,
    setNativePresentation: setNativePresentation,
    setBackNativePresentation: setBackNativePresentation,
    setNativeThemePresentation: setNativeThemePresentation,
    setNativeFloatingPresentation: setNativeFloatingPresentation,
    setNativeMirrorPresentation: setNativeMirrorPresentation,
    setEnabled: setEnabled,
    refresh: scheduleNotify,
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
  var observedMirrorRoots = {};
  var mirrorAttachObserver = null;
  function attachMirrorObservers() {
    ['crop', 'tlLens', 'lg', 'cbar', 'qpop', 'ddPop', 'zoomPop'].forEach(function (id) {
      var root = document.getElementById(id);
      if (!root || observedMirrorRoots[id] === root) return;
      observedMirrorRoots[id] = root;
      observer.observe(root, {
        subtree: true, childList: true, attributes: true,
        attributeFilter: ['class', 'style', 'aria-hidden', 'value', 'checked'],
        characterData: true
      });
    });
    if (['crop', 'tlLens', 'cbar', 'qpop'].every(function (id) { return !!observedMirrorRoots[id]; }) && mirrorAttachObserver) {
      mirrorAttachObserver.disconnect();
      mirrorAttachObserver = null;
    }
  }
  mirrorAttachObserver = new MutationObserver(attachMirrorObservers);
  attachMirrorObservers();
  if (!['crop', 'tlLens', 'cbar', 'qpop'].every(function (id) { return !!observedMirrorRoots[id]; })) {
    mirrorAttachObserver.observe(document.documentElement, { childList: true, subtree: true });
  }
  var observedThemeMenu = null;
  var themeMenuAttachObserver = null;
  function attachThemeMenuObserver() {
    var themeMenuRoot = document.getElementById('mediaMenu');
    if (!themeMenuRoot || themeMenuRoot === observedThemeMenu) return;
    observedThemeMenu = themeMenuRoot;
    observer.observe(themeMenuRoot, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-expanded', 'aria-selected', 'aria-pressed', 'aria-label', 'disabled', 'hidden', 'value', 'checked', 'selected', 'src', 'alt', 'role'],
      characterData: true
    });
    themeMenuRoot.addEventListener('input', scheduleNotify, true);
    themeMenuRoot.addEventListener('change', scheduleNotify, true);
    if (themeMenuAttachObserver) {
      themeMenuAttachObserver.disconnect();
      themeMenuAttachObserver = null;
    }
    scheduleNotify();
  }
  attachThemeMenuObserver();
  if (!observedThemeMenu) {
    themeMenuAttachObserver = new MutationObserver(attachThemeMenuObserver);
    themeMenuAttachObserver.observe(document.documentElement, { childList: true, subtree: true });
  }
  window.addEventListener('resize', scheduleNotify, { passive: true });
  window.addEventListener('scroll', scheduleNotify, { passive: true, capture: true });
  hub.addEventListener('input', scheduleNotify, true);
  hub.addEventListener('change', scheduleNotify, true);
  window.addEventListener('pagehide', function () {
    if (observer) observer.disconnect();
    if (themeMenuAttachObserver) themeMenuAttachObserver.disconnect();
    if (mirrorAttachObserver) mirrorAttachObserver.disconnect();
    if (notifyTimer) window.clearTimeout(notifyTimer);
    listeners = [];
  }, { once: true });
  // Publish the first state immediately so UIKit does not wait for a later mutation.
  notify();
})();
