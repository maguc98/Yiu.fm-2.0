const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', '..', 'APP', 'cmd-early.js'),
  'utf8'
);

function createHarness() {
  const listeners = Object.create(null);
  const window = {
    __YIU_ACTIVE_SCRIPT: {
      index: 47,
      label: './APP/boot.js?v=test',
      startedAt: 40
    },
    addEventListener(type, callback) {
      (listeners[type] || (listeners[type] = [])).push(callback);
    }
  };
  const fakeConsole = {
    log() {}, info() {}, warn() {}, error() {}, debug() {}
  };
  const context = vm.createContext({
    window,
    console: fakeConsole,
    localStorage: {
      getItem() { return null; },
      setItem() {}
    },
    performance: {
      now() { return 250; },
      setResourceTimingBufferSize() {}
    },
    setTimeout() { return 1; },
    clearTimeout() {}
  });
  vm.runInContext(source, context, { filename: 'APP/cmd-early.js' });
  return {
    window,
    emit(type, event) {
      for (const callback of listeners[type] || []) callback(event);
    }
  };
}

test('early runtime errors retain the active script when WebKit masks the source', () => {
  const h = createHarness();
  h.emit('error', {
    target: null,
    message: 'Script error.',
    filename: '',
    lineno: 0,
    colno: 0,
    error: null
  });

  const [entry] = h.window.__cmEarly.errs;
  assert.equal(entry.msg, 'Script error.');
  assert.equal(entry.activeScript.label, './APP/boot.js?v=test');
  assert.match(entry.src, /执行脚本线索：\.\/APP\/boot\.js/);
  assert.match(entry.src, /210ms/);
  assert.equal(entry.kind, 'runtime');
});

test('early resource errors retain both the failed URL and active script context', () => {
  const h = createHarness();
  h.emit('error', {
    target: {
      src: 'file:///app/APP/missing-module.js',
      nodeName: 'SCRIPT'
    }
  });

  const [entry] = h.window.__cmEarly.errs;
  assert.equal(entry.kind, 'resource-load');
  assert.equal(entry.file, 'file:///app/APP/missing-module.js');
  assert.equal(entry.activeScript.label, './APP/boot.js?v=test');
});

test('early unhandled rejections retain their stack and the active script context', () => {
  const h = createHarness();
  h.emit('unhandledrejection', {
    reason: {
      message: 'startup rejected',
      stack: 'Error: startup rejected\\n    at boot (file:///app/APP/boot.js:8:3)'
    }
  });

  const [entry] = h.window.__cmEarly.errs;
  assert.equal(entry.kind, 'unhandled-rejection');
  assert.equal(entry.msg, '未处理的 Promise 拒绝：startup rejected');
  assert.match(entry.src, /at boot/);
  assert.match(entry.stack, /APP\/boot\.js:8:3/);
  assert.equal(entry.activeScript.label, './APP/boot.js?v=test');
});
