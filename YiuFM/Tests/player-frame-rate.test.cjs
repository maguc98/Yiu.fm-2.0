const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('player animation and visualizer clock are not capped by a 30 FPS gate',()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','..','APP','player.js'),'utf8');
 assert.doesNotMatch(source,/ts\s*-\s*lastTickTime\s*<\s*30/);
 assert.match(source,/window\.YiuFrameScheduler\.start\(tick/);
 assert.match(source,/window\.VisualizerManager\.drive\(ct\)/);
 assert.match(source,/now\s*-\s*lastUiPaint\s*>\s*100/);
});
