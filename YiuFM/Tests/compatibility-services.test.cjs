const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function createHarness() {
  const audioListeners = Object.create(null);
  const windowListeners = Object.create(null);
  const emitted = [];
  const audio = {
    paused: true,
    currentTime: 12,
    duration: 100,
    src: 'blob:fixture',
    addEventListener(name, callback) {
      (audioListeners[name] ||= []).push(callback);
    },
    removeEventListener(name, callback) {
      audioListeners[name] = (audioListeners[name] || []).filter(fn => fn !== callback);
    }
  };

  const songs = [{ id: 7, name: 'Fixture Song', artist: 'Fixture Artist' }];
  let currentId = 7;
  let libraryListener = null;
  let playing = false;

  const window = {
    audio,
    AUDIO_ON: true,
    TS: [0, 20],
    WT: [null, null],
    LN: ['First line', 'Second line'],
    LRC_META: { ti: 'Fixture Song' },
    idx: 0,
    prog: 0.25,
    playing,
    addEventListener(name, callback) {
      (windowListeners[name] ||= []).push(callback);
    },
    dispatchEvent(event) {
      emitted.push(event);
      (windowListeners[event.type] || []).forEach(fn => fn(event));
      return true;
    },
    SongLibrary: {
      list: () => songs.slice(),
      current: () => currentId,
      isMusic: () => true,
      onChange(callback) {
        libraryListener = callback;
        return () => { if (libraryListener === callback) libraryListener = null; };
      },
      select(id, autoPlay) {
        currentId = id;
        return Promise.resolve({ id, autoPlay });
      },
      step: direction => direction,
      autoNext: () => true,
      peekNext: () => 9,
      remove: id => Promise.resolve(id),
      cover: id => Promise.resolve('cover:' + id),
      importScanned: (items, options) => Promise.resolve({
        added: items.length, updated: 0, skipped: 0, failed: 0, manual: !!options.manual
      }),
      clearAll: () => Promise.resolve('cleared')
    },
    setPlay(value) {
      playing = !!value;
      window.playing = playing;
      audio.paused = !playing;
      return playing;
    },
    gotoIdx(index, playNow) {
      window.idx = index;
      if (playNow) window.setPlay(true);
      return index;
    },
    parseLRC(text) {
      const items = String(text).split(/\\r?\\n/).map(line => {
        const match = line.match(/^\\[(\\d{2}):(\\d{2})\\.(\\d{2})\\](.*)$/);
        return match ? {
          t: Number(match[1]) * 60 + Number(match[2]) + Number(match[3]) / 100,
          text: match[4]
        } : null;
      }).filter(Boolean);
      return { items, meta: { ti: 'Parsed fixture' } };
    },
    applyLRC(parsed) {
      window.LN = parsed.items.map(item => item.text);
      window.TS = parsed.items.map(item => item.t);
      window.WT = parsed.items.map(item => item.wt || null);
      window.LRC_META = parsed.meta || {};
      return window.LN.length;
    },
    goNext() { return 'next'; }
  };

  class CustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options && options.detail;
    }
  }

  const context = vm.createContext({
    window,
    document: { getElementById: id => id === 'audio' ? audio : null },
    CustomEvent,
    console: { warn() {}, error() {}, log() {} },
    performance: { now: () => 123 },
    Date,
    Object,
    Array,
    Math,
    Number,
    String,
    isFinite
  });

  function load(name) {
    const file = path.join(__dirname, '..', 'Resources', 'Web', 'APP', name);
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: name });
  }

  return {
    window,
    audio,
    emitted,
    load,
    fireAudioEvent(name) { (audioListeners[name] || []).forEach(fn => fn({ type: name })); },
    notifyLibraryChange() { if (libraryListener) libraryListener(); }
  };
}

test('playback facade delegates commands and publishes legacy/audio events', () => {
  const h = createHarness();
  h.load('playback-service.js');

  const received = [];
  const unsubscribe = h.window.YiuPlayback.subscribe(event => received.push(event.type));

  h.window.YiuPlayback.play();
  assert.equal(h.audio.paused, false);
  assert.ok(received.includes('playbackstatechange'));

  h.audio.currentTime = 31;
  h.fireAudioEvent('timeupdate');
  assert.ok(received.includes('timeupdate'));
  h.window.YiuPlayback.seek(44);
  assert.equal(h.audio.currentTime, 44);

  h.window.YiuPlayback.pause();
  assert.equal(h.audio.paused, true);
  assert.ok(received.includes('playbackstatechange'));

  unsubscribe();
  assert.equal(h.window.YiuPlayback.getSnapshot().currentTime, 44);
});

test('lyrics facade delegates parsing, applying, seeking, and returns snapshot copies', () => {
  const h = createHarness();
  h.load('playback-service.js');
  h.load('lyrics-service.js');

  const events = [];
  const unsubscribe = h.window.YiuLyrics.subscribe(event => events.push(event.type));
  const parsed = h.window.YiuLyrics.parse('[00:01.00]Hello\n[00:02.00]World');
  assert.equal(parsed.items.length, 2);

  h.window.YiuLyrics.apply(parsed);
  assert.deepEqual(Array.from(h.window.YiuLyrics.getSnapshot().lines), ['Hello', 'World']);
  assert.ok(events.includes('lyricschange'));

  h.window.YiuLyrics.seek(1, false);
  assert.equal(h.window.YiuLyrics.getSnapshot().currentIndex, 1);
  assert.ok(events.includes('lyricindexchange'));

  const snapshot = h.window.YiuLyrics.getSnapshot();
  snapshot.lines[0] = 'mutated';
  assert.equal(h.window.LN[0], 'Hello');
  unsubscribe();
});

test('library facade snapshots and delegates to the existing SongLibrary API', async () => {
  const h = createHarness();
  h.load('library-service.js');

  const snapshot = h.window.YiuLibrary.getSnapshot();
  assert.equal(snapshot.currentId, 7);
  assert.equal(snapshot.songs[0].name, 'Fixture Song');
  snapshot.songs[0].name = 'changed';
  assert.equal(h.window.SongLibrary.list()[0].name, 'Fixture Song');

  const changes = [];
  const unsubscribe = h.window.YiuLibrary.subscribe(value => changes.push(value.currentId));
  await h.window.YiuLibrary.select(9, true);
  h.notifyLibraryChange();
  assert.deepEqual(changes, [9]);

  assert.equal(h.window.YiuLibrary.step(-1), -1);
  assert.equal(h.window.YiuLibrary.peekNext(), 9);
  assert.equal(h.window.YiuLibrary.isMusic(), true);
  assert.equal(await h.window.YiuLibrary.cover(7), 'cover:7');
  assert.equal((await h.window.YiuLibrary.importScanned([{}, {}], { manual: true })).added, 2);
  assert.equal(await h.window.YiuLibrary.remove(7), 7);
  assert.equal(await h.window.YiuLibrary.clearAll(), 'cleared');
  unsubscribe();
});
