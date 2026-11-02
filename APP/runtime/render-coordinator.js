/* Yiu.fm 2.0 — Render Coordinator
 * Phase 3 shadow facade: one public entry point, legacy lifecycle remains the
 * implementation underneath until the V2 coordinator passes parity checks.
 */
(function(w){
'use strict';
if(w.YiuRenderCoordinator)return;
var legacy=w.VisualizerManager;
if(!legacy)return;
var stats={mode:'shadow',bootCalls:0,switchRequests:0,switchSuccesses:0,switchFailures:0,driveCalls:0,lyricsSyncs:0,hideCalls:0,destroyCalls:0,suspendCalls:0,lastTarget:null,lastPrevious:null,lastError:null,lastDriveTime:null};
function errorText(error){return error&&error.message?String(error.message):String(error||'unknown error');}
function switchTo(name,opts){
 var previous=legacy.current;
 stats.switchRequests++;stats.lastTarget=name;stats.lastPrevious=previous;stats.lastError=null;
 var result;
 try{result=legacy.switchTo(name,opts||{});}catch(error){stats.switchFailures++;stats.lastError=errorText(error);return Promise.reject(error);}
 return Promise.resolve(result).then(function(value){stats.switchSuccesses++;return value;},function(error){stats.switchFailures++;stats.lastError=errorText(error);throw error;});
}
var api={
 version:'2.0-phase3-shadow',mode:'shadow',
 boot:function(){stats.bootCalls++;return legacy.boot.apply(legacy,arguments);},
 init:function(name,opts){return switchTo(name,opts);},
 switchTo:switchTo,
 drive:function(time){stats.driveCalls++;stats.lastDriveTime=time;return legacy.drive.apply(legacy,arguments);},
 loadLyrics:function(){stats.lyricsSyncs++;return legacy.loadLyrics.apply(legacy,arguments);},
 hide:function(){stats.hideCalls++;return legacy.hide.apply(legacy,arguments);},
 setSuspended:function(value){stats.suspendCalls++;return legacy.setSuspended.apply(legacy,arguments);},
 destroy:function(){stats.destroyCalls++;return legacy.destroy.apply(legacy,arguments);},
 debug:function(){return {mode:stats.mode,stats:api.snapshot(),legacy:typeof legacy.debug==='function'?legacy.debug():null};},
 snapshot:function(){return {mode:stats.mode,bootCalls:stats.bootCalls,switchRequests:stats.switchRequests,switchSuccesses:stats.switchSuccesses,switchFailures:stats.switchFailures,driveCalls:stats.driveCalls,lyricsSyncs:stats.lyricsSyncs,hideCalls:stats.hideCalls,destroyCalls:stats.destroyCalls,suspendCalls:stats.suspendCalls,lastTarget:stats.lastTarget,lastPrevious:stats.lastPrevious,lastError:stats.lastError,lastDriveTime:stats.lastDriveTime,current:legacy.current,isSwitching:legacy.isSwitching};}
};
Object.defineProperties(api,{current:{enumerable:true,get:function(){return legacy.current;}},isSwitching:{enumerable:true,get:function(){return legacy.isSwitching;}},legacy:{enumerable:false,get:function(){return legacy;}}});
w.YiuLegacyBridge=legacy;
w.YiuRenderCoordinator=api;
w.VisualizerManager=api;
})(window);
