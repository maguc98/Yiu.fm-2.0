// APP/cmd-keyboard.js — 命令窗口的「自带键盘」（手机上代替系统键盘，贴屏幕底、与系统键盘同高同位）
// 依赖 cmd-console.js（必须先加载）。没加载本文件 / 关掉开关时，命令窗口完全走旧逻辑。
//   开关：localStorage cmd_kb = '1' / '0'（没设置时：触屏 pointer:coarse 为开，电脑为关）；命令窗口 ⋯ 里也有开关，/kb on|off
//   高度：键盘本体（不含上面的符号胶囊）可自定义：dev_kb_h（竖屏）/ dev_kb_h_l（横屏），像素，没设置 = 自动（按系统键盘高度 dev_cm_kbH / dev_cm_kbH_l 减去胶囊区，都没有就用 300 / 200）
//        命令窗口 ⋯ 里「键盘高度」± 调，或 /kbh 340、/kbh auto；动画 dev_kb_sw（毫秒，默认 160，会除以 --ui-spd）
//   对外：window.__cmKb = { enabled, isVisible, hide, ... }；cmd-console.js 里的 customKbOn() 就是 __cmKb.enabled()
(function () {
  'use strict';
  if (window.__cmKb) return;

  var ctx = null, el = null, sw = null, built = false;
  var mode = 'custom';                       // custom 自带键盘 / system 系统键盘（只在本次页面生命周期内有效，刷新回到自带）
  var open = false, layer = 'abc', shift = 0, shiftT = 0;
  var swAt = 0, swT = 0, ntT = 0, fbT = 0, folT = 0;
  var vv = window.visualViewport;
  var letters = [], shiftKeys = [], enKeys = [];
  var SEG = null;
  try { SEG = (window.Intl && Intl.Segmenter) ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null; } catch (_) { SEG = null; }

  function lsGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  function coarse() { return !!(window.matchMedia && matchMedia('(pointer:coarse)').matches); }
  function land() { return window.innerWidth > window.innerHeight; }
  function featureOn() { var v = lsGet('cmd_kb'); return v === '1' ? true : v === '0' ? false : coarse(); }
  function active() { return !!ctx && featureOn(); }                 // 功能开着（不管此刻是自带还是系统键盘）
  function enabled() { return active() && mode === 'custom'; }       // = customKbOn()：此刻由自带键盘接管
  function isVisible() { return enabled() && open; }

  /* ---------- 高度：竖屏 dev_cm_kbH，横屏 dev_cm_kbH_l；都没有就兜底 300 / 200 ---------- */
  /* 符号胶囊和键盘本体是两块：胶囊区固定（竖屏 上隙 8 + 46 + 下隙 10，横屏 4 + 32 + 5），自定义高度只管下面的键盘本体（含底部安全区） */
  function barH() { return land() ? 41 : 64; }
  function customH() { var v = parseFloat(lsGet(land() ? 'dev_kb_h_l' : 'dev_kb_h')); return v > 0 ? v : 0; }
  function bodyH() {
    var l = land(), full = ctx && ctx.fullH ? ctx.fullH() : window.innerHeight, v = customH();
    if (!v) { v = parseFloat(lsGet(l ? 'dev_cm_kbH_l' : 'dev_cm_kbH')); if (!(v > 0)) v = l ? 200 : 300; v -= barH(); }   // 自动：和系统键盘（含它上面的工具条）同高
    return Math.round(Math.max(l ? 110 : 160, Math.min(v, full * 0.7 - barH())));
  }
  function kbH() { return bodyH() + barH(); }                               // 整块（胶囊 + 键盘）的高度
  function dur() { var v = parseFloat(lsGet('dev_kb_sw')); if (!(v >= 0)) v = 160; return v / (ctx ? ctx.uiSpd() : 1); }

  /* ---------- 图标 ---------- */
  function svg(p, fill) { return '<svg viewBox="0 0 24 24" fill="' + (fill ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; }
  var ICON = {
    shift: svg('<path d="M12 4l8 9h-5v7H9v-7H4z"/>'),
    bs: svg('<path d="M20 5H9l-6 7 6 7h11a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="M13 9.5l5 5M18 9.5l-5 5"/>'),
    ret: svg('<path d="M20 5v6a3 3 0 0 1-3 3H5M9 10l-4 4 4 4"/>'),
    down: svg('<path d="M6 9l6 6 6-6"/>'),
    up: svg('<path d="M12 19V5M5 12l7-7 7 7"/>'),
    left: svg('<path d="M14.5 5.5L8 12l6.5 6.5"/>'),
    right: svg('<path d="M9.5 5.5L16 12l-6.5 6.5"/>'),
    dnarr: svg('<path d="M12 5v14M5 12l7 7 7-7"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7"/>'),
    globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9s1.3-6.4 3.8-9z"/>'),
    kbd: svg('<rect x="2.5" y="5.5" width="19" height="13" rx="3"/><path d="M6.5 9.5h.01M10 9.5h.01M14 9.5h.01M17.5 9.5h.01M8 14.5h8"/>')
  };

  /* ---------- 键位 ---------- */
  function C(ch, o) { o = o || {}; o.t = 'c'; o.v = ch; o.l = ch; return o; }
  function Lt(ch) { var o = C(ch); o.letter = true; return o; }
  function Sp(w) { return { sp: true, w: w }; }
  function F(t, o) { o = o || {}; o.t = t; return o; }
  var STRIP = [F('tab', { l: 'Tab', w: 1.7, cls: 'fn' }), C('/', { cls: 'kb-ll' }), C('('), C(')'), C('{'), C('}'), C('['), C(']'),
    C(';', { cls: 'kb-pl' }), C(':', { cls: 'kb-pl' }), C('"', { cls: 'kb-pl' }),
    F('arr', { v: 'L', icon: 'left', rep: true, cls: 'fn kb-ll', aria: '光标左移' }), F('arr', { v: 'R', icon: 'right', rep: true, cls: 'fn kb-ll', aria: '光标右移' }),   // 横屏没有底下那一行，← → 放进胶囊
    F('hide', { icon: 'check', cls: 'fn', aria: '收起键盘' })];
  function bottom(label, to, cp) {                                           // cp：带逗号 / 句号（只有 123 层要，字母层和系统键盘一样只有 123 / 空格 / 回车）
    var r = [F('lay', { v: to, l: label, w: cp ? 1.6 : 2.8, cls: 'fn' })];
    if (cp) r.push(C(','));
    r.push(F('sp', { l: '', aria: '空格', w: cp ? 3.6 : 5.8 }));
    if (cp) r.push(C('.'));
    r.push(F('en', { icon: 'up', w: cp ? 1.8 : 2.8, aria: '回车' }));
    return r;
  }
  function curRow() {                                                        // 左下 ← 右下 →：光标左右移（长按连发），字母层和 123 层都有
    var r = [F('arr', { v: 'L', icon: 'left', rep: true, cls: 'gl', aria: '光标左移' }), Sp(9), F('arr', { v: 'R', icon: 'right', rep: true, cls: 'gl gr', aria: '光标右移' })];
    r.cls = 'kb-gr'; return r;
  }
  function chars(s) { return s.split('').map(function (c) { return C(c); }); }
  var LAYERS = {
    abc: [
      'qwertyuiop'.split('').map(Lt),
      [Sp(0.5)].concat('asdfghjkl'.split('').map(Lt), [Sp(0.5)]),
      [F('sh', { icon: 'shift', w: 1.36, cls: 'fn mr', aria: '大写' })].concat('zxcvbnm'.split('').map(Lt), [F('bs', { icon: 'bs', w: 1.36, cls: 'fn ml', rep: true, aria: '退格' })]),
      bottom('123', 'num', false),
      curRow()
    ],
    num: [
      chars('1234567890'),
      chars('+-*/=%_$@#'),
      [Sp(0.5)].concat(chars('!?&|\'`~^\\'), [C(';', { cls: 'kb-ll' }), C(':', { cls: 'kb-ll' }), C('"', { cls: 'kb-ll' })], [Sp(0.5)]),
      chars('<>').concat([                                                     // 只留 ↑ ↓ 行首 行尾 退格，和系统 123 层一样一排收齐
        F('arr', { v: 'U', icon: 'up', rep: true, cls: 'fn', aria: '上移' }), F('arr', { v: 'D', icon: 'dnarr', rep: true, cls: 'fn', aria: '下移' }),
        F('arr', { v: 'H', l: '行首', w: 1.5, cls: 'fn', aria: '行首' }), F('arr', { v: 'E', l: '行尾', w: 1.5, cls: 'fn', aria: '行尾' }),
        F('bs', { icon: 'bs', w: 1.5, cls: 'fn', rep: true, aria: '退格' })]),
      bottom('ABC', 'abc', true),
      curRow()
    ]
  };

  function mkKey(k, parent) {
    if (k.sp) { var s = document.createElement('i'); s.className = 'kb-sp'; s.style.flex = (k.w || 1) + ' 1 0'; parent.appendChild(s); return; }
    var b = document.createElement('button');
    b.type = 'button'; b.tabIndex = -1;
    b.className = 'kb-k' + (k.cls ? ' ' + k.cls : '');
    b.style.flex = (k.w || 1) + ' 1 0';
    if (k.icon) b.innerHTML = ICON[k.icon]; else b.textContent = k.l;
    b.setAttribute('aria-label', k.aria || k.l);
    b.__k = k;
    if (k.letter) letters.push(b);
    if (k.t === 'sh') shiftKeys.push(b);
    if (k.t === 'en') enKeys.push(b);
    parent.appendChild(b);
  }
  function mkRow(keys, cls, parent) {
    cls = cls || keys.cls;
    var r = document.createElement('div'); r.className = 'kb-r' + (cls ? ' ' + cls : '');
    r.style.setProperty('--ri', parent.children.length);                      // 行序号：切层时一行一行错开弹入
    keys.forEach(function (k) { mkKey(k, r); });
    parent.appendChild(r);
  }
  function ensureBuilt() {
    if (built) return;
    built = true;
    var inn = document.createElement('div'); inn.className = 'kb-in';
    var bar = document.createElement('div'); bar.className = 'kb-bar';      // 符号胶囊：独立的一块，悬浮在键盘本体上方
    STRIP.forEach(function (k) { mkKey(k, bar); });
    var body = document.createElement('div'); body.className = 'kb-body';  // 键盘本体
    Object.keys(LAYERS).forEach(function (n) {
      var l = document.createElement('div'); l.className = 'kb-l ' + n;
      LAYERS[n].forEach(function (row) { mkRow(row, '', l); });
      body.appendChild(l);
    });
    inn.appendChild(bar); inn.appendChild(body);
    el.appendChild(inn);
    el.setAttribute('data-l', layer);
    renderShift(); sync();
  }

  /* ---------- 文字操作：统一走 setRangeText + input 事件，这样 autosize / updateSug / hIdx 重置都走输入框原有的路径 ---------- */
  function fireInput() { ctx.input.dispatchEvent(new Event('input', { bubbles: true })); }
  function fireKey(key) { ctx.input.dispatchEvent(new KeyboardEvent('keydown', { key: key, bubbles: true, cancelable: true })); }
  function ins(t) {
    var i = ctx.input, s = i.selectionStart, e = i.selectionEnd;
    if (s == null) { s = e = i.value.length; }
    i.setRangeText(t, s, e, 'end');
    fireInput();
    if (i.selectionEnd === i.value.length) i.scrollTop = i.scrollHeight;
  }
  /* 退格按「字」删：emoji / 组合字符 / 国旗不会删一半 */
  function isExt(cp) { return cp === 0xFE0F || cp === 0x20E3 || (cp >= 0x1F3FB && cp <= 0x1F3FF) || (cp >= 0x300 && cp <= 0x36F) || (cp >= 0xE0020 && cp <= 0xE007F); }
  function cpBefore(s, pos) {
    var c = s.charCodeAt(pos - 1);
    if (c >= 0xDC00 && c <= 0xDFFF && pos >= 2) { var h = s.charCodeAt(pos - 2); if (h >= 0xD800 && h <= 0xDBFF) return 2; }
    return 1;
  }
  function lastLen(s) {                                     // s 末尾那个「字」有几个 UTF-16 单元
    if (!s) return 0;
    if (SEG) { var last = 0; Array.from(SEG.segment(s)).forEach(function (x) { last = x.segment.length; }); return last || 1; }
    var pos = s.length - cpBefore(s, s.length);
    for (;;) {
      while (pos > 0 && isExt(s.codePointAt(pos))) pos -= cpBefore(s, pos);
      if (pos > 0 && s.charCodeAt(pos - 1) === 0x200D) { pos -= 1; if (pos > 0) pos -= cpBefore(s, pos); continue; }
      break;
    }
    var cp = s.codePointAt(pos);
    if (cp >= 0x1F1E6 && cp <= 0x1F1FF && pos >= 2) { var p2 = pos - cpBefore(s, pos); if (p2 >= 0 && s.codePointAt(p2) >= 0x1F1E6 && s.codePointAt(p2) <= 0x1F1FF) pos = p2; }
    return s.length - pos;
  }
  function firstLen(s) {
    if (!s) return 0;
    if (SEG) { var it = SEG.segment(s)[Symbol.iterator]().next(); return it.value ? it.value.segment.length : 1; }
    var n = s.codePointAt(0) > 0xFFFF ? 2 : 1;
    while (n < s.length && (isExt(s.codePointAt(n)) || s.charCodeAt(n) === 0x200D)) n += s.codePointAt(n) > 0xFFFF ? 2 : 1;
    return n;
  }
  function del() {
    var i = ctx.input, s = i.selectionStart, e = i.selectionEnd;
    if (s !== e) i.setRangeText('', s, e, 'end');
    else if (s > 0) { var n = lastLen(i.value.slice(Math.max(0, s - 64), s)) || 1; i.setRangeText('', s - n, s, 'end'); }
    else return false;
    fireInput();
    return true;
  }
  function lineStart(v, pos) { return pos <= 0 ? 0 : v.lastIndexOf('\n', pos - 1) + 1; }
  function arrow(d) {
    var i = ctx.input, v = i.value, s = i.selectionStart, e = i.selectionEnd, p = s, moved = true;
    if (d === 'L') p = s !== e ? s : Math.max(0, s - lastLen(v.slice(Math.max(0, s - 64), s)));
    else if (d === 'R') p = s !== e ? e : Math.min(v.length, e + firstLen(v.slice(e, e + 64)));
    else if (d === 'H') p = lineStart(v, s);
    else if (d === 'E') { var nb = v.indexOf('\n', e); p = nb < 0 ? v.length : nb; }
    else if (v.indexOf('\n') < 0) { fireKey(d === 'U' ? 'ArrowUp' : 'ArrowDown'); return true; }   // 单行：交给输入框原有的历史翻页
    else {
      var ls = lineStart(v, s), col = s - ls;
      if (d === 'U') { if (ls === 0) p = 0; else { var pe = ls - 1, ps = lineStart(v, pe); p = Math.min(ps + col, pe); } }
      else { var nx = v.indexOf('\n', s); if (nx < 0) p = v.length; else { var ns = nx + 1, ne = v.indexOf('\n', ns); if (ne < 0) ne = v.length; p = Math.min(ns + col, ne); } }
    }
    try { i.setSelectionRange(p, p); } catch (_) { moved = false; }
    return moved && p !== s;
  }

  /* ---------- 按键分发 ---------- */
  function keepFocus() {
    var i = ctx.input;
    if (document.activeElement !== i) { try { i.focus({ preventScroll: true }); } catch (_) { i.focus(); } }
  }
  function press(k) {
    if (!enabled() || !open) return false;
    keepFocus();
    switch (k.t) {
      case 'c':
        ins(k.letter && shift ? k.v.toUpperCase() : k.v);
        if (shift === 1) { shift = 0; renderShift(); }
        return true;
      case 'sp': ins(' '); return true;
      case 'tab': fireKey('Tab'); return true;                               // 走输入框原有的 tabComplete
      case 'bs': return del();
      case 'sh': toggleShift(); return true;
      case 'en':
        if (ctx.isMulti()) ins('\n');                                         // 多行：合成事件不会插入换行，必须自己插
        else fireKey('Enter');                                                // 单行：走输入框原有的 submit()
        return true;
      case 'lay': setLayer(k.v); return true;
      case 'hide': hide(); return true;                                       // 只收起，不 blur，光标不丢
      case 'arr': return arrow(k.v);
      case 'clr': ctx.input.value = ''; fireInput(); return true;
    }
    return false;
  }
  function toggleShift() {
    var now = Date.now();
    if (shift === 0) shift = 1;
    else if (shift === 1) shift = (now - shiftT < 350) ? 2 : 0;               // 连点两下 = 锁定大写
    else shift = 0;
    shiftT = now; renderShift();
  }
  function renderShift() {
    letters.forEach(function (b) { b.textContent = shift ? b.__k.v.toUpperCase() : b.__k.v; });
    shiftKeys.forEach(function (b) { b.classList.toggle('on', shift > 0); b.innerHTML = shift === 2 ? svg('<path d="M12 4l8 9h-5v7H9v-7H4z"/><path d="M9 23h6"/>', true) : ICON.shift; });
  }
  function setLayer(n) { layer = n; if (el) el.setAttribute('data-l', n); }
  function sync() {                                                           // 多行 / 单行切换后：回车键只有单行时才是「执行」色
    if (!ctx) return;
    var m = ctx.isMulti();
    enKeys.forEach(function (b) { b.classList.toggle('en', !m); b.innerHTML = m ? ICON.ret : ICON.up; });
    var s = ctx.root.querySelector('[data-act="kb"]');
    if (s) s.setAttribute('aria-checked', String(featureOn()));
    var hb = ctx.root.querySelector('#cmKbH');
    if (hb) hb.textContent = (customH() ? '' : '自动 ') + bodyH();
  }

  /* ---------- 显示 / 收起（只动自带键盘的高度 0→H，不 blur） ---------- */
  function nt() {                                                             // 切换键盘类型时要「瞬间」到位，不做动画
    ctx.root.classList.add('kbnt'); clearTimeout(ntT);
    ntT = setTimeout(function () { ctx.root.classList.remove('kbnt'); }, 340);
  }
  function layout() { el.classList.toggle('land', land()); el.style.setProperty('--kb-h', kbH() + 'px'); }
  function follow(ms) {                                                       // 动画期间逐帧让输出区继续贴底
    var t0 = Date.now(); cancelAnimationFrame(folT);
    (function tick() { ctx.keep(); if (Date.now() - t0 < ms + 80) folT = requestAnimationFrame(tick); })();
  }
  function setOpen(b, instant) {
    if (instant) nt();
    else { var ms = Math.round(dur()); ctx.root.style.setProperty('--kb-dur', ms + 'ms'); ctx.rzMotion(ms); follow(ms); }
    if (b) layout();
    open = b;
    ctx.root.classList.toggle('kbo', b);
    el.classList.toggle('open', b);
    if (instant) { void el.offsetHeight; ctx.keep(); }
    if (!b) stopAll();
  }
  function show() { if (enabled() && !open) setOpen(true, false); }
  function hide() { if (open) setOpen(false, false); }

  /* ---------- 按键事件：pointerdown 就触发（快），preventDefault 防止输入框失焦 / 丢光标；退格等可长按连发 ---------- */
  var downs = {};
  /* 按下字母 / 符号键时，键上方弹出放大的预览气泡（和系统键盘一样；横屏、胶囊里的键不弹） */
  var pop = null;
  function showPop(b, k) {
    if (k.t !== 'c' || b.closest('.kb-bar') || el.classList.contains('land')) return;
    if (!pop) { pop = document.createElement('div'); pop.className = 'kb-pop'; el.appendChild(pop); }
    var r = b.getBoundingClientRect(), e = el.getBoundingClientRect();
    var w = Math.round(r.width * 1.5), h = Math.round(r.height * 1.25);
    var left = Math.max(4, Math.min(e.width - w - 4, r.left - e.left - (w - r.width) / 2));
    var top = Math.max(0, r.top - e.top - h - 4);
    pop.style.cssText = 'width:' + w + 'px;height:' + h + 'px;left:' + left + 'px;top:' + top + 'px';
    pop.textContent = b.textContent; pop.classList.add('on');
  }
  function hidePop() { if (pop) pop.classList.remove('on'); }
  function stopOne(st) { clearTimeout(st.t1); clearInterval(st.t2); st.b.classList.remove('dn'); hidePop(); }
  function stopAll() { Object.keys(downs).forEach(function (id) { stopOne(downs[id]); delete downs[id]; }); }
  function onDown(e) {
    var b = e.target.closest && e.target.closest('.kb-k');
    if (!b) return;
    e.preventDefault();
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    var k = b.__k, st = { b: b, t1: 0, t2: 0 };
    downs[e.pointerId] = st;
    b.classList.add('dn');
    press(k);
    showPop(b, k);
    if (k.rep) {
      st.t1 = setTimeout(function () {
        var n = 0;
        st.t2 = setInterval(function () {
          if (!press(k)) { clearInterval(st.t2); return; }
          if (++n === 10) { clearInterval(st.t2); st.t2 = setInterval(function () { if (!press(k)) clearInterval(st.t2); }, 36); }
        }, 55);
      }, 380);
    }
  }
  function onUp(e) { var st = downs[e.pointerId]; if (!st) return; stopOne(st); delete downs[e.pointerId]; }

  /* ---------- ⌨ / 🌐：同一个按键里完成 inputmode 改动 + blur + focus ---------- */
  function swFlag() {
    window.__kbSwitching = true; swAt = Date.now(); clearTimeout(swT);
    swT = setTimeout(function () { window.__kbSwitching = false; }, 300);
  }
  function applyAttrs() {
    var on = featureOn(), cu = on && mode === 'custom', r = ctx.root;
    r.classList.toggle('kbx', on);
    r.classList.toggle('custkb', cu);
    if (cu) { ensureBuilt(); ctx.input.setAttribute('inputmode', 'none'); layout(); }
    else if (on) ctx.input.setAttribute('inputmode', 'text');
    else ctx.input.removeAttribute('inputmode');
    if (!cu) { open = false; r.classList.remove('kbo'); el.classList.remove('open'); stopAll(); }
    syncSw(); sync();
  }
  function syncSw() {
    if (!sw) return;
    var c = mode === 'custom';
    sw.innerHTML = c ? ICON.globe : ICON.kbd;
    sw.setAttribute('aria-label', c ? '切换到系统键盘（中文输入）' : '切换回自带键盘');
  }
  function refocus() {
    var i = ctx.input; i.blur();
    try { i.focus({ preventScroll: true }); } catch (_) { i.focus(); }
  }
  function toSystem() {
    swFlag(); nt();
    mode = 'system'; applyAttrs();            // 先改 inputmode 再 blur/focus，系统键盘才会弹出来
    refocus();                                // focus 监听这时已不再 return，旧的避让逻辑接手
  }
  function toCustom() {
    swFlag(); nt();
    mode = 'custom'; applyAttrs();
    ctx.releaseOld();                         // 去掉系统键盘避让留下的窗口尺寸
    setOpen(true, true);                      // 自带键盘瞬间就位，正好在系统键盘收起的位置下面
    refocus();                                // 收系统键盘；inputmode=none，不会再弹
  }
  function toggleMode() { if (!active()) return; if (mode === 'custom') toSystem(); else toCustom(); }

  /* 兜底：iOS < 16.4 / 部分 WebView 下 inputmode=none 仍会弹系统键盘 —— 自带键盘收起，改走系统键盘的避让，不叠两个键盘 */
  function onVV() {
    if (!ctx || !vv) return;
    clearTimeout(fbT);
    fbT = setTimeout(function () {
      if (!isVisible() || window.__kbSwitching || Date.now() - swAt < 800) return;
      var baseH = ctx.fullH();
      if ((baseH - Math.round(vv.height)) > baseH * 0.2) {
        mode = 'system'; swFlag(); nt();
        applyAttrs();
        ctx.toSystem();
      }
    }, 120);
  }

  /* ---------- 对外 ---------- */
  function mount(c) {
    if (ctx) return;
    ctx = c;
    el = document.createElement('div');
    el.id = 'cmKb'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', '自带键盘');
    (ctx.panel.parentNode || ctx.panel).appendChild(el);                   // 挂在 cm-card 里、窗口下面，和窗口是两块；之前挂在窗口里面，背景才会粘在一起
    sw = document.createElement('button');
    sw.type = 'button'; sw.className = 'cm-kbsw';
    ctx.field.appendChild(sw);
    sw.addEventListener('pointerdown', function (e) { e.preventDefault(); });
    sw.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); toggleMode(); });
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
    ctx.input.addEventListener('focus', function () { if (enabled()) show(); });
    ctx.input.addEventListener('click', function () { if (enabled()) show(); });      // 已聚焦但收起了：再点输入框展开
    window.addEventListener('resize', function () { if (active() && built) layout(); });
    window.addEventListener('orientationchange', function () { setTimeout(function () { if (active() && built) layout(); }, 300); });
    if (vv) vv.addEventListener('resize', onVV);
    applyAttrs();
  }
  function setHeight(n) {                                                     // n = 键盘本体高度（px）；0 / 'auto' = 自动
    n = Math.round(parseFloat(n));
    var key = land() ? 'dev_kb_h_l' : 'dev_kb_h';
    if (n > 0) lsSet(key, String(Math.max(land() ? 110 : 160, n)));
    else { try { localStorage.removeItem(key); } catch (_) {} }
    if (active() && built) layout();
    if (enabled() && ctx) show();                                            // 改完立刻展开，当场看效果
    sync();
    return bodyH();
  }
  function setFeature(b) {
    if (!ctx) return;
    var had = document.activeElement === ctx.input;
    lsSet('cmd_kb', b ? '1' : '0');
    mode = 'custom';
    applyAttrs();
    if (b) ctx.releaseOld();
    if (had) ctx.input.blur();
    ctx.keep();
  }
  window.__cmKb = {
    mount: mount, enabled: enabled, featureOn: featureOn, isVisible: isVisible, show: show, hide: hide, sync: sync,
    setFeature: setFeature, toggleMode: toggleMode, height: kbH, bodyHeight: bodyH, setHeight: setHeight,
    onOpen: function () { if (!ctx) return; setLayer('abc'); shift = 0; if (built) renderShift(); if (active()) { open = false; ctx.root.classList.remove('kbo'); el.classList.remove('open'); nt(); } },
    focusInput: function () {
      var i = ctx.input;
      try { i.focus({ preventScroll: true }); } catch (_) { i.focus(); }
      var n = i.value.length; try { i.setSelectionRange(n, n); } catch (_) {}
    }
  };

  // cmd-console.js 已经建好了窗口（先于本文件跑完 build）：直接接上
  if (typeof window.__cmKbCtx === 'function') { var c0 = window.__cmKbCtx(); if (c0) mount(c0); }

  // /kb on|off|status
  if (window.CmdConsole && CmdConsole.register) {
    CmdConsole.register('kb', {
      group: '外观', desc: '自带键盘（手机上代替系统键盘）：开 / 关 / 查看状态', usage: '/kb [on|off]',
      complete: function (tk) { return tk.length ? [] : ['on', 'off']; },
      run: function (a) {
        var x = (a[0] || '').toLowerCase();
        if (x === 'on' || x === 'off') { setFeature(x === 'on'); return '自带键盘：' + (x === 'on' ? '开' : '关'); }
        if (x) throw new Error('用法：/kb [on|off]');
        return '自带键盘：' + (featureOn() ? '开（当前 ' + (mode === 'custom' ? '自带' : '系统') + '键盘）' : '关') + '    键盘高度 ' + bodyH() + 'px' + (customH() ? '' : '（自动）') + ' + 胶囊 ' + barH() + 'px（' + (land() ? '横屏' : '竖屏') + '）';
      }
    });
    CmdConsole.register('kbh', {
      group: '外观', desc: '自带键盘高度（键盘本体，不含上面的符号胶囊；竖屏 / 横屏分开记）：数字 = 像素，auto = 自动', usage: '/kbh [像素|auto]',
      complete: function (tk) { return tk.length ? [] : ['auto', '300', '320', '340']; },
      run: function (a) {
        var x = (a[0] || '').toLowerCase();
        if (!x) return '键盘高度 ' + bodyH() + 'px' + (customH() ? '' : '（自动）') + '（' + (land() ? '横屏 dev_kb_h_l' : '竖屏 dev_kb_h') + '）';
        if (x === 'auto' || x === '0') { setHeight(0); return '键盘高度：自动 ' + bodyH() + 'px'; }
        if (!(parseFloat(x) > 0)) throw new Error('用法：/kbh [像素|auto]');
        return '键盘高度：' + setHeight(x) + 'px';
      }
    });
  }
})();
