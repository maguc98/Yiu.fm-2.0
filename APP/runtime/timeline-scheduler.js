/* Yiu.fm 2.0 — Timeline Scheduler
 * Deterministic, audio-time-driven event queue. No timers and no RAF loop.
 * The caller supplies the current lyric time from the existing playback loop.
 */
(function (global) {
  'use strict';

  function finite(value) {
    return typeof value === 'number' && isFinite(value);
  }

  function lowerBound(events, time) {
    var lo = 0, hi = events.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (events[mid].time < time) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  function upperBound(events, time) {
    var lo = 0, hi = events.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (events[mid].time <= time) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  function create(onEvent) {
    var events = [];
    var cursor = 0;
    var lastTime = -Number.EPSILON;
    var includeCurrentAt = null;
    var timelineVersion = 0;

    function setTimeline(TS, WT, LN, options) {
      TS = Array.isArray(TS) ? TS : [];
      WT = Array.isArray(WT) ? WT : [];
      LN = Array.isArray(LN) ? LN : [];
      options = options || {};
      var next = [];

      for (var i = 0; i < TS.length; i++) {
        var start = Number(TS[i]);
        if (isFinite(start) && start >= 0) {
          next.push({
            type: 'line-start', time: start, lineIndex: i,
            wordIndex: null, text: String(LN[i] == null ? '' : LN[i]), priority: 1
          });
        }
        if (i + 1 < TS.length) {
          var end = Number(TS[i + 1]);
          if (isFinite(end) && end >= 0) {
            next.push({
              type: 'line-end', time: end, lineIndex: i,
              wordIndex: null, text: String(LN[i] == null ? '' : LN[i]), priority: 0
            });
          }
        }
        var words = Array.isArray(WT[i]) ? WT[i] : [];
        for (var j = 0; j < words.length; j++) {
          var wordTime = Number(words[j]);
          if (!isFinite(wordTime) || wordTime < 0) continue;
          next.push({
            type: 'word-start', time: wordTime, lineIndex: i,
            wordIndex: j, text: '', priority: 2
          });
        }
      }

      next.sort(function (a, b) {
        return a.time - b.time || a.priority - b.priority ||
          a.lineIndex - b.lineIndex ||
          ((a.wordIndex == null ? -1 : a.wordIndex) - (b.wordIndex == null ? -1 : b.wordIndex));
      });

      events = next;
      timelineVersion++;
      if (finite(options.currentTime)) {
        lastTime = options.currentTime;
        cursor = options.includeCurrent ? lowerBound(events, options.currentTime) : upperBound(events, options.currentTime);
        includeCurrentAt = options.includeCurrent ? options.currentTime : null;
      } else {
        lastTime = -Number.EPSILON;
        cursor = 0;
        includeCurrentAt = null;
      }
      return events.length;
    }

    function advance(currentTime) {
      if (!finite(currentTime) || currentTime < 0) return [];
      if (currentTime < lastTime) {
        // A seek/restart: include an event exactly at the target timestamp.
        lastTime = currentTime;
        cursor = lowerBound(events, currentTime);
        includeCurrentAt = currentTime;
        return [];
      }

      var emitted = [];
      while (cursor < events.length && events[cursor].time <= currentTime) {
        var event = events[cursor++];
        if (event.time > lastTime || event.time === includeCurrentAt || (lastTime < 0 && event.time === 0)) {
          var copy = {
            type: event.type,
            time: event.time,
            lineIndex: event.lineIndex,
            wordIndex: event.wordIndex,
            text: event.text
          };
          emitted.push(copy);
          if (typeof onEvent === 'function') {
            try { onEvent(copy); } catch (error) {
              if (global.console && console.warn) console.warn('[YiuTimelineScheduler] callback failed', error);
            }
          }
        }
      }
      lastTime = currentTime;
      includeCurrentAt = null;
      return emitted;
    }

    function reset(time, options) {
      options = options || {};
      if (!finite(time) || time < 0) time = 0;
      lastTime = time;
      cursor = options.includeCurrent ? lowerBound(events, time) : upperBound(events, time);
      includeCurrentAt = options.includeCurrent ? time : null;
    }

    return {
      version: '2.0-phase1',
      setTimeline: setTimeline,
      advance: advance,
      reset: reset,
      getSnapshot: function () {
        return {
          eventCount: events.length,
          cursor: cursor,
          lastTime: lastTime,
          remainingEvents: Math.max(0, events.length - cursor),
          timelineVersion: timelineVersion
        };
      }
    };
  }

  if (!global.YiuTimelineScheduler) global.YiuTimelineScheduler = { create: create };
})(window);
