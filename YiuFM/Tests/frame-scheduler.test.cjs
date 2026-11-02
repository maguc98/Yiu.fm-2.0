const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
test('FrameScheduler owns one guarded RAF loop and supports suspension',()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','..','APP','runtime','frame-scheduler.js'),'utf8');
 assert.match(source,/function schedule\(\)/);
 assert.match(source,/!inFrame&&!id/);
 assert.match(source,/function suspend\(value\)/);
 assert.match(source,/if\(keep\(\)===false\)\{stop\(\);return;\}/);
 assert.match(source,/w\.YiuFrameScheduler=/);
});
