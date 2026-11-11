import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = process.env.FUME_OUT_DIR
  ? path.resolve(process.env.FUME_OUT_DIR)
  : path.resolve(here, '../../Resources/Web/APP/fume-folia');
const bundlePath = path.join(outputDirectory, 'fume-folia.js');
const source = await readFile(bundlePath, 'utf8');

assert.ok(source.length > 0, 'Folia bundle must not be empty');

const jsdomErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', error => jsdomErrors.push(error));

const dom = new JSDOM(
  '<!doctype html><html><body><div id="fumeHost"></div></body></html>',
  {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'file:///yiufm-folia-smoke/index.html',
    virtualConsole
  }
);

const runtimeErrors = [];
dom.window.addEventListener('error', event => {
  runtimeErrors.push(event.error || new Error(event.message || 'Unknown browser error'));
});

try {
  // Evaluate the output as a classic browser script, matching the HTML script tag.
  dom.window.eval(source);

  const bundle = dom.window.FumeFoliaBundle;
  assert.ok(bundle, 'Bundle execution did not register window.FumeFoliaBundle');
  assert.equal(typeof bundle.create, 'function', 'FumeFoliaBundle.create must be callable');
  assert.equal(typeof bundle.buildLines, 'function', 'FumeFoliaBundle.buildLines must be callable');

  const lines = bundle.buildLines([0], [[0, 1]], ['Folia smoke test']);
  assert.equal(lines.length, 1, 'Bundle lyric adapter must execute');
  assert.equal(lines[0].fullText, 'Folia smoke test');

  assert.equal(runtimeErrors.length, 0, 'Bundle raised browser runtime errors');
  assert.equal(jsdomErrors.length, 0, 'Bundle raised jsdom runtime errors');

  console.log('[folia-smoke] PASS: classic-script execution registered FumeFoliaBundle.create and buildLines.');
} catch (error) {
  const details = [
    error && error.stack ? error.stack : String(error),
    ...runtimeErrors.map(item => 'window error: ' + (item.stack || item.message || String(item))),
    ...jsdomErrors.map(item => 'jsdom error: ' + (item.stack || item.message || String(item)))
  ];
  console.error('[folia-smoke] FAIL: ' + details.join('\n'));
  process.exitCode = 1;
} finally {
  dom.window.close();
}
