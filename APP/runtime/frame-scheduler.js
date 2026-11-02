/* Yiu.fm 2.0 — Frame Scheduler
 * Owns the main player RAF loop. Engine-specific renderers keep their native
 * tickers; this scheduler does not force DOM/React and Pixi onto one renderer.
 */
(function(w){
'use strict';
var active=false,id=0,fn=null,keep=null,suspended=false,inFrame=false,lastFrameTime=null;
function schedule(){if(active&&!suspended&&!inFrame&&!id)id=w.requestAnimationFrame(loop);}
function loop(t){
 id=0;if(!active||suspended)return;
 inFrame=true;lastFrameTime=typeof t==='number'?t:null;
 try{if(fn)fn(t);}catch(e){if(w.console&&w.console.error)w.console.error('[YiuFrameScheduler] callback failed',e);}
 inFrame=false;
 if(!active||suspended)return;
 if(keep){try{if(keep()===false){stop();return;}}catch(e){if(w.console&&w.console.error)w.console.error('[YiuFrameScheduler] continuation failed',e);stop();return;}}
 schedule();
}
function start(callback,continuation){
 if(typeof callback==='function')fn=callback;
 if(typeof continuation==='function')keep=continuation;
 if(!fn)return false;
 active=true;schedule();return true;
}
function stop(){active=false;if(id){w.cancelAnimationFrame(id);id=0;}lastFrameTime=null;}
function suspend(value){
 suspended=!!value;
 if(suspended&&id){w.cancelAnimationFrame(id);id=0;}
 else if(!suspended)schedule();
}
w.YiuFrameScheduler={
 version:'2.0-phase2',start:start,stop:stop,setSuspended:suspend,
 isRunning:function(){return active;},isSuspended:function(){return suspended;},
 getSnapshot:function(){return {running:active,suspended:suspended,pendingFrame:!!id,inFrame:inFrame,lastFrameTime:lastFrameTime};}
};
})(window);
