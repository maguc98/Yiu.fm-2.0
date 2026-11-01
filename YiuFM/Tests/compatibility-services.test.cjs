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


test('mini-bar event patch publishes renderer lyric edits and state changes', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'yiu-mini-events-'));
  const app = path.join(temp, 'YiuFM', 'Resources', 'Web', 'APP');
  fs.mkdirSync(app, { recursive: true });
  fs.writeFileSync(path.join(app, 'player.js'), [
    'if(i !== idx){ idx = i; prog = 0; deferUpdate(); return; }',
    'if(prog >= 1){ prog = 0; idx = nextIdx(true); deferUpdate(); return; }',
    'for(var k = 0; k < n; k++) TS.push(d * k / n);'
  ].join('\n'));
  fs.writeFileSync(path.join(app, 'renderer.js'), '  if(chg)LN=arr;');
  fs.writeFileSync(path.join(app, 'song-library.js'), [
    'function syncNextLabel() {}',
    'function isMusicMode() { return musicMode; }',
    'function find(id) { return id === currentId ? { name: currentName } : null; }',
    'function syncNow(){',
    '  var s = curId != null ? find(curId) : null, on = isMusicMode() && !!s;',
    "  window.__musicTitle = on ? s.name : '';",
    "  window.__musicCover = on ? curCover : '';",
    '    syncNextLabel();',
    '}',
    'function loadCover(id, rec){',
    '  return (rec ? Promise.resolve(rec) : getFile(id))',
    "    .then(function(r){ if(!r) return ['', '']; return ensureCover(id, r).then(function(c){ return [c, r.ucover || '']; }); })",
    "    .then(function(a){ if(curId === id){ curOrig = a[0] || ''; curCover = a[1] || curOrig; syncNow(); } })",
    '    .catch(function(){});',
    '}'
  ].join('\n'));
  fs.writeFileSync(path.join(app, 'mini-player.js'), [
    'var key=mt+"\\u0001"+s;',
    '  tick();setInterval(tick,200);'
  ].join('\n'));

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

  const events = [];
  const context = {
    window: { YiuLibrary: { notify: type => events.push(type) } },
    musicMode: true,
    currentId: 7,
    currentName: 'Fixture Song',
    curId: 7,
    curCover: '',
    curOrig: '',
    find: id => id === 7 ? { name: 'Fixture Song' } : null,
    isMusicMode: () => context.musicMode,
    syncNextLabel() {},
    getFile: () => Promise.resolve(null),
    ensureCover: (id, rec) => Promise.resolve(rec.cover || ''),
    Promise
  };
  vm.runInNewContext(fs.readFileSync(path.join(app, 'song-library.js'), 'utf8'), context);
  context.syncNow();
  assert.equal(context.window.__musicTitle, 'Fixture Song');
  assert.deepEqual(events, ['librarychange']);

  await context.loadCover(7, { cover: 'embedded-cover', ucover: 'user-cover' });
  assert.equal(context.window.__musicCover, 'user-cover');
  assert.equal(events.length, 2, 'async cover completion must publish a library event');

  context.musicMode = false;
  context.syncNow();
  assert.equal(context.window.__musicTitle, '');
  assert.equal(context.window.__musicCover, '');
  assert.equal(events.length, 3, 'mode changes must publish a library event');

  context.curId = 8;
  await context.loadCover(7, { cover: 'stale-cover', ucover: '' });
  assert.equal(context.curCover, 'user-cover', 'stale async cover must not overwrite the newly selected song');
  assert.equal(events.length, 3, 'stale async cover completion must not publish a current-song event');

  fs.rmSync(temp, { recursive: true, force: true });
});


test('player end-of-track and next-track consumers prefer YiuLibrary with legacy fallback', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'yiu-player-library-'));
  const app = path.join(temp, 'YiuFM', 'Resources', 'Web', 'APP');
  fs.mkdirSync(app, { recursive: true });
  fs.writeFileSync(path.join(app, 'player.js'), [
    '  var SL = window.SongLibrary;',
    '  if(window.SongLibrary && SongLibrary.step && SongLibrary.step(1)) return;'
  ].join('\n'));

  const patch = path.join(__dirname, '..', 'Scripts', 'patch-player-library-consumer.py');
  const result = spawnSync('python3', [patch], { cwd: temp, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const source = fs.readFileSync(path.join(app, 'player.js'), 'utf8');
  assert.ok(source.includes('var SL = window.YiuLibrary || window.SongLibrary;'));
  assert.ok(source.includes('var library = window.YiuLibrary || window.SongLibrary;'));
  assert.ok(!source.includes('var SL = window.SongLibrary;'));
  assert.ok(!source.includes('window.SongLibrary && SongLibrary.step'));

  const calls = [];
  const context = {
    window: {
      YiuLibrary: {
        isMusic: () => true,
        autoNext: () => { calls.push('facade:autoNext'); return true; },
        step: direction => { calls.push('facade:step:' + direction); return true; }
      },
      SongLibrary: {
        isMusic: () => { calls.push('legacy:isMusic'); return false; },
        autoNext: () => { calls.push('legacy:autoNext'); return false; },
        step: direction => { calls.push('legacy:step:' + direction); return false; }
      }
    }
  };
  vm.runInNewContext(
    '(function(window){' +
    'var SL = window.YiuLibrary || window.SongLibrary; SL.isMusic(); SL.autoNext();' +
    'var library = window.YiuLibrary || window.SongLibrary; library.step(1);' +
    '})(window);',
    context
  );
  assert.deepEqual(calls, ['facade:autoNext', 'facade:step:1']);
  fs.rmSync(temp, { recursive: true, force: true });
});


test('legacy persistence keys and database schemas remain pinned', () => {
  const root = path.join(__dirname, '..', 'Resources', 'Web', 'APP');
  const read = name => fs.readFileSync(path.join(root, name), 'utf8');
  const storage = read('storage.js');
  const library = read('song-library.js');
  const themes = read('theme-editor.js');
  const themePicker = read('theme-picker.js');
  const core = read('core.js');
  const mode = read('mode-pref.js');
  const mini = read('mini-player.js');
  const sonnet = read('sonnet-adapter.js');
  const tempera = read('tempera-adapter.js');
  const lumiere = read('lumiere-adapter.js');
  const partita = read('partita-adapter.js');
  const beat = read('beat.js');

  assert.ok(storage.includes('SK="td_autosave"'));
  assert.ok(storage.includes('o={app:"text-display",v:1}'));
  assert.ok(storage.includes('localStorage.setItem(SK,str)'));
  assert.ok(storage.includes('function loadData()'));

  assert.ok(library.includes("DB_NAME = 'yiufm-songs'"));
  assert.ok(library.includes('indexedDB.open(DB_NAME, 1)'));
  assert.ok(library.includes("createObjectStore('songs', {keyPath: 'id', autoIncrement: true})"));
  assert.ok(library.includes("createObjectStore('files', {keyPath: 'id'})"));
  for (const key of ['song_cur', 'song_order', 'ios_music_skip', 'lyoff_hidden']) {
    assert.ok(library.includes(key), 'missing song-library persistence key: ' + key);
  }

  assert.ok(themePicker.includes('localStorage.setItem("themesV1"'));
  assert.ok(themes.includes('CFG_KEY = "themeCfgV1"'));
  assert.ok(themes.includes('IMGDB = "themeImgsV1", IMGST = "img"'));
  assert.ok(themes.includes('function saveLegacy()'));
  assert.ok(themes.includes('function hydrate()'));

  assert.ok(core.includes('localStorage.getItem("themesV1"'));
  assert.ok(core.includes("localStorage.getItem('performanceMode')"));
  assert.ok(mode.includes("'ui_mode_pref'") && mode.includes("'ui_mode_last'"));
  assert.ok(mini.includes('PM_KEY = "playModeV1"'));

  assert.ok(sonnet.includes("'sonnetCfg.v1'"));
  assert.ok(sonnet.includes("'folia.sonnet.dynamic'"));
  assert.ok(tempera.includes("'temperaCfg.v1'"));
  assert.ok(lumiere.includes("'folia.lumiere.cfg'"));
  assert.ok(partita.includes("'partitaCfgV3'"));
  assert.ok(beat.includes("'yiu.beatTune.v1'"));
});


function createVisualizerHarness(options = {}) {
  const events = [];
  const activeClasses = new Set();
  const stage = { classList: {
    add: name => activeClasses.add(name),
    remove: name => activeClasses.delete(name)
  }};
  const hosts = {};
  for (const name of ['sonnet', 'tempera', 'lumiere', 'partita']) {
    const id = name + 'Host';
    hosts[id] = { id, innerHTML: '', querySelectorAll: () => [] };
  }

  let resolveSonnetShow = null;
  const adapters = {};
  for (const name of ['sonnet', 'tempera', 'lumiere', 'partita']) {
    const state = { alive: false, active: false, host: null };
    adapters[name] = {
      init(host) { state.host = host; events.push(name + ':init'); },
      show() {
        events.push(name + ':show');
        state.alive = true;
        state.active = true;
        if (name === 'sonnet' && options.holdSonnetShow && !resolveSonnetShow) {
          return new Promise(resolve => { resolveSonnetShow = resolve; });
        }
        return Promise.resolve();
      },
      whenReady() { return Promise.resolve(); },
      hide() { events.push(name + ':hide'); state.active = false; },
      destroy() { events.push(name + ':destroy'); state.alive = false; state.active = false; },
      drive(ct) { events.push(name + ':drive:' + ct); },
      loadLyrics() { events.push(name + ':lyrics'); },
      setSuspended(value) { events.push(name + ':suspend:' + value); },
      isAlive() { return state.alive; },
      isActive() { return state.active; },
      _state: state
    };
  }

  const window = {
    console: { warn() {}, error() {} },
    SonnetAdapter: adapters.sonnet,
    TemperaAdapter: adapters.tempera,
    LumiereAdapter: adapters.lumiere,
    PartitaAdapter: adapters.partita
  };
  const document = {
    getElementById(id) { return id === 'stage' ? stage : hosts[id] || null; },
    querySelectorAll() { return []; }
  };
  const managerPath = path.join(__dirname, '..', 'Resources', 'Web', 'APP', 'visualizer-manager.js');
  const source = fs.readFileSync(managerPath, 'utf8');
  vm.runInNewContext(source, {
    window, document, Promise, Date, Array, Object, setTimeout, clearTimeout,
    requestAnimationFrame(callback) { callback(); return 1; }
  });
  return {
    manager: window.VisualizerManager,
    adapters,
    events,
    activeClasses,
    releaseSonnet() { if (resolveSonnetShow) { const done = resolveSonnetShow; resolveSonnetShow = null; done(); } }
  };
}

test('visualizer manager destroys the previous engine before mounting the next', async () => {
  const h = createVisualizerHarness();
  await h.manager.switchTo('sonnet');
  await h.manager.switchTo('tempera');

  assert.equal(h.manager.current, 'tempera');
  assert.ok(h.events.indexOf('sonnet:destroy') < h.events.indexOf('tempera:init'));
  assert.equal(h.adapters.sonnet._state.alive, false);
  assert.equal(h.adapters.tempera._state.active, true);
  assert.deepEqual([...h.activeClasses], ['mode-tempera']);
});

test('visualizer manager coalesces in-flight switch requests to the latest target', async () => {
  const h = createVisualizerHarness({ holdSonnetShow: true });
  const first = h.manager.switchTo('sonnet');
  for (let i = 0; i < 10 && !h.events.includes('sonnet:show'); i++) await Promise.resolve();
  assert.ok(h.events.includes('sonnet:show'));

  const second = h.manager.switchTo('tempera');
  const third = h.manager.switchTo('partita');
  h.releaseSonnet();

  const results = await Promise.all([first, second, third]);
  assert.deepEqual(results, ['partita', 'partita', 'partita']);
  assert.equal(h.manager.current, 'partita');
  assert.equal(h.adapters.sonnet._state.alive, false);
  assert.equal(h.adapters.tempera._state.alive, false);
  assert.equal(h.adapters.partita._state.active, true);
});

test('visualizer manager keeps non-lazy reuse and separates hide from destroy', async () => {
  const h = createVisualizerHarness();
  await h.manager.switchTo('sonnet');
  await h.manager.switchTo('sonnet', { reuse: true });

  assert.equal(h.events.filter(x => x === 'sonnet:destroy').length, 0);
  assert.equal(h.events.filter(x => x === 'sonnet:show').length, 2);

  h.manager.hide();
  assert.equal(h.adapters.sonnet._state.alive, true);
  assert.equal(h.adapters.sonnet._state.active, false);
  assert.equal(h.events.filter(x => x === 'sonnet:destroy').length, 0);

  h.manager.drive(12.5);
  h.manager.loadLyrics([0], [[ [0, 1] ]], ['test']);
  for (const name of ['sonnet', 'tempera', 'lumiere', 'partita']) {
    assert.ok(h.events.includes(name + ':drive:12.5'));
    assert.ok(h.events.includes(name + ':lyrics'));
  }

  await h.manager.destroy();
  assert.equal(h.adapters.sonnet._state.alive, false);
  assert.equal(h.manager.current, null);
});
