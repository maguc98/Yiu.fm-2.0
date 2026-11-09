/* Yiu.fm 2.0 — Render Coordinator
 * V2 is the default lifecycle coordinator. The previous VisualizerManager is
 * retained privately as the V1 compatibility bridge and is activated only
 * when V2 cannot mount an engine or when the user explicitly retries V2.
 */
(function(w){
'use strict';
if(w.YiuRenderCoordinator)return;
var legacy=w.VisualizerManager;
if(!legacy)return;
var REG={
 sonnet:{hostId:'sonnetHost',modeClass:'mode-sonnet',adapter:'SonnetAdapter'},
 tempera:{hostId:'temperaHost',modeClass:'mode-tempera',adapter:'TemperaAdapter'},
 lumiere:{hostId:'lumiereHost',modeClass:'mode-lumiere',adapter:'LumiereAdapter',lazy:true},
 partita:{hostId:'partitaHost',modeClass:'mode-partita',adapter:'PartitaAdapter',lazy:true},
 fume:{hostId:'fumeHost',modeClass:'mode-fume',adapter:'FumeAdapter'}
};
var NAMES=Object.keys(REG),mode='v2',fallbackLocked=false,current=null,switching=false,want=null,waiters=[],lastError=null,driveFaults={},fallbackPending=false;
var stats={v2Switches:0,v2Failures:0,fallbackAttempts:0,fallbacks:0,fallbackFailures:0,legacySwitches:0,retryAttempts:0,driveFailures:0,runtimeFallbacks:0,lastRuntimeError:null,lastTarget:null,lastFallbackEngine:null,lastError:null,lastFallbackError:null};
function warn(message,error){if(w.console&&console.warn)console.warn('[YiuRenderCoordinator] '+message,error||'');}
function hostOf(name){return w.document&&w.document.getElementById(REG[name].hostId);}
function adapterOf(name){return w[REG[name].adapter];}
function setStageMode(name){
 var stage=w.document&&w.document.getElementById('stage');if(!stage)return;
 NAMES.forEach(function(key){stage.classList.remove(REG[key].modeClass);});
 if(name)stage.classList.add(REG[name].modeClass);
}
function waitAlive(adapter,ms){
 return new Promise(function(resolve){var start=Date.now();(function poll(){if(typeof adapter.isAlive!=='function'||adapter.isAlive()||Date.now()-start>ms)return resolve();setTimeout(poll,80);})();});
}
function nextFrames(count){
 return new Promise(function(resolve){function step(left){if(left<=0)return resolve();w.requestAnimationFrame(function(){step(left-1);});}step(count||2);});
}
function isAlive(name){var adapter=adapterOf(name);return !!(adapter&&typeof adapter.isAlive==='function'&&adapter.isAlive());}
function isActive(name){var adapter=adapterOf(name);return !!(adapter&&typeof adapter.isActive==='function'&&adapter.isActive());}
function safeDestroy(name){
 var adapter=adapterOf(name),host=hostOf(name),canvases=host?Array.prototype.slice.call(host.querySelectorAll('canvas')):[];
 if(adapter&&typeof adapter.destroy==='function'){try{adapter.destroy();}catch(error){warn('destroy '+name,error);}}
 canvases.forEach(function(canvas){try{var gl=canvas.getContext('webgl2')||canvas.getContext('webgl');var ext=gl&&gl.getExtension&&gl.getExtension('WEBGL_lose_context');if(ext)ext.loseContext();}catch(_){}});
 if(host)host.innerHTML='';
}
function teardownAll(previous){
 var any=false;
 NAMES.forEach(function(name){if(name===previous||isAlive(name)||isActive(name)){any=true;safeDestroy(name);}});
 return any;
}
function mount(name,opts){
 var adapter=adapterOf(name),host=hostOf(name);
 if(!adapter||typeof adapter.init!=='function')throw new Error('[YiuRenderCoordinator] adapter missing: '+REG[name].adapter);
 if(!host)throw new Error('[YiuRenderCoordinator] host missing: #'+REG[name].hostId);
 adapter.init(host,opts||{});
 var shown=typeof adapter.show==='function'?adapter.show():null;
 return Promise.resolve(shown).then(function(){if(typeof adapter.whenReady==='function')return adapter.whenReady();return REG[name].lazy?waitAlive(adapter,8000):null;}).then(function(){
  if(typeof adapter.isAlive==='function'&&!adapter.isAlive())throw new Error('[YiuRenderCoordinator] '+name+' failed to become alive');
 });
}
function fallbackToLegacy(name,opts,error){
 if(!name)return Promise.reject(error);
 stats.fallbackAttempts++;stats.lastTarget=name;
 var legacyOptions={};
 Object.keys(opts||{}).forEach(function(key){legacyOptions[key]=opts[key];});
 legacyOptions.reuse=false;
 return Promise.resolve().then(function(){return legacy.switchTo(name,legacyOptions);}).then(function(){
  mode='legacy';fallbackLocked=true;current=null;stats.fallbacks++;stats.lastFallbackEngine=name;stats.lastError=error&&error.message?String(error.message):String(error||'V2 failed');stats.lastFallbackError=null;
  return name;
 },function(legacyError){
  stats.fallbackFailures++;stats.lastError=error&&error.message?String(error.message):String(error||'V2 failed');
  stats.lastFallbackError=legacyError&&legacyError.message?String(legacyError.message):String(legacyError||'legacy fallback failed');
  throw error;
 });
}
function finish(){
 switching=false;var pending=waiters;waiters=[];var error=lastError;lastError=null;
 pending.forEach(function(waiter){if(error)waiter.fail(error);else waiter.ok(api.current);});
}
function canReuse(name){
 if(switching||REG[name].lazy||!isAlive(name))return false;
 for(var i=0;i<NAMES.length;i++)if(NAMES[i]!==name&&isAlive(NAMES[i]))return false;
 return true;
}
function reuse(name,opts){
 var adapter=adapterOf(name),host=hostOf(name);setStageMode(name);current=name;
 return Promise.resolve().then(function(){adapter.init(host,opts||{});return typeof adapter.show==='function'?adapter.show():null;})
 .then(function(){return typeof adapter.whenReady==='function'?adapter.whenReady():null;})
 .then(function(){if(typeof adapter.isAlive==='function'&&!adapter.isAlive())throw new Error('[YiuRenderCoordinator] '+name+' reuse failed');return name;},
 function(error){current=null;setStageMode(null);throw error;});
}
function drain(){
 if(!want){finish();return Promise.resolve();}
 var job=want;want=null;
 if(mode==='legacy'){
  return Promise.resolve().then(function(){if(!job.name)return legacy.destroy();stats.legacySwitches++;return legacy.switchTo(job.name,job.opts||{});})
   .then(function(){current=null;},function(error){lastError=error;}).then(drain);
 }
 var previous=current;current=null;lastError=null;stats.v2Switches++;stats.lastTarget=job.name;
 return Promise.resolve().then(function(){setStageMode(job.name||null);return teardownAll(previous);})
 .then(function(destroyed){return destroyed?nextFrames(2):null;})
 .then(function(){if(!job.name)return;setStageMode(job.name);return mount(job.name,job.opts).then(function(){current=job.name;});})
 .catch(function(error){
  stats.v2Failures++;warn('V2 switch failed; trying V1 compatibility bridge',error);
  try{teardownAll(job.name);}catch(_){}
  current=null;setStageMode(null);
  return fallbackToLegacy(job.name,job.opts,error).then(function(){lastError=null;},function(){lastError=error;setStageMode(null);});
 }).then(drain);
}
function request(name,opts){
 opts=opts||{};if(name)driveFaults[name]=0;
 if(mode==='legacy'&&!switching){if(!name)return legacy.destroy();stats.legacySwitches++;return legacy.switchTo(name,opts);}
 if(name&&opts.reuse&&canReuse(name)){
  return reuse(name,opts).catch(function(error){return fallbackToLegacy(name,opts,error);});
 }
 want={name:name,opts:opts};
 var promise=new Promise(function(resolve,reject){waiters.push({ok:resolve,fail:reject});});
 if(!switching){switching=true;drain();}
 return promise;
}
function activeName(){
 if(current)return current;
 for(var i=0;i<NAMES.length;i++)if(isActive(NAMES[i]))return NAMES[i];
 return null;
}
function triggerRuntimeFallback(name,error){
 if(mode!=='v2'||fallbackPending||fallbackLocked||!name)return;
 fallbackPending=true;switching=true;stats.runtimeFallbacks++;
 stats.lastRuntimeError=error&&error.message?String(error.message):String(error||'runtime drive failed');
 fallbackToLegacy(name,{reuse:false},error).then(function(){
  fallbackPending=false;if(want)drain();else finish();
 },function(fallbackError){
  fallbackPending=false;current=null;setStageMode(null);lastError=fallbackError;
  if(w.__yiuRenderFailure){try{w.__yiuRenderFailure(name,fallbackError);}catch(_){}}
  if(want)drain();else finish();
 });
}
function driveV2(time){
 if(mode!=='v2'||fallbackPending)return;
 var name=activeName(),adapter=name&&adapterOf(name);if(!adapter)return;
 if(typeof adapter.isAlive==='function'&&!adapter.isAlive()){
  driveFaults[name]=(driveFaults[name]||0)+1;
  if(driveFaults[name]>=3)triggerRuntimeFallback(name,new Error(name+' runtime stopped responding'));
  return;
 }
 if(typeof adapter.drive!=='function')return;
 try{var result=adapter.drive(time);driveFaults[name]=0;return result;}
 catch(error){
  stats.driveFailures++;driveFaults[name]=(driveFaults[name]||0)+1;warn('drive '+name,error);
  if(driveFaults[name]>=3)triggerRuntimeFallback(name,error);
 }
}
function retryV2(){
 if(mode!=='legacy'||fallbackPending)return Promise.resolve(mode==='v2');
 var target=legacy.current;stats.retryAttempts++;if(target)driveFaults[target]=0;
 if(!target){mode='v2';fallbackLocked=false;return Promise.resolve(true);}
 mode='v2';fallbackLocked=false;
 return request(target,{reuse:true}).then(function(){return mode==='v2';},function(){
  mode='legacy';fallbackLocked=true;
  return Promise.resolve(legacy.switchTo(target,{reuse:false})).then(function(){return false;},function(){return false;});
 });
}
var api={
 version:'2.0-phase3',mode:'v2',
 boot:function(){
  if(mode==='legacy')return legacy.boot();
  NAMES.forEach(function(name){if(REG[name].lazy)return;var adapter=adapterOf(name),host=hostOf(name);if(adapter&&host&&typeof adapter.init==='function'){try{adapter.init(host,{});}catch(error){warn('boot '+name,error);}}});
 },
 init:function(name,opts){if(!REG[name])return Promise.reject(new Error('[YiuRenderCoordinator] unknown engine: '+name));return request(name,opts);},
 switchTo:function(name,opts){if(!REG[name])return Promise.reject(new Error('[YiuRenderCoordinator] unknown engine: '+name));return request(name,opts);},
 drive:function(time){
  if(mode==='legacy')return legacy.drive(time);
  return driveV2(time);
 },
 loadLyrics:function(TS,WT,LN){
  if(mode==='legacy')return legacy.loadLyrics(TS,WT,LN);
  NAMES.forEach(function(name){var adapter=adapterOf(name);if(adapter&&typeof adapter.loadLyrics==='function'){try{adapter.loadLyrics(TS,WT,LN);}catch(error){warn('loadLyrics '+name,error);}}});
 },
 hide:function(){
  if(mode==='legacy')return legacy.hide();
  NAMES.forEach(function(name){var adapter=adapterOf(name);if(adapter&&typeof adapter.hide==='function'&&(isAlive(name)||isActive(name))){try{adapter.hide();}catch(error){warn('hide '+name,error);}}});
  if(!switching){current=null;setStageMode(null);}
 },
 setSuspended:function(value){
  if(mode==='legacy')return legacy.setSuspended(value);
  NAMES.forEach(function(name){var adapter=adapterOf(name);if(adapter&&typeof adapter.setSuspended==='function'){try{adapter.setSuspended(value);}catch(error){warn('suspend '+name,error);}}});
 },
 destroy:function(){return mode==='legacy'?legacy.destroy():request(null,{});},
 retryV2:retryV2,
 fallbackController:{retry:retryV2,snapshot:function(){return {active:mode==='legacy',locked:fallbackLocked,pending:fallbackPending,attempts:stats.fallbackAttempts,successes:stats.fallbacks,failures:stats.fallbackFailures,runtimeFallbacks:stats.runtimeFallbacks,driveFailures:stats.driveFailures,lastEngine:stats.lastFallbackEngine,lastError:stats.lastError,lastFallbackError:stats.lastFallbackError};}},
 snapshot:function(){return {version:api.version,mode:mode,fallbackLocked:fallbackLocked,current:api.current,isSwitching:api.isSwitching,v2Current:current,legacyCurrent:legacy.current,stats:{v2Switches:stats.v2Switches,v2Failures:stats.v2Failures,fallbackAttempts:stats.fallbackAttempts,fallbacks:stats.fallbacks,fallbackFailures:stats.fallbackFailures,legacySwitches:stats.legacySwitches,retryAttempts:stats.retryAttempts,driveFailures:stats.driveFailures,runtimeFallbacks:stats.runtimeFallbacks,lastRuntimeError:stats.lastRuntimeError,lastTarget:stats.lastTarget,lastFallbackEngine:stats.lastFallbackEngine,lastError:stats.lastError,lastFallbackError:stats.lastFallbackError}};},
 debug:function(){return {coordinator:api.snapshot(),legacy:typeof legacy.debug==='function'?legacy.debug():null};}
};
Object.defineProperties(api,{
 current:{enumerable:true,get:function(){if(mode==='legacy')return legacy.current;if(current)return current;if(switching)return null;return activeName();}},
 isSwitching:{enumerable:true,get:function(){return switching||(mode==='legacy'&&!!legacy.isSwitching);}},
 legacy:{enumerable:false,get:function(){return legacy;}}
});
w.YiuLegacyBridge=legacy;w.YiuRenderCoordinator=api;w.VisualizerManager=api;
})(window);
