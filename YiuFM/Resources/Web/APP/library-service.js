(function (w) {
  'use strict';

  // Library v1 standardizes access to the existing SongLibrary implementation.
  // IndexedDB, object URLs, import sequencing, and song-selection behavior stay
  // owned by song-library.js in this migration phase.
  if (w.YiuLibrary && w.YiuLibrary.version === 1) return;

  function legacy() {
    return w.SongLibrary || null;
  }

  function getSnapshot() {
    var api = legacy();
    if (!api || typeof api.list !== 'function') {
      return { version: 1, songs: [], currentId: null, isMusicMode: false };
    }
    var songs = api.list().map(function (song) {
      return Object.assign({}, song);
    });
    return {
      version: 1,
      songs: songs,
      currentId: typeof api.current === 'function' ? api.current() : null,
      isMusicMode: typeof api.isMusic === 'function' ? !!api.isMusic() : false
    };
  }

  function call(name, args, fallback) {
    var api = legacy();
    if (!api || typeof api[name] !== 'function') return fallback;
    return api[name].apply(api, args || []);
  }

  function subscribe(callback) {
    if (typeof callback !== 'function') return function () {};
    var api = legacy();
    if (!api || typeof api.onChange !== 'function') return function () {};
    return api.onChange(function () {
      try { callback(getSnapshot()); }
      catch (error) {
        if (w.console && console.warn) console.warn('[YiuLibrary] subscriber failed', error);
      }
    });
  }

  w.YiuLibrary = {
    version: 1,
    getSnapshot: getSnapshot,
    subscribe: subscribe,
    select: function (id, autoPlay) { return call('select', [id, !!autoPlay], Promise.resolve()); },
    step: function (direction) { return call('step', [direction < 0 ? -1 : 1], false); },
    autoNext: function () { return call('autoNext', [], false); },
    peekNext: function () { return call('peekNext', [], null); },
    isMusic: function () { return !!call('isMusic', [], false); },
    remove: function (id, element) { return call('remove', [id, element], Promise.resolve()); },
    cover: function (id) { return call('cover', [id], Promise.resolve('')); },
    importScanned: function (items, options) {
      return call('importScanned', [items, options || {}], Promise.resolve({
        added: 0, updated: 0, skipped: 0, failed: 0
      }));
    },
    clearAll: function () { return call('clearAll', [], Promise.resolve()); }
  };
})(window);
