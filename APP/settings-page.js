/* Yiu.fm 2.0 — native settings architecture.
 * The hidden source is only a one-time staging area. Live controls are moved,
 * never cloned, so their existing service listeners and IDs remain intact.
 */
(function(w,d){
'use strict';
var tries=0;
  // Build the one-time settings control source before devtools.js runs.
  // The controls are moved into the live settings page during mount; this source is removed afterward.
  (function(){
    if(d.getElementById('yiuSettingsDataRoot'))return;
    var settingsData=d.createElement('div');
    settingsData.id='yiuSettingsDataRoot';
    settingsData.className='yiu-settings-data-root';
    settingsData.setAttribute('aria-hidden','true');
    settingsData.style.cssText='display:none!important;position:absolute!important;width:0!important;height:0!important;overflow:hidden!important;pointer-events:none!important;';
    settingsData.innerHTML=`<div class="yiu-settings-source">

      <!-- 1. 系统设置 -->
      <div class="grp">
        <button class="gh" type="button" aria-expanded="false"><span>系统设置</span><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>
        <div class="gb"><div class="gi"><div class="gp">
          <div class="qh" style="margin-top:0; display:flex; justify-content:space-between; align-items:center; padding:0 4px;">
            <b>界面动画速度</b><em id="uiSpdV" class="av" style="font-style:normal; color:var(--sub);">1.00×</em>
          </div>
          <div class="qr" style="margin-top:8px; display:flex; align-items:center; gap:8px; padding:0 4px;">
            <span style="font-size:12px; color:var(--sub);">0.25×</span>
            <input type="range" id="uiSpd" min="25" max="300" step="5" value="100" aria-label="界面动画速度" style="flex:1;">
            <span style="font-size:12px; color:var(--sub);">3×</span>
          </div>
          <div class="qtip" style="margin:6px 4px 0">调节面板、按钮、菜单等界面动画的快慢，不影响文字特效。</div>

          <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px; border-top:1px solid rgba(255,255,255,.1); padding-top:16px;">
            <label class="chk" style="display:flex; align-items:center; justify-content:space-between; width:100%; margin:0; padding:10px 14px; background:rgba(255,255,255,.04); border-radius:12px; box-sizing:border-box;">
              <span style="font-size:14px; color:#fff;">高光描边</span>
              <input type="checkbox" id="uiH" checked>
            </label>
            <label class="chk" style="display:flex; align-items:center; justify-content:space-between; width:100%; margin:0; padding:10px 14px; background:rgba(255,255,255,.04); border-radius:12px; box-sizing:border-box;">
              <span style="font-size:14px; color:#fff;">柔和阴影</span>
              <input type="checkbox" id="uiS" checked>
            </label>
            <label class="chk" style="display:flex; align-items:center; justify-content:space-between; width:100%; margin:0; padding:10px 14px; background:rgba(255,255,255,.04); border-radius:12px; box-sizing:border-box;">
              <span style="font-size:14px; color:#fff;">性能优化</span>
              <input type="checkbox" id="performanceMode" checked>
            </label>
          </div>

          <div class="qd" style="margin-top:20px; display:flex; justify-content:center;">
            <button class="chip" id="qrstMoved" type="button" style="flex:1; padding:10px 0;">恢复默认设置</button>
          </div>
        </div></div></div>
      </div>

      <!-- 2. Beta 测试功能 -->
      <div class="grp" id="betaBox">
        <button class="gh" type="button" aria-expanded="false" style="background:rgba(80,125,240,.25); border:1px solid rgba(80,125,240,.4);"><span style="color:#a3c2ff">Beta 测试功能</span><em class="beta-tag" style="margin-left:auto; margin-right:8px;">BETA</em><svg viewBox="0 0 24 24" style="stroke:#a3c2ff"><path d="M6 9l6 6 6-6"/></svg></button>
        <div class="gb"><div class="gi"><div class="gp" id="betaBody" style="display:flex;flex-direction:column;gap:8px;">
          <div class="qtip" style="margin-top:0; margin-bottom:8px;">测试中的功能，可能不稳定。音乐模式和音频 / 歌词导入已移到底部「···」菜单。</div>
        </div></div></div>
      </div>

      <!-- 3. 开发者选项（由 devtools.js 注入） -->
      <div id="devOptionsHolder"></div>

      <div class="qtip" id="appVersion" style="text-align:center;margin-top:24px">版本 v0.1.1 Beta 3</div>
    </div>`;
    d.body.appendChild(settingsData);
    var ranges=settingsData.querySelectorAll('input[type=range]');
    Array.prototype.forEach.call(ranges,function(el){if(typeof w.wrapRange==='function')w.wrapRange(el)});
    if(typeof w.bindUiSpd==='function')w.bindUiSpd();
    var reset=settingsData.querySelector('#qrstMoved');
    if(reset)reset.onclick=function(){if(typeof w.setUiSpdPct==='function')w.setUiSpdPct(100);var demo=d.getElementById('qdemo');if(demo)demo.checked=!demo.checked};
    settingsData.addEventListener('click',function(e){
      var button=e.target.closest&&e.target.closest('button');if(!button)return;e.stopPropagation();
      var target=button.dataset.t;if(target){var control=d.getElementById(target);if(control)control.click()}
      Array.prototype.forEach.call(settingsData.querySelectorAll('[data-t]'),function(item){var control=d.getElementById(item.dataset.t);item.classList.toggle('on',!!(control&&control.checked))});
    });
  })();
function mount(){
  var root=d.getElementById('yiuSettingsDataRoot');
  var source=root&&root.querySelector('.yiu-settings-source');
  if(!root||!source||d.getElementById('yiuSettingsPage'))return false;
  if(!d.getElementById('devOptionsGroup'))return false;
  var frameRateScript=d.querySelector('script[src*="frame-rate-settings.js"]');
  if(frameRateScript&&!d.getElementById('yiuFrameRateSettings')&&tries<10)return false;

  var oldSystem=source.querySelector(':scope > .grp:not(#betaBox)');
  var beta=source.querySelector('#betaBox');
  var developer=source.querySelector('#devOptionsGroup');
  if(!oldSystem)return false;

  var page=d.createElement('section');
  page.id='yiuSettingsPage';
  page.className='yiu-settings-page is-hidden';
  page.setAttribute('role','dialog');
  page.setAttribute('aria-modal','true');
  page.setAttribute('aria-label','Yiu.fm 系统设置');
  page.setAttribute('aria-hidden','true');

  var style=d.createElement('style');
  style.id='yiuSettingsPageCSS';
  style.textContent=[
  '#yiuSettingsPage{--s-bg:#f4f6fb;--s-card:#fff;--s-ink:#222536;--s-sub:color-mix(in srgb,var(--s-ink) 62%,transparent);--s-line:color-mix(in srgb,var(--s-ink) 13%,transparent);--s-accent:#7b75d5;position:fixed;inset:0;z-index:2147482000;width:100%;height:100vh;height:100dvh;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;box-sizing:border-box;padding:calc(env(safe-area-inset-top,0px) + 8px) 18px calc(env(safe-area-inset-bottom,0px) + 28px);background:var(--s-bg);color:var(--s-ink);font-family:inherit;color-scheme:light}',
  '#yiuSettingsPage *{box-sizing:border-box}#yiuSettingsPage.is-hidden{display:none!important}#yiuSettingsPage.is-open{display:block;animation:yiuSettingsEnter .18s ease-out both}@keyframes yiuSettingsEnter{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',
  'body.yiu-full-settings-open #panel{visibility:hidden!important;pointer-events:none!important}',
  'body.yiu-full-settings-open .aiui-pill{display:none!important}',
  '#yiuSettingsPage button,#yiuSettingsPage input,#yiuSettingsPage select,#yiuSettingsPage textarea{font:inherit}#yiuSettingsPage button{cursor:pointer;-webkit-tap-highlight-color:transparent}#yiuSettingsPage [hidden]{display:none!important}',
  '#yiuSettingsPage .s-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:12px;min-height:58px;margin:0 -18px 12px;padding:0 18px;background:var(--s-bg);border-bottom:1px solid var(--s-line)}',
  '#yiuSettingsPage .s-back{display:grid;place-items:center;width:42px;height:42px;flex:none;border:1px solid var(--s-line);border-radius:14px;background:var(--s-card);color:var(--s-ink)}#yiuSettingsPage .s-back svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}#yiuSettingsPage .s-head{min-width:0;flex:1}#yiuSettingsPage .s-title{font-size:20px;font-weight:780;letter-spacing:-.3px}#yiuSettingsPage .s-subtitle{margin-top:2px;color:var(--s-sub);font-size:11px}',
  '#yiuSettingsPage .s-wrap{width:100%;max-width:680px;margin:0 auto}#yiuSettingsPage .s-search{display:flex;align-items:center;gap:10px;height:48px;margin:8px 0 15px;padding:0 14px;border:1px solid var(--s-line);border-radius:15px;background:var(--s-card);color:var(--s-sub)}#yiuSettingsPage .s-search svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8}#yiuSettingsPage .s-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--s-ink);font-size:15px}',
  '#yiuSettingsPage .s-hero{display:flex;align-items:center;gap:13px;margin-bottom:22px;padding:16px;border:1px solid #e3e5f5;border-radius:19px;background:linear-gradient(115deg,color-mix(in srgb,var(--s-accent) 12%,var(--s-bg)),var(--s-card))}#yiuSettingsPage .s-mark{display:grid;place-items:center;width:48px;height:48px;flex:none;border-radius:15px;background:#d9e3fb;color:#5b69ad;font-size:22px}#yiuSettingsPage .s-hero b{display:block;font-size:16px}#yiuSettingsPage .s-hero small{display:block;margin-top:4px;color:#626b82;font-size:12px}',
  '#yiuSettingsPage .s-label{margin:0 3px 10px;color:var(--s-sub);font-size:12px;font-weight:750;letter-spacing:.3px}#yiuSettingsPage .s-list{display:flex;flex-direction:column;gap:9px}',
  '#yiuSettingsPage .s-category{display:flex;align-items:center;gap:13px;width:100%;min-height:76px;padding:12px 14px;border:1px solid var(--s-line);border-radius:17px;background:var(--s-card);color:var(--s-ink);text-align:left}#yiuSettingsPage .s-category:active{border-color:var(--s-accent);background:#f9f8ff}',
  '#yiuSettingsPage .s-icon{display:grid;place-items:center;width:44px;height:44px;flex:none;border-radius:14px;background:#edf0fb}#yiuSettingsPage .s-icon svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}#yiuSettingsPage [data-cat=system] .s-icon{background:#eaf0fc}#yiuSettingsPage [data-cat=beta] .s-icon{background:#fff1e6}#yiuSettingsPage [data-cat=developer] .s-icon{background:#e9f5ee}#yiuSettingsPage [data-cat=theme] .s-icon{background:#f7eefa}',
  '#yiuSettingsPage .s-arrow svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}#yiuSettingsPage .s-copy{flex:1;min-width:0}#yiuSettingsPage .s-copy b{display:block;font-size:14px;font-weight:750}#yiuSettingsPage .s-copy small{display:block;margin-top:4px;color:var(--s-sub);font-size:11px;line-height:1.45}#yiuSettingsPage .s-arrow{color:#969bad;font-size:23px}',
  '#yiuSettingsPage .s-panel{position:relative;isolation:isolate;width:100%;max-width:680px;min-height:100%;margin:0 auto;padding:3px 0 20px;background:var(--s-bg);pointer-events:auto}#yiuSettingsPage .s-panel-intro{position:relative;z-index:2;margin:0 0 14px;padding:12px 13px;border:1px solid var(--s-line);border-radius:13px;background:var(--s-card);color:var(--s-sub);font-size:12px;line-height:1.55}',
  '#yiuSettingsPage .s-section{margin:0 0 17px}#yiuSettingsPage .s-section-title{display:flex;align-items:center;gap:8px;margin:0 3px 9px;color:var(--s-sub);font-size:12px;font-weight:780}#yiuSettingsPage .s-section-title:before{content:"";width:4px;height:13px;border-radius:4px;background:var(--s-accent)}#yiuSettingsPage .s-section-body{display:flex;flex-direction:column;gap:9px}',
  '#yiuSettingsPage .s-panel>.grp{margin:0 0 14px;padding:10px;border:1px solid var(--s-line);border-radius:16px;background:var(--s-card);color:var(--s-card-ink)}#yiuSettingsPage .s-panel>.grp>.gh{background:var(--s-bg)!important;border:1px solid var(--s-line)!important;box-shadow:none!important;color:var(--s-card-ink)!important}#yiuSettingsPage .s-panel>.grp>.gh span,#yiuSettingsPage .s-panel>.grp>.gh em,#yiuSettingsPage .s-panel>.grp>.gh svg{color:var(--s-card-ink)!important;stroke:currentColor!important}#yiuSettingsPage .s-panel>.grp .gp{color:var(--s-card-ink)!important}#yiuSettingsPage .s-panel>.grp .qtip{color:var(--s-card-sub)!important}#yiuSettingsPage .s-panel>.grp .chk{color:var(--s-card-ink)!important;background:var(--s-bg)!important;border:1px solid var(--s-line)!important}#yiuSettingsPage .s-panel>.grp .chk span{color:var(--s-card-ink)!important}#yiuSettingsPage .s-panel>.grp#devOptionsGroup{margin-top:0!important;padding-top:10px!important;border-top:1px solid var(--s-line)!important}#yiuSettingsPage .s-panel>.grp .gp :is(span,small,p,label,em,strong,b,i,code,output,legend){color:var(--s-card-ink)!important}#yiuSettingsPage .s-panel>.grp .gp :is(.qtip,.tnote,.ph,.mt,.stat,.av,.cv,.mini,.np-s,.mi-l,.mi-s,.pm-lb,.tlt){color:var(--s-card-sub)!important;opacity:1!important;text-shadow:none!important}#yiuSettingsPage .s-panel>.grp .gp :is(input,select,textarea){color:var(--s-card-ink)}',
  /* Keep the blank gutter above each section heading opaque and non-interactive; stop overflowing previous controls showing through or receiving taps. */,
  '#yiuSettingsPage .s-section{position:relative;isolation:isolate;z-index:4}#yiuSettingsPage .s-section::before{content:"";position:absolute;top:-17px;left:-18px;right:-18px;height:17px;background:var(--s-bg);z-index:6;pointer-events:auto}#yiuSettingsPage .s-section-title{position:relative;z-index:7;background:var(--s-bg)}',
  '#yiuSettingsPage .s-control-card{display:flex;flex-direction:column;gap:10px;min-width:0;padding:14px;border:1px solid var(--s-line);border-radius:16px;background:var(--s-card);box-shadow:0 2px 7px rgba(37,45,70,.035)}#yiuSettingsPage .s-control-card>*{max-width:100%;min-width:0}#yiuSettingsPage .s-control-card .qh{display:flex;justify-content:space-between;align-items:center;gap:10px;color:var(--s-ink);font-size:14px;font-weight:700}#yiuSettingsPage .s-control-card .qtip,#yiuSettingsPage .s-control-card .tnote{margin:0!important;padding:9px 10px;border-radius:10px;background:var(--s-bg);color:var(--s-sub)!important;font-size:11px;line-height:1.55}',
  '#yiuSettingsPage .s-category,#yiuSettingsPage .s-search,#yiuSettingsPage .s-back,#yiuSettingsPage .s-hero,#yiuSettingsPage .s-control-card,#yiuSettingsPage .s-control-card .qh,#yiuSettingsPage .s-control-card .row,#yiuSettingsPage .s-control-card .chip,#yiuSettingsPage .s-theme-card,#yiuSettingsPage .s-theme-card h3,#yiuSettingsPage .s-theme-card p,#yiuSettingsPage .s-color,#yiuSettingsPage .s-preset{color:var(--s-card-ink)!important}#yiuSettingsPage .s-search input{color:var(--s-card-ink)!important}#yiuSettingsPage .s-search,#yiuSettingsPage .s-copy small,#yiuSettingsPage .s-arrow,#yiuSettingsPage .s-control-card .qtip,#yiuSettingsPage .s-control-card .tnote,#yiuSettingsPage .s-control-card .qr,#yiuSettingsPage .s-control-card .qr span,#yiuSettingsPage .s-theme-card p,#yiuSettingsPage .s-color{color:var(--s-card-sub)!important}#yiuSettingsPage .s-control-card [style*="color:var(--sub)"],#yiuSettingsPage .s-control-card [style*="color: var(--sub)"],#yiuSettingsPage .s-control-card [style*="color:#fff"],#yiuSettingsPage .s-control-card [style*="color: #fff"]{color:var(--s-card-ink)!important}#yiuSettingsPage .s-panel-intro{background:var(--s-card);color:var(--s-card-sub)}#yiuSettingsPage .s-hero small{color:var(--s-card-sub)}',
  '#yiuSettingsPage .s-control-card [style*="color:#fff"],#yiuSettingsPage .s-control-card [style*="color: #fff"]{color:var(--s-card-ink)!important}',
  '#yiuSettingsPage .s-control-card .yiu-frame-rate-toggle span{color:var(--s-card-ink)!important}#yiuSettingsPage .s-control-card .row{display:flex;align-items:center;gap:10px;min-height:38px;color:var(--s-card-ink)}#yiuSettingsPage .s-control-card .row>span:first-child{flex:1;min-width:0;font-size:13px}#yiuSettingsPage .s-control-card .qr{display:flex!important;align-items:center;gap:9px;color:var(--s-sub);font-size:11px}#yiuSettingsPage .s-control-card .qr>.rw,#yiuSettingsPage .s-control-card .qr>input[type=range]{flex:1;min-width:0}',
  '#yiuSettingsPage input[type=checkbox]{appearance:none;-webkit-appearance:none;position:relative;display:inline-block;flex:none;width:48px;height:28px;margin:0;border:1.5px solid #c8ccda;border-radius:999px;background:#e8eaf0;vertical-align:middle;transition:background .16s,border-color .16s}#yiuSettingsPage input[type=checkbox]:after{content:"";position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 4px #252b4030;transition:transform .16s}#yiuSettingsPage input[type=checkbox]:checked{border-color:var(--s-accent);background:var(--s-accent)}#yiuSettingsPage input[type=checkbox]:checked:after{transform:translateX(20px)}',
  '#yiuSettingsPage .rw{position:relative;display:block;flex:1 1 0;width:100%;min-width:0;height:30px}#yiuSettingsPage .qr>.rw{grid-column:2;min-width:0}#yiuSettingsPage input[type=range]{-webkit-appearance:none;appearance:none;display:block;width:100%;height:30px;margin:0;padding:0;background:transparent;touch-action:pan-y;--f:.5;--e:calc(22px + (100% - 44px)*var(--f))}#yiuSettingsPage input[type=range]::-webkit-slider-runnable-track{height:12px;box-sizing:border-box;border:1px solid #aeb6c7;border-radius:6px;background:linear-gradient(90deg,var(--s-accent) 0,var(--s-accent) var(--s-progress,0%),#c5ccda var(--s-progress,0%),#c5ccda 100%);box-shadow:inset 0 1px 3px rgba(35,48,75,.22)}#yiuSettingsPage input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:44px;height:28px;margin-top:-8px;border:0;border-radius:14px;background:transparent;box-shadow:none}#yiuSettingsPage input[type=range]::-moz-range-track{height:12px;box-sizing:border-box;border:1px solid #aeb6c7;border-radius:6px;background:#c5ccda;box-shadow:inset 0 1px 3px rgba(35,48,75,.22)}#yiuSettingsPage input[type=range]::-moz-range-progress{height:12px;border-radius:6px;background:var(--s-accent)}#yiuSettingsPage input[type=range]::-moz-range-thumb{width:42px;height:26px;border:0;border-radius:14px;background:transparent;box-shadow:none}#yiuSettingsPage .rw>.gt{display:block;position:absolute;top:50%;left:calc(22px + (100% - 44px)*var(--f,.5));width:44px;height:28px;margin:-14px 0 0 -22px;border:1px solid rgba(91,103,137,.48);border-radius:14px;pointer-events:none;z-index:2;background:linear-gradient(180deg,#fff,#e5e9f4);box-shadow:0 4px 13px rgba(35,48,75,.28),inset 0 -2px 4px rgba(120,140,200,.25);transition:transform calc(.45s/var(--ui-spd,1)) var(--spring-pop,cubic-bezier(.32,.72,0,1)),box-shadow calc(.3s/var(--ui-spd,1)) ease}#yiuSettingsPage .rw:has(>input[type=range]:active)>.gt{transform:scale(1.1);box-shadow:0 8px 20px rgba(35,48,75,.25)}#yiuSettingsPage input[type=range]:focus-visible{outline:2px solid var(--s-accent);outline-offset:5px;border-radius:8px}#yiuSettingsPage input[type=range]:disabled{opacity:.55;cursor:not-allowed}@media(prefers-reduced-motion:reduce){#yiuSettingsPage .rw>.gt{transition:none}}',
  /* Slider clipping/overlap fix: reserve vertical room and keep every slider card above following section headers. */,
  '#yiuSettingsPage .s-section,#yiuSettingsPage .s-section-body,#yiuSettingsPage .s-control-card{overflow:visible!important}#yiuSettingsPage .s-control-card{position:relative;z-index:2}#yiuSettingsPage .s-section-title{position:relative;z-index:0}#yiuSettingsPage .rw{position:relative;z-index:3;height:40px;min-height:40px;overflow:visible!important}#yiuSettingsPage .rw>input[type=range]{height:40px;overflow:visible}#yiuSettingsPage .rw>.gt{z-index:4;top:50%;transform-origin:center}#yiuSettingsPage .rw:has(>input[type=range]:active)>.gt{z-index:5}',
  /* Minimal slider: a fine neutral line and original simple white thumb; no heavy glass styling. */,
  '#yiuSettingsPage input:not([type=checkbox]):not([type=range]),#yiuSettingsPage select,#yiuSettingsPage textarea{max-width:100%;min-width:0;min-height:40px;padding:9px 11px;border:1px solid #dce1eb;border-radius:11px;background:#fff;color:var(--s-ink)}#yiuSettingsPage .chip{min-height:39px;padding:9px 13px;border:1px solid #e0def1;border-radius:11px;background:#f4f2fc;color:#625ab2;font-size:12px;font-weight:700}#yiuSettingsPage .seg{display:flex;flex-wrap:wrap;gap:6px}',
  '#yiuSettingsPage .s-theme-card{position:relative;isolation:isolate;z-index:4;margin:0 0 12px;padding:15px;border:1px solid var(--s-line);border-radius:16px;background:var(--s-card)}#yiuSettingsPage .s-theme-card::before{content:"";position:absolute;top:-13px;left:-18px;right:-18px;height:13px;background:var(--s-bg);z-index:6;pointer-events:auto}#yiuSettingsPage .s-theme-card h3{position:relative;z-index:7;margin:0 0 7px;font-size:14px;background:var(--s-card)}#yiuSettingsPage .s-theme-card p{margin:0 0 12px;color:var(--s-sub);font-size:11px;line-height:1.5}#yiuSettingsPage .s-presets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}#yiuSettingsPage .s-preset{display:flex;align-items:center;gap:8px;min-height:40px;padding:8px 10px;border:1px solid var(--s-line);border-radius:11px;background:var(--s-card);color:var(--s-ink);font-size:12px}#yiuSettingsPage .s-preset i{width:17px;height:17px;border-radius:50%}#yiuSettingsPage .s-colors{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}#yiuSettingsPage .s-color{display:flex;flex-direction:column;gap:6px;color:var(--s-sub);font-size:11px}#yiuSettingsPage .s-color input{width:100%;height:36px;padding:2px;border:1px solid var(--s-line);border-radius:9px;background:#fff}',
  '#yiuSettingsPage .s-control-card input:not([type=checkbox]):not([type=range]),#yiuSettingsPage .s-control-card select,#yiuSettingsPage .s-control-card textarea{background:var(--s-card);color:var(--s-card-ink)}#yiuSettingsPage .s-control-card .chip{background:color-mix(in srgb,var(--s-accent) 10%,var(--s-card));color:var(--s-card-ink)}',
  '#yiuSettingsPage .s-footer{max-width:680px;margin:0 auto;padding:20px 0 5px;color:var(--s-sub);text-align:center;font-size:10px}#yiuSettingsPage .s-footer button{display:block;width:100%;margin:0 0 10px;padding:11px;border:1px solid var(--s-line);border-radius:12px;background:var(--s-card);color:var(--s-sub);font-size:12px}',
  '#yiuSettingsPage :focus-visible{outline:2px solid var(--s-accent);outline-offset:3px}#yiuSettingsPage button:disabled,#yiuSettingsPage input:disabled{opacity:.48;cursor:not-allowed}#yiuSettingsPage .s-empty{padding:22px 12px;color:var(--s-sub);text-align:center;font-size:12px}',
  '#yiuSettingsPage .s-control-card .tnote,#yiuSettingsPage .s-control-card .qtip,#yiuSettingsPage .s-control-card .qr,#yiuSettingsPage .s-control-card .qr span{opacity:1!important;color:var(--s-card-sub)!important}#yiuSettingsPage .s-control-card .row span,#yiuSettingsPage .s-control-card .qh,#yiuSettingsPage .s-control-card .qh b{opacity:1!important;color:var(--s-card-ink)!important}#yiuSettingsPage .s-control-card :is(.tnote,.qtip,.qr,.row span,.qh,.qh b){text-shadow:none!important}',
  '#yiuSettingsPage .s-control-card :is(span,small,p,label,em,strong,b,i,code,output,legend){color:var(--s-card-ink)!important}#yiuSettingsPage .s-control-card :is(.tnote,.qtip,.ph,.mt,.stat,.lcnt,.av,.cv,.crow>span,.mini,.np-s,.mi-l,.mi-s,.pm-lb,.tlt,.qr span){color:var(--s-card-sub)!important}#yiuSettingsPage .s-control-card :is(.tnote,.qtip,.ph,.mt,.stat,.lcnt,.av,.cv,.crow>span,.mini,.np-s,.mi-l,.mi-s,.pm-lb,.tlt){opacity:1!important;text-shadow:none!important}',
  ].join('');
  d.head.appendChild(style);

  page.innerHTML='<header class="s-top"><button class="s-back" type="button" aria-label="返回"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button><div class="s-head"><div class="s-title">系统设置</div><div class="s-subtitle" hidden></div></div></header><main class="s-wrap"><div class="s-home"><label class="s-search"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.2 4.2"/></svg><input type="search" placeholder="搜索设置" aria-label="搜索设置"></label><div class="s-hero"><div class="s-mark">♫</div><div><b>Yiu.fm 2.0</b><small>把播放体验调整成你喜欢的样子</small></div></div><div class="s-label">设置分类</div><div class="s-list"></div><div class="s-empty" hidden>没有找到相关设置</div></div><div class="s-panels" hidden></div></main><footer class="s-footer"><button type="button" data-open-logs>查看运行日志</button><div>Yiu.fm · 设置保存在本机</div></footer>';
  d.body.appendChild(page);

  var home=page.querySelector('.s-home'),list=page.querySelector('.s-list'),panels=page.querySelector('.s-panels');
  var title=page.querySelector('.s-title'),subtitle=page.querySelector('.s-subtitle'),search=page.querySelector('.s-search input');
  var footer=page.querySelector('.s-footer'),empty=page.querySelector('.s-empty');
  var cats=[
    {id:'system',title:'系统设置',desc:'界面速度、性能与基础偏好',icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.3"/><path d="M19 13.7v-3.4l-2-.5a5.6 5.6 0 0 0-.6-1.4l1.1-1.7-2.4-2.4-1.7 1.1a5.6 5.6 0 0 0-1.4-.6l-.5-2H8.1l-.5 2a5.6 5.6 0 0 0-1.4.6L4.5 4.3 2.1 6.7l1.1 1.7a5.6 5.6 0 0 0-.6 1.4l-2 .5v3.4l2 .5a5.6 5.6 0 0 0 .6 1.4l-1.1 1.7 2.4 2.4 1.7-1.1a5.6 5.6 0 0 0 1.4.6l.5 2h3.4l.5-2a5.6 5.6 0 0 0 1.4-.6l1.7 1.1 2.4-2.4-1.1-1.7a5.6 5.6 0 0 0 .6-1.4Z"/></svg>',source:oldSystem},
    {id:'beta',title:'Beta 测试功能',desc:'正在试验与逐步开放的功能',icon:'<svg viewBox="0 0 24 24"><path d="M9 3h6M10 3v6l-5.5 9.2A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.8L14 9V3M8 15h8"/></svg>',source:beta},
    {id:'developer',title:'开发者选项',desc:'性能监测、调试与维护工具',icon:'<svg viewBox="0 0 24 24"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/></svg>',source:developer},
    {id:'theme',title:'主题与颜色',desc:'自定义设置页面的配色',icon:'<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18h1.2a2 2 0 0 0 1.4-3.4 1.8 1.8 0 0 1 1.3-3.1H18a3 3 0 0 0 3-3c0-4.7-4-8.5-9-8.5Z"/><path d="M7.5 10h.01M10 7.5h.01M14 7.5h.01M16.5 10h.01"/></svg>'}
  ];
  var active=null,previousFocus=null,previousOverflow='',previousInert=[],opened=false;
  var themeDefaults={accent:'#7b75d5',bg:'#f4f6fb',card:'#ffffff',ink:'#222536'};
  var themePresets={
    lavender:{accent:'#7b75d5',bg:'#f4f6fb',card:'#ffffff',ink:'#222536'},
    blue:{accent:'#5486d8',bg:'#eef5ff',card:'#ffffff',ink:'#253247'},
    green:{accent:'#4d9b7a',bg:'#eff8f2',card:'#ffffff',ink:'#263b32'},
    peach:{accent:'#d58a63',bg:'#fff4ec',card:'#ffffff',ink:'#443127'},
    pink:{accent:'#cf729b',bg:'#fff1f6',card:'#ffffff',ink:'#432b38'}
  };
  var theme=Object.assign({},themeDefaults);
  try{theme=Object.assign(theme,JSON.parse(w.localStorage.getItem('yiu.settings.theme.v1')||'{}'))}catch(_){}
  function hexLuminance(hex){var v=hex.replace('#',''),r=parseInt(v.slice(0,2),16)/255,g=parseInt(v.slice(2,4),16)/255,b=parseInt(v.slice(4,6),16)/255;function f(x){return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4)}return .2126*f(r)+.7152*f(g)+.0722*f(b)}
  function contrastRatio(a,b){var x=hexLuminance(a),y=hexLuminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
  function mixHex(fg,bg,alpha){var f=fg.replace('#',''),b=bg.replace('#',''),out='';for(var i=0;i<3;i++){var v=Math.round(parseInt(f.slice(i*2,i*2+2),16)*alpha+parseInt(b.slice(i*2,i*2+2),16)*(1-alpha));out+=('0'+v.toString(16)).slice(-2)}return '#'+out}
  function readableSub(fg,bg){var lo=0,hi=1;for(var i=0;i<18;i++){var mid=(lo+hi)/2;if(contrastRatio(mixHex(fg,bg,mid),bg)>=4.5)hi=mid;else lo=mid}return mixHex(fg,bg,hi)}
  function applyTheme(save){
    Object.keys(themeDefaults).forEach(function(k){if(!/^#[0-9a-f]{6}$/i.test(theme[k]||''))theme[k]=themeDefaults[k]});
    var dark='#000000',light='#ffffff',effectiveInk=theme.ink,effectiveCardInk=theme.ink;
    if(contrastRatio(effectiveInk,theme.bg)<4.5)effectiveInk=contrastRatio(dark,theme.bg)>=contrastRatio(light,theme.bg)?dark:light;
    if(contrastRatio(effectiveCardInk,theme.card)<4.5)effectiveCardInk=contrastRatio(dark,theme.card)>=contrastRatio(light,theme.card)?dark:light;
    page.style.colorScheme=hexLuminance(theme.bg)>.45?'light':'dark';
    page.style.setProperty('--s-accent',theme.accent);
    page.style.setProperty('--s-bg',theme.bg);
    page.style.setProperty('--s-card',theme.card);
    page.style.setProperty('--s-ink',effectiveInk);
    page.style.setProperty('--s-sub',readableSub(effectiveInk,theme.bg));
    page.style.setProperty('--s-card-ink',effectiveCardInk);
    page.style.setProperty('--s-card-sub',readableSub(effectiveCardInk,theme.card));
    page.querySelectorAll('[data-theme-key]').forEach(function(el){el.value=theme[el.dataset.themeKey]});
    if(save)try{w.localStorage.setItem('yiu.settings.theme.v1',JSON.stringify(theme))}catch(_){}
  }
  function openOriginalGroup(src,panel){
    if(!src)return;
    var head=src.querySelector('.gh');
    if(head&&!head.__yiuSettingsBound){
      head.__yiuSettingsBound=true;
      head.addEventListener('click',function(){
        var open=src.classList.toggle('open');
        head.setAttribute('aria-expanded',open?'true':'false');
      });
    }
    src.classList.add('open');
    if(head)head.setAttribute('aria-expanded','true');
    panel.appendChild(src);
  }
  function moveSystem(src,panel){openOriginalGroup(src,panel)}
  function moveDeveloper(src,panel){if(src){src.classList.add('open');var head=src.querySelector('.gh');if(head)head.setAttribute('aria-expanded','true');panel.appendChild(src)}}
  function addTheme(panel){
    var presets=d.createElement('section');presets.className='s-theme-card';
    presets.innerHTML='<h3>预设主题</h3><p>选一套配色，也可以在下面逐项调整。</p><div class="s-presets"><button class="s-preset" data-preset="lavender"><i style="background:#7b75d5"></i>薰衣草</button><button class="s-preset" data-preset="blue"><i style="background:#5486d8"></i>晴空蓝</button><button class="s-preset" data-preset="green"><i style="background:#4d9b7a"></i>薄荷绿</button><button class="s-preset" data-preset="peach"><i style="background:#d58a63"></i>蜜桃橙</button><button class="s-preset" data-preset="pink"><i style="background:#cf729b"></i>樱花粉</button></div>';
    panel.appendChild(presets);
    var custom=d.createElement('section');custom.className='s-theme-card';
    custom.innerHTML='<h3>自定义颜色</h3><p>只影响设置页面，不会改变播放器、歌词或动效主题。</p><div class="s-colors"><label class="s-color">强调色<input type="color" data-theme-key="accent"></label><label class="s-color">页面底色<input type="color" data-theme-key="bg"></label><label class="s-color">卡片颜色<input type="color" data-theme-key="card"></label><label class="s-color">文字颜色<input type="color" data-theme-key="ink"></label></div><button class="chip" type="button" data-theme-reset style="margin-top:14px;width:100%">恢复默认配色</button>';
    panel.appendChild(custom);applyTheme(false);
  }
  function makeCategory(cat){
    var card=d.createElement('button');card.type='button';card.className='s-category';card.dataset.cat=cat.id;
    card.innerHTML='<span class="s-icon" aria-hidden="true">'+cat.icon+'</span><span class="s-copy"><b>'+cat.title+'</b><small>'+cat.desc+'</small></span><span class="s-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></span>';
    list.appendChild(card);
    var panel=d.createElement('section');panel.className='s-panel';panel.dataset.panel=cat.id;panel.hidden=true;
    var intro=d.createElement('p');intro.className='s-panel-intro';intro.textContent=cat.desc;panel.appendChild(intro);
    if(cat.id==='system')moveSystem(cat.source,panel);
    else if(cat.id==='developer')moveDeveloper(cat.source,panel);
    else if(cat.id==='beta')openOriginalGroup(cat.source,panel);
    else addTheme(panel);
    panels.appendChild(panel);cat.card=card;cat.panel=panel;
  }
  cats.forEach(makeCategory);
  function updateRanges(root){
    (root||page).querySelectorAll('input[type=range]').forEach(function(el){
      var min=Number(el.min||0),max=Number(el.max||100),v=Number(el.value||0);
      var pct=max>min?Math.max(0,Math.min(100,(v-min)/(max-min)*100)):0;
      el.style.setProperty('--s-progress',pct+'%');
      if(!el.parentNode.classList.contains('rw')){
        var wrap=d.createElement('span');wrap.className='rw';
        el.parentNode.insertBefore(wrap,el);wrap.appendChild(el);
        var thumb=d.createElement('span');thumb.className='gt';thumb.setAttribute('aria-hidden','true');wrap.appendChild(thumb);
      }
      el.parentNode.style.setProperty('--f',(pct/100).toFixed(5));
    });
  }
  function applyPanelFilter(cat,q){
    var panel=cat.panel,matched=0,categoryMatch=!q||(cat.title+' '+cat.desc).toLocaleLowerCase().indexOf(q)>=0;
    var cards=panel.querySelectorAll('.s-control-card');
    Array.prototype.forEach.call(cards,function(card){var hit=categoryMatch||(card.textContent||'').toLocaleLowerCase().indexOf(q)>=0;card.hidden=!!q&&!hit;if(hit)matched++});
    panel.querySelectorAll('.s-section').forEach(function(section){var visible=section.querySelector('.s-control-card:not([hidden])');section.hidden=!!q&&!visible});
    if(!cards.length)matched=categoryMatch||(panel.textContent||'').toLocaleLowerCase().indexOf(q)>=0?1:0;
    return matched>0;
  }
  function openCategory(id){
    var cat=cats.find(function(c){return c.id===id});if(!cat)return;
    active=cat;home.hidden=true;panels.hidden=false;cat.panel.hidden=false;
    cats.forEach(function(c){if(c!==cat)c.panel.hidden=true});
    applyPanelFilter(cat,search.value.trim().toLocaleLowerCase());
    title.textContent=cat.title;subtitle.textContent=cat.desc;subtitle.hidden=false;
    footer.hidden=true;page.scrollTop=0;updateRanges(cat.panel);
    var firstControl=cat.panel.querySelector('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
    (firstControl||page.querySelector('.s-back')).focus();
  }
  function showHome(){
    active=null;home.hidden=false;panels.hidden=true;title.textContent='系统设置';subtitle.hidden=true;
    footer.hidden=false;search.value='';filterCategories('');page.scrollTop=0;
  }
  function filterCategories(q){
    var count=0;
    cats.forEach(function(cat){
      var match=applyPanelFilter(cat,q);
      cat.card.hidden=!match;if(match)count++;
    });
    empty.hidden=!q||count>0;
  }
  function open(){
    if(opened)return;opened=true;previousFocus=d.activeElement;previousOverflow=d.body.style.overflow;previousInert=[];
    Array.prototype.forEach.call(d.body.children,function(el){if(el!==page&&'inert' in el){previousInert.push({el:el,value:el.inert});el.inert=true}});
    page.classList.remove('is-hidden');page.classList.add('is-open');page.setAttribute('aria-hidden','false');
    d.body.classList.add('yiu-full-settings-open');d.body.style.overflow='hidden';
    var trigger=d.getElementById('cmore');if(trigger)trigger.setAttribute('aria-expanded','true');
    showHome();page.querySelector('.s-back').focus();
  }
  function close(){
    if(!opened)return;opened=false;page.classList.remove('is-open');page.classList.add('is-hidden');page.setAttribute('aria-hidden','true');
    previousInert.forEach(function(item){item.el.inert=item.value});previousInert=[];
    d.body.classList.remove('yiu-full-settings-open');d.body.style.overflow=previousOverflow;
    var trigger=d.getElementById('cmore');if(trigger)trigger.setAttribute('aria-expanded','false');
    if(previousFocus&&previousFocus.focus)previousFocus.focus();
  }
  page.querySelector('.s-back').addEventListener('click',function(){if(active)showHome();else close()});
  list.addEventListener('click',function(e){var card=e.target.closest('[data-cat]');if(card)openCategory(card.dataset.cat)});
  search.addEventListener('input',function(){filterCategories(search.value.trim().toLocaleLowerCase())});
  page.addEventListener('input',function(e){
    if(e.target.matches('input[type=range]'))updateRanges(e.target.parentNode);
    if(e.target.matches('[data-theme-key]')){
      var key=e.target.dataset.themeKey;
      if(Object.prototype.hasOwnProperty.call(themeDefaults,key)){
        theme[key]=e.target.value;
        applyTheme(true);
      }
    }
  });
  page.addEventListener('change',function(e){
    if(e.target.matches('[data-theme-key]')){
      var key=e.target.dataset.themeKey;
      if(Object.prototype.hasOwnProperty.call(themeDefaults,key)){
        theme[key]=e.target.value;
        applyTheme(true);
      }
    }
  });
  page.addEventListener('change',function(e){if(e.target.matches('input[type=range]'))updateRanges(e.target.parentNode)});
  page.addEventListener('click',function(e){
    var preset=e.target.closest('[data-preset]');
    if(preset&&themePresets[preset.dataset.preset]){theme=Object.assign({},themePresets[preset.dataset.preset]);applyTheme(true);return}
    if(e.target.closest('[data-theme-reset]')){theme=Object.assign({},themeDefaults);applyTheme(true);return}
    var proxy=e.target.closest('[data-t]');
    if(proxy){var control=d.getElementById(proxy.dataset.t);if(control)control.click()}
    if(e.target.closest('[data-open-logs]')){if(typeof w.__openLogPanel==='function')w.__openLogPanel()}
  });
  function routeEntry(e){
    var trigger=e.target&&e.target.closest&&e.target.closest('#cmore, #hbTools [data-for="cmore"]');
    if(!trigger)return;
    e.stopImmediatePropagation();
    if(e.type==='pointerdown'||e.type==='touchstart'||e.type==='mousedown')return;
    e.preventDefault();if(!opened)open();
  }
  ['pointerdown','pointerup','touchstart','touchend','mousedown','mouseup','click'].forEach(function(type){d.addEventListener(type,routeEntry,true)});
  d.addEventListener('keydown',function(e){
    if(!opened)return;
    if(e.key==='Escape'){if(active){showHome();page.querySelector('.s-back').focus()}else close();return}
    if(e.key!=='Tab')return;
    var focusable=Array.prototype.filter.call(page.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'),function(el){return !el.hidden&&el.getClientRects().length>0});
    if(!focusable.length){e.preventDefault();page.querySelector('.s-back').focus();return}
    var first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&(d.activeElement===first||!page.contains(d.activeElement))){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&(d.activeElement===last||!page.contains(d.activeElement))){e.preventDefault();first.focus()}
  });
  d.addEventListener('change',function(e){if(e.target&&e.target.matches&&e.target.matches('input[type=range]'))updateRanges(page)});
  applyTheme(false);updateRanges(page);
  if(source.querySelector('#appVersion'))page.querySelector('.s-footer div').textContent=source.querySelector('#appVersion').textContent+' · 设置保存在本机';
  root.remove();
  w.__yiuSettingsDiag=function(){return {ui:'native-settings-20261112d',mounted:!!d.getElementById('yiuSettingsPage'),categories:cats.map(function(c){return c.id}),sourceRemoved:!d.getElementById('yiuSettingsDataRoot'),controls:page.querySelectorAll('input,select,textarea,button').length}};
  return true;
}
var timer=w.setInterval(function(){tries++;if(mount()||tries>=80)w.clearInterval(timer)},100);
})(window,document);
