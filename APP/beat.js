/*!
 * beat.js · 节拍检测 + 律动联动  (v5)
 * ---------------------------------------------------------------------------
 * 检测管线（v5 重写核心，修复 v4 的"多拍 / 漏拍 / 安静歌不出拍"）：
 *
 *  v4 的问题：检的是「低频响度」而不是「鼓点」——贝斯弹八分音符时会在正拍之间多识别一倍；
 *  基线 1s 时间常数在快歌里被节拍本身抬高；纯门限触发没有节拍网格，镲片 / 装饰音全算成拍。
 *
 *  v5 的做法：
 *   1. 谱通量（spectral flux）：三个频段（底鼓 30-140 / 军鼓 140-420 / 帽镲 420-1400 Hz，
 *      按采样率换算 bin）分别算「比上一帧变大多少」，只统计正增量。
 *      持续长音（贝斯延音、铺底合成器）通量 ≈ 0，只有瞬态鼓点产生尖峰。
 *   2. 滑动窗自适应阈值：约 1.2s 窗口的均值 + max(1.2, 峰值差×0.45)，时间基计算，30fps 下行为不变。
 *   3. 节拍网格锁定：自由模式下收够 6 个一致间隔后锁定 tempo；锁定后 onset 必须落在
 *      预测拍点 ±30% 内才被承认（贝斯 off-beat 音直接丢弃）；连续 8 次平均偏差 >24% 自动解锁重收敛。
 *   4. 预测补拍：网格锁定后漏检的拍按预测位置补发（力度 ×0.85）；静音 2.5s 自动解锁。
 *   5. 取消 -62dB 绝对门限（安静歌不出拍的元凶），改用相对阈值 + 微量绝对地板。
 *
 * 对外接口与 v4 完全一致：window.Beat.on / .bpm / .beating，'beat' 事件 detail.strength / .count。
 * ---------------------------------------------------------------------------
 */
;(function () {
  'use strict';
  if (window.__beatLoaded) return;
  window.__beatLoaded = true;

  var audio = document.getElementById('audio');
  if (!audio) { console.warn('[Beat] 找不到 #audio'); return; }

  /* =========================================================================
   * 1. Web Audio 分析链路
   * ========================================================================= */
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, analyser = null, fdb = null, bdb = null, prevDb = null, useFloat = false, ready = false;
  var BANDS = [[30, 140], [140, 420], [420, 1400]];   // 底鼓 / 军鼓低中频 / 帽镲
  var BW = [1, 0.45, 0.18];                            // 权重：底鼓主导，军鼓补 2/4 拍，帽镲只作点缀
  var binOf = [[1, 6], [6, 18], [18, 65]];

  function ensureCtx() {
    if (ctx) return ready;
    if (!AC) { console.warn('[Beat] 当前环境不支持 Web Audio'); return false; }
    try {
      ctx = new AC();
      var src = ctx.createMediaElementSource(audio);   // 注意：一个 audio 元素只能接一次
      analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;                         // @44.1kHz 每档 ≈ 21.5Hz，低频分辨率足够
      analyser.smoothingTimeConstant = 0.2;            // 低一点，鼓点边沿更陡
      analyser.minDecibels = -100;
      analyser.maxDecibels = -10;
      var n = analyser.frequencyBinCount;
      useFloat = typeof analyser.getFloatFrequencyData === 'function';
      if (useFloat) fdb = new Float32Array(n); else bdb = new Uint8Array(n);
      prevDb = new Float32Array(n);
      prevDb.fill(-100);                               // 初值 = 静音 dB，避免首帧假尖峰
      var binHz = ctx.sampleRate / analyser.fftSize;
      for (var b = 0; b < 3; b++) {
        var lo = Math.max(1, Math.round(BANDS[b][0] / binHz));
        var hi = Math.min(n - 1, Math.max(lo, Math.round(BANDS[b][1] / binHz)));
        binOf[b] = [lo, hi];
      }
      src.connect(analyser);
      analyser.connect(ctx.destination);
      ready = true;
    } catch (e) {
      ready = false;
      console.warn('[Beat] 创建 MediaElementSource 失败：', e);
    }
    return ready;
  }

  // iOS：AudioContext 可能被创建在 gesture 之外而 suspended，这里兜底
  ['pointerdown', 'touchend', 'keydown'].forEach(function (n) {
    document.addEventListener(n, function () {
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {});
    }, { capture: true, passive: true });
  });

  /* =========================================================================
   * 2. 检测状态
   * ========================================================================= */
  var hist = [];                 // {t, v} 谱通量包络滑窗（≈1.2s，时间基，帧率无关）
  var lastLoop = 0, warmT = 0;
  var armed = true, peakE = 0;
  var lastBeat = 0, lastInterval = 400, intervals = [];
  var locked = false, period = 500, devSum = 0, devN = 0, quietT = 0;
  var recentS = [], beatCount = 0;
  var running = false, raf = 0;
  var cbs = [];

  function median(a) {
    if (!a.length) return 0;
    var s = a.slice().sort(function (x, y) { return x - y; });
    return s[Math.floor(s.length / 2)];
  }
  function foldBpm(b) { while (b < 70) b *= 2; while (b >= 160) b /= 2; return b; }
  function bpmNow() {
    if (intervals.length < 3) return 0;
    return Math.round(median(intervals.map(function (x) { return foldBpm(60000 / x); })));
  }
  function avgRecent() {
    if (!recentS.length) return 0.6;
    var s = 0; for (var i = 0; i < recentS.length; i++) s += recentS[i];
    return s / recentS.length;
  }

  function reset() {             // 切歌 / 重新加载：全部状态清零重新收敛
    hist.length = 0; intervals.length = 0; recentS.length = 0;
    lastBeat = 0; lastInterval = 400; lastLoop = 0; warmT = 0;
    armed = true; peakE = 0;
    locked = false; period = 500; devSum = 0; devN = 0; quietT = 0;
    if (prevDb) prevDb.fill(-100);
  }

  /* =========================================================================
   * 3. 谱通量：每个频段「每 bin 平均正增量」，加权合成 onset 包络
   *    持续音 → 通量 ≈ 0；瞬态鼓点 → 尖峰。这是和 v4（低频响度）的本质区别。
   * ========================================================================= */
  function onsetEnv() {
    var out = [0, 0, 0], b, i, d;
    if (useFloat) {
      analyser.getFloatFrequencyData(fdb);
      for (b = 0; b < 3; b++) {
        var lo = binOf[b][0], hi = binOf[b][1], sum = 0;
        for (i = lo; i <= hi; i++) {
          d = fdb[i]; if (!(d > -100)) d = -100;       // 同时挡掉 -Infinity / NaN
          var p = prevDb[i]; prevDb[i] = d;
          if (d > p) sum += d - p;
        }
        out[b] = sum / (hi - lo + 1);
      }
    } else {
      analyser.getByteFrequencyData(bdb);
      var mn = analyser.minDecibels, mx = analyser.maxDecibels;
      for (b = 0; b < 3; b++) {
        var lo2 = binOf[b][0], hi2 = binOf[b][1], sum2 = 0;
        for (i = lo2; i <= hi2; i++) {
          d = mn + bdb[i] / 255 * (mx - mn);
          var p2 = prevDb[i]; prevDb[i] = d;
          if (d > p2) sum2 += d - p2;
        }
        out[b] = sum2 / (hi2 - lo2 + 1);
      }
    }
    return out[0] * BW[0] + out[1] * BW[1] + out[2] * BW[2];
  }

  /* =========================================================================
   * 4. 节拍接受 / 网格判定
   * ========================================================================= */
  function accept(t, s) {
    if (lastBeat) {
      var itv = t - lastBeat;
      if (itv >= 200 && itv <= 2500) {
        intervals.push(itv);
        if (intervals.length > 12) intervals.shift();
        lastInterval = median(intervals);
      }
    }
    lastBeat = t;
    beatCount++;
    recentS.push(s); if (recentS.length > 8) recentS.shift();
    fire(s);
  }

  function lockPeriod() {
    if (intervals.length >= 3) period = 60000 / foldBpm(60000 / median(intervals));
  }

  function tryLock() {
    if (intervals.length < 6) return;
    var bs = intervals.map(function (x) { return foldBpm(60000 / x); }).sort(function (a, b) { return a - b; });
    var med = bs[bs.length >> 1];
    var mad = median(bs.map(function (b) { return Math.abs(b - med); }));
    if (med > 0 && mad / med < 0.06) {                 // 折叠 BPM 中位数 ±6% 以内才算稳
      locked = true; lockPeriod(); devSum = 0; devN = 0;
    }
  }

  function onCandidate(t, s) {
    var since = t - lastBeat;
    if (since < 180) return;                           // 硬下限：任何模式下都不快于 ~315 BPM

    if (!locked) {
      // 自由模式：动态冷却 + 间隔离群过滤（明显偏离当前节奏的 onset 不进 BPM 池）
      var cool = Math.max(200, Math.min(450, lastInterval * 0.55));
      if (since < cool) return;
      if (lastBeat) {
        var r = since / lastInterval;
        if (r < 0.45 || r > 2.2) return;
      }
      accept(t, s);
      tryLock();
      return;
    }

    // 锁定模式：必须落在预测网格上（±30%），贝斯 off-beat / 装饰音直接丢弃
    var n = Math.round(since / period);
    if (n < 1) { devSum += 0.5; devN++; checkUnlock(); return; }
    var devMs = t - (lastBeat + n * period);
    var tol = Math.max(70, 0.3 * n * period);
    if (Math.abs(devMs) <= tol) {
      accept(t, s);
      lockPeriod();
      devSum += Math.abs(devMs) / (n * period); devN++;
    } else {
      devSum += 0.5; devN++;                           // 持续离群 → 累计偏差，触发解锁重收敛
    }
    checkUnlock();
  }

  function checkUnlock() {
    if (devN < 8) return;
    if (devSum / devN > 0.24) { locked = false; intervals.length = 0; }
    devSum = 0; devN = 0;
  }

  /* =========================================================================
   * 5. 主循环（~60Hz 分析，低功耗 30fps 时自动降为 30Hz，窗口按时间算不受影响）
   * ========================================================================= */
  var WIN = 1200;        // 滑窗 ms
  var FLOOR = 1.2;       // 绝对地板：纯静音的谱抖动不触发

  function loop() {
    raf = 0;
    if (!running) return;
    if (audio.paused || audio.ended) { running = false; return; }
    raf = requestAnimationFrame(loop);

    var now = performance.now();
    if (now - lastLoop < 15) return;
    var dt = Math.min(100, lastLoop ? now - lastLoop : 16);
    lastLoop = now;
    warmT += dt;

    var env = onsetEnv();
    hist.push({ t: now, v: env });
    var cut = now - WIN, h0 = 0;
    while (h0 < hist.length && hist[h0].t < cut) h0++;
    if (h0) hist.splice(0, h0);

    var m = 0, pk = 0, i;
    for (i = 0; i < hist.length; i++) { m += hist[i].v; if (hist[i].v > pk) pk = hist[i].v; }
    m = hist.length ? m / hist.length : 0;

    // 静音累计：安静段落 2.5s 解锁，不硬凑拍
    if (env < 0.8) { quietT += dt; if (quietT > 2500 && locked) { locked = false; intervals.length = 0; } }
    else quietT = 0;

    var since = now - lastBeat;
    if (!armed) {                                      // 触发后等包络从峰值回落才重新上膛，长音 / 拖尾不连发
      if (env > peakE) peakE = env;
      var drop = Math.max(0.8, (peakE - m) * 0.5);
      if (env < peakE - drop || since > (locked ? period * 1.5 : 600)) armed = true;
    }

    var thr = m + Math.max(FLOOR, (pk - m) * 0.45);
    if (warmT > 400 && hist.length >= 6 && now - hist[0].t >= 500 && armed && env > FLOOR && env > thr) {
      armed = false; peakE = env;
      onCandidate(now, Math.min(2, Math.max(0.35, env / thr * 0.9)));
    }

    // 网格补拍：锁定后漏检的拍按预测位置补发（弱 15%）；安静段落不补
    if (locked && lastBeat && quietT < 800) {
      var guard = 0;
      while (now - lastBeat > period * 1.45 && guard++ < 4) {
        accept(lastBeat + period, avgRecent() * 0.85);
      }
    }
  }

  function start() {
    if (!ensureCtx()) return;
    if (ctx.state === 'suspended') { ctx.resume().catch(function () {}); }
    if (running) return;
    running = true;
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; }

  /* =========================================================================
   * 6. 视觉联动：音符按钮 + AI 灵动岛（与 v4 一致）
   * ========================================================================= */
  var pillEl = null, eyesEl = null, eyeEls = null, cfsEl = null, orbEl = null;
  function findEls() {
    if (!pillEl || !pillEl.isConnected) pillEl = document.querySelector('.aiui-pill');
    if (!eyesEl || !eyesEl.isConnected) eyesEl = document.querySelector('.aiui-eyes');
    if (!eyeEls || !eyeEls[0] || !eyeEls[0].isConnected)
      eyeEls = [].slice.call(document.querySelectorAll('.aiui-eye'));
    if (!cfsEl || !cfsEl.isConnected) cfsEl = document.getElementById('cfs');
    if (!orbEl || !orbEl.isConnected) orbEl = document.querySelector('.aiui-orb');
  }

  function lowPower() { return document.body.classList.contains('low-power'); }

  function scalePulse(el, sx, sy, dur) {
    if (!el || !el.animate) return;
    if (el.__beatA) { try { el.__beatA.cancel(); } catch (_) {} }
    el.__beatA = el.animate(
      [{ scale: '1 1' }, { scale: sx + ' ' + sy, offset: 0.32 }, { scale: '1 1' }],
      { duration: dur, easing: 'cubic-bezier(.3,1.5,.5,1)' }
    );
  }

  function blinkEyes() {
    if (!eyeEls) return;
    eyeEls.forEach(function (el) {
      if (!el.animate) return;
      el.animate(
        [{ transform: 'scaleY(1)' }, { transform: 'scaleY(.1)', offset: 0.45 }, { transform: 'scaleY(1)' }],
        { duration: 220, easing: 'ease-in-out' }
      );
    });
  }

  function popOrb() {
    if (!orbEl || !orbEl.classList.contains('is-on')) return;
    orbEl.classList.remove('do-pop');
    void orbEl.offsetWidth;
    orbEl.classList.add('do-pop');
    setTimeout(function () { orbEl.classList.remove('do-pop'); }, 650);
  }

  function fire(s) {
    findEls();
    var amp = Math.min(0.30, 0.10 + s * 0.12);

    // ① 音符按钮 #cfs：每拍都跳
    if (cfsEl && cfsEl.getClientRects().length) scalePulse(cfsEl, String(1 + amp * 1.25), String(1 + amp * 1.25), 240);

    // ② AI 灵动岛：只在唤醒且面板收起时律动
    var awake = pillEl && pillEl.classList.contains('is-awake');
    if (awake && !document.body.classList.contains('open')) {
      if (!lowPower()) scalePulse(pillEl, String(1 + amp), String(1 + amp), 300);
      if (eyesEl && !lowPower()) {
        var sq = Math.min(0.22, 0.07 + s * 0.08);
        scalePulse(eyesEl, String(1 + sq), String(1 - sq), 200);
      }
      if (beatCount % 4 === 0) blinkEyes();
      if (beatCount % 8 === 0) popOrb();
    }

    // ③ 对外广播（格式与 v4 一致）
    for (var i = 0; i < cbs.length; i++) { try { cbs[i](s); } catch (e) {} }
    try {
      window.dispatchEvent(new CustomEvent('beat', { detail: { strength: s, count: beatCount } }));
    } catch (_) {}
  }

  /* =========================================================================
   * 7. 事件接线 + 对外接口（与 v4 完全一致）
   * ========================================================================= */
  ['play', 'playing'].forEach(function (n) {
    document.addEventListener(n, function (e) {
      if (e.target && e.target.id === 'audio') start();
    }, true);
  });
  ['pause', 'ended'].forEach(function (n) {
    document.addEventListener(n, function (e) {
      if (e.target && e.target.id === 'audio') stop();
    }, true);
  });
  ['emptied', 'loadstart'].forEach(function (n) {
    document.addEventListener(n, function (e) {
      if (e.target && e.target.id === 'audio') { stop(); reset(); }
    }, true);
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else if (!audio.paused) start();
  });

  window.Beat = {
    on: function (cb) { if (typeof cb === 'function') cbs.push(cb); return window.Beat; },
    get bpm()     { return bpmNow(); },
    get beating() { return running && !!lastBeat && (performance.now() - lastBeat < 1200); },
    get locked()  { return locked; },                 // v5 新增：网格是否已锁定（调试用）
    start: start,
    stop: stop
  };
})();
