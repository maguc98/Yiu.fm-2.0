const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Packaged Partita waits for exact word timestamps and protects entrance completion', () => {
  const bundle = fs.readFileSync(
    path.join(__dirname, '..', 'Resources', 'Web', 'APP', 'P1.js'),
    'utf8'
  );

  assert.ok(
    bundle.includes('g>=t.startTime&&g<=E+0.08?y="active":g>E+0.08&&(y="passed")'),
    'individual word state must begin at its exact timestamp and retain an 80ms completion grace'
  );
  assert.ok(
    bundle.includes('y>=b&&y<=E+0.08?S="active":y>E+0.08&&(S="passed")'),
    'the containing lyric chunk must also wait for its exact first-word timestamp'
  );
  assert.ok(!bundle.includes('startTime-u.wordLookahead'));
  assert.ok(!bundle.includes('b-c.wordLookahead'));
});
