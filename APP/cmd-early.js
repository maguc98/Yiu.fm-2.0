/* 命令窗口的「早期记录」：放在 <head> 最前面，比页面里别的脚本都先跑。
   作用：1) 记下命令窗口加载之前发生的报错和 console 输出  2) 网络记录开着时，从页面一开始就记 fetch / XHR / WebSocket / sendBeacon / EventSource，
   并保存请求内容和响应内容。数据放在 window.__cmEarly，由 cmd-console.js / cmd-extra.js 读取。网络记录关着时，这里只有几个监听器，几乎没有开销。 */
(function () {
  'use strict';
  if (window.__cmEarly) return;
  var E = window.__cmEarly = { t0: Date.now(), errs: [], logs: [], net: [], id: 0, netOn: false, errOn: true, logOn: true, installed: false };
  function ls(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  E.netOn = ls('cmd_net') === '1';
  var LIM = 20000, MAXB = 600000;

  function brief(v, n) {
    n = n || 160;
    var t = typeof v, s;
    try {
      if (v === null || t === 'undefined' || t === 'number' || t === 'boolean' || t === 'bigint') s = String(v);
      else if (t === 'string') s = v;
      else if (t === 'function') s = 'ƒ ' + (v.name || 'anonymous');
      else if (t === 'symbol') s = v.toString();
      else if (v instanceof Error) s = v.name + ': ' + v.message;
      else if (v && v.nodeType === 1) s = '<' + v.nodeName.toLowerCase() + (v.id ? '#' + v.id : '') + '>';
      else if (Array.isArray(v)) s = 'Array(' + v.length + ')';
      else { var k = Object.keys(v); s = '{' + k.slice(0, 6).join(', ') + (k.length > 6 ? ', …' : '') + '}'; }
    } catch (_) { s = '[?]'; }
    return s.length > n ? s.slice(0, n) + '…' : s;
  }
  E.brief = brief;

  /* ---- 报错 ---- */
  function errPush(msg, src) { if (!E.errOn) return; E.errs.push({ t: Date.now(), msg: msg, src: src || '' }); if (E.errs.length > 100) E.errs.shift(); }
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t !== window && (t.src || t.href)) { errPush('资源加载失败：' + (t.src || t.href), ''); return; }
    errPush(e.message || brief(e.error), e.filename ? String(e.filename).split('/').pop() + ':' + e.lineno + ':' + e.colno : '');
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    errPush('未处理的 Promise 拒绝：' + (r && r.message ? r.message : brief(r)), r && r.stack ? String(r.stack).split('\n')[1] || '' : '');
  });

  /* ---- console：只记到页面加载完 3 秒后，之后交给「同步 console」 ---- */
  var CON = ['log', 'info', 'warn', 'error', 'debug'], wrapped = {};
  CON.forEach(function (k) {
    var o = console[k];
    if (typeof o !== 'function') return;
    var w = function () {
      if (E.logOn) {
        try { E.logs.push({ t: Date.now(), k: k, s: Array.prototype.map.call(arguments, function (x) { return brief(x, 300); }).join(' ') }); if (E.logs.length > 200) E.logs.shift(); } catch (_) {}
      }
      return o.apply(console, arguments);
    };
    try { console[k] = w; wrapped[k] = { w: w, o: o }; } catch (_) {}
  });
  function logStop() {
    E.logOn = false;
    CON.forEach(function (k) { var x = wrapped[k]; if (x && console[k] === x.w) { try { console[k] = x.o; } catch (_) {} } });
  }
  E.logStop = logStop;
  window.addEventListener('load', function () { setTimeout(logStop, 3000); }, { once: true });

  try { if (performance.setResourceTimingBufferSize) performance.setResourceTimingBufferSize(1500); } catch (_) {}

  /* ---- 网络 ---- */
  function isText(ct) { return /^(text\/(?!event-stream)|application\/(json|xml|javascript|x-www-form-urlencoded|[\w.+-]*\+(json|xml)))/i.test(ct || ''); }
  function start(method, url, via) {
    var r = { id: ++E.id, t: Date.now(), t0: performance.now(), method: String(method || 'GET').toUpperCase(), url: String(url), via: via, status: 0, ms: null, size: null, err: '', ct: '', hd: [], rh: [], reqBody: null, resBody: null, resLen: 0, frames: null };
    E.net.push(r); if (E.net.length > 200) E.net.shift();
    return r;
  }
  function hdrList(h) {
    var out = [];
    try {
      if (!h) return out;
      if (typeof h.forEach === 'function' && !Array.isArray(h)) h.forEach(function (v, k) { if (out.length < 30) out.push(k + ': ' + v); });
      else if (Array.isArray(h)) h.forEach(function (p) { if (out.length < 30) out.push(p[0] + ': ' + p[1]); });
      else Object.keys(h).forEach(function (k) { if (out.length < 30) out.push(k + ': ' + h[k]); });
    } catch (_) {}
    return out;
  }
  function bodyBrief(b) {
    try {
      if (b == null) return null;
      if (typeof b === 'string') return b.length > LIM ? b.slice(0, LIM) + '…' : b;
      if (typeof URLSearchParams !== 'undefined' && b instanceof URLSearchParams) return b.toString();
      if (typeof FormData !== 'undefined' && b instanceof FormData) { var o = []; b.forEach(function (v, k) { o.push(k + '=' + (typeof v === 'string' ? (v.length > 200 ? v.slice(0, 200) + '…' : v) : '[文件 ' + (v.name || '') + ' ' + v.size + 'B]')); }); return '[FormData] ' + o.join('&'); }
      if (typeof Blob !== 'undefined' && b instanceof Blob) return '[Blob ' + b.size + 'B ' + (b.type || '') + ']';
      if (b instanceof ArrayBuffer) return '[ArrayBuffer ' + b.byteLength + 'B]';
      if (ArrayBuffer.isView(b)) return '[' + b.constructor.name + ' ' + b.byteLength + 'B]';
      return '[' + Object.prototype.toString.call(b) + ']';
    } catch (_) { return null; }
  }
  function fail(r, e) { r.ms = performance.now() - r.t0; r.err = e && e.message ? e.message : String(e); }

  var f0 = null, xo = null, xs = null, xh = null, bc = null, W0 = null, ES0 = null;
  function install() {
    if (E.installed) return;
    E.installed = true;
    if (window.fetch) {
      f0 = window.fetch;
      window.fetch = function (input, init) {
        if (!E.netOn) return f0.apply(this, arguments);
        var url = typeof input === 'string' ? input : (input && input.url) || String(input);
        var r = start((init && init.method) || (input && input.method) || 'GET', url, 'fetch');
        try { r.rh = hdrList((init && init.headers) || (input && input.headers)); r.reqBody = bodyBrief(init && init.body); } catch (_) {}
        var p;
        try { p = f0.apply(this, arguments); } catch (e) { fail(r, e); throw e; }
        return p.then(function (resp) {
          r.ms = performance.now() - r.t0; r.status = resp.status;
          try {
            var cl = resp.headers.get('content-length'); r.size = cl != null ? parseInt(cl, 10) : null;
            r.ct = resp.headers.get('content-type') || ''; r.hd = hdrList(resp.headers);
            if (isText(r.ct) && (r.size == null || r.size <= MAXB)) {
              resp.clone().text().then(function (t) { r.resBody = t.length > LIM ? t.slice(0, LIM) : t; r.resLen = t.length; if (r.size == null) r.size = t.length; r.ms = performance.now() - r.t0; }, function () {});
            }
          } catch (_) {}
          return resp;
        }, function (e) { fail(r, e); throw e; });
      };
    }
    if (window.XMLHttpRequest) {
      var P = XMLHttpRequest.prototype;
      xo = P.open; xs = P.send; xh = P.setRequestHeader;
      P.open = function (m, u) { this.__cmNet = { m: m, u: u, h: [] }; return xo.apply(this, arguments); };
      P.setRequestHeader = function (k, v) { var i = this.__cmNet; if (i && i.h.length < 30) i.h.push(k + ': ' + v); return xh.apply(this, arguments); };
      P.send = function (body) {
        var x = this, i = x.__cmNet;
        if (i && E.netOn) {
          var r = start(i.m, i.u, 'xhr'); r.rh = i.h; r.reqBody = bodyBrief(body);
          x.addEventListener('loadend', function () {
            r.ms = performance.now() - r.t0; r.status = x.status;
            if (!x.status) r.err = '失败或被取消';
            try {
              r.ct = x.getResponseHeader('content-type') || '';
              var cl = x.getResponseHeader('content-length'); r.size = cl != null ? parseInt(cl, 10) : null;
              var all = x.getAllResponseHeaders(); r.hd = all ? all.trim().split(/\r?\n/).slice(0, 30) : [];
              var t = null, rt = x.responseType;
              if (rt === '' || rt === 'text') t = x.responseText;
              else if (rt === 'json' && x.response != null) t = JSON.stringify(x.response);
              if (t != null && isText(r.ct || 'text/plain')) { r.resBody = t.length > LIM ? t.slice(0, LIM) : t; r.resLen = t.length; if (r.size == null) r.size = t.length; }
              else if (r.size == null && x.response && x.response.byteLength != null) r.size = x.response.byteLength;
              else if (r.size == null && x.response && x.response.size != null) r.size = x.response.size;
            } catch (_) {}
          });
        }
        return xs.apply(this, arguments);
      };
    }
    if (navigator.sendBeacon) {
      bc = navigator.sendBeacon;
      try {
        navigator.sendBeacon = function (url, data) {
          var ok = bc.apply(navigator, arguments);
          if (E.netOn) { var r = start('POST', url, 'beacon'); r.reqBody = bodyBrief(data); r.ms = 0; r.status = ok ? 202 : 0; if (!ok) r.err = '浏览器拒绝排队'; r.note = 'sendBeacon：只表示已排队，不一定送达'; }
          return ok;
        };
      } catch (_) {}
    }
    if (window.WebSocket) {
      W0 = window.WebSocket;
      var WS = function (url, protocols) {
        var ws = protocols === undefined ? new W0(url) : new W0(url, protocols);
        if (E.netOn) {
          try {
            var r = start('WS', url, 'ws'); r.frames = []; r.status = 0;
            var add = function (d, s) { if (r.frames.length < 80) r.frames.push({ t: Date.now(), d: d, s: typeof s === 'string' ? (s.length > 300 ? s.slice(0, 300) + '…' : s) : bodyBrief(s) }); };
            ws.addEventListener('open', function () { r.status = 101; r.ms = performance.now() - r.t0; });
            ws.addEventListener('message', function (e) { add('↓', e.data); });
            ws.addEventListener('error', function () { r.err = '连接出错'; });
            ws.addEventListener('close', function (e) { r.closed = e.code + (e.reason ? ' ' + e.reason : ''); if (r.ms == null) r.ms = performance.now() - r.t0; });
            var s0 = ws.send;
            ws.send = function (d) { add('↑', d); return s0.apply(this, arguments); };
          } catch (_) {}
        }
        return ws;
      };
      WS.prototype = W0.prototype;
      ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(function (k) { try { WS[k] = W0[k]; } catch (_) {} });
      try { window.WebSocket = WS; } catch (_) {}
    }
    if (window.EventSource) {
      ES0 = window.EventSource;
      var ES = function (url, cfg) {
        var es = cfg === undefined ? new ES0(url) : new ES0(url, cfg);
        if (E.netOn) {
          try {
            var r = start('SSE', url, 'sse'); r.frames = [];
            es.addEventListener('open', function () { r.status = 200; r.ms = performance.now() - r.t0; });
            es.addEventListener('message', function (e) { if (r.frames.length < 80) r.frames.push({ t: Date.now(), d: '↓', s: bodyBrief(e.data) }); });
            es.addEventListener('error', function () { r.err = '连接出错或已断开'; });
          } catch (_) {}
        }
        return es;
      };
      ES.prototype = ES0.prototype;
      ['CONNECTING', 'OPEN', 'CLOSED'].forEach(function (k) { try { ES[k] = ES0[k]; } catch (_) {} });
      try { window.EventSource = ES; } catch (_) {}
    }
  }
  E.setNet = function (on) {
    E.netOn = !!on;
    try { localStorage.setItem('cmd_net', on ? '1' : '0'); } catch (_) {}
    if (on) install();
  };
  if (E.netOn) install();

  /* ---- 探针（默认关闭）：定时器 / 观察器 / rAF ----
     由 cmd-console.js 的「定时器盘点」「观察器盘点」「rAF 监控」开启；localStorage cmd_probe=1（「提前统计开关」）时，
     定时器和观察器在页面一开始就挂钩，能统计到启动阶段。关着时这里只有函数定义，没有任何包装，不影响页面。
     统计只从开启那一刻起算；开启前就存在的看不到，开启前就缓存了 requestAnimationFrame 引用的循环也看不到。 */
  var P = E.probe = {
    early: ls('cmd_probe') === '1',
    on: { tm: false, ob: false, raf: false },
    t0: { tm: 0, ob: 0, raf: 0 },
    iv: {}, ivMade: 0, ivCleared: 0, to: { n: 0, by: {}, keys: 0 },
    ob: [], raf: { n: 0, by: {}, keys: 0 }
  };
  var HK = {};
  function hook(name, make) {
    if (HK[name]) return;
    var orig = window[name];
    if (typeof orig !== 'function') return;
    var wrap = make(orig);
    HK[name] = { orig: orig, wrap: wrap };
    try { window[name] = wrap; } catch (_) { delete HK[name]; }
  }
  function unhook(name) {
    var h = HK[name];
    if (h && window[name] === h.wrap) { try { window[name] = h.orig; delete HK[name]; } catch (_) {} }
    /* 如果别的脚本又包了一层，就保留这层「空转」的包装：P.on 为 false 时它只是原样转发 */
  }
  function srcOf() {
    try {
      var ln = String(new Error().stack || '').split('\n');
      for (var i = 0; i < ln.length; i++) {
        var l = ln[i];
        if (!l || l === 'Error' || l.indexOf('cmd-early') >= 0) continue;
        var m = /([^\/\s()@]+:\d+):\d+\)?\s*$/.exec(l);
        if (m) return m[1].replace(/\?[^:]*/, '');
      }
    } catch (_) {}
    return '?';
  }
  function hid() { return !!document.hidden; }

  function hookTimers() {
    hook('setInterval', function (o) {
      return function (fn, ms) {
        if (!P.on.tm || typeof fn !== 'function') return o.apply(this, arguments);
        var rec = { src: srcOf(), ms: +ms || 0, t: performance.now(), fires: 0, tot: 0, hf: 0, htot: 0 };
        var args = Array.prototype.slice.call(arguments);
        args[0] = function () {
          var a = performance.now();
          try { return fn.apply(this, arguments); }
          finally { var d = performance.now() - a; rec.fires++; rec.tot += d; if (hid()) { rec.hf++; rec.htot += d; } }
        };
        var id = o.apply(this, args);
        P.iv[id] = rec; P.ivMade++;
        return id;
      };
    });
    hook('clearInterval', function (o) {
      return function (id) {
        if (P.iv[id]) { delete P.iv[id]; P.ivCleared++; }
        return o.apply(this, arguments);
      };
    });
    hook('setTimeout', function (o) {
      return function () {
        if (P.on.tm) {
          try {
            var s = srcOf(), b = P.to.by[s];
            P.to.n++;
            if (b) b.n++; else if (P.to.keys < 200) { P.to.by[s] = { n: 1 }; P.to.keys++; }
          } catch (_) {}
        }
        return o.apply(this, arguments);
      };
    });
  }
  function hookObs(name, tag) {
    hook(name, function (O0) {
      var W = function (cb) {
        if (!P.on.ob || typeof cb !== 'function') return new O0(cb);
        var rec = { tag: tag, src: srcOf(), t: performance.now(), calls: 0, tot: 0, recs: 0, hc: 0, targets: 0, on: false };
        var o = new O0(function (list) {
          var a = performance.now();
          try { return cb.apply(this, arguments); }
          finally {
            rec.calls++; rec.tot += performance.now() - a;
            try { rec.recs += list.length; } catch (_) {}
            if (hid()) rec.hc++;
          }
        });
        var ob0 = o.observe, dc0 = o.disconnect;
        o.observe = function () { rec.targets++; rec.on = true; return ob0.apply(this, arguments); };
        o.disconnect = function () { rec.on = false; return dc0.apply(this, arguments); };
        P.ob.push(rec); if (P.ob.length > 500) P.ob.shift();
        return o;
      };
      W.prototype = O0.prototype;
      return W;
    });
  }
  function hookRaf() {
    hook('requestAnimationFrame', function (o) {
      var cache = typeof WeakMap === 'function' ? new WeakMap() : null;
      return function (cb) {
        if (P.on.raf) {
          try {
            var s = cache && typeof cb === 'function' ? cache.get(cb) : undefined;
            if (!s) { s = srcOf(); if (cache && typeof cb === 'function') cache.set(cb, s); }
            P.raf.n++;
            var b = P.raf.by[s];
            if (b) b.n++; else if (P.raf.keys < 100) { P.raf.by[s] = { n: 1 }; P.raf.keys++; }
          } catch (_) {}
        }
        return o.apply(this, arguments);
      };
    });
  }
  /* k：'tm' 定时器 / 'ob' 观察器 / 'raf'。开启时清零重新统计；已经开着就什么也不做（返回 false） */
  P.start = function (k) {
    if (P.on[k]) return false;
    P.on[k] = true; P.t0[k] = performance.now();
    if (k === 'tm') { P.iv = {}; P.ivMade = 0; P.ivCleared = 0; P.to = { n: 0, by: {}, keys: 0 }; hookTimers(); }
    else if (k === 'ob') { P.ob = []; hookObs('MutationObserver', 'MO'); hookObs('ResizeObserver', 'RO'); }
    else if (k === 'raf') { P.raf = { n: 0, by: {}, keys: 0 }; hookRaf(); }
    return true;
  };
  /* 停止并尽量还原原函数；数据保留，方便停了之后再看 */
  P.stop = function (k) {
    if (!P.on[k]) return false;
    P.on[k] = false;
    if (k === 'tm') { unhook('setInterval'); unhook('clearInterval'); unhook('setTimeout'); }
    else if (k === 'ob') { unhook('MutationObserver'); unhook('ResizeObserver'); }
    else if (k === 'raf') unhook('requestAnimationFrame');
    return true;
  };
  P.setEarly = function (on) {
    P.early = !!on;
    try { localStorage.setItem('cmd_probe', on ? '1' : '0'); } catch (_) {}
  };
  if (P.early) { P.start('tm'); P.start('ob'); }
})();
