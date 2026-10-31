// SonnetPerfGovernor —— 商籁动态性能调节器
// 在运行时观测帧耗时，按 p50 / p95 分位数逐级降配（先调 modulation 无重建成本，
// 后调 tuning 有重建成本），实在扛不住就触发 onExit 切到轻量样式。
// 分级思想：L0-L2 只动 modulation（setModulation 热替换，无重建）；L3-L4 才动 tuning
// （setTuning 会 rebuildScenes ~300ms，须 ignore 600ms 再采样）；L5 退出。

(function (global) {
  'use strict';

  // perf: 分位数（最近秩）。采样窗口固定 60 帧，p50 看常态、p95 看尖峰。
  function percentile(values, q) {
    if (!values || !values.length) return 0;
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var pos = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
    return sorted[pos];
  }

  // perf: 统一的 toast 出口，走项目约定的 folia:toast 事件
  function toast(text) {
    try {
      global.dispatchEvent(new CustomEvent('folia:toast', { detail: { text: text, duration: 3500 } }));
    } catch (_) { /* 忽略 toast 失败，不打断调节流程 */ }
  }

  class SonnetPerfGovernor {
    constructor(opts) {
      this.runtime = opts.runtime;                      // SonnetPixiRuntime 实例
      this.userModulation = Object.assign({}, opts.userModulation || {});
      this.userTuning = Object.assign({}, opts.userTuning || {});
      this.targetFps = (opts.targetFps === undefined || opts.targetFps === null) ? 60 : opts.targetFps;
      this.onExit = opts.onExit || (function () {});
      this.onLevelChange = opts.onLevelChange || (function () {});
      this.targetDelta = 1000 / this.targetFps;
      this.windowSize = 60;
      this.cooldownMs = 2500;
      this.level = -1;
      this.maxLevel = 5;                                // perf: 默认可降到底（退出）；检测到 rAF 锁帧时封顶为 2
      this.frames = [];
      this.badStreak = 0;
      this.goodStreak = 0;
      this.lastLevelChangeAt = 0;
      this._ignoreUntil = 0;
      this.running = false;
      this._rafHandle = 0;
      this._lastTs = 0;
      this._observeUntil = 0;
      this._sawFastFrame = false;
      this._observed = false;
      this.detectedRafLock = false;
      this.exitNotified = false;
      this._exitSink = false;
      this.levels = [
        { id: 0, kind: "modulation", mod: null },
        { id: 1, kind: "modulation", mod: { cameraScale: 0.4, breathScale: 0, parallaxScale: 0, motionScale: 0.6, driftScale: 0, mgSwimScale: 0, caScale: 0, ghostScale: 0, transitionMotionScale: 0, transitionBlurScale: 0, transitionGlitchScale: 0 } },
        { id: 2, kind: "modulation", mod: { cameraScale: 0, breathScale: 0, parallaxScale: 0, motionScale: 0, driftScale: 0, mgSwimScale: 0, caScale: 0, ghostScale: 0, transitionMotionScale: 0, transitionBlurScale: 0, transitionGlitchScale: 0 } },
        { id: 3, kind: "tuning", tuning: { showBackgroundMg: false, showFixedGeo: false, showBackgroundDecor: false, showGiantDecorativeText: false } },
        { id: 4, kind: "tuning", tuning: { showBackgroundMg: false, showFixedGeo: false, showBackgroundDecor: false, showGiantDecorativeText: false, showGuide: false, outerFrameMode: "none", enableTransitions: false } },
        { id: 5, kind: "exit" },
      ];
    }

    // perf: 启动自带的 rAF 观测循环，先观察 5s（不降级，只探测 rAF 是否被外部锁帧）
    start() {
      if (this.running) return;
      this.running = true;
      this.level = 0;
      this.maxLevel = 5;
      this.frames = [];
      this.badStreak = 0;
      this.goodStreak = 0;
      this.lastLevelChangeAt = 0;
      this._ignoreUntil = 0;
      this._observeUntil = performance.now() + 5000;
      this._sawFastFrame = false;
      this._observed = false;
      this.detectedRafLock = false;
      this.exitNotified = false;
      this._exitSink = false;
      this._lastTs = 0;
      // perf: 从 L0 基线起步，保证和用户配置一致
      this._applyModulation(0);
      this._rafHandle = requestAnimationFrame(this._loop);
    }

    // perf: 停止观测并恢复到 L0（用户基线）
    stop() {
      this.running = false;
      if (this._rafHandle) { cancelAnimationFrame(this._rafHandle); this._rafHandle = 0; }
      this._lastTs = 0;
      this.level = 0;
      this._exitSink = false;
      this.exitNotified = false;
      this._applyModulation(0);
      // perf: 若之前降到了 tuning 级，恢复用户 tuning 基线（会触发一次 rebuild，属正常收尾）
      if (this.runtime && typeof this.runtime.setTuning === 'function') {
        try { this.runtime.setTuning(Object.assign({}, this.userTuning)); } catch (_) {}
      }
    }

    // perf: 更新调制基线；若当前正处在调制级（0/1/2），立刻重算并热替换，保持同步
    setUserModulation(mod) {
      this.userModulation = Object.assign({}, mod || {});
      if (this.level >= 0 && this.level <= 2) this._applyModulation(this.level);
    }

    // perf: 更新调优基线；若当前正处在 tuning 级（3/4），立刻重算并重建
    setUserTuning(tuning) {
      this.userTuning = Object.assign({}, tuning || {});
      if (this.level >= 3 && this.level <= 4) this._applyTuning(this.level);
    }

    // perf: 核心判定。每帧由内部 rAF 循环喂入真实帧间隔
    sample(deltaMs) {
      var now = performance.now();
      if (now < this._ignoreUntil) return;              // perf: rebuild 尖峰期间不采样，避免误判

      // perf: 观察期内只要见过 <22ms 的帧，就说明 rAF 没被外部锁在 ~30fps
      if (!this._observed && deltaMs < 22) this._sawFastFrame = true;

      this.frames.push(deltaMs);

      // perf: 观察期结束，做一次 rAF 锁帧判定（只做一次）
      if (!this._observed && now >= this._observeUntil) {
        this._observed = true;
        var obsP50 = percentile(this.frames, 0.5);
        if (!this._sawFastFrame && obsP50 > 28 && obsP50 < 40) {
          this.detectedRafLock = true;
          this.maxLevel = 2;                            // perf: 有重建成本的 L3/L4 不再降，封顶在调制级
          toast('检测到 rAF 被外部锁定在 ~30 FPS');
        }
        this.frames = [];                               // perf: 观察样本清零，重新起正常窗口
        this.badStreak = 0;
        this.goodStreak = 0;
        return;
      }

      if (!this._observed) return;                      // perf: 观察期内只收集，不判定
      if (this._exitSink) return;                       // perf: 已退出，不再处理
      if (this.frames.length < this.windowSize) return;

      var p50 = percentile(this.frames, 0.5);
      var p95 = percentile(this.frames, 0.95);
      this.frames = [];

      // perf: rAF 锁帧时按 30fps 容忍度评估，否则按目标 60fps
      var effectiveTarget = this.detectedRafLock ? (1000 / 30) : (1000 / this.targetFps);

      // perf: 严重超时（>2.2x）单次即降，不等连续窗口
      if (p50 > effectiveTarget * 2.2) {
        this.badStreak = 0; this.goodStreak = 0;
        this._downgrade('severe');
        return;
      }
      // perf: 偏慢（>1.4x）连续 2 个窗口才降
      if (p50 > effectiveTarget * 1.4) {
        this.badStreak++; this.goodStreak = 0;
        if (this.badStreak >= 2) { this.badStreak = 0; this._downgrade('bad'); }
        return;
      }
      // perf: 干净（p50<1.15x 且 p95<1.6x）连续 4 个窗口才升
      if (p50 < effectiveTarget * 1.15 && p95 < effectiveTarget * 1.6) {
        this.goodStreak++; this.badStreak = 0;
        if (this.goodStreak >= 4) { this.goodStreak = 0; this._upgrade('clean'); }
        return;
      }
      // perf: 中间地带，重置连续计数，防止偶发抖动累积
      this.badStreak = 0; this.goodStreak = 0;
    }

    // perf: 应用某一级。modulation 热替换零成本；tuning 重建后 ignore 600ms；exit 只触发一次
    applyLevel(level, force, reason) {
      if (level < 0 || level >= this.levels.length) return;
      if (level > this.maxLevel) level = this.maxLevel;         // perf: rAF 锁帧时封顶
      if (!force && level === this.level) return;
      var now = performance.now();
      if (!force && now - this.lastLevelChangeAt < this.cooldownMs) return;   // perf: 冷却防抖

      var def = this.levels[level];
      this.level = level;
      this.lastLevelChangeAt = now;
      try { this.onLevelChange(level, reason, def); } catch (_) {}

      if (def.kind === 'modulation') {
        this._applyModulation(level);
      } else if (def.kind === 'tuning') {
        this._applyTuning(level);
        // perf: rebuild ~300ms，清空窗口并 ignore 600ms，避免把重建尖峰误判成新卡顿
        this.frames = [];
        this._ignoreUntil = performance.now() + 600;
        this.badStreak = 0; this.goodStreak = 0;
      } else if (def.kind === 'exit') {
        if (!this.exitNotified) {
          this.exitNotified = true;
          this._exitSink = true;
          toast('商籁模式在当前设备上运行过重，已自动切换为轻量样式');
          try { this.onExit(); } catch (_) {}
        }
      }
    }

    // perf: 调制级 = 用户基线 ⊕ 本级覆盖值，热替换不触发重建
    _applyModulation(level) {
      if (!this.runtime || typeof this.runtime.setModulation !== 'function') return;
      var def = this.levels[level];
      var mod = Object.assign({}, this.userModulation, def && def.mod ? def.mod : {});
      try { this.runtime.setModulation(mod); } catch (_) {}
    }

    // perf: 调优级 = 用户基线 ⊕ 本级覆盖值，会触发 rebuildScenes
    _applyTuning(level) {
      if (!this.runtime || typeof this.runtime.setTuning !== 'function') return;
      var def = this.levels[level];
      var tuning = Object.assign({}, this.userTuning, def && def.tuning ? def.tuning : {});
      try { this.runtime.setTuning(tuning); } catch (_) {}
    }

    _downgrade(reason) {
      if (this.level >= 5) return;                              // perf: 已到退出级，不再降
      this.applyLevel(this.level + 1, false, reason);
    }

    _upgrade(reason) {
      if (this.level <= 0) return;
      this.applyLevel(this.level - 1, false, reason);
    }

    // perf: 内部 rAF 循环，跑在主线程，帧间隔本身就能反映真实卡顿
    _loop = (ts) => {
      if (!this.running) return;
      if (this._lastTs) this.sample(ts - this._lastTs);
      this._lastTs = ts;
      this._rafHandle = requestAnimationFrame(this._loop);
    };
  }

  // perf: 挂到全局，和 window.SonnetAdapter / window.SonnetRuntime 同风格
  global.SonnetPerfGovernor = SonnetPerfGovernor;
})(typeof window !== 'undefined' ? window : globalThis);
