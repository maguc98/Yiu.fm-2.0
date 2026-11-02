/* Yiu.fm 2.0 — Audio Clock
 * Phase 1: read-only clock facade. It observes the existing audio element;
 * it does not create a timer, RAF loop, or control playback.
 */
(function (global) {
  'use strict';

  var EVENTS = [
    'play', 'playing', 'pause', 'ended', 'timeupdate',
    'seeking', 'seeked', 'ratechange', 'loadedmetadata',
    'durationchange', 'waiting', 'canplay', 'emptied', 'volumechange'
  ];

  function create(audio) {
    var listeners = [];
    var attached = false;
    var bound = [];

    function snapshot() {
      var a = audio;
      if (!a) {
        return {
          currentTime: 0, duration: null, playbackRate: 1,
          paused: true, seeking: false, ended: false,
          readyState: 0, attached: false
        };
      }
      var duration = Number(a.duration);
      var rate = Number(a.playbackRate);
      var time = Number(a.currentTime);
      return {
        currentTime: isFinite(time) && time >= 0 ? time : 0,
        duration: isFinite(duration) && duration >= 0 ? duration : null,
        playbackRate: isFinite(rate) && rate > 0 ? rate : 1,
        paused: !!a.paused,
        seeking: !!a.seeking,
        ended: !!a.ended,
        readyState: Number(a.readyState) || 0,
        attached: attached
      };
    }

    function emit(type, originalEvent) {
      var event = {
        type: type,
        snapshot: snapshot(),
        originalEvent: originalEvent || null
      };
      listeners.slice().forEach(function (fn) {
        try { fn(event); } catch (error) {
          if (global.console && console.warn) console.warn('[YiuAudioClock] subscriber failed', error);
        }
      });
    }

    function detach() {
      if (audio && attached && typeof audio.removeEventListener === 'function') {
        bound.forEach(function (item) {
          audio.removeEventListener(item.type, item.handler);
        });
      }
      bound = [];
      attached = false;
    }

    function attach(nextAudio) {
      if (nextAudio === audio && attached) return api;
      detach();
      audio = nextAudio || null;
      if (!audio || typeof audio.addEventListener !== 'function') {
        emit('detached');
        return api;
      }
      EVENTS.forEach(function (type) {
        var handler = function (event) { emit(type, event); };
        audio.addEventListener(type, handler);
        bound.push({ type: type, handler: handler });
      });
      attached = true;
      emit('attached');
      return api;
    }

    function subscribe(fn) {
      if (typeof fn !== 'function') return function () {};
      listeners.push(fn);
      return function () {
        listeners = listeners.filter(function (item) { return item !== fn; });
      };
    }

    var api = {
      version: '2.0-phase1',
      attach: attach,
      refresh: function () {
        if ((!audio || !attached) && global.document) {
          attach(global.document.getElementById('audio'));
        }
        return snapshot();
      },
      getTime: function () { return snapshot().currentTime; },
      getSnapshot: snapshot,
      subscribe: subscribe,
      destroy: function () { detach(); listeners = []; audio = null; },
      create: create
    };

    if (audio) attach(audio);
    return api;
  }

  if (!global.YiuAudioClock) {
    var audioElement = global.document && global.document.getElementById('audio');
    global.YiuAudioClock = create(audioElement);
  }
})(window);
