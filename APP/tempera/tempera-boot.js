(function () {
  var w = typeof window !== 'undefined' ? window : globalThis;
  w.__temperaBootLog = w.__temperaBootLog || [];
  function log(m) { try { w.__temperaBootLog.push(String(m)); } catch (e) {} }
  log('tempera-boot: start');

  if (!Array.prototype.at) {
    Object.defineProperty(Array.prototype, 'at', { configurable: true, writable: true, value: function at(n) {
      var len = this.length >>> 0; n = Math.trunc(n) || 0; if (n < 0) n += len;
      return (n < 0 || n >= len) ? undefined : this[n];
    }});
  }
  if (!String.prototype.at) {
    Object.defineProperty(String.prototype, 'at', { configurable: true, writable: true, value: function at(n) {
      var s = String(this), len = s.length; n = Math.trunc(n) || 0; if (n < 0) n += len;
      return (n < 0 || n >= len) ? undefined : s.charAt(n);
    }});
  }
  if (!Object.hasOwn) {
    Object.hasOwn = function (o, p) { return Object.prototype.hasOwnProperty.call(o, p); };
  }
  if (!Array.prototype.findLast) {
    Object.defineProperty(Array.prototype, 'findLast', { configurable: true, writable: true, value: function (p, t) {
      for (var i = this.length - 1; i >= 0; i--) if (p.call(t, this[i], i, this)) return this[i];
      return undefined;
    }});
  }
  if (!Array.prototype.findLastIndex) {
    Object.defineProperty(Array.prototype, 'findLastIndex', { configurable: true, writable: true, value: function (p, t) {
      for (var i = this.length - 1; i >= 0; i--) if (p.call(t, this[i], i, this)) return i;
      return -1;
    }});
  }
  if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function (search, replacement) {
      var s = String(this);
      if (search instanceof RegExp) {
        if (!search.global) throw new TypeError('replaceAll must be called with a global RegExp');
        return s.replace(search, replacement);
      }
      return s.split(String(search)).join(String(replacement));
    };
  }
  if (typeof Promise.withResolvers !== 'function') {
    Promise.withResolvers = function () {
      var resolve, reject;
      var promise = new Promise(function (r, j) { resolve = r; reject = j; });
      return { promise: promise, resolve: resolve, reject: reject };
    };
  }
  if (typeof structuredClone === 'undefined') {
    w.structuredClone = function (v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); };
  }
  if (!w.TemperaRuntime) {
    w.TemperaRuntime = {
      __placeholder: true,
      __booted: false,
      create: function () {
        return Promise.reject(new Error('TemperaRuntime not booted yet. Check window.__temperaBootLog.'));
      }
    };
  }
  w.addEventListener('error', function (e) {
    log('window.error: ' + (e && (e.message || e.error || e)));
  }, true);
  w.addEventListener('unhandledrejection', function (e) {
    log('unhandledrejection: ' + (e && e.reason ? e.reason : e));
  });
  log('tempera-boot: done');
})();
