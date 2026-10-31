(function () {
  'use strict';

  var T = [];
  var cnt = {};

  function log() {
    var s = Array.prototype.slice.call(arguments).join(' ');
    T.push(s);
    console.log('[LP] ' + s);
  }

  function few(k, n) {
    cnt[k] = (cnt[k] || 0) + 1;
    return cnt[k] <= n;
  }

  function dump() {
    console.log('[LP] ---- last events ----');
    var tail = T.slice(-30);
    for (var i = 0; i < tail.length; i++) console.log('[LP] ' + tail[i]);
  }

  function short(v, n) {
    return String(v && v.url ? v.url : v).slice(0, n || 80);
  }

  function patch() {
    if (window.__lpPatched) return;
    window.__lpPatched = true;

    var gc = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t) {
      var r = gc.apply(this, arguments);
      if (few('gc', 20)) log('getContext ' + t + ' -> ' + (r ? 'ok' : 'null'));
      return r;
    };

    var f = window.fetch;
    if (f) {
      window.fetch = function (u) {
        var label = 'fetch ' + short(u);
        log(label);
        var p = f.apply(this, arguments);
        p.then(function (r) { log(label + ' ok ' + r.status); }, function (e) { log(label + ' FAIL ' + e); });
        return p;
      };
    }

    var xo = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (m, u) {
      log('xhr ' + m + ' ' + short(u));
      return xo.apply(this, arguments);
    };

    var cib = window.createImageBitmap;
    if (cib) {
      window.createImageBitmap = function () {
        log('createImageBitmap');
        var p = cib.apply(this, arguments);
        p.then(function () { log('createImageBitmap ok'); }, function (e) { log('createImageBitmap FAIL ' + e); });
        return p;
      };
    }

    var d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    if (d && d.set) {
      Object.defineProperty(HTMLImageElement.prototype, 'src', {
        get: d.get,
        set: function (v) {
          log('img.src ' + short(v, 60));
          d.set.call(this, v);
        },
        configurable: true
      });
    }

    if (window.FontFace && FontFace.prototype.load) {
      var fl = FontFace.prototype.load;
      FontFace.prototype.load = function () {
        var label = 'FontFace.load ' + this.family;
        log(label);
        var p = fl.apply(this, arguments);
        p.then(function () { log(label + ' ok'); }, function (e) { log(label + ' FAIL ' + e); });
        return p;
      };
    }

    if (document.fonts && document.fonts.load) {
      var dfl = document.fonts.load.bind(document.fonts);
      document.fonts.load = function (spec) {
        var label = 'fonts.load ' + short(spec, 60);
        log(label);
        var p = dfl.apply(null, arguments);
        p.then(function () { log(label + ' ok'); }, function (e) { log(label + ' FAIL ' + e); });
        return p;
      };
    }

    var W = window.Worker;
    if (W) {
      window.Worker = function (u, o) {
        log('new Worker ' + short(u, 60));
        return new W(u, o);
      };
      window.Worker.prototype = W.prototype;
    }

    var RO = window.ResizeObserver;
    if (RO) {
      window.ResizeObserver = function (cb) {
        log('new ResizeObserver');
        return new RO(function (e, o) {
          var r = e && e[0] ? e[0].contentRect : null;
          log('RO callback ' + (r ? Math.round(r.width) + 'x' + Math.round(r.height) : 'none'));
          cb(e, o);
        });
      };
      window.ResizeObserver.prototype = RO.prototype;
    }

    if (navigator.gpu && navigator.gpu.requestAdapter) {
      var ra = navigator.gpu.requestAdapter.bind(navigator.gpu);
      navigator.gpu.requestAdapter = function () {
        log('gpu.requestAdapter');
        var p = ra.apply(null, arguments);
        p.then(function (a) { log('gpu.requestAdapter ok ' + !!a); }, function (e) { log('gpu.requestAdapter FAIL ' + e); });
        return p;
      };
    }

    window.addEventListener('error', function (e) { log('window.error ' + (e && e.message)); });
    window.addEventListener('unhandledrejection', function (e) {
      var r = e && e.reason;
      log('unhandledrejection ' + (r && r.stack ? r.stack : r));
    });
  }

  function withTimeout(p, ms, label) {
    return new Promise(function (res) {
      var done = false;
      var t = setTimeout(function () {
        if (done) return;
        done = true;
        log(label + ' TIMEOUT ' + ms + 'ms');
        res('timeout');
      }, ms);
      p.then(function (v) {
        if (done) return;
        done = true;
        clearTimeout(t);
        log(label + ' OK');
        res(v);
      }, function (e) {
        if (done) return;
        done = true;
        clearTimeout(t);
        log(label + ' REJECT ' + (e && e.stack ? e.stack : e));
        res('reject');
      });
    });
  }

  function timeValue(initial) {
    var v = initial;
    var prev = initial;
    var ls = [];
    function set(n) {
      prev = v;
      v = n;
      for (var i = 0; i < ls.length; i++) ls[i](v);
    }
    return {
      get: function () { return v; },
      getPrevious: function () { return prev; },
      getVelocity: function () { return 0; },
      set: set,
      jump: set,
      on: function (ev, cb) {
        if (ev !== 'change') return function () {};
        ls.push(cb);
        return function () {
          var i = ls.indexOf(cb);
          if (i >= 0) ls.splice(i, 1);
        };
      },
      off: function (ev, cb) {
        var i = ls.indexOf(cb);
        if (i >= 0) ls.splice(i, 1);
      }
    };
  }

  function env(host) {
    var r = host.getBoundingClientRect();
    var cs = getComputedStyle(host);
    log('host rect ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' display=' + cs.display + ' visibility=' + cs.visibility + ' position=' + cs.position);
    log('dpr=' + window.devicePixelRatio + ' gpu=' + !!navigator.gpu + ' OffscreenCanvas=' + typeof OffscreenCanvas + ' createImageBitmap=' + typeof createImageBitmap + ' ResizeObserver=' + typeof ResizeObserver + ' Worker=' + typeof Worker);
    log('document.visibilityState=' + document.visibilityState + ' fonts.status=' + (document.fonts && document.fonts.status));
    var c1 = document.createElement('canvas');
    var c2 = document.createElement('canvas');
    log('webgl2=' + !!c1.getContext('webgl2') + ' webgl1=' + !!c2.getContext('webgl'));
    var n = 0;
    function tick() {
      n++;
      if (n < 5) requestAnimationFrame(tick);
      else log('rAF ok x5');
    }
    requestAnimationFrame(tick);
    setTimeout(function () { if (n < 5) log('rAF STALLED n=' + n); }, 1500);
    if (r.width < 2 || r.height < 2) {
      host.style.position = 'absolute';
      host.style.left = '0';
      host.style.top = '0';
      host.style.width = '100vw';
      host.style.height = '100vh';
      var r2 = host.getBoundingClientRect();
      log('host had no size, forced to ' + Math.round(r2.width) + 'x' + Math.round(r2.height));
    }
  }

  function pixiBare(pref) {
    var label = 'pixi bare ' + (pref || 'default');
    var P = window.PIXI;
    if (!P || !P.Application) {
      log(label + ' skipped, no window.PIXI');
      return Promise.resolve('skip');
    }
    var app = new P.Application();
    var init = typeof app.init === 'function'
      ? app.init(pref ? { width: 64, height: 64, preference: pref } : { width: 64, height: 64 })
      : Promise.resolve();
    return withTimeout(init, 4000, label).then(function (r) {
      try { app.destroy(true); } catch (e) {}
      return r;
    });
  }

  function createLumiere(host, opts) {
    var R = window.LumiereRuntime;
    if (!R || !R.LumierePixiRuntime) {
      log('LumiereRuntime missing');
      return Promise.resolve();
    }
    var ac = new AbortController();
    var tv = timeValue(0);
    var line = {
      fullText: 'test',
      startTime: 0,
      endTime: 5,
      words: ['t', 'e', 's', 't'].map(function (c, i) { return { text: c, startTime: i, endTime: i + 1 }; })
    };
    var copts = R.resolveLumiereCompileOptions ? R.resolveLumiereCompileOptions({ seamlessTransitions: true }) : {};
    var prog = R.compileLumiereProgram([line], 'probe', {}, copts);
    log('program compiled');
    var ms = opts.timeout || 8000;
    log('create() start');
    var p = R.LumierePixiRuntime.create({
      host: host,
      song: {
        seed: 'probe',
        program: prog,
        theme: { primaryColor: '#ffffff', textColor: '#ffffff', backgroundColor: '#000000', lyricsIcons: [] }
      },
      tuning: R.DEFAULT_LUMIERE_TUNING || {},
      currentTime: tv,
      audioPower: timeValue(0),
      audioBands: timeValue([0, 0, 0, 0]),
      staticMode: false,
      showText: true,
      paused: false,
      metadata: { title: '', artist: '', album: '' },
      signal: ac.signal
    });
    var stall = setTimeout(function () {
      log('create() STILL PENDING after ' + ms + 'ms, canvases in host=' + host.querySelectorAll('canvas').length);
      dump();
    }, ms);
    return p.then(function (rt) {
      clearTimeout(stall);
      window.__lp = rt;
      log('create() OK, canvases in host=' + host.querySelectorAll('canvas').length);
      return rt;
    }, function (e) {
      clearTimeout(stall);
      log('create() REJECT ' + (e && e.stack ? e.stack : e));
    });
  }

  function run(host, opts) {
    opts = opts || {};
    patch();
    log('probe start');
    env(host);
    var chain = Promise.resolve();
    if (!opts.skipPixi) {
      chain = chain.then(function () { return pixiBare('webgl'); }).then(function () { return pixiBare(); });
    }
    return chain.then(function () { return createLumiere(host, opts); });
  }

  window.LumiereProbe = { run: run, dump: dump, trace: T };
})();
