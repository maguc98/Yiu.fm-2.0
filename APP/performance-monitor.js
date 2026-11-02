/* Yiu.fm performance monitor: opt-in, hidden by default. No GPU metrics are claimed. */
(function(){
  'use strict';
  if(window.__YiuPerfMonitorInstalled)return;
  window.__YiuPerfMonitorInstalled=true;
  var nativeData=null, jsData={fps:0,gaps:0}, opened=false, raf=0, prev=0, start=0, count=0, longGaps=0, intervals=[];
  var overlay=null,panel=null,nodes={};
  var css='#yiuPerfOverlay{position:fixed;inset:0;z-index:100020;background:rgba(0,0,0,.48);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .2s}'+
  '#yiuPerfOverlay.show{opacity:1;visibility:visible;pointer-events:auto}'+
  '#yiuPerfPanel{position:fixed;left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 12px);z-index:100021;max-height:78vh;overflow:auto;padding:16px;border:1px solid rgba(255,255,255,.14);border-radius:20px;background:rgba(18,21,29,.97);color:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;box-shadow:0 16px 48px rgba(0,0,0,.42);transform:translateY(-8px);opacity:0;visibility:hidden;transition:transform .22s,opacity .22s;backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px)}'+
  '#yiuPerfPanel.show{transform:none;opacity:1;visibility:visible}'+
  '#yiuPerfPanel .yp-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}'+
  '#yiuPerfPanel .yp-title{font-size:16px;font-weight:700;flex:1}'+
  '#yiuPerfPanel .yp-close{border:0;border-radius:10px;background:rgba(255,255,255,.12);color:#fff;width:32px;height:32px;font-size:18px}'+
  '#yiuPerfPanel .yp-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}'+
  '#yiuPerfPanel .yp-card{min-width:0;padding:12px;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:rgba(255,255,255,.055)}'+
  '#yiuPerfPanel .yp-label{font-size:11px;color:rgba(255,255,255,.62);margin-bottom:7px}'+
  '#yiuPerfPanel .yp-value{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}'+
  '#yiuPerfPanel .yp-unit{font-size:11px;color:rgba(255,255,255,.55);margin-left:4px}'+
  '#yiuPerfPanel .yp-note{font-size:11px;line-height:1.5;color:rgba(255,255,255,.62);margin-top:12px}'+
  '#yiuPerfOpen{display:block;width:100%;margin-top:10px;padding:10px 12px;border:1px solid rgba(125,170,255,.28);border-radius:11px;background:rgba(90,140,230,.16);color:#dce8ff;font:600 12px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}';
  function card(label,id,unit){return '<div class="yp-card"><div class="yp-label">'+label+'</div><div class="yp-value" id="'+id+'">—'+(unit?'<span class="yp-unit">'+unit+'</span>':'')+'</div></div>';}
  function build(){
    if(panel)return;
    var style=document.createElement('style');style.id='yiuPerfStyle';style.textContent=css;document.head.appendChild(style);
    overlay=document.createElement('div');overlay.id='yiuPerfOverlay';
    panel=document.createElement('section');panel.id='yiuPerfPanel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Yiu.fm 性能监控');
    panel.innerHTML='<div class="yp-head"><div class="yp-title">Yiu.fm 性能监控</div><button type="button" class="yp-close" aria-label="关闭">×</button></div><div class="yp-grid">'+
      card('原生显示同步回调','ypNative','次/s')+card('屏幕最高刷新率','ypScreen','Hz')+
      card('网页 rAF 回调频率','ypJs','FPS')+card('原生回调平均间隔','ypAvg','ms')+
      card('原生间隔 P95','ypP95','ms')+card('网页帧间隔 > 33ms','ypJsGaps','次/s')+
      card('设备热状态','ypThermal','')+card('原生间隔 > 33ms','ypNativeGaps','次/s')+
      '</div><div class="yp-note">数据用于判断主线程显示同步回调和网页动画回调是否迟滞，不代表 GPU 利用率、Metal 命令缓冲区耗时或真实屏幕呈现帧数。GPU 指标不由此监控器提供。</div>';
    document.body.appendChild(overlay);document.body.appendChild(panel);
    ['ypNative','ypScreen','ypJs','ypAvg','ypP95','ypJsGaps','ypThermal','ypNativeGaps'].forEach(function(id){nodes[id]=panel.querySelector('#'+id);});
    overlay.addEventListener('click',close);panel.querySelector('.yp-close').addEventListener('click',close);
  }
  function put(id,value){if(nodes[id])nodes[id].textContent=value===undefined||value===null?'—':String(value);}
  function render(){
    if(!panel)return;
    put('ypNative',nativeData?nativeData.displayLinkFPS.toFixed(1):'等待数据');
    put('ypScreen',nativeData?nativeData.screenMaxFPS:'—');
    put('ypJs',jsData.fps?jsData.fps.toFixed(1):'采样中');
    put('ypAvg',nativeData?nativeData.averageIntervalMs.toFixed(2):'—');
    put('ypP95',nativeData?nativeData.p95IntervalMs.toFixed(2):'—');
    put('ypJsGaps',jsData.gaps);
    put('ypThermal',nativeData?nativeData.thermalState:'等待数据');
    put('ypNativeGaps',nativeData?nativeData.gapsOver33ms:'—');
  }
  function native(op){
    try{var h=window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.yiuPerformance;if(h)h.postMessage({op:op});}
    catch(e){if(window.console&&console.warn)console.warn('[性能监控] 原生消息发送失败',e);}
  }
  function frame(ts){
    if(!opened)return;
    if(!start)start=ts;
    if(prev){var gap=ts-prev;if(isFinite(gap)&&gap>0){intervals.push(gap);count++;if(gap>33.34)longGaps++;}}
    prev=ts;
    var elapsed=ts-start;
    if(elapsed>=1000){jsData={fps:count*1000/elapsed,gaps:longGaps};count=0;longGaps=0;intervals=[];start=ts;render();}
    raf=window.requestAnimationFrame(frame);
  }
  function open(){
    build();if(opened)return;opened=true;nativeData=null;jsData={fps:0,gaps:0};prev=0;start=0;count=0;longGaps=0;intervals=[];
    overlay.classList.add('show');panel.classList.add('show');render();native('start');raf=window.requestAnimationFrame(frame);
  }
  function close(){
    opened=false;if(raf)window.cancelAnimationFrame(raf);raf=0;native('stop');
    if(overlay)overlay.classList.remove('show');if(panel)panel.classList.remove('show');
  }
  function install(){
    var host=document.querySelector('#fpsIndicator .fpsPanel');
    if(!host||document.getElementById('yiuPerfOpen'))return false;
    var b=document.createElement('button');b.type='button';b.id='yiuPerfOpen';b.textContent='打开性能详情';
    b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();open();});host.appendChild(b);return true;
  }
  window.__openYiuPerfPanel=open;window.__closeYiuPerfPanel=close;
  window.__YiuNativePerf=function(data){nativeData=data||null;render();};
  if(!install()){var tries=0,t=window.setInterval(function(){tries++;if(install()||tries>=30)window.clearInterval(t);},100);}
  document.addEventListener('visibilitychange',function(){if(document.hidden&&opened)close();});
})();