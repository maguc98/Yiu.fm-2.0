/* VisualizerManager：串行管理可视化引擎（Sonnet / Tempera / Lumiere），保证同一时刻最多一个 WebGL Context。
   - 适配器协议（生命周期，与现有 SonnetAdapter 对齐）：
       init(host, opts)  只登记宿主 / 参数，不创建 WebGL
       show()            真正创建运行时（可返回 Promise）
       destroy()         销毁运行时并释放 WebGL
       drive(ct) / loadLyrics(TS,WT,LN) / isAlive() / isActive() / whenReady()（后两者可选）
   - 切换：销毁所有存活引擎 → 等两帧 → init + show 新引擎。绝不并行。
   - drive 只转发给当前激活的适配器，避免每帧调用所有休眠引擎；
     loadLyrics 仍转发给所有适配器，确保下次切换时拿到最新歌词。
   - 不创建 Pixi Application，不碰 renderer.js 里 Sonnet 的 show/hide 流程。
*/
(function () {
  'use strict';

  var REG = {
    sonnet:  { hostId: 'sonnetHost',  modeClass: 'mode-sonnet',  adapter: 'SonnetAdapter'  },
    tempera: { hostId: 'temperaHost', modeClass: 'mode-tempera', adapter: 'TemperaAdapter' },
    lumiere: { hostId: 'lumiereHost', modeClass: 'mode-lumiere', adapter: 'LumiereAdapter', lazy: true },
  partita: { hostId: 'partitaHost', modeClass: 'mode-partita', adapter: 'PartitaAdapter', lazy: true },
    fume:    { hostId: 'fumeHost',    modeClass: 'mode-fume',    adapter: 'FumeAdapter' }   
  };
  var NAMES = Object.keys(REG);

  var current = null;      // Manager 自己切出来的引擎：'sonnet' | 'tempera' | null
  var switching = false;
  var want = null;         // 排队中的最新一次请求 { name, opts }；中间被覆盖的请求直接丢弃
  var waiters = [];        // 等待本轮切换收敛的 { ok, fail }
  var lastError = null;

  function warn(msg, e) { if (window.console) console.warn('[VisualizerManager] ' + msg, e || ''); }

  function hostOf(name) { return document.getElementById(REG[name].hostId); }
  function adapterOf(name) { return window[REG[name].adapter]; }

  function setStageMode(name) {
    var st = document.getElementById('stage');
    if (!st) return;
    NAMES.forEach(function (k) { st.classList.remove(REG[k].modeClass); });
    if (name) st.classList.add(REG[name].modeClass);
  }

  /* lazy 引擎：适配器的 init 就会创建运行时（异步），所以 boot 不能调 init，也不走 reuse；mount 里要等 isAlive */
  function waitAlive(ad, ms) {
    return new Promise(function (resolve) {
      var t0 = Date.now();
      (function poll() {
        if (typeof ad.isAlive !== 'function' || ad.isAlive() || Date.now() - t0 > ms) return resolve();
        setTimeout(poll, 80);
      })();
    });
  }

  function nextFrames(n) {
    return new Promise(function (resolve) {
      function step(i) {
        if (i <= 0) return resolve();
        requestAnimationFrame(function () { step(i - 1); });
      }
      step(n || 2);
    });
  }

  function isAlive(name) {
    var ad = adapterOf(name);
    return !!(ad && typeof ad.isAlive === 'function' && ad.isAlive());
  }
  function isActive(name) {
    var ad = adapterOf(name);
    return !!(ad && typeof ad.isActive === 'function' && ad.isActive());
  }

  /* 销毁一个引擎：先收集宿主里的 canvas → adapter.destroy() → 主动 loseContext（iOS 释放更及时）→ 清空宿主 */
  function safeDestroy(name) {
    var ad = adapterOf(name);
    var h = hostOf(name);
    var canvases = h ? Array.prototype.slice.call(h.querySelectorAll('canvas')) : [];
    if (ad && typeof ad.destroy === 'function') {
      try { ad.destroy(); } catch (e) { warn('destroy ' + name, e); }
    }
    canvases.forEach(function (cv) {
      try {
        var gl = cv.getContext('webgl2') || cv.getContext('webgl');
        var ext = gl && gl.getExtension && gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      } catch (_) { /* 已被 Pixi 释放：忽略 */ }
    });
    if (h) h.innerHTML = '';
  }

  /* 销毁所有存活（或曾被 Manager 切出来）的引擎，包括 renderer.js 自己拉起的 Sonnet */
  function teardownAll(prev) {
    var any = false;
    NAMES.forEach(function (k) {
      if (k === prev || isAlive(k) || isActive(k)) { any = true; safeDestroy(k); }
    });
    return any;
  }

  function mount(name, opts) {
    var ad = adapterOf(name);
    if (!ad || typeof ad.init !== 'function') {
      throw new Error('[VisualizerManager] 适配器未加载：' + REG[name].adapter);
    }
    var host = hostOf(name);
    if (!host) throw new Error('[VisualizerManager] 宿主容器缺失：#' + REG[name].hostId);
    ad.init(host, opts || {});
    var p = (typeof ad.show === 'function') ? ad.show() : null;
    return Promise.resolve(p).then(function () {
      if (typeof ad.whenReady === 'function') return ad.whenReady();
      return REG[name].lazy ? waitAlive(ad, 8000) : null;
    }).then(function () {
      if (typeof ad.isAlive === 'function' && !ad.isAlive()) {
        throw new Error('[VisualizerManager] ' + name + ' 创建失败（运行时未存活，详见控制台）');
      }
    });
  }

  function finish() {
    switching = false;
    var ws = waiters; waiters = [];
    var err = lastError; lastError = null;
    ws.forEach(function (w) { if (err) w.fail(err); else w.ok(current); });
  }

  /* 串行消费 want：每一轮 = 销毁 → 两帧 → 创建；期间新来的请求只覆盖 want，本轮结束后再处理 */
  function drain() {
    if (!want) { finish(); return Promise.resolve(); }
    var job = want; want = null;
    var prev = current;
    current = null;
    lastError = null;
    return Promise.resolve()
      .then(function () { setStageMode(job.name || null); return teardownAll(prev); })   // 目标类先挂上：renderer / StyleFX 据此选宿主，不闪回 #one
      .then(function (destroyed) { return destroyed ? nextFrames(2) : null; })            // 真销毁过东西才等两帧；空场首次创建不用等
      .then(function () {
        if (!job.name) return;
        setStageMode(job.name);              // 先挂 mode 类：宿主 display 才有尺寸，运行时才能量到画布大小
        return mount(job.name, job.opts).then(function () { current = job.name; });
      })
      .catch(function (e) {
        if (window.console) console.error('[VisualizerManager] 切换失败', e);
        lastError = e;
        try { teardownAll(job.name); } catch (_) {}
        current = null;
        setStageMode(null);
      })
      .then(drain);
  }

  /* reuse 快路径：目标引擎被保留着（hide 过但没销毁）、没有别的引擎存活、也不在切换中 → 只 show()，不销毁重建 */
  function canReuse(name) {
    if (switching || REG[name].lazy || !isAlive(name)) return false;
    for (var i = 0; i < NAMES.length; i++) if (NAMES[i] !== name && isAlive(NAMES[i])) return false;
    return true;
  }
  function reuse(name, opts) {
    var ad = adapterOf(name), host = hostOf(name);
    setStageMode(name);
    current = name;
    return Promise.resolve().then(function () {
      ad.init(host, opts || {});
      return (typeof ad.show === 'function') ? ad.show() : null;
    }).then(function () {
      return (typeof ad.whenReady === 'function') ? ad.whenReady() : null;
    }).then(function () {
      if (typeof ad.isAlive === 'function' && !ad.isAlive()) throw new Error('[VisualizerManager] ' + name + ' 恢复失败');
      return name;
    }, function (e) { current = null; setStageMode(null); throw e; });
  }

  function request(name, opts) {
    if (name && opts && opts.reuse && canReuse(name)) return reuse(name, opts);
    want = { name: name, opts: opts || {} };
    var p = new Promise(function (ok, fail) { waiters.push({ ok: ok, fail: fail }); });
    if (!switching) { switching = true; drain(); }
    return p;
  }

  var Manager = {
    version: '20261105a',

    /* 启动期：只让每个适配器登记宿主元素，不创建 WebGL，不改 stage 的 mode 类 */
    boot: function () {
      NAMES.forEach(function (k) {
        if (REG[k].lazy) return;
        var ad = adapterOf(k), h = hostOf(k);
        if (ad && h && typeof ad.init === 'function') {
          try { ad.init(h, {}); } catch (e) { warn('boot ' + k, e); }
        }
      });
    },

    /* 当前没有 Manager 切出的引擎时直接 switchTo；已有则也走 switchTo。返回 Promise */
    init: function (name, opts) {
      if (!REG[name]) return Promise.reject(new Error('[VisualizerManager] 未知引擎：' + name));
      return Manager.switchTo(name, opts);
    },

    switchTo: function (name, opts) {
      if (!REG[name]) return Promise.reject(new Error('[VisualizerManager] 未知引擎：' + name));
      return request(name, opts);
    },

    drive: function (ct) {
      for (var i = 0; i < NAMES.length; i++) {
        var ad = adapterOf(NAMES[i]);
        if (!ad || typeof ad.drive !== 'function') continue;
        // isActive is optional for legacy adapters; when provided, use it to
        // keep hidden engines completely out of the per-frame hot path.
        if (typeof ad.isActive === 'function' && !ad.isActive()) continue;
        try { ad.drive(ct); } catch (e) { warn('drive ' + NAMES[i], e); }
      }
    },

    /* 歌词要给所有适配器：未激活的也要缓存最新歌词，下次 show() 才不会是旧歌词 */
    loadLyrics: function (TS, WT, LN) {
      for (var i = 0; i < NAMES.length; i++) {
        var ad = adapterOf(NAMES[i]);
        if (ad && typeof ad.loadLyrics === 'function') {
          try { ad.loadLyrics(TS, WT, LN); } catch (e) { warn('loadLyrics ' + NAMES[i], e); }
        }
      }
    },

    /* 当前引擎：优先 Manager 自己切出的；否则看哪个适配器处于显示中（renderer.js 直接 show() 的 Sonnet 也能识别） */
    /* 立刻隐藏所有存活引擎（停 Ticker + 藏画布），不销毁；配合稍后的 destroy() 实现「离开 15 秒内回来不重建」 */
    hide: function () {
      NAMES.forEach(function (k) {
        var ad = adapterOf(k);
        if (ad && typeof ad.hide === 'function' && (isAlive(k) || isActive(k))) {
          try { ad.hide(); } catch (e) { warn('hide ' + k, e); }
        }
      });
      if (!switching) { current = null; setStageMode(null); }
    },

    /* 全屏墙面（Bravais）等需要临时挂起时调用；转发给支持的适配器 */
    setSuspended: function (v) {
      NAMES.forEach(function (k) {
        var ad = adapterOf(k);
        if (ad && typeof ad.setSuspended === 'function') { try { ad.setSuspended(v); } catch (e) { warn('setSuspended ' + k, e); } }
      });
    },

    get current() {
      if (current) return current;
      if (switching) return null;
      for (var i = 0; i < NAMES.length; i++) if (isActive(NAMES[i])) return NAMES[i];
      return null;
    },
    get isSwitching() { return switching; },

    /* 销毁全部引擎（页面卸载 / 调试用）。返回 Promise，等待进行中的切换收敛 */
    destroy: function () { return request(null, {}); },

    /* 调试：当前有多少个存活的 canvas / 各引擎状态 */
    debug: function () {
      var info = { version: Manager.version, current: Manager.current, switching: switching,
                   canvases: document.querySelectorAll('canvas:not(#sonnetRgb)').length, alive: {}, active: {}, hasIsActive: {} };
      NAMES.forEach(function (k) {
        var ad = adapterOf(k);
        info.alive[k] = isAlive(k); info.active[k] = isActive(k);
        info.hasIsActive[k] = !!(ad && typeof ad.isActive === 'function');   // false = 加载的是旧版适配器
      });
      return info;
    }
  };

  window.VisualizerManager = Manager;
})();
