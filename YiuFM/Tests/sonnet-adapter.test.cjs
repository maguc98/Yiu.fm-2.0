const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadAdapter() {
  const file = path.join(__dirname, '..', 'Resources', 'Web', 'APP', 'sonnet-adapter.js');
  const source = fs.readFileSync(file, 'utf8');
  const window = { devicePixelRatio: 2 };
  const document = { addEventListener() {}, getElementById() { return null; } };
  vm.runInNewContext(source, {
    window,
    document,
    performance: { now: () => 1000 },
    Intl,
    Uint8Array,
    console,
    Math,
    Array,
    Object,
    Promise,
    AbortController,
    setTimeout,
    clearTimeout
  });
  return window.SonnetAdapter;
}

test('Sonnet preserves original per-character lyric timestamps', () => {
  const adapter = loadAdapter();
  const lines = adapter.buildLines(
    [1.0, 3.0],
    [[1.00, 1.18, 1.44, 1.92], null],
    ['云阶逐字', '下一句']
  );

  assert.equal(lines.length, 2);
  assert.deepEqual(
    Array.from(lines[0].words, word => word.text),
    ['云', '阶', '逐', '字']
  );
  assert.deepEqual(
    Array.from(lines[0].words, word => word.startTime),
    [1.00, 1.18, 1.44, 1.92]
  );
  assert.deepEqual(
    Array.from(lines[0].words, word => word.endTime),
    [1.18, 1.44, 1.92, 3.0]
  );
});

test('Sonnet does not spread repeated character timestamps into an even line animation', () => {
  const adapter = loadAdapter();
  const lines = adapter.buildLines(
    [2.0, 4.0],
    [[2.0, 2.0, 2.65, 3.4], null],
    ['啊啊然后', '下一句']
  );

  assert.deepEqual(
    Array.from(lines[0].words, word => word.startTime),
    [2.0, 2.0, 2.65, 3.4]
  );
});
