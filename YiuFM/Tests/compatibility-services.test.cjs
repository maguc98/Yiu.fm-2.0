const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

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
      const items = String(text).split(/\r?\n/).map(line => {
        const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2})\](.*)$/);
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
  h.window.YiuPlayback.notify('lyricindexchange');
  assert.ok(received.includes('lyricindexchange'));
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

  h.window.__musicTitle = 'Fixture Song';
  h.window.__musicCover = 'data:image/fixture';
  const enriched = h.window.YiuLibrary.getSnapshot();
  assert.equal(enriched.currentTitle, 'Fixture Song');
  assert.equal(enriched.currentCover, 'data:image/fixture');

  const changes = [];
  const unsubscribe = h.window.YiuLibrary.subscribe(value => changes.push(value.currentId));
  await h.window.YiuLibrary.select(9, true);
  h.notifyLibraryChange();
  h.window.YiuLibrary.notify('librarychange');
  assert.deepEqual(changes, [9, 9]);

  assert.equal(h.window.YiuLibrary.step(-1), -1);
  assert.equal(h.window.YiuLibrary.peekNext(), 9);
  assert.equal(h.window.YiuLibrary.isMusic(), true);
  assert.equal(await h.window.YiuLibrary.cover(7), 'cover:7');
  assert.equal((await h.window.YiuLibrary.importScanned([{}, {}], { manual: true })).added, 2);
  assert.equal(await h.window.YiuLibrary.remove(7), 7);
  assert.equal(await h.window.YiuLibrary.clearAll(), 'cleared');
  unsubscribe();
});



test('mini-player refresh is event-driven rather than interval-polled', () => {
  const file = path.join(__dirname, '..', 'Resources', 'Web', 'APP', 'mini-player.js');
  const source = fs.readFileSync(file, 'utf8');

  assert.doesNotMatch(source, /npTimer|setInterval\(npRefresh/);
  assert.match(source, /function requestNpRefresh\(\)/);
  assert.match(source, /window\.YiuPlayback&&typeof window\.YiuPlayback\.subscribe/);
  assert.match(source, /window\.YiuLibrary&&typeof window\.YiuLibrary\.subscribe/);
  assert.match(source, /npMiniObserver\.observe\(mini/);
  assert.match(source, /requestAnimationFrame\(function\(\)/);
});


test('mini-player bridge coalesces playback, library, and DOM signals into one frame', () => {
  const patchPath = path.join(__dirname, '..', 'Scripts', 'patch-mini-player-refresh.py');
  const patch = fs.readFileSync(patchPath, 'utf8');
  const match = patch.match(/bridge = r'''([\s\S]*?)'''/);
  assert.ok(match, 'event-driven bridge must exist in the build patch');

  const playbackListeners = [];
  const libraryListeners = [];
  const rafQueue = [];
  let observerCallback = null;
  let refreshCount = 0;
  let visible = false;

  class MutationObserver {
    constructor(callback) { observerCallback = callback; }
    observe(target, options) {
      assert.equal(target, mini);
      assert.equal(options.subtree, true);
      assert.deepEqual(Array.from(options.attributeFilter), ['class']);
    }
  }

  const mini = {};
  const window = {
    MutationObserver,
    YiuPlayback: { subscribe(fn) { playbackListeners.push(fn); } },
    YiuLibrary: { subscribe(fn) { libraryListeners.push(fn); } }
  };
  const context = vm.createContext({
    window,
    mini,
    MutationObserver,
    npRefreshRaf: 0,
    npCard: { classList: { contains(name) { return name === 'show' && visible; } } },
    isNpDragging: false,
    npRefresh() { refreshCount += 1; },
    requestAnimationFrame(callback) { rafQueue.push(callback); return rafQueue.length; },
    cancelAnimationFrame() {}
  });

  vm.runInContext(match[1], context, { filename: 'mini-player-refresh-bridge.js' });
  assert.equal(typeof observerCallback, 'function');

  // Hidden and idle: notifications must not schedule work.
  playbackListeners[0]();
  libraryListeners[0]();
  observerCallback([]);
  assert.equal(rafQueue.length, 0);

  // While visible, many signals in one frame must collapse into one refresh.
  visible = true;
  playbackListeners[0]();
  libraryListeners[0]();
  observerCallback([]);
  assert.equal(rafQueue.length, 1);
  rafQueue.shift()();
  assert.equal(refreshCount, 1);

  // Dragging keeps the card refreshable even if the card is not marked visible.
  visible = false;
  context.isNpDragging = true;
  playbackListeners[0]();
  assert.equal(rafQueue.length, 1);
  rafQueue.shift()();
  assert.equal(refreshCount, 2);
});


test('mini-bar event patch publishes renderer lyric edits and state changes', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'yiu-mini-events-'));
  const app = path.join(temp, 'YiuFM', 'Resources', 'Web', 'APP');
  fs.mkdirSync(app, { recursive: true });
  fs.writeFileSync(path.join(app, 'player.js'), [
    'if(i !== idx){ idx = i; prog = 0; deferUpdate(); return; }',
    'if(prog >= 1){ prog = 0; idx = nextIdx(true); deferUpdate(); return; }',
    'for(var k = 0; k < n; k++) TS.push(d * k / n);'
  ].join('\n'));
  fs.writeFileSync(path.join(app, 'renderer.js'), '  if(chg)LN=arr;');
  fs.writeFileSync(path.join(app, 'song-library.js'),
  fs.writeFileSync(path.join(app, 'song-library.js'), [
    "window.__musicCover = on ? curCover : '';",
    '    syncNextLabel();'
  ].join('\\n'));
  fs.writeFileSync(path.join(app, 'mini-player.js'),
  fs.writeFileSync(path.join(app, 'mini-player.js'), [
    'var key=mt+"\\\\u0001"+s;',
    '  tick();setInterval(tick,200);'
  ].join('\\n'));

  const patch = path.join(__dirname, '..', 'Scripts', 'patch-mini-bar-events.py');
  const result = spawnSync('python3', [patch], { cwd: temp, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const renderer = fs.readFileSync(path.join(app, 'renderer.js'), 'utf8');
  const player = fs.readFileSync(path.join(app, 'player.js'), 'utf8');
  const mini = fs.readFileSync(path.join(app, 'mini-player.js'), 'utf8');
  assert.match(renderer, /YiuPlayback\.notify\('lyricschange'\)/);
  assert.equal((player.match(/notify\('lyricindexchange'\)/g) || []).length, 2);
  assert.match(mini, /YiuPlayback.*subscribe/);
  assert.match(mini, /YiuLibrary.*subscribe/);
  assert.doesNotMatch(mini, /setInterval\(tick,200\)/);
  fs.rmSync(temp, { recursive: true, force: true });
});
