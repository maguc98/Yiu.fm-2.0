(function (w) {
  'use strict';
  if (w.YiuPlayback && w.YiuPlayback.version === 1) return;
  var listeners = [];
  var audio = function () { return w.audio || document.getElementById('audio'); };
  function snapshot() {
    var a = audio(), ts = Array.isArray(w.TS) ? w.TS : [];
    return {
      version: 1,
      currentTime: a && isFinite(a.currentTime) ? a.currentTime : 0,
      duration: a && isFinite(a.duration) ? a.duration : 0,
      isPlaying: a ? !a.paused : !!w.playing,
      audioReady: !!(w.AUDIO_ON && a && a.src),
      lyricIndex: isFinite(w.idx) ? w.idx : 0,
      lyricProgress: isFinite(w.prog) ? w.prog : 0,
      lyricCount: Array.isArray(w.LN) ? w.LN.length : ts.length
    };
  }
  function emit(type) {
    var event = { type: type, snapshot: snapshot() };
    listeners.slice().forEach(function (fn) { try { fn(event); } catch (_) {} });
    w.dispatchEvent(new CustomEvent('yiufm:playback', { detail: event }));
  }
  function subscribe(fn) {
    if (typeof fn !== 'function') return function () {};
    if (listeners.indexOf(fn) < 0) listeners.push(fn);
    return function () {
      var i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }
  function wrap(name, type) {
    var old = w[name];
    if (typeof old !== 'function' || old.__yiuPlaybackWrapped) return;
    var next = function () {
      var result = old.apply(this, arguments);
      emit(type);
      return result;
    };
    next.__yiuPlaybackWrapped = true;
    w[name] = next;
  }
  var a = audio();
  if (a) ['play','pause','timeupdate','loadedmetadata','durationchange','seeking','seeked','ended','error'].forEach(function (name) {
    a.addEventListener(name, function () { emit(name); });
  });
  wrap('setPlay', 'playbackstatechange');
  wrap('gotoIdx', 'lyricindexchange');
  wrap('applyLRC', 'lyricschange');
  w.YiuPlayback = {
    version: 1,
    getSnapshot: snapshot,
    subscribe: subscribe,
    play: function () { if (typeof w.setPlay === 'function') w.setPlay(true); },
    pause: function () { if (typeof w.setPlay === 'function') w.setPlay(false); },
    toggle: function () { if (typeof w.setPlay === 'function') w.setPlay(!w.playing); },
    seek: function (seconds) {
      var el = audio(), value = Number(seconds);
      if (!el || !isFinite(value)) return false;
      value = Math.max(0, value);
      if (isFinite(el.duration) && el.duration > 0) value = Math.min(value, el.duration);
      try { el.currentTime = value; emit('seekcommand'); return true; } catch (_) { return false; }
    },
    jumpToLyric: function (index, playNow) {
      var count = Array.isArray(w.LN) ? w.LN.length : 0;
      if (!count || typeof w.gotoIdx !== 'function' || !isFinite(Number(index))) return false;
      w.gotoIdx(Math.max(0, Math.min(count - 1, Math.floor(Number(index)))), !!playNow);
      return true;
    },
    next: function () {
      if (typeof w.goNext !== 'function') return false;
      w.goNext();
      return true;
    }
  };
  emit('ready');
})(window);
