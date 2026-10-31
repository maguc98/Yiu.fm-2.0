(function () {
  'use strict';
  var KEY = 'lumLog';
  var MAX = 80;
  var buf = [];
  var t0 = Date.now();
  var drives = 0;
  try { buf = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { buf = []; }
  buf.push('--- start ' + new Date().toISOString());

  function save() {
    if (buf.length > MAX) buf = buf.slice(buf.length - MAX);
    try { localStorage.setItem(KEY, JSON.stringify(buf)); } catch (e) {}
  }
  function log(s) {
    buf.push(((Date.now() - t0) / 1000).toFixed(1) + ' ' + s);
    save();
  }
  function where() {
    try {
      var st = String(new Error().stack || '').split('\n').slice(3, 6);
      return st.map(function (x) { return x.replace(/https?:\/\/[^\s)]*\//, '').replace(/file:\/\/[^\s)]*\//, '').slice(0, 60); }).join(' < ');
    } catch (e) { return ''; }
  }
  function wrap(obj, name, label, withStack) {
    if (!obj || typeof obj[name] !== 'function' || obj[name].__t) return;
    var f = obj[name];
    var w = function () {
      var a0 = arguments[0];
      var tag = (typeof a0 === 'string' || typeof a0 === 'number') ? a0 : '';
      log(label + '.' + name + '(' + tag + ')' + (withStack ? ' @ ' + where() : ''));
      var r = f.apply(this, arguments);
      if (r && typeof r.then === 'function') {
        r.then(function () { log(label + '.' + name + ' done'); }, function (e) { log(label + '.' + name + ' FAIL ' + (e && e.message)); });
      }
      return r;
    };
    w.__t = 1;
    obj[name] = w;
  }

  var VM = window.VisualizerManager;
  ['switchTo', 'hide', 'destroy', 'init', 'setSuspended'].forEach(function (n) { wrap(VM, n, 'VM', true); });
  wrap(VM, 'loadLyrics', 'VM', true);
  ['LumiereAdapter', 'TemperaAdapter', 'SonnetAdapter'].forEach(function (k) {
    var ad = window[k];
    ['init', 'destroy', 'show', 'hide', 'loadLyrics'].forEach(function (n) { wrap(ad, n, k.slice(0, 3), n !== 'loadLyrics'); });
  });
  var LA = window.LumiereAdapter;
  if (LA && typeof LA.drive === 'function') {
    var d = LA.drive;
    LA.drive = function () { drives++; return d.apply(this, arguments); };
  }

  window.addEventListener('error', function (e) { log('ERR ' + (e && e.message)); });
  window.addEventListener('unhandledrejection', function (e) { log('REJ ' + (e && e.reason && (e.reason.message || e.reason))); });
  document.addEventListener('webglcontextlost', function () { log('GL LOST'); }, true);
  document.addEventListener('webglcontextrestored', function () { log('GL RESTORED'); }, true);
  document.addEventListener('visibilitychange', function () { log('vis ' + document.visibilityState); });
  window.addEventListener('pagehide', function () { log('pagehide'); });

  setInterval(function () {
    var c = document.querySelectorAll('canvas').length;
    var st = document.getElementById('stage');
    var cls = st ? st.className : '';
    try { localStorage.setItem('lumHb', ((Date.now() - t0) / 1000).toFixed(1) + ' cv=' + c + ' dr=' + drives + ' ' + cls); } catch (e) {}
  }, 1000);

  window.__lumLog = log;

  window.lumTrace = {
    show: function (n) { return (buf.slice(-(n || 10))).join('\n'); },
    clear: function () { buf = []; save(); localStorage.removeItem('lumHb'); return 'cleared'; }
  };
  save();
})();
