(function (w) {
  'use strict';
  if (w.YiuPlaybackPreferences && w.YiuPlaybackPreferences.version === 1) return;
  var PLAY_MODE_KEY = 'playModeV1';
  function validMode(value) {
    var mode = Number(value);
    return mode === 0 || mode === 1 || mode === 2 ? mode : null;
  }
  function getPlayMode() {
    try {
      var saved = validMode(parseInt(w.localStorage.getItem(PLAY_MODE_KEY), 10));
      return saved === null ? 0 : saved;
    } catch (_) {
      return 0;
    }
  }
  function setPlayMode(value) {
    var mode = validMode(value);
    if (mode === null) return false;
    try {
      w.localStorage.setItem(PLAY_MODE_KEY, String(mode));
      return true;
    } catch (_) {
      return false;
    }
  }
  w.YiuPlaybackPreferences = {
    version: 1,
    getPlayMode: getPlayMode,
    setPlayMode: setPlayMode
  };
})(window);
