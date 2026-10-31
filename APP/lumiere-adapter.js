(function () {
  'use strict';

  var runtime = null;
  var active = false;
  var inited = false;
  var readyP = null;
  var lastCt = null;
  var timeVal = null;
  var theme = null;
  var ac = null;
  var seq = 0;
  var loadTok = 0;   // 按需加载：destroy() 会让进行中的加载作废
  var songSeq = 0;
  var queued = null;
  var suspended = false;
  var pausedNow = false;
  var dprHold = 0;
  var dprDesc = null;
  var dprHad = false;

  var CFG_KEY = 'folia.lumiere.cfg';
  var DEFAULTS = {
    lightIntensity: 1, audioResponse: 1, fogDensity: 1, darkField: 0.75,
    moteAmount: 1, bloom: 1, textBloom: 1, unlitOpacity: 0.22,
    windowNeighbors: 2, decay: 1, echo: 1, fogOctaves: 5,
    lineArt: true, frontBokeh: true, trails: true, hideTrails: false,
    seamlessTransitions: false, overlayFrame: true, textOnly: false,
    keywordColors: true, themeIcons: true, themeColorMix: 0.3,
    renderQuality: 'full',
    resolution: 0
  };

  function mergeCfg(c, p) {
    if (!p || typeof p !== 'object') return;
    for (var k in DEFAULTS) {
      if (!Object.prototype.hasOwnProperty.call(p, k)) continue;
      var v = p[k];
      if (typeof v !== typeof DEFAULTS[k]) continue;
      if (typeof v === 'number' && !isFinite(v)) continue;
      if (k === 'renderQuality' && v !== 'full' && v !== 'balanced' && v !== 'low') continue;
      if (k === 'resolution' && v !== 0 && (v < 1 || v > 2)) continue;
      c[k] = v;
    }
  }

  function loadCfg() {
    var c = {};
    for (var k in DEFAULTS) c[k] = DEFAULTS[k];
    try {
      var raw = localStorage.getItem(CFG_KEY);
      if (raw) mergeCfg(c, JSON.parse(raw));
    } catch (e) {}
    return c;
  }

  var cfg = loadCfg();

  function saveCfg() {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  function tuningCopy() {
    var t = {};
    for (var k in cfg) if (k !== 'resolution') t[k] = cfg[k];
    return t;
  }

  // 全局渲染分辨率倍率（开发者选项里设置，localStorage 'qt_res_mul'；1 = 不缩放）。只在 <1 时才改动引擎参数，默认行为不变
  function resMul() {
    var m = window.__renderResMul;
    if (m == null) { try { m = parseFloat(localStorage.getItem('qt_res_mul')); } catch (_) { m = NaN; } }
    return (m >= 0.25 && m < 1) ? m : 1;
  }
  // 实际使用的分辨率：倍率为 1 时就是用户设置（0 = 自动，不覆盖）；<1 时在其基础上缩小（自动档按屏幕 DPR，最高 2×），下限 0.5
  function effRes() {
    var m = resMul();
    if (cfg.resolution > 0) return Math.max(0.5, cfg.resolution * m);
    if (m === 1) return 0;
    return Math.max(0.5, Math.min(2, window.devicePixelRatio || 1) * m);
  }

  function dprOn() {
    if (dprHold > 0) { dprHold++; return true; }    // 已经在覆盖中：只加计数
    var v = effRes();
    if (!(v > 0)) return false;
    dprHold = 1;
    try {
      dprDesc = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
      dprHad = !!dprDesc;
      Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: function () { return v; } });
    } catch (e) {
      dprHold = 0;
      return false;
    }
    return true;
  }

  function dprOff() {
    if (dprHold <= 0) return;
    if (--dprHold > 0) return;
    try {
      if (dprHad && dprDesc) Object.defineProperty(window, 'devicePixelRatio', dprDesc);
      else delete window.devicePixelRatio;
    } catch (e) {}
  }

  function withDpr(fn) {
    var took = dprOn();
    try { return fn(); } finally { if (took) dprOff(); }
  }

  function wrapResize(rt) {
    if (typeof rt.resizeToHost !== 'function') return;
    var orig = rt.resizeToHost;
    rt.resizeToHost = function (t) {
      var self = this;
      return withDpr(function () { return orig.call(self, t); });
    };
  }

  function applyResolution() {
    if (!runtime || typeof runtime.resizeToHost !== 'function') return;
    try { runtime.resizeToHost(false); } catch (e) { console.error('resize failed', e); }
  }

  function syncPause() {
    if (!runtime || typeof runtime.setPaused !== 'function') return;
    var want = !active || suspended;
    if (want === pausedNow) return;
    pausedNow = want;
    try { runtime.setPaused(want); } catch (e) { console.error('setPaused failed', e); }
  }

  function pushTuning() {
    if (runtime && typeof runtime.setTuning === 'function') {
      try { runtime.setTuning(tuningCopy()); } catch (e) { console.error('setTuning failed', e); }
    }
  }

  function createTimeValue(initial) {
    var v = initial;
    var prev = initial;
    var listeners = [];
    function set(n) {
      prev = v;
      v = n;
      for (var i = 0; i < listeners.length; i++) listeners[i](v);
    }
    return {
      get: function () { return v; },
      getPrevious: function () { return prev; },
      getVelocity: function () { return 0; },
      set: set,
      jump: set,
      on: function (event, callback) {
        if (event !== 'change') return function () {};
        listeners.push(callback);
        return function () {
          var i = listeners.indexOf(callback);
          if (i >= 0) listeners.splice(i, 1);
        };
      },
      off: function (event, callback) {
        var i = listeners.indexOf(callback);
        if (i >= 0) listeners.splice(i, 1);
      }
    };
  }

  function validPair(t) {
    return !!t && typeof t[0] === 'number' && isFinite(t[0]);
  }

  function buildLines(TS, WT, LN) {
    var lines = [];
    for (var i = 0; i < LN.length; i++) {
      var text = String(LN[i] == null ? '' : LN[i]);
      var chars = Array.from(text);
      var wt = (WT && WT[i]) || [];
      var start = TS[i] || 0;
      var end = TS[i + 1] || start + 5;
      if (end <= start) end = start + 2;
      var any = false;
      for (var k = 0; k < chars.length; k++) {
        if (validPair(wt[k])) { any = true; break; }
      }
      var words = [];
      if (any) {
        var last = start;
        for (var c = 0; c < chars.length; c++) {
          var t = wt[c];
          var ws;
          var we;
          if (validPair(t)) {
            ws = t[0];
            we = typeof t[1] === 'number' && isFinite(t[1]) && t[1] >= ws ? t[1] : ws;
          } else {
            ws = last;
            we = last;
          }
          last = we;
          words.push({ text: chars[c], startTime: ws, endTime: we });
        }
      }
      lines.push({
        fullText: text,
        startTime: start,
        endTime: end,
        words: words
      });
    }
    return lines;
  }

  function tr(msg) {
    try { if (window.__lumLog) window.__lumLog(msg); } catch (e) {}
  }

  function compile(R, lines, seed) {
    var copts = R.resolveLumiereCompileOptions ? R.resolveLumiereCompileOptions({ seamlessTransitions: cfg.seamlessTransitions === true }) : {};
    var program = R.compileLumiereProgram ? R.compileLumiereProgram(lines, seed, {}, copts) : null;
    return { seed: seed, program: program, theme: theme };
  }

  function fromGlobals() {
    try {
      var ln = window.LN;
      if (ln && ln.length) return { TS: window.TS || [], WT: window.WT, LN: ln };
    } catch (e) {}
    return null;
  }

  function applyLyrics(q, immediate) {
    try {
      var R = window.LumiereRuntime;
      if (!runtime || !R || typeof runtime.swapSong !== 'function') {
        tr('apply skip no swapSong');
        return;
      }
      var lines = buildLines(q.TS, q.WT, q.LN);
      var chars = 0;
      for (var i = 0; i < lines.length; i++) chars += lines[i].words.length;
      var nowt = 0;
      for (var n = 0; n < lines.length; n++) if (lines[n].words.length === 0 && lines[n].fullText) nowt++;
      tr('apply lines=' + lines.length + ' chars=' + chars + ' nowt=' + nowt + (immediate ? ' first' : ''));
      if (!lines.length) {
        tr('apply skip empty');
        return;
      }
      var t0 = Date.now();
      var song = compile(R, lines, 'song-' + (++songSeq));
      tr('compiled ms=' + (Date.now() - t0));
      var sig = ac ? ac.signal : undefined;
      if (immediate) {
        var quick = new AbortController();
        quick.abort();
        sig = quick.signal;
      }
      tr('swap start');
      var p = runtime.swapSong(song, sig);
      if (p && typeof p.then === 'function') {
        p.then(function () { tr('swap done'); }, function (e) {
          tr('swap fail ' + (e && e.message));
          console.error('swapSong failed', e);
        });
      } else {
        tr('swap sync done');
      }
    } catch (e) {
      tr('apply threw ' + (e && e.message));
      console.error('applyLyrics threw', e);
    }
  }

  var LumiereAdapter = {
    init: function (host, opts) {
      opts = opts || {};
      var R = window.LumiereRuntime;
      if (!R || !R.LumierePixiRuntime) {
        if (window.__EngineLoader && !opts.__loaded) {
          // 按需加载：先占位（isAlive / whenReady 照常等待），脚本到位后再走一遍完整 init
          var self = this, host0 = host;
          this.destroy();
          var my = ++loadTok;
          inited = true; active = true;
          var gate;
          readyP = new Promise(function (r) { gate = r; });
          window.__EngineLoader.load('lumiere').then(function () {
            if (my !== loadTok) { gate(); return; }          // 加载期间被 destroy
            inited = false; active = false;
            var o2 = {}; for (var k in opts) o2[k] = opts[k]; o2.__loaded = true;
            var old = readyP;
            self.init(host0, o2);                            // 内部会换一个新的 readyP
            var nr = readyP; if (nr && nr !== old) nr.then(gate, gate); else gate();
          }, function (e) {
            console.error('lumiere 引擎脚本加载失败', e);
            if (my === loadTok) { inited = false; active = false; }
            gate();
          });
          return null;
        }
        console.warn('LumiereRuntime missing');
        return null;
      }

      this.destroy();
      active = true;
      inited = true;
      var done;
      readyP = new Promise(function (r) { done = r; });
      var mine = ++seq;
      ac = new AbortController();
      var signal = ac.signal;
      timeVal = createTimeValue(0);
      lastCt = null;
      theme = opts.theme || {
        primaryColor: '#ffffff',
        textColor: '#ffffff',
        backgroundColor: '#000000',
        lyricsIcons: []
      };

      var testLine = {
        fullText: 'test',
        startTime: 0,
        endTime: 5,
        words: [{ text: 'test', startTime: 0, endTime: 5 }]
      };
      var songContext = compile(R, [testLine], 'test-seed');
      var tv = timeVal;

      var tookDpr = dprOn();
      var relDpr = function () {
        if (tookDpr) { tookDpr = false; dprOff(); }
      };
      R.LumierePixiRuntime.create({
        host: host,
        song: songContext,
        tuning: tuningCopy(),
        currentTime: tv,
        audioPower: createTimeValue(0),
        audioBands: createTimeValue([0, 0, 0, 0]),
        staticMode: false,
        showText: true,
        paused: false,
        metadata: { title: '', artist: '', album: '' },
        signal: signal
      }).then(function (rt) {
        relDpr();
        if (mine !== seq || !inited) {
          try { rt.destroy(); } catch (e) {}
          done();
          return;
        }
        runtime = rt;
        pausedNow = false;
        wrapResize(rt);
        window.__LumiereRuntime = rt;
        console.log('lumiere runtime created');
        tr('created queued=' + (queued ? queued.LN.length : 0));
        if (!queued) queued = fromGlobals();
        if (queued) applyLyrics(queued, true);
        syncPause();
        done();
      }).catch(function (err) {
        relDpr();
        console.error('lumiere create failed', err);
        tr('create failed ' + (err && err.message));
        if (mine === seq) { inited = false; active = false; }
        done();
      });

      return { options: { currentTime: tv } };
    },

    drive: function (ct) {
      if (!active || !timeVal) return;
      if (ct === lastCt) return;
      lastCt = ct;
      timeVal.set(ct);
    },

    loadLyrics: function (TS, WT, LN) {
      var q = { TS: TS || [], WT: WT, LN: LN || [] };
      queued = q;
      if (!runtime) return;
      applyLyrics(q);
    },

    destroy: function () {
      active = false;
      inited = false;
      seq++;
      loadTok++;
      timeVal = null;
      if (ac) {
        try { ac.abort(); } catch (e) {}
        ac = null;
      }
      if (!runtime) return;
      var r = runtime;
      runtime = null;
      window.__LumiereRuntime = null;
      try {
        if (typeof r.destroy === 'function') r.destroy();
      } catch (e) {}
    },

    whenReady: function () {
      var p = readyP || Promise.resolve();
      return Promise.race([p, new Promise(function (r) { setTimeout(r, 10000); })]);
    },
    getConfig: function () {
      var c = {};
      for (var k in cfg) c[k] = cfg[k];
      return c;
    },

    updateConfig: function (patch) {
      var before = cfg.resolution;
      mergeCfg(cfg, patch);
      saveCfg();
      pushTuning();
      if (cfg.resolution !== before) applyResolution();
    },

    resetConfig: function () {
      var before = cfg.resolution;
      for (var k in DEFAULTS) cfg[k] = DEFAULTS[k];
      saveCfg();
      pushTuning();
      if (cfg.resolution !== before) applyResolution();
    },

    setSuspended: function (v) {
      suspended = !!v;
      syncPause();
    },

    applyResMul: function () { applyResolution(); },   // 全局分辨率倍率变化：运行中则按新值重算画布尺寸
    isAlive: function () { return inited; },
    isActive: function () { return inited && active; },
    show: function () {
      if (inited) active = true;
      syncPause();
    },
    hide: function () {
      active = false;
      syncPause();
    }
  };

  window.LumiereAdapter = LumiereAdapter;
})();
