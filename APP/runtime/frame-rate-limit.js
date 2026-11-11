/* Yiu.fm 2.0 — Global animation frame-rate controller.
 * Default cadence: 60 FPS. Optional user cap: 24–60 FPS.
 * Native audio playback/currentTime are untouched; JS animation frames are paced globally.
 */
(function(w){
'use strict';
if(w.YiuFrameRateLimit)return;
var KEY='yiu.frameRateLimit.v1',DEFAULTS={enabled:false,fps:30},config={enabled:false,fps:30};
var nativeRAF=w.requestAnimationFrame&&w.requestAnimationFrame.bind(w),nativeCAF=w.cancelAnimationFrame&&w.cancelAnimationFrame.bind(w);
var pending=Object.create(null),sequence=0,nativeHandle=0,nextFrameAt=0,streamTimes=Object.create(null);
function clampFPS(v){v=Number(v);return Number.isFinite(v)?Math.max(24,Math.min(60,Math.round(v))):DEFAULTS.fps;}
function targetFPS(){return config.enabled?config.fps:60;}
function load(){try{var s=JSON.parse(w.localStorage.getItem(KEY)||'null');if(s&&typeof s==='object'){config.enabled=s.enabled===true;config.fps=clampFPS(s.fps);}}catch(_){}}
function save(){try{w.localStorage.setItem(KEY,JSON.stringify(config));}catch(_){}}
function hasPending(){for(var k in pending)if(Object.prototype.hasOwnProperty.call(pending,k))return true;return false;}
function schedule(){if(nativeRAF&&!nativeHandle&&hasPending())nativeHandle=nativeRAF(pump);}
function pump(ts){
 nativeHandle=0;
 if(nextFrameAt&&ts+0.25<nextFrameAt){schedule();return;}
 nextFrameAt=ts+1000/targetFPS();
 var batch=pending;pending=Object.create(null);
 for(var id in batch){if(!Object.prototype.hasOwnProperty.call(batch,id))continue;try{batch[id].call(w,ts);}catch(e){if(w.console&&w.console.error)w.console.error('[YiuFrameRateLimit] callback failed',e);}}
 schedule();
}
function requestFrame(fn){if(typeof fn!=='function')throw new TypeError('requestAnimationFrame callback must be a function');var id=++sequence;pending[id]=fn;schedule();return id;}
function cancelFrame(id){delete pending[id];if(!hasPending()&&nativeHandle){if(nativeCAF)nativeCAF(nativeHandle);nativeHandle=0;}}
function getConfig(){return {enabled:config.enabled,fps:config.fps,targetFPS:targetFPS()};}
function setConfig(p){p=p&&typeof p==='object'?p:{};if(Object.prototype.hasOwnProperty.call(p,'enabled'))config.enabled=p.enabled===true;if(Object.prototype.hasOwnProperty.call(p,'fps'))config.fps=clampFPS(p.fps);nextFrameAt=0;streamTimes=Object.create(null);save();return getConfig();}
function reset(){config.enabled=DEFAULTS.enabled;config.fps=DEFAULTS.fps;nextFrameAt=0;streamTimes=Object.create(null);save();return getConfig();}
function shouldRender(ts,key){var n=Number(ts);if(!Number.isFinite(n))n=Date.now();key=String(key||'default');var last=streamTimes[key],interval=1000/targetFPS();if(last==null||n<last||n-last+0.25>=interval){streamTimes[key]=n;return true;}return false;}
load();
if(nativeRAF){w.requestAnimationFrame=requestFrame;w.cancelAnimationFrame=cancelFrame;}
w.YiuFrameRateLimit={version:'1.0.0',getConfig:getConfig,setConfig:setConfig,reset:reset,getTargetFPS:targetFPS,shouldRender:shouldRender,getSnapshot:function(){var count=0;for(var k in pending)if(Object.prototype.hasOwnProperty.call(pending,k))count++;return {config:getConfig(),pendingCallbacks:count,nativeFramePending:!!nativeHandle};}};
})(window);
