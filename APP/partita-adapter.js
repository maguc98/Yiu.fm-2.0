/* PartitaAdapter：纯净版，完全不包含假数据，只对接真实播放器 */
(function () {
  'use strict';

  var root = null;
  var active = false;
  var currentTimeObj = null;
  var lastLines = [];
  var lineIndex = -1;
  var hostEl = null;
  var VERSION = 'adapter-v8-pure';
  var Boundary = null;
  var errHooked = false;
  var stylesInjected = false;

  var defaultTheme = {
    primaryColor: '#ffffff', secondaryColor: '#8899ff', accentColor: '#ffff00',
    backgroundColor: '#000000', textColor: '#ffffff', animationIntensity: 'normal'
  };
  var defaultTuning = { staggerMin: 40, staggerMax: 120, showGuideLines: true, useSemanticLayout: true };

  /* ---- 可调参数：只包含 P1.js 引擎真正读取的字段，由「动效细节 → 云阶」面板实时修改，并记在 localStorage ---- */
  var DEFAULT_CFG = {
    primaryColor: '#d9d9d9',      // 还没唱到 / 已唱过的字的颜色
    secondaryColor: '#9aa0a6',    // 空歌词占位字的颜色
    accentColor: '#8fe388',       // 正在唱的字的颜色和辉光
    animationIntensity: 'calm',   // calm（整齐，原版的样子）| normal（带随机缩放和旋转，容易重叠）| chaotic
    fontStyle: 'sans',            // sans | serif | mono
    fontWeight: 700,              // 100–900
    staggerMin: 20, staggerMax: 100,   // 引擎只接受 0–180
    showGuideLines: true, useSemanticLayout: true,
    showText: true, lyricsFontScale: 1
  };
  var lastExtDriveAt = 0;
  var fitByLine = {}, fitPass = {}, fitTimer = 0;   // 每句歌词的「防出屏」修正：{k: 字号倍率, cap: 左右错位上限(px)}
  var fontComp = 1;   // 低分辨率模式下，如果浏览器没有把 vw 一起缩小，用它补偿字号
  var resTimer = 0;

  /* ---- 全局渲染分辨率（开发者选项）：整块云阶按比例缩小排版，再整体放大回来，降低渲染负担 ---- */
  function readMul() {
    var m = parseFloat(window.__renderResMul);
    return (m >= 0.25 && m < 1) ? m : 1;
  }
  function applyRes() {
    if (!hostEl) return;
    var m = readMul();
    if (resTimer) { cancelAnimationFrame(resTimer); resTimer = 0; }
    if (m === 1) {
      hostEl.style.width = '100%'; hostEl.style.height = '100%';
      hostEl.style.zoom = ''; hostEl.style.transform = ''; hostEl.style.transformOrigin = '';
      hostEl.style.willChange = ''; hostEl.style.opacity = '';
      fontComp = 1;
      return;
    }
    hostEl.style.width = (m * 100) + '%'; hostEl.style.height = (m * 100) + '%';
    hostEl.style.zoom = String(m);
    hostEl.style.transformOrigin = '0 0';
    hostEl.style.willChange = 'transform';
    hostEl.style.transform = '';
    hostEl.style.opacity = '0.01';
    // 探测 vw 有没有跟着 zoom 一起缩小；没有的话字号需要自己乘上比例
    var comp = 1;
    try {
      var pr = document.createElement('div');
      pr.style.cssText = 'position:absolute;left:0;top:0;width:100vw;height:1px;visibility:hidden;pointer-events:none';
      hostEl.appendChild(pr);
      var w = pr.getBoundingClientRect().width, iw = window.innerWidth;
      hostEl.removeChild(pr);
      if (w > 0 && iw > 0) comp = (w < iw * (1 + m) / 2) ? 1 : m;
    } catch (_) {}
    fontComp = comp;
    // 先以原尺寸画一帧，再放大：这样浏览器会按小尺寸栅格化（画面变糊、更省电）
    var n = 0;
    (function step() {
      if (++n < 3) { resTimer = requestAnimationFrame(step); return; }
      resTimer = 0;
      if (!hostEl || readMul() !== m) return;
      hostEl.style.transform = 'scale(' + (1 / m) + ')';
      hostEl.style.opacity = '';
    })();
  }
  var CFG_KEY = 'partitaCfgV3';
  var cfg = (function () {
    var c = {}, k;
    for (k in DEFAULT_CFG) c[k] = DEFAULT_CFG[k];
    try {
      var sv = JSON.parse(localStorage.getItem(CFG_KEY) || 'null');
      if (sv && typeof sv === 'object') for (k in DEFAULT_CFG) if (sv[k] !== undefined && typeof sv[k] === typeof DEFAULT_CFG[k]) c[k] = sv[k];
    } catch (_) {}
    return c;
  })();
  function saveCfg() { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (_) {} }
  function applyVars() {
    // 容器保持透明，让 App 自己的背景透出来
    if (hostEl) hostEl.style.backgroundColor = 'transparent';
  }
  function tuningFor(idx) {
    var t = tuningFromCfg(), f = fitByLine[idx];
    if (f && typeof f.cap === 'number') {
      t.staggerMax = Math.min(t.staggerMax, f.cap);
      t.staggerMin = Math.min(t.staggerMin, t.staggerMax);
    }
    return t;
  }
  // 防止文字落到屏幕外：这一句渲染出来后量一下最宽的一行，
  // 放不下就先收窄左右错位，还不够再整体缩小字号（每句最多修正 3 次）
  function scheduleFit(idx) {
    if (fitTimer) clearTimeout(fitTimer);
    fitTimer = setTimeout(function () { fitTimer = 0; measureFit(idx); }, 80);
  }
  function measureFit(idx) {
    if (!active || !hostEl || idx !== lineIndex || idx < 0) return;
    var pass = fitPass[idx] || 0;
    if (pass >= 3) return;
    var core = hostEl.querySelector('.partita-core');
    var rows = hostEl.querySelectorAll('.partita-core .inline-flex');
    if (!core || !rows.length) return;
    var W = core.offsetWidth, mx = 0;
    for (var i = 0; i < rows.length; i++) mx = Math.max(mx, rows[i].offsetWidth);
    if (!W || !mx) return;
    var avail = W - 28, f = fitByLine[idx] || { k: 1 };
    var tun = tuningFor(idx);
    var need = tun.staggerMax;                       // 当前允许的最大错位
    var nf;
    if (mx > avail) nf = { k: (f.k || 1) * (avail / mx) * 0.97, cap: 0 };
    else {
      var cap = Math.floor((avail - mx) / 2);
      if (cap >= need) return;                       // 已经放得下
      nf = { k: f.k || 1, cap: Math.max(0, cap) };
    }
    fitByLine[idx] = nf; fitPass[idx] = pass + 1;
    PartitaAdapter._render();
  }
  function themeFromCfg() {
    return {
      primaryColor: cfg.primaryColor, secondaryColor: cfg.secondaryColor, accentColor: cfg.accentColor,
      animationIntensity: cfg.animationIntensity, fontStyle: cfg.fontStyle, fontWeight: cfg.fontWeight
    };
  }
  function tuningFromCfg() {
    var mn = Math.min(cfg.staggerMin, cfg.staggerMax), mx = Math.max(cfg.staggerMin, cfg.staggerMax);
    return { staggerMin: mn, staggerMax: mx, showGuideLines: cfg.showGuideLines, useSemanticLayout: cfg.useSemanticLayout };
  }

  // 注入云阶用到的 Tailwind 工具类（App 里没有 Tailwind，这里手写等价规则，不做任何强制覆盖）
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var R = [
      ['relative', 'position:relative'], ['absolute', 'position:absolute'], ['inset-0', 'inset:0'],
      ['top-1\\/2', 'top:50%'], ['left-1\\/2', 'left:50%'],
      ['z-0', 'z-index:0'], ['z-10', 'z-index:10'],
      ['block', 'display:block'], ['inline-block', 'display:inline-block'], ['inline-flex', 'display:inline-flex'], ['flex', 'display:flex'],
      ['flex-row', 'flex-direction:row'], ['flex-col', 'flex-direction:column'], ['flex-row-reverse', 'flex-direction:row-reverse'],
      ['items-center', 'align-items:center'], ['items-stretch', 'align-items:stretch'],
      ['justify-center', 'justify-content:center'], ['justify-start', 'justify-content:flex-start'],
      ['w-full', 'width:100%'], ['h-full', 'height:100%'], ['h-px', 'height:1px'], ['w-px', 'width:1px'],
      ['h-\\[70vh\\]', 'height:70%'], ['h-\\[150\\%\\]', 'height:150%'], ['aspect-square', 'aspect-ratio:1/1'],
      ['max-w-5xl', 'max-width:64rem'], ['min-h-\\[24rem\\]', 'min-height:24rem'], ['min-w-\\[3\\.8rem\\]', 'min-width:3.8rem'],
      ['p-8', 'padding:2rem'], ['px-3', 'padding-left:.75rem;padding-right:.75rem'],
      ['overflow-hidden', 'overflow:hidden'], ['rounded-full', 'border-radius:9999px'], ['border-1', 'border-width:1px;border-style:solid'],
      ['pointer-events-none', 'pointer-events:none'], ['select-none', '-webkit-user-select:none;user-select:none'],
      ['will-change-transform', 'will-change:transform'], ['origin-center', 'transform-origin:center'],
      ['whitespace-nowrap', 'white-space:nowrap'], ['whitespace-pre-wrap', 'white-space:pre-wrap'],
      ['text-center', 'text-align:center'], ['text-2xl', 'font-size:1.5rem;line-height:2rem'], ['opacity-50', 'opacity:.5']
    ];
    var out = '.partita-core,.partita-core *,.partita-core *::before,.partita-core *::after{box-sizing:border-box;border:0 solid;margin:0;padding:0}\n';
    R.forEach(function (r) { out += '.partita-core .' + r[0] + ',.partita-core.' + r[0] + '{' + r[1] + '}\n'; });
    out += '.partita-core .-translate-x-1\\/2.-translate-y-1\\/2{translate:-50% -50%}\n';
    var css = document.createElement('style');
    css.id = 'partita-core-tailwind-subset';
    css.textContent = out;
    document.head.appendChild(css);
  }

  function fmtErr(e) {
    if (!e) return 'unknown';
    var m = (e && e.message) ? e.message : String(e);
    return m.slice(0, 200);
  }

  function hookGlobalErrors() {
    if (errHooked) return;
    errHooked = true;
    window.addEventListener('error', function (ev) { console.warn('[Partita]', ev.error || ev.message); });
  }

  function getBoundary(React) {
    if (Boundary) return Boundary;
    function B(props) { React.Component.call(this, props); this.state = { err: null }; }
    B.prototype = Object.create(React.Component.prototype);
    B.prototype.constructor = B;
    B.getDerivedStateFromError = function (e) { return { err: fmtErr(e) }; };
    B.prototype.componentDidCatch = function (e) { console.error('Partita render error:', e); };
    B.prototype.render = function () {
      if (this.state.err) return React.createElement('pre', { style: { color: '#f66', padding: '20px' } }, 'Error: ' + this.state.err);
      return this.props.children;
    };
    Boundary = B;
    return B;
  }

  function findIndex(ct) {
    var r = -1;
    for (var i = 0; i < lastLines.length; i++) {
      if (lastLines[i].startTime <= ct) r = i; else break;
    }
    return r;
  }

  var PartitaAdapter = {
    init: function (host, opts) {
      var P = window.Partita;
      if (!P || !P.default) { console.warn('❌ 没找到 window.Partita.default'); return; }

      injectStyles();
      hookGlobalErrors();
      active = false;
      hostEl = host;
      lineIndex = -1;
      lastLines = []; // 初始化时保证是空的

      if (host) {
        host.innerHTML = '';
        host.style.width = '100%';
        host.style.height = '100%';
        host.style.display = 'block';
        host.style.overflow = 'hidden';
        host.style.backgroundColor = 'transparent';
      }
      applyVars();

      currentTimeObj = P.FramerMotion.motionValue(0);
      
      var rootEl = document.createElement('div');
      rootEl.style.cssText = 'width:100%; height:100%;';
      host.appendChild(rootEl);
      
      try {
        root = P.ReactDOM.createRoot(rootEl);
      } catch (e) {
        console.error('Partita init error:', e);
      }
    },

    show: function () {
      active = true;
      if (hostEl) hostEl.style.display = 'block';
      applyVars();
      applyRes();
      if (!lastLines.length && window.LN && window.LN.length) this.loadLyrics(window.TS || [], window.WT || [], window.LN);
      this._render();
      return Promise.resolve();
    },

    hide: function () {
      active = false;
      if (hostEl) hostEl.style.display = 'none';
    },

    _render: function () {
      if (!root || !window.Partita || !active) return;
      try {
        var P = window.Partita;
        var React = P.React;

        // 只传真实数据，如果没有歌词，lineIndex 就是 -1，它会自动显示“等待音乐”
        var props = {
          currentTime: currentTimeObj,
          currentLineIndex: lineIndex,
          lines: lastLines, 
          theme: themeFromCfg(),
          partitaTuning: tuningFor(lineIndex),
          showText: cfg.showText,
          lyricsFontScale: cfg.lyricsFontScale * fontComp * ((fitByLine[lineIndex] && fitByLine[lineIndex].k) || 1)
        };
        
        var B = getBoundary(React);
        root.render(React.createElement(B, null, React.createElement(P.default, props)));
        scheduleFit(lineIndex);
      } catch (e) {
        console.error('Partita render error:', e);
      }
    },

    // 时间输入：可能同时有多个来源（播放器主循环、partita-connect 备用时钟）。
    // 为避免两个时钟互相拉扯造成文字抽搐：① 主循环在喂数据时，备用时钟自动让位；② 小幅回退的时间戳直接忽略。
    drive: function (ct, fromFallback) {
      if (!active || !currentTimeObj) return;
      try {
        var now = (window.performance && performance.now) ? performance.now() : Date.now();
        if (fromFallback) {
          if (now - lastExtDriveAt < 300) return;
        } else {
          lastExtDriveAt = now;
        }
        if (typeof ct !== 'number' || !isFinite(ct)) return;
        var prev = currentTimeObj.get();
        if (ct < prev && prev - ct < 0.25) return;
        currentTimeObj.set(ct);
        var idx = findIndex(ct);
        if (idx !== lineIndex) {
          lineIndex = idx;
          this._render();
        }
      } catch (e) {}
    },

    // 外部播放器喂过来的真实数据
    loadLyrics: function (TS, WT, LN) {
      // 如果没收到数据，或者数据为空，就不处理
      if (!TS || !LN || LN.length === 0) {
          lastLines = [];
          lineIndex = -1;
          if (active) this._render();
          return;
      }

      var lines = [];
      for (var i = 0; i < LN.length; i++) {
        var text = String(LN[i] == null ? '' : LN[i]);
        var chars = Array.from(text);
        var wt = (WT && WT[i]) || [];
        var ls = TS[i] || 0;
        var le = TS[i + 1] != null ? TS[i + 1] : ls + 5;
        var per = chars.length ? (le - ls) / chars.length : 0;

        // player.js 的 WT 契约是「每个字的绝对开始秒数」，不是 [start,end] 元组。
        // 只有整行逐字时间完整、有限且单调时才采用真实时间；普通 LRC 继续走旧兼容回退。
        var hasWordTimes = Array.isArray(wt) && wt.length === chars.length;
        if (hasWordTimes) {
          var prevTime = -Infinity;
          for (var j = 0; j < wt.length; j++) {
            if (typeof wt[j] !== 'number' || !isFinite(wt[j]) || wt[j] < prevTime) {
              hasWordTimes = false;
              break;
            }
            prevTime = wt[j];
          }
        }

        var words = chars.map(function (ch, idx) {
          var s, e;
          if (hasWordTimes) {
            s = wt[idx];
            // 同一时间标签后的字符应同步出现；结束时间取下一个更晚的真实字时间。
            var next = idx + 1;
            while (next < wt.length && wt[next] <= s) next++;
            e = next < wt.length ? wt[next] : le;
            if (!(e > s)) e = s + 0.08;
          } else {
            // 无逐字时间的普通 LRC 保持既有兼容行为。
            s = ls + per * idx;
            e = ls + per * (idx + 1);
          }
          return { text: ch, startTime: s, endTime: e };
        });
        lines.push({ fullText: text, startTime: ls, endTime: le, words: words });
      }
      lastLines = lines;
      fitByLine = {}; fitPass = {};
      lineIndex = findIndex(currentTimeObj ? currentTimeObj.get() : 0);
      if (active) this._render();
    },

    destroy: function () {
      active = false;
      if (root) { try { root.unmount(); } catch (e) {} root = null; }
      if (hostEl) hostEl.innerHTML = '';
      // 彻底清空内存中的假数据和游标
      lastLines = [];
      lineIndex = -1;
    },

    // 开发者选项里的「渲染分辨率（全局）」改变时由 devtools.js 调用
    applyResMul: function () {
      applyRes(); fitByLine = {}; fitPass = {};
      if (active) this._render();
    },

    getConfig: function () { var o = {}, k; for (k in cfg) o[k] = cfg[k]; return o; },
    updateConfig: function (p) {
      if (!p) return;
      for (var k in p) if (k in DEFAULT_CFG && typeof p[k] === typeof DEFAULT_CFG[k]) cfg[k] = p[k];
      saveCfg(); applyVars(); fitByLine = {}; fitPass = {};
      if (active) this._render();
    },
    resetConfig: function () {
      for (var k in DEFAULT_CFG) cfg[k] = DEFAULT_CFG[k];
      saveCfg(); applyVars(); fitByLine = {}; fitPass = {};
      if (active) this._render();
    },

    isAlive: function () { return active || !!root; },
    isActive: function () { return active; },
    setSuspended: function (v) { this.hide(); },
    version: VERSION
  };

  window.PartitaAdapter = PartitaAdapter;
})();