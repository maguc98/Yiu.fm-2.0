/* Yiu.fm 2.0 — System settings UI for global frame-rate control. */
(function(w,d){
'use strict';
function mount(){
 var api=w.YiuFrameRateLimit,group=d.querySelector('#yiuSettingsDataRoot .grp .gp');
 if(!api||!group||d.getElementById('yiuFrameRateSettings'))return false;
 var panel=d.createElement('div');panel.id='yiuFrameRateSettings';
 panel.style.cssText='margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.1);display:flex;flex-direction:column;gap:10px;';
 panel.innerHTML=
 '<div style="display:flex;align-items:center;justify-content:space-between;padding:0 4px"><b style="font-size:14px">帧率限制</b><em id="yiuFrameRateStatus" style="font-style:normal;color:var(--sub);font-size:12px">未限制 · 60 FPS</em></div>'+
 '<label class="chk yiu-frame-rate-toggle" aria-label="限制最高帧率" style="display:flex;align-items:center;justify-content:space-between;width:100%;margin:0;padding:10px 14px;background:rgba(255,255,255,.04);border-radius:12px;box-sizing:border-box"><span style="font-size:14px;color:var(--sub)">限制最高帧率</span><input type="checkbox" id="yiuFrameRateEnabled"></label>'+
 '<div style="display:flex;flex-direction:column;gap:8px;padding:0 4px"><div style="display:flex;align-items:center;justify-content:space-between"><b style="font-size:13px">帧率上限</b><em id="yiuFrameRateValue" style="font-style:normal;color:var(--sub);font-size:12px">30 FPS</em></div>'+
 '<div class="qr" style="display:flex;align-items:center;gap:8px"><span style="font-size:12px;color:var(--sub)">24</span><input type="range" id="yiuFrameRateSlider" min="24" max="60" step="1" value="30" aria-label="帧率上限" style="flex:1"><span style="font-size:12px;color:var(--sub)">60</span></div></div>'+
 '<div class="qtip" style="margin:0 4px">默认以 60 FPS 运行。开启后限制 JS 动画帧率（24–60 FPS），不改变音频播放速度或歌词时间轴。部分 CSS / WebKit 合成动画不受此限制；可看右上角实测 JS FPS 判断是否生效。</div>';
 var resetButton=d.getElementById('qrstMoved');
 if(resetButton&&resetButton.parentNode)group.insertBefore(panel,resetButton.parentNode);else group.appendChild(panel);
 var enabled=d.getElementById('yiuFrameRateEnabled'),slider=d.getElementById('yiuFrameRateSlider');
 var value=d.getElementById('yiuFrameRateValue'),status=d.getElementById('yiuFrameRateStatus');
 function refresh(){var c=api.getConfig(),s=api.getSnapshot?api.getSnapshot():null,actual=s&&s.measuredFPS>0?' · 实测 JS '+Math.round(s.measuredFPS)+' FPS':'';enabled.checked=c.enabled;slider.value=String(c.fps);slider.disabled=!c.enabled;slider.setAttribute('aria-disabled',c.enabled?'false':'true');value.textContent=c.fps+' FPS';status.textContent=(c.enabled?'已限制 · '+c.targetFPS+' FPS':'未限制 · 60 FPS')+actual;if(typeof w.sync==='function')try{w.sync(slider)}catch(_){}}
 if(typeof w.wrapRange==='function')try{w.wrapRange(slider)}catch(_){}
 enabled.addEventListener('change',function(){api.setConfig({enabled:enabled.checked});refresh();});
 slider.addEventListener('input',function(){api.setConfig({fps:Number(slider.value)});refresh();});
 if(resetButton)resetButton.addEventListener('click',function(){api.reset();refresh();});
 refresh();var meter=setInterval(function(){if(!d.getElementById('yiuFrameRateSettings')){clearInterval(meter);return;}refresh();},1000);return true;
}
if(!mount()){var attempts=0,timer=setInterval(function(){if(mount()||++attempts>=20)clearInterval(timer);},50);}
})(window,document);
