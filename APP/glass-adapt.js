/* glass-adapt.js —— 玻璃整体随背景亮度变深（全局一个 --ui-k，没有局部变深）
 * 估算：#bg 背景图下半部分的平均亮度 × #dimv 压暗；T0=0.32 以下 k=0，T1=0.62 以上 k=1，中间平滑，带缓动。
 * 取不到像素（跨域 / file:// 污染画布）：body.light-bg 开着 → k 取 0.8，没开 → 0。
 * 接口：window.__glassSetLuma(0~1) 手动给亮度；window.__glassRefresh() 重算。
 */
(function () {
  'use strict';
  var T0 = 0.32, T1 = 0.62, FALLBACK_K = 0.8;
  var root = document.documentElement, cur = 0, target = 0, raf = 0, timer = 0, img = null, imgUrl = '', manual = null;
  var cv = document.createElement('canvas'), cx = cv.getContext('2d');
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function kOf(L) { var x = clamp((L - T0) / (T1 - T0), 0, 1); return x * x * (3 - 2 * x); }
  function dimFactor() {
    var d = document.getElementById('dimv'); if (!d) return 1;
    var cs = getComputedStyle(d); if (cs.display === 'none' || cs.visibility === 'hidden') return 1;
    var o = parseFloat(cs.opacity); if (isNaN(o)) o = 1;
    var m = /rgba?\(([^)]+)\)/.exec(cs.backgroundColor); if (!m) return 1;
    var p = m[1].split(','), a = p.length > 3 ? parseFloat(p[3]) : 1;
    if ((parseFloat(p[0]) + parseFloat(p[1]) + parseFloat(p[2])) / 765 > .5) return 1;
    return clamp(1 - o * a, 0, 1);
  }
  /* 深色深度滑块 depth：最左（0）= 自动（按背景亮度）；往右 = 手动，玻璃固定按这个深度（100% 最深） */
  var autoK = 0, depth = 0;
  try { var sv = parseFloat(localStorage.getItem('glassDepth2')); if (!isNaN(sv)) depth = clamp(sv / 100, 0, 1); } catch (e) {}
  function applyTarget() {
    /* 手动档按开方换算：线性时 1~70% 几乎看不出变化，开方后低档位也有明显差别 */
    target = clamp(depth <= 0 ? autoK : Math.sqrt(depth), 0, 1); if (!raf) raf = requestAnimationFrame(step);
  }
  function setTarget(k) { autoK = clamp(k, 0, 1); applyTarget(); }
  function setDepth(v100, save) {
    depth = clamp(v100 / 100, 0, 1); applyTarget();
    if (save) { try { localStorage.setItem('glassDepth2', String(Math.round(v100))); } catch (e) {} }
    [].forEach.call(document.querySelectorAll('input[data-glass-depth]'), function (i) { if (+i.value !== Math.round(v100)) i.value = Math.round(v100); i.style.setProperty('--p', Math.round(v100) + '%'); });
    [].forEach.call(document.querySelectorAll('[data-glass-depth-v]'), function (m) { m.textContent = depthLabel(Math.round(v100)); });
  }
  function depthLabel(v) { return v === 0 ? '自动' : v + '%'; }
  window.__glassSetDepth = function (v) { setDepth(+v || 0, true); };

  /* ---- 界面：设置页（挂在「性能模式」开关那一行后面）+ 主题卡片弹窗里各放一个滑块，两处同步 ---- */
  function sliderHTML() {      // 文字（左）+ 数值（右）在上一行，滑块独占下一行、整行宽
    return '<div class="gd-top"><span class="gd-name">玻璃深色深度</span><em data-glass-depth-v>' + depthLabel(Math.round(depth * 100)) + '</em></div><input type="range" min="0" max="100" step="1" data-glass-depth value="' + Math.round(depth * 100) + '" style="--p:' + Math.round(depth * 100) + '%">';
  }
  function bindRange(inp) { inp.style.setProperty('--p', inp.value + '%'); inp.addEventListener('input', function () { setDepth(+inp.value, true); }); }
  var TITLES = ['界面动画速度', '动画速度'];   // 只精确匹配速度滑块行的标签，绝不匹配「界面动画」标题行（否则会向上爬到整个面板容器）
  function findSpeedRow() {       // 在整个页面里找「界面动画速度」那一行（优先可见的），整行 = 包含它自己的滑块的那一层
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n, first = null, vis = null;
    while ((n = w.nextNode())) {
      var pe = n.parentElement; if (!pe || (pe.closest && pe.closest('#gdSet,#gdTp'))) continue;
      var t = (n.nodeValue || '').trim(); if (!t || t.length > 14) continue;
      for (var i = 0; i < TITLES.length; i++) {
        if (t.indexOf(TITLES[i]) >= 0) {
          if (!first) first = pe;
          if (pe.getClientRects().length) { vis = pe; break; }
        }
      }
      if (vis) break;
    }
    var el = vis || first, root = document.body;
    if (!el) return null;
    while (el && el !== root && !el.querySelector('input[type=range]')) el = el.parentElement;
    if (!el || el === root) return null;
    return el;   // 只定位到「包含自己滑块的那一行」，绝不向上合并，避免爬进整个设置面板把滑块插到面板外
  }
  window.__glassRowInfo = function () { var r = findSpeedRow(); return r ? r.outerHTML.slice(0, 1500) : 'not found'; };
  function dropSpeedNote(row) {     // 删掉「界面动画」的使用说明（真删除，不是隐藏）
    var all = row.querySelectorAll('*'), titleSeen = false;
    for (var i = 0; i < all.length; i++) {
      var e = all[i]; if (e.children.length || !e.parentNode) continue;
      var t = (e.textContent || '').trim(); if (!t) continue;
      if (!titleSeen && t.length <= 14 && TITLES.some(function (k) { return t.indexOf(k) >= 0; })) { titleSeen = true; continue; }
      if (t.length < 6 || /^[\d.]+\s*[x×%s秒倍]*$/i.test(t)) continue;
      e.remove();
    }
    var sib = row.nextElementSibling;   // 说明也可能是行外紧跟着的一小段字
    while (sib && sib.id !== 'gdSet' && !sib.querySelector('input,button,select') && /动画|速度|快慢/.test(sib.textContent || '') && (sib.textContent || '').trim().length >= 6) { var nx = sib.nextElementSibling; sib.remove(); sib = nx; }
  }
  function mountUI() {
    var pm = document.getElementById('performanceMode'), speed0 = findSpeedRow();
    if (pm || speed0) {
      var d = document.getElementById('gdSet'), speed = speed0, row = null;
      if (speed) { dropSpeedNote(speed); row = speed; }
      else if (!d && pm) row = pm.closest('label,.row,li,[class*="row"]') || pm.parentElement;
      if (!d && row && row.parentNode) {
        d = document.createElement('div'); d.id = 'gdSet'; d.className = 'gd-set'; d.innerHTML = sliderHTML();
        row.parentNode.insertBefore(d, row.nextSibling); bindRange(d.querySelector('input'));
      } else if (d && speed && d.previousElementSibling !== speed) speed.parentNode.insertBefore(d, speed.nextSibling);
    }
    var opts = document.querySelector('#mediaMenu .tp-options');
    if (opts && !document.getElementById('gdTp')) {
      var r = document.createElement('div'); r.id = 'gdTp'; r.className = 'tp-row';
      r.innerHTML = '<div class="tp-lbl"><div class="tp-name">玻璃深色深度</div><div class="tp-desc">最左边是自动，往右手动变深</div></div><div class="tp-ctrl"><input type="range" min="0" max="100" step="1" data-glass-depth value="' + Math.round(depth * 100) + '" style="--p:' + Math.round(depth * 100) + '%"><em data-glass-depth-v>' + depthLabel(Math.round(depth * 100)) + '</em></div>';
      opts.appendChild(r); bindRange(r.querySelector('input'));
    }
  }
  var mt = 0; try { new MutationObserver(function () { clearTimeout(mt); mt = setTimeout(mountUI, 200); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  function step() {
    raf = 0; cur += (target - cur) * 0.14;
    if (Math.abs(target - cur) < 0.004) cur = target;
    root.style.setProperty('--ui-k', cur.toFixed(3));
    if (cur !== target) raf = requestAnimationFrame(step);
  }
  function fallback() { setTarget(document.body.classList.contains('light-bg') ? FALLBACK_K : 0); }
  function measure(im) {
    var W = 32, H = 32; cv.width = W; cv.height = H;
    var vw = innerWidth || 390, vh = innerHeight || 844, s = Math.max(W / im.naturalWidth, H * (vw / vw) / im.naturalHeight);
    var vr = vh / vw, cw = W, ch = Math.round(W * vr); cv.height = ch;
    var sc = Math.max(cw / im.naturalWidth, ch / im.naturalHeight), w = im.naturalWidth * sc, h = im.naturalHeight * sc;
    cx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
    var d; try { d = cx.getImageData(0, Math.floor(ch / 2), cw, ch - Math.floor(ch / 2)).data; } catch (e) { return null; }
    var sum = 0, n = d.length / 4; for (var i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    return sum / n / 255 * dimFactor();
  }
  function recompute() {
    if (manual != null) { setTarget(kOf(manual)); return; }
    var bg = document.getElementById('bg'); if (!bg) { fallback(); return; }
    var m = /url\((['"]?)(.*?)\1\)/.exec(getComputedStyle(bg).backgroundImage || ''); if (!m) { fallback(); return; }
    var url = m[2];
    function go(im) { var L = measure(im); if (L == null) fallback(); else setTarget(kOf(L)); }
    if (img && imgUrl === url && img.complete && img.naturalWidth) { go(img); return; }
    var im = new Image(); imgUrl = url; img = im; im.onload = function () { if (img === im) go(im); }; im.onerror = function () { if (img === im) fallback(); }; im.src = url;
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(recompute, 120); }
  try {
    var mo = new MutationObserver(schedule);
    ['bg', 'dimv'].forEach(function (id) { var e = document.getElementById(id); if (e) mo.observe(e, { attributes: true, attributeFilter: ['style', 'class'] }); });
    new MutationObserver(schedule).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  } catch (e) {}
  addEventListener('resize', schedule);
  window.__glassSetLuma = function (v) { manual = clamp(+v || 0, 0, 1); recompute(); };
  window.__glassRefresh = function () { manual = null; imgUrl = ''; recompute(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { recompute(); mountUI(); }); else { recompute(); mountUI(); }
  addEventListener('load', function () { recompute(); setTimeout(recompute, 800); });
})();
