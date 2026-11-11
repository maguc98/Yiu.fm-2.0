const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function harness(saved){
 const queue=new Map();let next=1,storage=saved||null;
 const window={console:{error(){}},localStorage:{getItem(){return storage;},setItem(k,v){storage=v;}},requestAnimationFrame(fn){const id=next++;queue.set(id,fn);return id;},cancelAnimationFrame(id){queue.delete(id);}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','..','APP','runtime','frame-rate-limit.js'),'utf8'),{window,TypeError,Number,Math,Date,Object,String,JSON});
 function frame(ts){const item=queue.entries().next().value;if(!item)throw new Error('no native frame queued');queue.delete(item[0]);item[1](ts);}
 return {window,frame,get storage(){return storage;},get queue(){return queue;}};
}
test('default animation cadence is 60 FPS and frame cap is opt-in',()=>{const h=harness(),a=h.window.YiuFrameRateLimit;assert.equal(a.getConfig().enabled,false);assert.equal(a.getTargetFPS(),60);let n=0;h.window.requestAnimationFrame(()=>n++);h.frame(0);assert.equal(n,1);h.window.requestAnimationFrame(()=>n++);h.frame(16.67);assert.equal(n,2);});
test('enabled 30 FPS cap delays callbacks until the 30 FPS interval',()=>{const h=harness(),a=h.window.YiuFrameRateLimit;a.setConfig({enabled:true,fps:30});let n=0;h.window.requestAnimationFrame(()=>n++);h.frame(0);assert.equal(n,1);h.window.requestAnimationFrame(()=>n++);h.frame(16.67);assert.equal(n,1);h.frame(33.34);assert.equal(n,2);});
test('frame cap clamps to 24–60 FPS and persists across reload',()=>{const h=harness();h.window.YiuFrameRateLimit.setConfig({enabled:true,fps:1});assert.equal(h.window.YiuFrameRateLimit.getConfig().fps,24);const h2=harness(h.storage);assert.equal(h2.window.YiuFrameRateLimit.getConfig().enabled,true);assert.equal(h2.window.YiuFrameRateLimit.getTargetFPS(),24);h2.window.YiuFrameRateLimit.setConfig({fps:120});assert.equal(h2.window.YiuFrameRateLimit.getConfig().fps,60);});
test('cancelAnimationFrame removes queued callbacks',()=>{const h=harness();let called=false;const id=h.window.requestAnimationFrame(()=>called=true);h.window.cancelAnimationFrame(id);assert.equal(h.queue.size,0);assert.equal(called,false);});
