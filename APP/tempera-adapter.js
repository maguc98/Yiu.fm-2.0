/* TemperaAdapter v8 —— 适配 VisualizerManager 的生命周期协议
 *   init(host, opts)   只登记宿主/参数，不创建 WebGL（boot 时 Manager 会对每个适配器调用一次）
 *   show()             真正创建运行时，返回 Promise（已存在则恢复 ticker）
 *   whenReady()        等运行时创建完成
 *   hide()             暂停并保留运行时（不销毁）
 *   destroy()          销毁运行时并释放 WebGL
 *   drive(ct)          推进时间（秒）；同时从全局 TS/WT/LN 同步歌词
 *   loadLyrics(TS,WT,LN)  缓存最新歌词；运行时存在则无缝切换
 *   isAlive()/isActive()/setSuspended(v)
 * v11：绿色诊断块默认关闭；动效细节里新增「自定义颜色」（文字 / 次要色 / 强调 / 背景）
 * v10：新增 getConfig / updateConfig / resetConfig（动效细节面板 #temperabox 用），参数存 localStorage 'temperaCfg.v1'
 * 已修复的引擎参数缺失（均会导致 NaN）：lyricsFontScale、tuning.depthOfField/depthPan/glyphDepth、theme 被清空
 */
(function () {
  'use strict';

  var DEBUG = (window.TEMPERA_DEBUG === true);   // 绿色诊断块默认关闭；调试时页面里先执行 window.TEMPERA_DEBUG=true 再进入凝彩
  var BUILD = 'v11-color';

  var runtime = null;
  var readyPromise = null;
  var creating = false;
  var active = false;
  var generation = 0;
  var hostEl = null;
  var initOpts = {};
  var currentTheme = null;
  var currentTuning = null;
  var timeObj = null;
  var lastCt = 0;
  var lastLyrics = null;
  var pendingLyrics = null;
  var lyricsSig = '';
  var testRafId = null;
  var seedCounter = 0;
  var stage = 'idle';
  var hudTimer = null;
  var createdAt = 0;

  /* ---------- 凝彩参数（动效细节面板 → 引擎） ---------- */
  var CFG_KEY = 'temperaCfg.v1';
  var DEFAULT_THEME = {
    primaryColor: '#ffffff', textColor: '#ffffff', backgroundColor: '#000000',
    secondaryColor: '#ffffff', accentColor: '#ffff00', fontFamily: 'sans-serif',
    wordColors: [], gradients: [], accents: [], colors: ['#ffffff', '#ffffff', '#ffff00']
  };
  var COLOR_KEYS = ['primaryColor', 'secondaryColor', 'accentColor', 'backgroundColor'];
  var baseTheme = null;                       // 宿主给的主题（不含自定义）
  var custom = { on: false, colors: {} };     // 自定义颜色：on 才覆盖主题
  var needTheme = false;
  var DEFAULT_TUNING = {
    cameraIntensity: 1, glyphMotion: 1, wholeLineLyrics: false, glyphSettleStretch: 0.5,
    colorMode: 'duo', showBlocks: false, showDecor: false, showCornerMarks: false,
    textInversion: false, layerImages: [], layerImageDepth: 'back',
    layerImageFrequency: 0, enableTransitions: true, textureResolution: 1,
    postProcessEnabled: false, postProcessGrain: 0, postProcessContrast: 1,
    postProcessRgbShift: 0, postProcessVignette: 0, postProcessLensDistortion: 0,
    depthOfField: 0, depthPan: 0, glyphDepth: 0   // 引擎每帧都读；缺失 => NaN => 文字不显示
  };
  // 效果预设：window.TEMPERA_PRESET = 'lite'（默认，省内存）| 'full'
  var PRESETS = {
    lite: {},
    full: {
      showBlocks: true, showDecor: true, showCornerMarks: true,
      postProcessEnabled: true, postProcessGrain: 0.12, postProcessContrast: 1.06,
      postProcessRgbShift: 0.25, postProcessVignette: 0.3, postProcessLensDistortion: 0
    }
  };
  // 面板能改的键：类型 + 范围（数值键 [min,max]）
  var CFG_SPEC = {
    cameraIntensity: [0, 2], glyphMotion: [0, 2], depthPan: [0, 1], glyphDepth: [0, 1], depthOfField: [0, 1],
    glyphSettleStretch: [0, 1], textureResolution: [0.5, 4],
    postProcessGrain: [0, 1], postProcessContrast: [0.5, 1.5], postProcessRgbShift: [0, 1],
    postProcessVignette: [0, 1], postProcessLensDistortion: [0, 1],
    showBlocks: 'bool', showDecor: 'bool', showCornerMarks: 'bool', textInversion: 'bool',
    enableTransitions: 'bool', postProcessEnabled: 'bool', wholeLineLyrics: 'bool',
    colorMode: ['duo', 'mono', 'gradient']
  };
  var FONT_RANGE = [0.5, 2];
  // 镜头强度 / 字动强度 / 景深平移 / 字形深度：引擎每帧都读 options.tuning，setTuning 之后立即生效，不用清场景
  var savedCfg = { tuning: {}, lyricsFontScale: null, custom: { on: false, colors: {} } };
  var curFontScale = null;
  var applyT = 0, needClear = false, needRecompile = false, needFont = false, needRebuild = false;

  // 全局渲染分辨率倍率（开发者选项里设置，localStorage 'qt_res_mul'；1 = 不缩放）。只在 <1 时才改动引擎参数，默认行为不变
  function resMul() {
    var m = window.__renderResMul;
    if (m == null) { try { m = parseFloat(localStorage.getItem('qt_res_mul')); } catch (_) { m = NaN; } }
    return (m >= 0.25 && m < 1) ? m : 1;
  }
  // 推给引擎的 tuning：倍率为 1 时就是 currentTuning 本身；<1 时给拷贝并缩小 textureResolution（引擎范围 0.5~4）
  function effT(t) {
    var m = resMul();
    if (m === 1 || !t) return t;
    var c = Object.assign({}, t);
    c.textureResolution = Math.max(0.5, Math.min(4, (+c.textureResolution || 1) * m));
    return c;
  }

  function baseTuning() {
    return Object.assign({}, DEFAULT_TUNING, PRESETS[window.TEMPERA_PRESET === 'full' ? 'full' : 'lite']);
  }
  function cleanVal(k, v) {
    var sp = CFG_SPEC[k];
    if (sp === 'bool') return !!v;
    if (Array.isArray(sp) && typeof sp[0] === 'string') return sp.indexOf(v) >= 0 ? v : undefined;
    v = Number(v);
    if (!isFinite(v)) return undefined;
    return Math.min(sp[1], Math.max(sp[0], v));
  }
  function cleanColor(v) { return (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) ? v.toLowerCase() : null; }
  function effectiveTheme() {
    var t = Object.assign({}, baseTheme || DEFAULT_THEME);
    if (custom.on) {
      COLOR_KEYS.forEach(function (k) { if (custom.colors[k]) t[k] = custom.colors[k]; });
      t.textColor = t.primaryColor;
    }
    return t;
  }
  function loadCfg() {
    try {
      var raw = localStorage.getItem(CFG_KEY); if (!raw) return;
      var o = JSON.parse(raw) || {};
      Object.keys(o.tuning || {}).forEach(function (k) {
        if (!CFG_SPEC.hasOwnProperty(k)) return;
        var v = cleanVal(k, o.tuning[k]); if (v !== undefined) savedCfg.tuning[k] = v;
      });
      var f = Number(o.lyricsFontScale);
      if (isFinite(f) && f >= FONT_RANGE[0] && f <= FONT_RANGE[1]) savedCfg.lyricsFontScale = f;
      if (o.custom) {
        savedCfg.custom.on = !!o.custom.on;
        COLOR_KEYS.forEach(function (k) { var c = cleanColor(o.custom.colors && o.custom.colors[k]); if (c) savedCfg.custom.colors[k] = c; });
      }
    } catch (_) {}
  }
  function saveCfg() {
    try {
      var t = {};
      Object.keys(CFG_SPEC).forEach(function (k) { if (currentTuning && currentTuning.hasOwnProperty(k)) t[k] = currentTuning[k]; });
      savedCfg = { tuning: t, lyricsFontScale: curFontScale, custom: { on: custom.on, colors: Object.assign({}, custom.colors) } };   // 同步内存副本：引擎重建时读它，不会回退到旧值
      localStorage.setItem(CFG_KEY, JSON.stringify(savedCfg));
    } catch (_) {}
  }
  loadCfg();
  custom = { on: savedCfg.custom.on, colors: Object.assign({}, savedCfg.custom.colors) };
  function ensureTheme() {
    if (!currentTheme) currentTheme = effectiveTheme();
    return currentTheme;
  }
  function ensureTuning() {
    if (!currentTuning) currentTuning = Object.assign({}, baseTuning(), savedCfg.tuning);
    if (curFontScale == null) curFontScale = pickScale(savedCfg.lyricsFontScale, window.TEMPERA_LYRICS_SCALE);
    return currentTuning;
  }
  function progOpts() { return { wholeLineLyrics: !!(currentTuning && currentTuning.wholeLineLyrics) }; }

  function valueOf(initial) {
    var v = initial;
    return {
      get: function () { return v; },
      set: function (n) { v = n; },
      subscribe: function () { return { unsubscribe: function () {} }; },
      on: function () {},
      off: function () {}
    };
  }

  function nextSeed() { seedCounter++; return 'seed-' + Date.now() + '-' + seedCounter; }

  /* ---------- 屏幕错误日志 / 诊断 ---------- */
  function dumpErr(tag, e) {
    try {
      console.error('[Tempera ' + tag + ']', e);
      var pre = document.getElementById('temperaErrLog');
      if (!pre) {
        pre = document.createElement('pre');
        pre.id = 'temperaErrLog';
        pre.style.cssText = 'position:fixed;left:0;right:0;top:0;max-height:40vh;overflow:auto;background:rgba(200,0,0,.85);color:#fff;font:11px monospace;z-index:2147483647;margin:0;padding:4px;white-space:pre-wrap;display:none;';
        document.body.appendChild(pre);
      }
      pre.style.display = 'block';
      pre.textContent += '[' + tag + '] ' + (e && (e.stack || e.message || e)) + '\n';
    } catch (_) {}
  }
  window.addEventListener('unhandledrejection', function (e) { dumpErr('UNHANDLED', e.reason); });
  window.addEventListener('error', function (e) { dumpErr('ERR', e.message + ' @' + e.filename + ':' + e.lineno); });

  function chainInfo(o) {
    var a = 1, bad = '', d = 0;
    for (var c = o; c; c = c.parent, d++) {
      a *= (typeof c.alpha === 'number' ? c.alpha : 1);
      if (!bad && c.visible === false) bad = 'visible=false@' + d;
      if (!bad && c.renderable === false) bad = 'renderable=false@' + d;
    }
    return { alpha: a, bad: bad };
  }
  function f2(v) { return typeof v === 'number' ? (v !== v ? 'NaN' : v.toFixed(1)) : String(v); }
  function scanScene(root) {
    var n = 0, t = 0, vis = 0, nan = 0, first = null, firstVis = null, stack = [root];
    while (stack.length) {
      var o = stack.pop(); n++;
      var p = o.position;
      if (p && (p.x !== p.x || p.y !== p.y)) nan++;
      if (typeof o.text === 'string' && o.style) {
        t++;
        if (!first) first = o;
        var ci = chainInfo(o);
        if (!ci.bad && ci.alpha > 0.01) { vis++; if (!firstVis) firstVis = o; }
      }
      if (o.children) for (var i = 0; i < o.children.length; i++) stack.push(o.children[i]);
    }
    var pick = firstVis || first, desc = '无Text';
    if (pick) {
      var ci2 = chainInfo(pick), bd = null;
      try { var b = pick.getBounds(); bd = b.rectangle || b; } catch (e) {}
      desc = '"' + pick.text + '" size=' + (pick.style && pick.style.fontSize) + ' chainAlpha=' + f2(ci2.alpha) + ' ' + (ci2.bad || 'chain可见') +
             ' bounds=' + (bd ? f2(bd.x) + ',' + f2(bd.y) + ' ' + f2(bd.width) + 'x' + f2(bd.height) : '?');
    }
    return 'nodes=' + n + ' Text=' + t + ' 可见Text=' + vis + ' NaN位置=' + nan + '\n  首个: ' + desc;
  }
  function startHud() {
    if (!DEBUG || hudTimer) return;
    try {
      var el = document.getElementById('temperaHud');
      if (!el) {
        el = document.createElement('pre');
        el.id = 'temperaHud';
        el.style.cssText = 'position:fixed;left:0;right:0;bottom:0;background:rgba(0,0,0,.75);color:#0f0;font:10px/1.3 monospace;z-index:2147483646;margin:0;padding:3px 5px;white-space:pre-wrap;pointer-events:none;';
        document.body.appendChild(el);
      }
      hudTimer = setInterval(function () {
        var L = [];
        try {
          L.push('build=' + BUILD + ' stage=' + stage + ' active=' + active + ' creating=' + creating + ' gen=' + generation +
                 (stage === 'creating' ? ' 已等待 ' + Math.round((Date.now() - createdAt) / 1000) + 's' : ''));
          if (hostEl) {
            var cs = getComputedStyle(hostEl), cv = hostEl.querySelector('canvas');
            L.push('host ' + hostEl.clientWidth + 'x' + hostEl.clientHeight + ' display=' + cs.display + ' canvas=' + (cv ? cv.width + 'x' + cv.height : '无'));
          }
          var gl_ = window.LN, ts_ = window.TS;
          L.push('全局歌词 LN=' + (gl_ ? gl_.length : 'x') + ' TS=' + (ts_ ? ts_.length : 'x') + ' lastCt=' + Number(lastCt).toFixed(2));
          if (runtime) {
            var r = runtime;
            L.push('paragraphs=' + (r.options && r.options.program && r.options.program.paragraphs.length) +
                   ' active=' + r.activeParagraphIndex + ' scenes=' + (r.sceneContainer && r.sceneContainer.children.length) +
                   ' ticker=' + (r.app && r.app.ticker && r.app.ticker.started) + ' paused=' + (r.options && r.options.paused));
            L.push('scene: ' + scanScene(r.sceneContainer));
            L.push('theme=' + (r.options && r.options.theme ? 'ok' : 'UNDEFINED') + ' ct=' + (r.options && r.options.currentTime ? Number(r.options.currentTime.get()).toFixed(2) : '?'));
          }
        } catch (e) { L.push('hud err ' + e.message); }
        el.textContent = L.join('\n');
      }, 500);
    } catch (e) {}
  }

  /* ---------- 歌词转换 ----------
   * TS[i]: 第 i 行开始时间；WT[i]: 该行每个字的【开始时间】数组（数字，也兼容 [start,end]），可为 null；LN[i]: 文本 */
  function buildLines(TS, WT, LN) {
    TS = TS || []; LN = LN || [];
    var lines = [];
    for (var i = 0; i < LN.length; i++) {
      var text = String(LN[i] == null ? '' : LN[i]);
      var chars = Array.from(text);
      var wt = (WT && WT[i]) || null;
      var st = Number(TS[i]) || 0;
      var en = (TS[i + 1] != null && Number(TS[i + 1]) > st) ? Number(TS[i + 1]) : (st + 5);
      var dur = Math.max(en - st, 0.1), n = Math.max(chars.length, 1);
      var perChar = wt && wt.length === chars.length;
      var words = chars.map(function (ch, idx) {
        if (perChar) {
          var a = wt[idx], b = wt[idx + 1], s0, e0;
          if (Array.isArray(a)) { s0 = Number(a[0]); e0 = Number(a[1]); }
          else { s0 = Number(a); e0 = (idx + 1 < wt.length) ? Number(Array.isArray(b) ? b[0] : b) : en; }
          if (!isFinite(s0)) s0 = st + idx * dur / n;
          if (!isFinite(e0) || e0 < s0) e0 = Math.min(en, s0 + 0.3);
          return { text: ch, startTime: s0, endTime: e0 };
        }
        return { text: ch, startTime: st + idx * dur / n, endTime: st + (idx + 1) * dur / n };
      });
      lines.push({ fullText: text, startTime: st, endTime: en, words: words });
    }
    return lines;
  }

  function sigOf(TS, WT, LN) {
    if (!LN || !TS) return '';
    var w0 = WT && WT[0] && WT[0].length;
    return LN.length + '|' + TS.length + '|' + LN[0] + '|' + LN[LN.length - 1] + '|' + TS[0] + '|' + TS[TS.length - 1] + '|' + (w0 || 0);
  }

  function globalLyrics() {
    var LN = window.LN, TS = window.TS, WT = window.WT;
    if (LN && LN.length && TS && TS.length) return [TS, WT, LN];
    return null;
  }

  // 取第一个合法的正数；都没有就用 1（字体整体缩放，字觉得"大"就设成 0.7~0.85）
  function pickScale() {
    for (var i = 0; i < arguments.length; i++) {
      var v = arguments[i];
      if (typeof v === 'number' && isFinite(v) && v > 0) return v;
    }
    return 1;
  }

  function stopTestClock() { if (testRafId) { cancelAnimationFrame(testRafId); testRafId = null; } }

  function safePause(v) { try { if (runtime && typeof runtime.setPaused === 'function') runtime.setPaused(!!v); } catch (e) { dumpErr('setPaused', e); } }

  /* ---------- 创建运行时 ---------- */
  function createRuntime(afterLoad) {
    var R = window.TemperaRuntime;
    // 按需加载：引擎脚本（boot + pixi + 核心）第一次用到时才下载；generation 防止加载期间被 destroy 后仍继续创建
    if (!R && !afterLoad && window.__EngineLoader) {
      var g0 = generation;
      creating = true; stage = 'loading';
      return window.__EngineLoader.load('tempera').then(function () {
        if (g0 !== generation) return null;   // 加载期间被 destroy
        creating = false;
        return createRuntime(true);
      }, function (e) {
        if (g0 === generation) { creating = false; readyPromise = null; stage = 'create失败'; }
        dumpErr('load', e);
        throw e;
      });
    }
    if (!R || !R.TemperaPixiRuntime && !R.create) return Promise.reject(new Error('TemperaRuntime 未加载'));
    if (!hostEl) return Promise.reject(new Error('Tempera 宿主未登记（init 未调用）'));
    var createFn = R.create ? R.create.bind(R) : function (o) { return R.TemperaPixiRuntime.create(o); };

    var opts = initOpts || {};
    generation++;
    var myGen = generation;
    creating = true; stage = 'creating'; createdAt = Date.now();
    startHud();

    var defaultTuning = DEFAULT_TUNING;
    baseTheme = Object.assign({}, DEFAULT_THEME, opts.theme || {});
    currentTheme = effectiveTheme();
    currentTuning = Object.assign({}, baseTuning(), opts.tuning || {}, savedCfg.tuning, window.TEMPERA_TUNING || {});
    if (curFontScale == null) curFontScale = pickScale(opts.lyricsFontScale, savedCfg.lyricsFontScale, window.TEMPERA_LYRICS_SCALE);
    ['depthOfField', 'depthPan', 'glyphDepth', 'cameraIntensity', 'glyphMotion'].forEach(function (k) {
      if (typeof currentTuning[k] !== 'number' || !isFinite(currentTuning[k])) currentTuning[k] = defaultTuning[k];
    });

    // 初始 program：宿主给的 > 全局/缓存歌词 > 测试文字
    var seed = opts.seed || nextSeed();
    var program = opts.program || null;
    var testMode = false;
    if (!program) {
      var src = globalLyrics() || lastLyrics;
      if (src) {
        try {
          var ls = buildLines(src[0], src[1], src[2]);
          if (ls.length) { program = R.compileTemperaProgram(ls, seed, progOpts()); lyricsSig = sigOf(src[0], src[1], src[2]); pendingLyrics = null; }
        } catch (e) { dumpErr('compile(歌词)', e); program = null; }
      }
    }
    if (!program) {
      testMode = true;
      var testLine = { fullText: '测试文字', startTime: 0, endTime: 5, words: [
        { text: '测', startTime: 0, endTime: 1 }, { text: '试', startTime: 1, endTime: 2 },
        { text: '文', startTime: 2, endTime: 3 }, { text: '字', startTime: 3, endTime: 5 }] };
      try { program = R.compileTemperaProgram([testLine], seed, progOpts()); }
      catch (e) { creating = false; stage = 'compile失败'; return Promise.reject(e); }
    }

    timeObj = valueOf(lastCt);
    var timeRef = timeObj;

    var p = createFn({
      host: hostEl,
      program: program,
      theme: currentTheme,
      tuning: effT(currentTuning),
      songSeed: seed,
      lyricsFontScale: curFontScale,
      staticMode: false,
      paused: false,
      coverColors: opts.coverColors || [],
      currentTime: timeRef,
      audioBands: valueOf([0, 0, 0, 0]),
      audioPower: valueOf(0)
    }).then(function (rt) {
      if (myGen !== generation) { try { rt.destroy(); } catch (e) {} return null; }   // 创建期间被 destroy
      runtime = rt;
      creating = false;
      stage = 'ready';
      window.__TemperaRuntime = rt;
      if (!active) safePause(true);
      if (pendingLyrics) { var pl = pendingLyrics; pendingLyrics = null; TemperaAdapter.loadLyrics(pl[0], pl[1], pl[2]); }
      if (testMode && active) {
        var last = performance.now(), t = 0;
        (function loop(now) {
          if (!runtime || myGen !== generation || !active) { testRafId = null; return; }
          t += Math.min((now - last) / 1000, 0.1); last = now;
          if (t > 5.5) t = 0;
          timeRef.set(t);
          testRafId = requestAnimationFrame(loop);
        })(last);
      }
      return rt;
    }, function (err) {
      if (myGen === generation) { creating = false; runtime = null; readyPromise = null; stage = 'create失败'; window.__TemperaRuntime = null; }
      dumpErr('create', err);
      throw err;
    });
    return p;
  }

  // 整体重建：优先走 VisualizerManager（销毁 → 等两帧 → 创建，并主动 loseContext）；没有 Manager 就自己销毁再 show
  function rebuildRuntime() {
    var was = active;
    try {
      var VM = window.VisualizerManager;
      if (was && VM && typeof VM.switchTo === 'function') {
        var o = Object.assign({}, initOpts); delete o.reuse;
        var p = VM.switchTo('tempera', o);
        if (p && p.catch) p.catch(function (e) { dumpErr('rebuild', e); });
        return;
      }
      TemperaAdapter.destroy();
      if (was) { var q = TemperaAdapter.show(); if (q && q.catch) q.catch(function (e) { dumpErr('rebuild', e); }); }
    } catch (e) { dumpErr('rebuild', e); }
  }

  function applyCfg() {
    applyT = 0;
    var clr = needClear, rec = needRecompile, fnt = needFont, reb = needRebuild, thm = needTheme;
    needClear = needRecompile = needFont = needRebuild = needTheme = false;
    if (!runtime) return;                      // 还没创建：创建时会读 currentTuning / curFontScale
    if (reb) { rebuildRuntime(); return; }     // 新运行时创建时会读全部最新参数
    try {
      if (typeof runtime.setTuning === 'function') runtime.setTuning(effT(currentTuning));
      if (fnt && runtime.options) runtime.options.lyricsFontScale = curFontScale;
      if (thm && runtime.options) {              // 配色在建场景时烘进去：换主题后清场景缓存，角标 / 片尾也重画
        runtime.options.theme = currentTheme; clr = true;
        if (runtime.lastWidth > 0 && runtime.lastHeight > 0) {
          if (typeof runtime.drawOverlay === 'function') runtime.drawOverlay(runtime.lastWidth, runtime.lastHeight);
          if (typeof runtime.drawCredits === 'function') runtime.drawCredits(runtime.lastWidth, runtime.lastHeight);
        }
      }
      if ((clr || fnt) && typeof runtime.clearScenes === 'function') {
        runtime.clearScenes();
        if (runtime.options && runtime.options.paused && typeof runtime.renderOnce === 'function') runtime.renderOnce();
      }
      if (rec && lastLyrics) TemperaAdapter.loadLyrics(lastLyrics[0], lastLyrics[1], lastLyrics[2]);
    } catch (e) { dumpErr('applyCfg', e); }
  }

  /* ---------- 适配器对象 ---------- */
  var TemperaAdapter = {
    init: function (host, opts) {
      hostEl = host || hostEl;
      initOpts = opts || {};
      return null;                      // 只登记，不创建 WebGL
    },

    show: function () {
      active = true;
      if (runtime) { safePause(false); return readyPromise || Promise.resolve(runtime); }
      if (readyPromise) return readyPromise;
      readyPromise = createRuntime();
      return readyPromise;
    },

    whenReady: function () { return readyPromise || Promise.resolve(runtime); },

    /* 全局分辨率倍率变化：合并到 applyCfg（运行中才会推给引擎，未创建则下次创建时生效） */
    applyResMul: function () { clearTimeout(applyT); applyT = setTimeout(applyCfg, 300); },

    hide: function () {
      active = false;
      stopTestClock();
      safePause(true);
    },

    setSuspended: function (v) { if (runtime && active) safePause(!!v); },

    destroy: function () {
      active = false;
      generation++;                     // 让进行中的创建自行作废
      creating = false;
      readyPromise = null;
      stopTestClock();
      stage = 'destroyed';
      var r = runtime;
      runtime = null;
      window.__TemperaRuntime = null;
      if (!r) return;
      try {
        if (typeof r.destroy === 'function') r.destroy();
        else if (r.app) r.app.destroy({ removeView: true });
      } catch (e) {}
    },

    drive: function (ct) {
      ct = Number(ct);
      if (!isFinite(ct)) return;
      lastCt = ct;
      stopTestClock();                  // 宿主接管时间
      if (!runtime || !active) return;
      try { if (timeObj) timeObj.set(ct); } catch (e) {}
      // 兜底：宿主没调 loadLyrics（或歌词被别处改了）时，从全局 TS/WT/LN 同步
      var g = globalLyrics();
      if (g) {
        var s = sigOf(g[0], g[1], g[2]);
        if (s !== lyricsSig) TemperaAdapter.loadLyrics(g[0], g[1], g[2]);
      }
    },

    loadLyrics: function (TS, WT, LN) {
      lastLyrics = [TS, WT, LN];
      lyricsSig = sigOf(TS, WT, LN);
      if (!runtime || typeof runtime.swapSong !== 'function') { if (creating) pendingLyrics = lastLyrics; return; }
      try {
        var lines = buildLines(TS, WT, LN);
        if (!lines.length) return;
        stopTestClock();
        var seed = nextSeed();           // 必须与当前 seed 不同
        var prog = window.TemperaRuntime.compileTemperaProgram(lines, seed, progOpts());
        var p = runtime.swapSong({ seed: seed, program: prog, theme: currentTheme, coverColors: [] });   // theme 必须带上
        if (p && p.catch) p.catch(function (e) { dumpErr('swapSong', e); });
      } catch (e) { dumpErr('loadLyrics', e); }
    },

    /* ---------- 动效细节面板接口 ---------- */
    getConfig: function () {
      var c = Object.assign({}, ensureTuning());
      c.lyricsFontScale = curFontScale;
      c.customColors = custom.on;
      var th = ensureTheme();
      COLOR_KEYS.forEach(function (k) { c[k] = custom.colors[k] || th[k]; });   // 没自定义过就显示当前主题色
      return c;
    },
    updateConfig: function (patch) {
      if (!patch) return;
      var t = Object.assign({}, ensureTuning());
      Object.keys(patch).forEach(function (k) {
        if (k === 'customColors') { custom.on = !!patch[k]; needTheme = true; return; }
        if (COLOR_KEYS.indexOf(k) >= 0) { var cc = cleanColor(patch[k]); if (cc) { custom.colors[k] = cc; needTheme = true; } return; }
        if (k === 'lyricsFontScale') {
          var f = Number(patch[k]);
          if (isFinite(f)) { curFontScale = Math.min(FONT_RANGE[1], Math.max(FONT_RANGE[0], f)); needFont = true; }
          return;
        }
        if (!CFG_SPEC.hasOwnProperty(k)) { if (window.console) console.warn('[Tempera] updateConfig 未知键：' + k); return; }
        var v = cleanVal(k, patch[k]); if (v === undefined || t[k] === v) return;
        t[k] = v;
        if (k === 'postProcessEnabled') needRebuild = true;   // 抗锯齿 / 后备缓冲在创建画布时定死，只能整体重建
        if (k === 'wholeLineLyrics') needRecompile = true;
      });
      currentTuning = t;     // 必须是新对象：引擎 setTuning 用引用比较
      if (needTheme) currentTheme = effectiveTheme();
      saveCfg();
      clearTimeout(applyT);
      applyT = setTimeout(applyCfg, 300);   // 重建类参数合并成一次，拖完才生效
    },
    resetConfig: function () {
      try { localStorage.removeItem(CFG_KEY); } catch (_) {}
      savedCfg = { tuning: {}, lyricsFontScale: null, custom: { on: false, colors: {} } };
      custom = { on: false, colors: {} };
      currentTheme = effectiveTheme(); needTheme = true;
      var oldWhole = currentTuning && currentTuning.wholeLineLyrics;
      var oldPP = currentTuning && currentTuning.postProcessEnabled;
      currentTuning = Object.assign({}, baseTuning(), window.TEMPERA_TUNING || {});
      curFontScale = pickScale(window.TEMPERA_LYRICS_SCALE);
      needClear = true; needFont = true;
      if (oldPP !== currentTuning.postProcessEnabled) needRebuild = true;
      if (oldWhole !== currentTuning.wholeLineLyrics) needRecompile = true;
      clearTimeout(applyT);
      applyT = setTimeout(applyCfg, 0);
    },

    isAlive: function () { return !!runtime || creating; },
    isActive: function () { return active && !!runtime; }
  };

  window.TemperaAdapter = TemperaAdapter;
})();
