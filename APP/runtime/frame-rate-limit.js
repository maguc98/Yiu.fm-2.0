/* Yiu.fm 2.0 — Global JS animation frame-rate controller.
 * Default: 60 FPS. Optional cap: 24–60 FPS. Audio.currentTime is never modified.
 * This caps JavaScript RAF callbacks; CSS/WebKit compositor animations are separate.
 */
(function(w){
'use strict';
if(w.YiuFrameRateLimit)return;
var KEY='yiu.frameRateLimit.v1',DEFAULTS={enabled:false,fps:30},config={enabled:false,fps:30};
var nativeRAF=w.requestAnimationFrame&&w.requestAnimationFrame.bind(w),nativeCAF=w.cancelAnimationFrame&&w.cancelAnimationFrame.bind(w);
var pending=Object.create(null),dispatchBatch=null,sequence=0,nativeHandle=0,nextFrameAt=0;
var listeners=[],tickers=[],measuredFPS=0,sampleStart=0,sampleCount=0,lastDispatchAt=0;
function clampFPS(v){v=Number(v);return Number.isFinite(v)?Math.max(24,Math.min(60,Math.round(v))):DEFAULTS.fps;}
function targetFPS(){return config.enabled?config.fps:60;}
function load(){try{var s=JSON.parse(w.localStorage.getItem(KEY)||'null');if(s&&typeof s==='object'){config.enabled=s.enabled===true;config.fps=clampFPS(s.fps);}}catch(_){}}
function save(){try{w.localStorage.setItem(KEY,JSON.stringify(config));}catch(_){}}
function hasPending(){for(var k in pending)if(Object.prototype.hasOwnProperty.call(pending,k))return true;return false;}
function notify(){var fps=targetFPS();tickers=tickers.filter(function(t){if(!t)return false;try{t.maxFPS=fps;return true;}catch(_){return false;}});listeners.slice().forEach(function(fn){try{fn(getConfig());}catch(e){if(w.console&&w.console.warn)w.console.warn('[YiuFrameRateLimit] listener failed',e);}});}
function schedule(){if(nativeRAF&&!nativeHandle&&hasPending())nativeHandle=nativeRAF(pump);}
function pump(ts){
 nativeHandle=0;
 var interval=1000/targetFPS();
 if(nextFrameAt&&ts+0.25<nextFrameAt){schedule();return;}
 if(!nextFrameAt||ts-nextFrameAt>interval*4)nextFrameAt=ts;
 sampleCount++;
 if(!sampleStart)sampleStart=ts||0;
 if(ts-sampleStart>=1000){measuredFPS=sampleCount*1000/Math.max(1,ts-sampleStart);sampleCount=0;sampleStart=ts;}
 lastDispatchAt=ts;
 var batch=pending;pending=Object.create(null);dispatchBatch=batch;
 for(var id in batch){if(!Object.prototype.hasOwnProperty.call(batch,id))continue;var callback=batch[id];delete batch[id];try{callback.call(w,ts);}catch(e){if(w.console&&w.console.error)w.console.error('[YiuFrameRateLimit] callback failed',e);}}
 dispatchBatch=null;
 // Preserve the ideal deadline instead of adding a full interval to the actual
 // display frame. This alternates 2/3 display frames at 24 FPS on a 60 Hz screen.
 nextFrameAt+=interval;
 while(nextFrameAt<=ts+0.25)nextFrameAt+=interval;
 schedule();
}
function requestFrame(fn){if(typeof fn!=='function')throw new TypeError('requestAnimationFrame callback must be a function');var id=++sequence;pending[id]=fn;schedule();return id;}
function cancelFrame(id){delete pending[id];if(dispatchBatch)delete dispatchBatch[id];if(!hasPending()&&nativeHandle){if(nativeCAF)nativeCAF(nativeHandle);nativeHandle=0;}}
function getConfig(){return {enabled:config.enabled,fps:config.fps,targetFPS:targetFPS()};}
function setConfig(p){p=p&&typeof p==='object'?p:{};if(Object.prototype.hasOwnProperty.call(p,'enabled'))config.enabled=p.enabled===true;if(Object.prototype.hasOwnProperty.call(p,'fps'))config.fps=clampFPS(p.fps);nextFrameAt=0;save();notify();schedule();return getConfig();}
function reset(){config.enabled=DEFAULTS.enabled;config.fps=DEFAULTS.fps;nextFrameAt=0;save();notify();schedule();return getConfig();}
function onChange(fn){if(typeof fn!=='function')return function(){};listeners.push(fn);return function(){var i=listeners.indexOf(fn);if(i>=0)listeners.splice(i,1);};}
function bindTicker(ticker){if(!ticker||typeof ticker!=='object')return false;if(tickers.indexOf(ticker)<0)tickers.push(ticker);try{ticker.maxFPS=targetFPS();return true;}catch(_){return false;}}
function bindRuntime(runtime){if(!runtime)return 0;var candidates=[runtime.ticker,runtime.app&&runtime.app.ticker,runtime.pixiApp&&runtime.pixiApp.ticker,runtime.renderer&&runtime.renderer.ticker];var count=0;candidates.forEach(function(t){if(bindTicker(t))count++;});return count;}
function getSnapshot(){var count=0;for(var k in pending)if(Object.prototype.hasOwnProperty.call(pending,k))count++;return {config:getConfig(),pendingCallbacks:count,nativeFramePending:!!nativeHandle,measuredFPS:Math.round(measuredFPS*10)/10,lastDispatchAt:lastDispatchAt,boundTickers:tickers.length};}
load();
if(nativeRAF){w.requestAnimationFrame=requestFrame;w.cancelAnimationFrame=cancelFrame;}
w.YiuFrameRateLimit={version:'1.1.0',getConfig:getConfig,setConfig:setConfig,reset:reset,getTargetFPS:targetFPS,bindTicker:bindTicker,bindRuntime:bindRuntime,onChange:onChange,getSnapshot:getSnapshot};
})(window);
