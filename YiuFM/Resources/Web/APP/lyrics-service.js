(function (w) {
  'use strict';

  // Lyrics v1 is a boundary around the legacy LRC parser and lyric globals.
  // It does not own the timeline, renderer, DOM, or playback clock.
  if (w.YiuLyrics && w.YiuLyrics.version === 1) return;

  function copyArray(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  function getSnapshot() {
    var lines = copyArray(w.LN);
    var times = copyArray(w.TS);
    var words = copyArray(w.WT);
    var index = typeof w.idx === 'number' && isFinite(w.idx) ? w.idx : 0;
    var meta = w.LRC_META && typeof w.LRC_META === 'object'
      ? Object.assign({}, w.LRC_META)
      : {};

    return {
      version: 1,
      lines: lines,
      timestamps: times,
      wordTimings: words,
      metadata: meta,
      currentIndex: index,
      progress: typeof w.prog === 'number' && isFinite(w.prog) ? w.prog : 0,
      count: lines.length
    };
  }

  function parse(text) {
    if (typeof w.parseLRC !== 'function') {
      throw new Error('The legacy LRC parser is not available yet.');
    }
    return w.parseLRC(text);
  }

  function apply(parsed) {
    if (!parsed || !Array.isArray(parsed.items)) {
      throw new TypeError('Expected the parsed LRC object returned by YiuLyrics.parse().');
    }
    if (typeof w.applyLRC !== 'function') {
      throw new Error('The legacy LRC apply function is not available yet.');
    }
    return w.applyLRC(parsed);
  }

  function seek(index, playNow) {
    if (w.YiuPlayback && typeof w.YiuPlayback.jumpToLyric === 'function') {
      return w.YiuPlayback.jumpToLyric(index, playNow);
    }
    if (typeof w.gotoIdx !== 'function' || !isFinite(Number(index))) return false;
    var count = Array.isArray(w.LN) ? w.LN.length : 0;
    if (!count) return false;
    w.gotoIdx(Math.max(0, Math.min(count - 1, Math.floor(Number(index)))), !!playNow);
    return true;
  }

  function subscribe(callback) {
    if (typeof callback !== 'function') return function () {};
    if (!w.YiuPlayback || typeof w.YiuPlayback.subscribe !== 'function') {
      return function () {};
    }
    return w.YiuPlayback.subscribe(function (event) {
      if (!event || (event.type !== 'lyricschange' && event.type !== 'lyricindexchange')) return;
      try {
        callback({ type: event.type, snapshot: getSnapshot() });
      } catch (error) {
        if (w.console && console.warn) console.warn('[YiuLyrics] subscriber failed', error);
      }
    });
  }

  w.YiuLyrics = {
    version: 1,
    getSnapshot: getSnapshot,
    parse: parse,
    apply: apply,
    seek: seek,
    subscribe: subscribe
  };
})(window);
