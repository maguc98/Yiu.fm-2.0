const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','..','APP','runtime','render-coordinator.js'),'utf8');
function harness(options){
 options=options||{};const events=[];const activeClasses=new Set();let legacyCurrent=null;
 const stage={classList:{add(name){activeClasses.add(name);},remove(name){activeClasses.delete(name);}}};
 const hosts={};
 for(const id of ['sonnetHost','temperaHost','lumiereHost','partitaHost'])hosts[id]={id,innerHTML:'',querySelectorAll(){return [];}};
 const adapters={};
 for(const name of ['sonnet','tempera','lumiere','partita']){
  const state={alive:false,active:false,host:null};
  adapters[name]={
   init(host){state.host=host;events.push(name+':init');},
   show(){events.push(name+':show');if(options.failV2On===name)return Promise.reject(new Error('V2 mount failed: '+name));state.alive=true;state.active=true;return Promise.resolve();},
   whenReady(){return Promise.resolve();},
   hide(){events.push(name+':hide');state.active=false;},
   destroy(){events.push(name+':destroy');state.alive=false;state.active=false;},
   drive(time){events.push(name+':drive:'+time);},
   loadLyrics(){events.push(name+':lyrics');},
   setSuspended(value){events.push(name+':suspend:'+value);},
   isAlive(){return state.alive;},isActive(){return state.active;},_state:state
  };
 }
 const legacy={
  get current(){return legacyCurrent;},isSwitching:false,
  boot(){events.push('legacy:boot');},
  switchTo(name,opts){events.push('legacy:switch:'+name+':'+!!(opts&&opts.reuse));if(options.failLegacy)return Promise.reject(new Error('V1 fallback failed'));legacyCurrent=name;return Promise.resolve(name);},
  drive(time){events.push('legacy:drive:'+time);},
  loadLyrics(){events.push('legacy:lyrics');},
  hide(){events.push('legacy:hide');legacyCurrent=null;},
  setSuspended(value){events.push('legacy:suspend:'+value);},
  destroy(){events.push('legacy:destroy');legacyCurrent=null;return Promise.resolve(null);},
  debug(){return {current:legacyCurrent};}
 };
 const window={VisualizerManager:legacy,document:null,console:{warn(){},error(){}},SonnetAdapter:adapters.sonnet,TemperaAdapter:adapters.tempera,LumiereAdapter:adapters.lumiere,PartitaAdapter:adapters.partita};
 const document={getElementById(id){return id==='stage'?stage:hosts[id]||null;},querySelectorAll(){return [];}};
 window.document=document;window.requestAnimationFrame=callback=>{callback();return 1;};
 vm.runInNewContext(source,{window,document,Promise,Date,Array,Object,String,Error,setTimeout,clearTimeout});
 return {window,legacy,adapters,events,activeClasses,options};
}
test('V2 RenderCoordinator becomes the single public entry and manages adapters directly',async()=>{
 const h=harness(),m=h.window.VisualizerManager;
 assert.equal(m,h.window.YiuRenderCoordinator);assert.equal(h.window.YiuLegacyBridge,h.legacy);
 await m.switchTo('sonnet');assert.equal(m.current,'sonnet');assert.ok(h.events.includes('sonnet:show'));assert.ok(!h.events.some(e=>e.startsWith('legacy:switch:')));
 m.drive(3.5);m.loadLyrics([],[],[]);m.setSuspended(true);
 assert.ok(h.events.includes('sonnet:drive:3.5'));assert.ok(h.events.includes('sonnet:lyrics'));assert.ok(h.events.includes('sonnet:suspend:true'));
 assert.equal(m.snapshot().mode,'v2');
});
test('V2 mount failure automatically activates the V1 compatibility bridge',async()=>{
 const h=harness({failV2On:'partita'}),m=h.window.YiuRenderCoordinator;
 const result=await m.switchTo('partita');
 assert.equal(result,'partita');assert.equal(m.snapshot().mode,'legacy');assert.equal(m.current,'partita');
 assert.ok(h.events.includes('legacy:switch:partita:false'));
 assert.equal(m.fallbackController.snapshot().successes,1);
});
test('Legacy fallback remains locked for the session until an explicit V2 retry',async()=>{
 const h=harness({failV2On:'partita'}),m=h.window.YiuRenderCoordinator;
 await m.switchTo('partita');h.events.length=0;
 await m.switchTo('sonnet');
 assert.ok(h.events.includes('legacy:switch:sonnet:false'));
 assert.equal(m.snapshot().mode,'legacy');
});
test('V2 can be explicitly retried after legacy fallback',async()=>{
 const h=harness({failV2On:'partita'}),m=h.window.YiuRenderCoordinator;
 await m.switchTo('partita');
 h.options.failV2On=undefined;
 assert.equal(await m.retryV2(),true);
 assert.equal(m.snapshot().mode,'v2');assert.equal(m.current,'partita');
});
test('If both V2 and V1 fail, the coordinator rejects and records the fallback failure',async()=>{
 const h=harness({failV2On:'tempera',failLegacy:true}),m=h.window.YiuRenderCoordinator;
 await assert.rejects(m.switchTo('tempera'),/V2 mount failed: tempera/);
 const fallback=m.fallbackController.snapshot();
 assert.equal(fallback.failures,1);assert.equal(fallback.active,false);
});
