const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','..','APP','runtime','render-coordinator.js'),'utf8');
function harness(){
 const events=[];let current='sonnet';
 const legacy={get current(){return current;},isSwitching:false,boot(){events.push('boot');},switchTo(name,opts){events.push('switch:'+name+':'+!!(opts&&opts.reuse));current=name;return Promise.resolve(name);},drive(t){events.push('drive:'+t);},loadLyrics(){events.push('lyrics');},hide(){events.push('hide');},setSuspended(v){events.push('suspend:'+v);},destroy(){events.push('destroy');current=null;return Promise.resolve(null);},debug(){return {current};}};
 const window={VisualizerManager:legacy};
 vm.runInNewContext(source,{window,Promise,Object,String,Error});
 return {window,legacy,events};
}
test('RenderCoordinator becomes the single public manager and delegates legacy operations',async()=>{
 const h=harness(),m=h.window.VisualizerManager;
 assert.equal(m,h.window.YiuRenderCoordinator);
 assert.equal(h.window.YiuLegacyBridge,h.legacy);
 assert.equal(m.current,'sonnet');
 m.boot();await m.switchTo('partita',{reuse:true});m.drive(3.5);m.loadLyrics([],[],[]);m.hide();m.setSuspended(true);await m.destroy();
 assert.deepEqual(h.events,['boot','switch:partita:true','drive:3.5','lyrics','hide','suspend:true','destroy']);
 const s=m.snapshot();assert.equal(s.mode,'shadow');assert.equal(s.switchRequests,1);assert.equal(s.switchSuccesses,1);assert.equal(s.driveCalls,1);assert.equal(s.current,null);
});
test('RenderCoordinator records a failed legacy switch and preserves the rejection',async()=>{
 const h=harness();h.legacy.switchTo=()=>Promise.reject(new Error('mount failed'));
 await assert.rejects(h.window.VisualizerManager.switchTo('lumiere'),/mount failed/);
 const s=h.window.YiuRenderCoordinator.snapshot();assert.equal(s.switchFailures,1);assert.equal(s.lastTarget,'lumiere');assert.equal(s.lastPrevious,'sonnet');assert.equal(s.lastError,'mount failed');
});
