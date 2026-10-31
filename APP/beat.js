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
  /* 可调参数（面板「调参」里改；存 localStorage，刷新后保留）
     gridTol 网格宽容度 · unlock 解锁灵敏度 · thr 阈值硬度 · bw0/1/2 底鼓/军鼓/帽镲权重 */
  var TKEY = 'yiu.beatTune.v1';
  var TDEF = { gridTol: 0.3, unlock: 0.24, thr: 0.45, bw0: 1, bw1: 0.45, bw2: 0.18, delay: 0, tempoBias: 0 };   // delay：视觉延迟补偿 ms（蓝牙耳机声音晚于画面时调大）
  var TUNE = {}, tk;
  for (tk in TDEF) TUNE[tk] = TDEF[tk];
  try {
    var _sv = JSON.parse(localStorage.getItem(TKEY) || 'null');
    if (_sv) for (tk in TDEF) if (isFinite(+_sv[tk]) && _sv[tk] !== null) TUNE[tk] = +_sv[tk];
  } catch (_) {}
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
  /* v6：节奏跟踪（自相关估速度 + 梳状滤波找相位）。不再靠「onset 间隔中位数」推速度，
     反拍贝斯 / 装饰音再多也不会把速度带偏；onset 只负责在预测拍点附近「校准」 */
  var ebuf = [], lastEst = 0, nextSlot = 0, tempoMiss = 0, phaseMiss = 0, lowConf = 0, confNow = 0;
  var SLOT_LATE = 50;      // 预测拍点之后多久还没等到 onset，就按网格补发（ms）

  function median(a) {
    if (!a.length) return 0;
    var s = a.slice().sort(function (x, y) { return x - y; });
    return s[Math.floor(s.length / 2)];
  }
  function foldBpm(b) { while (b < 70) b *= 2; while (b >= 160) b /= 2; return b; }
  function bpmNow() {
    if (locked && period > 0) return Math.round(foldBpm(60000 / period));
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
    ebuf.length = 0; lastEst = 0; nextSlot = 0; tempoMiss = 0; phaseMiss = 0; lowConf = 0; confNow = 0;
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
    return out[0] * TUNE.bw0 + out[1] * TUNE.bw1 + out[2] * TUNE.bw2;
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
    if (TUNE.delay > 0) { setTimeout(function () { fire(s); }, TUNE.delay); }   // 延迟补偿：只推迟视觉联动，不影响速度统计
    else fire(s);
  }

  function onCandidate(t, s) {
    var since = t - lastBeat;
    if (since < 180) return;                           // 硬下限：任何模式下都不快于 ~315 BPM

    if (!locked) {
      // 自由模式（刚开始 / 刚换段）：先用 onset 间隔顶着，等节奏估计出结果后自动锁定
      var cool = Math.max(200, Math.min(450, lastInterval * 0.55));
      if (since < cool) return;
      if (lastBeat) {
        var r = since / lastInterval;
        if (r < 0.45 || r > 2.2) return;
      }
      accept(t, s);
      return;
    }

    // 锁定模式：onset 必须落在「预测拍点」附近才算拍；反拍 / 装饰音直接丢弃
    var dev = t - nextSlot;
    var tolE = Math.max(50, TUNE.gridTol * period * 0.5);          // 提前侧容差（宽容度滑块）
    if (dev >= -tolE && dev <= SLOT_LATE) {
      accept(t, s);
      nextSlot += period + 0.2 * dev;                              // 相位微调：每个真实拍往实测位置靠 20%
      devSum += Math.abs(dev) / period; devN++;
      checkUnlock();
    }
  }

  function checkUnlock() {
    if (devN < 8) return;
    if (devSum / devN > TUNE.unlock) { locked = false; intervals.length = 0; lowConf = 0; }
    devSum = 0; devN = 0;
  }

  /* 节奏估计：每 400ms 对最近 ~8s 的 onset 包络做一次
     ① 自相关找拍周期（70–160 BPM，带 1× / 2× 倍周期加权，抛物线插值到亚 10ms 精度）
     ② 梳状滤波找相位（周期已定，哪个相位上的能量最大） */
  function estimateTempo(now) {
    var n = ebuf.length;
    if (n < 40) return;
    var t0 = ebuf[0].t, span = now - t0;
    if (span < 3500) return;
    lastEst = now;
    var STEP = 10, N = Math.floor(span / STEP);
    if (N < 300) return;
    var x = new Float32Array(N), j = 0, i, a, c, f;
    for (i = 0; i < N; i++) {
      var ti = t0 + i * STEP;
      while (j < n - 2 && ebuf[j + 1].t < ti) j++;
      a = ebuf[j]; c = ebuf[j + 1];
      f = (ti - a.t) / ((c.t - a.t) || 1);
      x[i] = a.v + (c.v - a.v) * (f < 0 ? 0 : f > 1 ? 1 : f);
    }
    // 去基线（约 0.6s 滑动均值）并截负，只留比周围「突出」的部分
    var W = 30, cs = new Float64Array(N + 1);
    for (i = 0; i < N; i++) cs[i + 1] = cs[i] + x[i];
    for (i = 0; i < N; i++) {
      var lo = Math.max(0, i - W), hi = Math.min(N, i + W + 1);
      var v = x[i] - (cs[hi] - cs[lo]) / (hi - lo);
      x[i] = v > 0 ? v : 0;
    }
    var LMIN = 33, LMAX = 90, LTOP = LMAX * 2 + 2, acf = new Float32Array(LTOP + 2), l, k, s0;
    for (l = 0; l <= LTOP; l++) {
      s0 = 0;
      for (k = 0; k + l < N; k++) s0 += x[k] * x[k + l];
      acf[l] = s0 / (N - l);
    }
    var r0 = acf[0];
    if (!(r0 > 1e-3)) { confNow = 0; noteLowConf(); return; }
    var best = -1, bestS = 0, sc = new Float32Array(LMAX + 2);
    for (l = LMIN - 1; l <= LMAX + 1; l++) sc[l] = acf[l] + 0.5 * acf[l * 2 <= LTOP ? l * 2 : l];
    for (l = LMIN; l <= LMAX; l++) {
      var oct = Math.log(l * STEP / 545) / Math.LN2;               // 以 ~110 BPM 为中心的温和先验
      var wv = sc[l] * Math.exp(-0.5 * oct * oct / 0.64);
      if (sc[l] >= sc[l - 1] && sc[l] >= sc[l + 1] && wv > bestS) { bestS = wv; best = l; }
    }
    if (best < 0) { confNow = 0; noteLowConf(); return; }
    // 八度歧义：周期和 2 倍周期得分常常几乎一样（75 BPM 被报成 150、158 被报成 79）。
    // 默认「自动」不干预；面板「速度倍率」可偏快 / 偏慢：对应候选得分够接近（≥90%）就取它
    if (TUNE.tempoBias !== 0) {
      var alt = TUNE.tempoBias > 0 ? Math.round(best / 2) : Math.round(best * 2), ab = alt, h2;
      if (alt >= LMIN && alt <= LMAX) {
        for (h2 = alt - 1; h2 <= alt + 1; h2++) if (h2 >= LMIN && h2 <= LMAX && sc[h2] > sc[ab]) ab = h2;
        var ao = Math.log(ab * STEP / 545) / Math.LN2;
        if (sc[ab] * Math.exp(-0.5 * ao * ao / 0.64) >= 0.9 * bestS && sc[ab] >= 0.85 * sc[best]) best = ab;
      }
    }
    var d1 = sc[best - 1], d2 = sc[best], d3 = sc[best + 1], den = d1 - 2 * d2 + d3;
    var off = den < 0 ? 0.5 * (d1 - d3) / den : 0;
    if (off > 1) off = 1; else if (off < -1) off = -1;
    var P = (best + off) * STEP;
    confNow = acf[best] / r0;

    // 相位：在一个周期内扫描，找梳状和最大的位置
    var bestPh = 0, bestC = -1, ph, sum, cnt, idx;
    for (ph = 0; ph < P; ph += STEP) {
      sum = 0; cnt = 0;
      for (idx = N - 1 - ph / STEP; idx >= 0; idx -= P / STEP) { sum += x[Math.round(idx)]; cnt++; }
      if (cnt > 0 && sum / cnt > bestC) { bestC = sum / cnt; bestPh = ph; }
    }
    var gt = t0 + (N - 1) * STEP - bestPh;                          // 最近一个网格拍点（ms，performance 时基）

    if (!locked) {
      if (confNow >= 0.15) {
        locked = true; period = P; lowConf = 0; tempoMiss = 0; phaseMiss = 0; devSum = 0; devN = 0;
        nextSlot = gt + Math.ceil((now - SLOT_LATE - gt) / P) * P;
      }
      return;
    }
    if (confNow < 0.07) { noteLowConf(); return; }
    lowConf = 0;
    // 速度：偏差小就平滑跟随，偏差大（换曲 / 变速）连续 3 次才重定
    var dp = (P - period) / period;
    if (Math.abs(dp) < 0.05) { period += 0.3 * (P - period); tempoMiss = 0; }
    else if (++tempoMiss >= 3) { period = P; tempoMiss = 0; phaseMiss = 99; }
    // 相位：和当前网格差不多就轻推，差太多连续 2 次才整体换相位
    var kk = Math.round((gt - nextSlot) / period);
    var dv = gt - (nextSlot + kk * period);
    if (Math.abs(dv) < 0.2 * period) { nextSlot += 0.35 * dv; phaseMiss = 0; }
    else if (++phaseMiss >= 2) {
      nextSlot = gt + Math.ceil((now - SLOT_LATE - gt) / period) * period; phaseMiss = 0;
    }
  }
  function noteLowConf() {
    if (locked && ++lowConf >= 4) { locked = false; intervals.length = 0; lowConf = 0; }
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

    ebuf.push({ t: now, v: env });
    var ecut = now - 8000, e0 = 0;
    while (e0 < ebuf.length && ebuf[e0].t < ecut) e0++;
    if (e0) ebuf.splice(0, e0);
    if (now - lastEst >= 400) estimateTempo(now);

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

    var thr = m + Math.max(FLOOR, (pk - m) * TUNE.thr);
    if (warmT > 400 && hist.length >= 6 && now - hist[0].t >= 500 && armed && env > FLOOR && env > thr) {
      armed = false; peakE = env;
      onCandidate(now, Math.min(2, Math.max(0.35, env / thr * 0.9)));
    }

    // 网格补拍：预测拍点过了 SLOT_LATE 还没等到 onset，就按网格补发（弱 15%）；安静段落只推进网格不发
    if (locked) {
      var guard = 0;
      while (now - nextSlot > SLOT_LATE && guard++ < 4) {
        if (quietT < 800) { accept(nextSlot, avgRecent() * 0.85); devSum += 0.5; devN++; }
        nextSlot += period;
        checkUnlock();
        if (!locked) break;
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
    tune: {
      defaults: TDEF,
      get: function () { var o = {}, k; for (k in TUNE) o[k] = TUNE[k]; return o; },
      set: function (k, v) {
        if (!(k in TDEF) || !isFinite(+v)) return;
        TUNE[k] = +v;
        try { localStorage.setItem(TKEY, JSON.stringify(TUNE)); } catch (_) {}
      },
      reset: function () {
        var k; for (k in TDEF) TUNE[k] = TDEF[k];
        try { localStorage.removeItem(TKEY); } catch (_) {}
      }
    },
    start: start,
    stop: stop
  };
})();
