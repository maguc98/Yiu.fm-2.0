(function (w) {
  'use strict';
  if (w.YiuLibrary && w.YiuLibrary.version === 1) return;
  var listeners = [];
  function legacy() { return w.SongLibrary || null; }
  function getSnapshot() {
    var api = legacy();
    if (!api || typeof api.list !== 'function') {
      return { version: 1, songs: [], currentId: null, isMusicMode: false, currentTitle: '', currentCover: '' };
    }
    var songs = api.list().map(function (song) { return Object.assign({}, song); });
    return {
      version: 1,
      songs: songs,
      currentId: typeof api.current === 'function' ? api.current() : null,
      isMusicMode: typeof api.isMusic === 'function' ? !!api.isMusic() : false,
      currentTitle: w.__musicTitle || '',
      currentCover: w.__musicCover || ''
    };
  }
  function publish(type) {
    var event = { type: type || 'librarychange', snapshot: getSnapshot() };
    listeners.slice().forEach(function (fn) { try { fn(event.snapshot, event); } catch (_) {} });
    w.dispatchEvent(new CustomEvent('yiufm:library', { detail: event }));
  }
  function call(name, args, fallback) {
    var api = legacy();
    if (!api || typeof api[name] !== 'function') return fallback;
    return api[name].apply(api, args || []);
  }
  function subscribe(callback) {
    if (typeof callback !== 'function') return function () {};
    if (listeners.indexOf(callback) < 0) listeners.push(callback);
    return function () {
      var i = listeners.indexOf(callback);
      if (i >= 0) listeners.splice(i, 1);
    };
  }
  w.YiuLibrary = {
    version: 1,
    getSnapshot: getSnapshot,
    subscribe: subscribe,
    notify: publish,
    select: function (id, autoPlay) { return call('select', [id, !!autoPlay], Promise.resolve()); },
    step: function (direction) { return call('step', [direction < 0 ? -1 : 1], false); },
    autoNext: function () { return call('autoNext', [], false); },
    peekNext: function () { return call('peekNext', [], null); },
    isMusic: function () { return !!call('isMusic', [], false); },
    remove: function (id, element) { return call('remove', [id, element], Promise.resolve()); },
    cover: function (id) { return call('cover', [id], Promise.resolve('')); },
    importScanned: function (items, options) {
      return call('importScanned', [items, options || {}], Promise.resolve({ added: 0, updated: 0, skipped: 0, failed: 0 }));
    },
    clearAll: function () { return call('clearAll', [], Promise.resolve()); }
  };
})(window);
