/* Yiu.fm 2.0 — dedicated settings UI.
 * The old screen/menu is removed. A non-rendering data root temporarily hosts
 * compatibility controls while their handlers are migrated into services.
 */
(function(w,d){
'use strict';
var attempts=0;
function mount(){
  var sourceRoot=d.getElementById('yiuSettingsDataRoot');
  var source=sourceRoot&&sourceRoot.querySelector('.yiu-settings-source');
  if(!sourceRoot||!source||d.getElementById('yiuSettingsPage'))return false;
  if(!d.getElementById('yiuFrameRateSettings')&&attempts<18)return false;

  var page=d.createElement('section');
  page.id='yiuSettingsPage';
  page.setAttribute('role','dialog');
  page.setAttribute('aria-modal','true');
  page.setAttribute('aria-label','Yiu.fm 设置');
  page.setAttribute('aria-hidden','true');
  page.className='is-hidden';

  var style=d.createElement('style');
  style.id='yiuSettingsPageCSS';
  style.textContent=`
:root{--yiu-m3-bg:#f5f1fb;--yiu-m3-surface:#fff;--yiu-m3-ink:#292536;--yiu-m3-sub:#5f596b;--yiu-m3-primary:#7565c9;--yiu-m3-line:#e8e2ef}
#yiuSettingsPage{--sub:#625c6b;--yf-green:#8fb8a3;--yf-green-ink:#2f7a52;--yf-blue-ink:#5a79a8;--yiu-theme-accent:#7565c9;--yiu-theme-bg:#f5f1fb;--yiu-theme-card:#fff;--yiu-theme-ink:#292536;--yiu-theme-line:#e8e2ef;position:fixed;inset:0;z-index:2147482000;box-sizing:border-box;width:100vw;height:100vh;height:100dvh;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:calc(env(safe-area-inset-top,0px) + 8px) 18px calc(env(safe-area-inset-bottom,0px) + 30px);background:var(--yiu-theme-bg);color:var(--yiu-theme-ink);font-family:inherit;color-scheme:light}
body.yiu-full-settings-open #panel{visibility:hidden!important;pointer-events:none!important}#yiuSettingsPage.is-hidden{display:none!important}#yiuSettingsPage.is-open{display:block;animation:yiuSettingsIn .18s ease-out both}@keyframes yiuSettingsIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
#yiuSettingsPage *{box-sizing:border-box}#yiuSettingsPage button,#yiuSettingsPage input,#yiuSettingsPage select,#yiuSettingsPage textarea{font:inherit}#yiuSettingsPage [hidden]{display:none!important}
#yiuSettingsPage .m3-top{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:12px;min-height:58px;margin:0 -18px 8px;padding:0 18px;background:var(--yiu-theme-bg);border-bottom:1px solid var(--yiu-theme-line)}
#yiuSettingsPage .m3-back{display:flex;align-items:center;justify-content:center;flex:none;width:42px;height:42px;border:0;border-radius:12px;background:transparent;color:var(--yiu-theme-ink);font-size:27px;line-height:1;-webkit-tap-highlight-color:transparent}
#yiuSettingsPage .m3-title-wrap{display:flex;flex-direction:column;justify-content:center;gap:2px;min-width:0}#yiuSettingsPage .m3-title{font-size:21px;line-height:1.25;font-weight:750;letter-spacing:-.3px}#yiuSettingsPage .m3-top.sub .m3-title{font-size:19px}#yiuSettingsPage .m3-subtitle{color:#625c6b;font-size:11px;line-height:1.3;font-weight:500}#yiuSettingsPage .m3-subtitle[hidden]{display:none!important}
#yiuSettingsPage :focus-visible{outline:2px solid var(--yiu-theme-accent);outline-offset:3px}#yiuSettingsPage button:disabled,#yiuSettingsPage input:disabled,#yiuSettingsPage select:disabled{opacity:.55;cursor:not-allowed}
#yiuSettingsPage .m3-home,#yiuSettingsPage .m3-subpage{width:100%;max-width:680px;margin:0 auto}
#yiuSettingsPage .m3-search{display:flex;align-items:center;gap:11px;height:48px;margin:12px 0 16px;padding:0 14px;border:1px solid var(--yiu-theme-line);border-radius:14px;background:var(--yiu-theme-card);color:#5f596b}
#yiuSettingsPage .m3-search:focus-within{border-color:var(--yiu-theme-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--yiu-theme-accent) 13%,transparent)}#yiuSettingsPage .m3-search svg{width:19px;height:19px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8}
#yiuSettingsPage .m3-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--yiu-theme-ink);font-size:15px}#yiuSettingsPage .m3-search input::placeholder{color:#716b7b;opacity:1}
#yiuSettingsPage .m3-hero{display:flex;align-items:center;gap:13px;min-height:84px;margin:0 0 22px;padding:14px 15px;border:1px solid #e5def1;border-radius:18px;background:linear-gradient(110deg,#eee9fa,#f2eef9 62%,#fbedf2);color:#302a3d}
#yiuSettingsPage .m3-logo{display:flex;align-items:center;justify-content:center;flex:none;width:50px;height:50px;border-radius:15px;background:#ddd5f2;color:#6755a8;font-size:21px;font-weight:800}
#yiuSettingsPage .m3-hero strong{display:block;font-size:16px;font-weight:750}#yiuSettingsPage .m3-hero small{display:block;margin-top:4px;color:#5e5669;font-size:12px;line-height:1.5}
#yiuSettingsPage .m3-section-title{margin:0 3px 10px;color:#554e60;font-size:13px;font-weight:750}
#yiuSettingsPage .m3-list{display:flex;flex-direction:column;gap:9px;overflow:visible}
#yiuSettingsPage .m3-category{display:flex;align-items:center;gap:13px;width:100%;min-height:76px;padding:12px 14px;border:1px solid var(--yiu-theme-line)!important;border-radius:16px;background:var(--yiu-theme-card)!important;color:var(--yiu-theme-ink);text-align:left;cursor:pointer;transition:background .12s ease,border-color .12s ease;-webkit-tap-highlight-color:transparent}
#yiuSettingsPage .m3-category:active{background:color-mix(in srgb,var(--yiu-theme-accent) 7%,var(--yiu-theme-card))!important;border-color:var(--yiu-theme-accent)!important}
#yiuSettingsPage .m3-icon{display:flex;align-items:center;justify-content:center;flex:none;width:44px;height:44px;border-radius:13px;background:#eee9f8;color:#6d5bb4}#yiuSettingsPage .m3-icon svg{display:block;width:24px;height:24px;overflow:visible}
#yiuSettingsPage .m3-category[data-category=system] .m3-icon{background:#e9f0fb;color:#5475b6}#yiuSettingsPage .m3-category[data-category=beta] .m3-icon{background:#fbefe4;color:#b97848}#yiuSettingsPage .m3-category[data-category=developer] .m3-icon{background:#e8f3ec;color:#4c8667}
#yiuSettingsPage .m3-cat-copy{flex:1;min-width:0}#yiuSettingsPage .m3-cat-copy strong{display:block;color:var(--yiu-theme-ink);font-size:15px;line-height:1.35;font-weight:700}#yiuSettingsPage .m3-cat-copy small{display:block;margin-top:4px;color:#625c6b;font-size:12px;line-height:1.4}#yiuSettingsPage .m3-chevron{flex:none;color:#797283;font-size:24px;font-weight:400}
#yiuSettingsPage .m3-subpage{padding:4px 0 18px}
#yiuSettingsPage .m3-subdesc{margin:0 0 13px;padding:10px 12px;border:1px solid var(--yiu-theme-line);border-radius:12px;background:color-mix(in srgb,var(--yiu-theme-accent) 6%,var(--yiu-theme-card));color:#50495a;font-size:12px;line-height:1.55}
#yiuSettingsPage .m3-group-title{margin:0 2px 12px;color:var(--yiu-theme-ink);font-size:19px;line-height:1.3;font-weight:750}#yiuSettingsPage [data-panel=system]>.m3-group-title,#yiuSettingsPage [data-panel=system]>.m3-subdesc{display:none!important}
#yiuSettingsPage .m3-category-panel[data-category=system]{--cat-soft:#f3f6fc;--cat-border:#e0e7f2;--cat-ink:#526a9f}#yiuSettingsPage .m3-category-panel[data-category=beta]{--cat-soft:#fbf5ef;--cat-border:#efe2d5;--cat-ink:#a56c43}#yiuSettingsPage .m3-category-panel[data-category=developer]{--cat-soft:#f1f7f3;--cat-border:#dce9df;--cat-ink:#47765c}
#yiuSettingsPage .m3-settings-body{display:flex!important;flex-direction:column!important;gap:12px!important;width:100%;min-width:0;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;color:var(--yiu-theme-ink)!important;box-shadow:none!important}
#yiuSettingsPage .m3-settings-body>*{visibility:visible!important;opacity:1!important;max-height:none}
#yiuSettingsPage .m3-setting-item{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:9px!important;width:100%;min-width:0;padding:14px!important;border:1px solid var(--yiu-theme-line)!important;border-radius:16px!important;background:var(--yiu-theme-card)!important;color:var(--yiu-theme-ink)!important;box-shadow:0 2px 7px rgba(45,36,65,.035)!important}
#yiuSettingsPage .m3-setting-item>*{width:100%;max-width:100%;min-width:0}
#yiuSettingsPage .m3-setting-section{display:flex;flex-direction:column;gap:8px;min-width:0;margin:0}
#yiuSettingsPage .m3-hierarchy-title{display:flex;align-items:center;gap:8px;margin:5px 2px 2px;color:var(--cat-ink,#6550a0)!important;font-size:13px;font-weight:750}
#yiuSettingsPage .m3-hierarchy-title:before{content:"";width:4px;height:13px;border-radius:4px;background:var(--cat-ink,#8b78c5)}
#yiuSettingsPage .m3-setting-section-body{display:flex;flex-direction:column;gap:8px;min-width:0}#yiuSettingsPage .m3-setting-section-body>.m3-setting-item{margin:0}
#yiuSettingsPage .m3-settings-body[data-category=developer]>.m3-setting-item{padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
#yiuSettingsPage .m3-settings-body[data-category=developer] .m3-setting-section{padding:11px;border:1px solid var(--cat-border,#e8e2ef);border-radius:14px;background:var(--cat-soft,#faf9fc)}
#yiuSettingsPage .m3-subpage .m3-setting-item{color:var(--yiu-theme-ink)!important}
#yiuSettingsPage .m3-subpage .m3-setting-item :is(.qh,strong,b,label,.row,.chk span){color:var(--yiu-theme-ink)!important}
#yiuSettingsPage .m3-subpage .m3-setting-item :is(.qr,.qtip,.hint,.desc,.subtext,small,p){color:#5f5968!important}
#yiuSettingsPage .m3-subpage .m3-setting-item .qh{display:flex!important;align-items:center;justify-content:space-between;gap:10px;margin:0!important;padding:0!important;font-size:14px;line-height:1.4;font-weight:700}
#yiuSettingsPage .m3-subpage .m3-setting-item .qr{display:grid!important;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:9px;width:100%;min-width:0;margin:0!important;padding:0!important;font-size:12px;line-height:1.4}
#yiuSettingsPage .m3-subpage .m3-setting-item .qr>span:first-child{grid-column:1;white-space:nowrap}
#yiuSettingsPage .m3-subpage .m3-setting-item .qr>span:last-child{grid-column:3;white-space:nowrap}
#yiuSettingsPage .m3-subpage .m3-setting-item .qtip{display:block!important;margin:0!important;padding:9px 10px;border:1px solid #e9e4ed;border-radius:11px;background:#f8f6fa!important;color:#5b5563!important;font-size:12px;line-height:1.5}
#yiuSettingsPage .m3-subpage .m3-setting-item .chk{display:grid!important;grid-template-columns:minmax(0,1fr) 48px!important;align-items:center!important;column-gap:12px!important;width:100%!important;min-height:52px!important;margin:0!important;padding:10px 12px!important;border:1px solid var(--yiu-theme-line)!important;border-radius:13px!important;background:color-mix(in srgb,var(--yiu-theme-card) 92%,var(--yiu-theme-bg))!important;color:var(--yiu-theme-ink)!important;text-align:left!important;line-height:1.4!important}
#yiuSettingsPage .m3-subpage .m3-setting-item .chk span{grid-column:1;min-width:0;font-size:14px;line-height:1.4;overflow-wrap:anywhere}
#yiuSettingsPage .m3-setting-item .chk:has(.yiu-switch)>span{display:block!important;visibility:visible!important;opacity:1!important;color:var(--yiu-theme-ink)!important;grid-column:1!important;min-width:0!important}
#yiuSettingsPage .m3-subpage .m3-setting-item .chip{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:9px 13px!important;border:1px solid color-mix(in srgb,var(--yiu-theme-accent) 28%,var(--yiu-theme-line))!important;border-radius:12px!important;background:color-mix(in srgb,var(--yiu-theme-accent) 8%,var(--yiu-theme-card))!important;color:var(--yiu-theme-accent)!important;font-size:13px;font-weight:700}
#yiuSettingsPage .m3-subpage .m3-setting-item .qd{margin:0!important;padding-top:9px;border-top:1px solid var(--yiu-theme-line)}
#yiuSettingsPage .m3-subpage .m3-settings-body input:not([type=checkbox]):not([type=range]),#yiuSettingsPage .m3-subpage .m3-settings-body select,#yiuSettingsPage .m3-subpage .m3-settings-body textarea{max-width:100%;min-width:0;min-height:40px;padding:9px 11px;border:1px solid #dcd5e4;border-radius:10px;background:#fff;color:#292536;-webkit-text-fill-color:#292536}
#yiuSettingsPage .m3-subpage .m3-settings-body input::placeholder,#yiuSettingsPage .m3-subpage .m3-settings-body textarea::placeholder{color:#716b79;-webkit-text-fill-color:#716b79;opacity:1}
#yiuSettingsPage .m3-search-results{display:flex;flex-direction:column;gap:8px;margin:0 0 12px}
#yiuSettingsPage .m3-search-result{display:flex;flex-direction:column;align-items:flex-start;gap:4px;width:100%;padding:12px 14px;border:1px solid var(--yiu-theme-line);border-radius:13px;background:var(--yiu-theme-card);color:var(--yiu-theme-ink);text-align:left}
#yiuSettingsPage .m3-search-result strong{font-size:14px}#yiuSettingsPage .m3-search-result small{color:#625c6b;font-size:12px}
#yiuSettingsPage .m3-search-hit{outline:2px solid var(--yiu-theme-accent)!important;outline-offset:3px!important;border-radius:10px!important}
#yiuSettingsPage .m3-empty{margin-top:12px;padding:19px 16px;border:1px solid var(--yiu-theme-line);border-radius:15px;background:var(--yiu-theme-card);color:#625c6b;text-align:center;font-size:13px}
#yiuSettingsPage .m3-empty strong{display:block;margin-bottom:5px;color:var(--yiu-theme-ink);font-size:15px}#yiuSettingsPage .m3-empty button{margin-top:12px;padding:9px 15px;border:0;border-radius:10px;background:#eee8f6;color:#503d79;font-size:13px;font-weight:700}
#yiuSettingsPage .m3-footer{max-width:680px;margin:0 auto;padding:22px 0 5px;color:#716b79;text-align:center;font-size:11px}
#yiuSettingsPage .yiu-native-control{display:none!important;position:absolute!important;width:1px!important;height:1px!important;min-width:1px!important;min-height:1px!important;margin:0!important;padding:0!important;opacity:0!important;pointer-events:none!important;clip-path:inset(50%)!important}
#yiuSettingsPage .m3-setting-item .qr:has(.yiu-slider){display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;align-items:center!important;gap:9px!important;width:100%!important;min-width:0!important}
#yiuSettingsPage .m3-setting-item .qr:has(.yiu-slider)>span:first-child{grid-column:1!important}
#yiuSettingsPage .m3-setting-item .qr:has(.yiu-slider)>span:last-child{grid-column:3!important}
#yiuSettingsPage .m3-setting-item .row:has(.yiu-slider){display:grid!important;grid-template-columns:minmax(0,1fr) minmax(110px,1.5fr)!important;align-items:center!important;column-gap:12px!important;width:100%!important;min-width:0!important}
#yiuSettingsPage .m3-setting-item .row:has(.yiu-slider)>span:first-child{grid-column:1!important;min-width:0!important;line-height:1.4!important}
#yiuSettingsPage .m3-setting-item .qr>.yiu-slider{grid-column:2!important;grid-row:1!important}
#yiuSettingsPage .m3-setting-item .row>.yiu-slider{grid-column:2!important;grid-row:1!important}
#yiuSettingsPage .yiu-slider{position:relative!important;display:block!important;width:100%!important;min-width:0!important;height:44px!important;min-height:44px!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;touch-action:pan-y!important;cursor:pointer!important;user-select:none!important;-webkit-user-select:none!important;-webkit-tap-highlight-color:transparent!important}
#yiuSettingsPage .yiu-slider-track{position:absolute!important;left:10px!important;right:10px!important;top:50%!important;height:6px!important;transform:translateY(-50%)!important;border:0!important;border-radius:999px!important;background:#b8b3c1!important;box-shadow:inset 0 1px 1px rgba(35,28,55,.12)!important;overflow:visible!important}
#yiuSettingsPage .yiu-slider-fill{position:absolute!important;left:0!important;top:0!important;bottom:0!important;width:var(--yiu-slider-progress,0%)!important;border-radius:999px!important;background:var(--yiu-theme-accent)!important}
#yiuSettingsPage .yiu-slider-thumb{position:absolute!important;left:var(--yiu-slider-progress,0%)!important;top:50%!important;width:20px!important;height:20px!important;transform:translate(-50%,-50%)!important;border:2px solid var(--yiu-theme-accent)!important;border-radius:50%!important;background:#fff!important;box-shadow:0 3px 9px rgba(35,28,55,.28),0 0 0 2px rgba(255,255,255,.96)!important}
#yiuSettingsPage .yiu-slider:active .yiu-slider-thumb{transform:translate(-50%,-50%) scale(1.12)!important}
#yiuSettingsPage .yiu-slider:focus-visible{outline:2px solid color-mix(in srgb,var(--yiu-theme-accent) 30%,transparent)!important;outline-offset:2px!important;border-radius:999px!important}
#yiuSettingsPage .yiu-slider[aria-disabled=true]{opacity:.42!important;cursor:not-allowed!important;filter:grayscale(.35)!important}#yiuSettingsPage .yiu-slider[aria-disabled=true] .yiu-slider-track{background:#dedbe3!important}#yiuSettingsPage .yiu-slider[aria-disabled=true] .yiu-slider-fill{background:#bdb7c7!important}#yiuSettingsPage .yiu-slider[aria-disabled=true] .yiu-slider-thumb{border-color:#bdb7c7!important;box-shadow:none!important}#yiuSettingsPage .m3-setting-item .chk:has(#yiuMirror_yiuFrameRateEnabled)>span{display:block!important;visibility:visible!important;opacity:1!important;color:var(--yiu-theme-ink)!important;font-size:14px!important;font-weight:650!important}#yiuSettingsPage .m3-setting-item .chk:has(#yiuMirror_yiuFrameRateEnabled){grid-template-columns:minmax(0,1fr) 48px!important}#yiuSettingsPage .m3-setting-item .chk:has(#yiuMirror_yiuFrameRateEnabled)>span{font-size:14px!important;font-weight:650!important;line-height:1.4!important;color:var(--yiu-theme-ink)!important}#yiuSettingsPage .yiu-frame-rate-range{transition:opacity .16s ease,filter .16s ease}#yiuSettingsPage .yiu-frame-rate-range.is-disabled{opacity:.48!important;filter:grayscale(.25)!important}#yiuSettingsPage .yiu-frame-rate-range.is-disabled .yiu-frame-rate-heading,#yiuSettingsPage .yiu-frame-rate-range.is-disabled .yiu-frame-rate-heading *{color:#827c89!important}#yiuSettingsPage .yiu-frame-rate-range.is-disabled .qr>span{color:#96909c!important}
#yiuSettingsPage .yiu-switch{position:relative!important;display:inline-flex!important;flex:none!important;align-items:center!important;justify-content:flex-start!important;width:48px!important;min-width:48px!important;max-width:48px!important;height:28px!important;min-height:28px!important;margin:0!important;padding:0!important;appearance:none!important;-webkit-appearance:none!important;border:2px solid #aaa3b4!important;border-radius:999px!important;background:#e8e4ec!important;box-shadow:inset 0 1px 2px rgba(40,32,55,.08)!important;overflow:visible!important;cursor:pointer!important;transition:background .16s ease,border-color .16s ease!important;-webkit-tap-highlight-color:transparent!important}
#yiuSettingsPage .yiu-switch:before{content:""!important;position:absolute!important;top:2px!important;left:2px!important;width:20px!important;height:20px!important;border-radius:50%!important;background:#fff!important;box-shadow:0 1px 3px rgba(35,28,55,.22)!important;transform:translateX(0)!important;transition:transform .16s ease!important}
#yiuSettingsPage .yiu-switch.is-on{border-color:var(--yiu-theme-accent)!important;background:var(--yiu-theme-accent)!important}
#yiuSettingsPage .yiu-switch.is-on:before{transform:translateX(20px)!important}
#yiuSettingsPage .yiu-switch:focus-visible{outline:2px solid color-mix(in srgb,var(--yiu-theme-accent) 32%,transparent)!important;outline-offset:3px!important}
#yiuSettingsPage .yiu-switch:disabled{opacity:.45!important;cursor:not-allowed!important}
#yiuSettingsPage .m3-setting-item .yiu-frame-rate-toggle{display:grid!important;grid-template-columns:minmax(0,1fr) 48px!important;align-items:center!important;gap:12px!important;min-height:54px!important;padding:11px 13px!important;border:1px solid #e4deeb!important;border-radius:13px!important;background:#f8f6fb!important}
#yiuSettingsPage .yiu-frame-rate-toggle>span{display:block!important;grid-column:1!important;grid-row:1!important;visibility:visible!important;opacity:1!important;color:#302b3b!important;font-size:14px!important;font-weight:650!important;line-height:1.4!important}
#yiuSettingsPage .yiu-frame-rate-toggle>.yiu-switch{display:inline-flex!important;grid-column:2!important;grid-row:1!important;justify-self:end!important;align-self:center!important;flex:0 0 48px!important;width:48px!important;min-width:48px!important;max-width:48px!important;height:28px!important;min-height:28px!important;max-height:28px!important;padding:0!important;border:2px solid #aaa3b4!important;border-radius:999px!important;background:#e8e4ec!important;box-shadow:inset 0 1px 2px rgba(40,32,55,.08)!important;appearance:none!important;-webkit-appearance:none!important}
#yiuSettingsPage .yiu-frame-rate-toggle>.yiu-switch:before{content:""!important;position:absolute!important;top:2px!important;left:2px!important;width:20px!important;height:20px!important;border-radius:50%!important;background:#fff!important;box-shadow:0 1px 3px rgba(35,28,55,.22)!important}
#yiuSettingsPage .yiu-frame-rate-toggle>.yiu-switch.is-on{background:var(--yiu-theme-accent)!important;border-color:var(--yiu-theme-accent)!important}
#yiuSettingsPage .yiu-frame-rate-toggle>.yiu-switch.is-on:before{transform:translateX(20px)!important}
#yiuSettingsPage .yiu-frame-rate-range.is-disabled{opacity:.4!important;filter:grayscale(.4)!important;pointer-events:none!important}
#yiuSettingsPage .yiu-frame-rate-range.is-disabled .yiu-slider{pointer-events:none!important}
#yiuSettingsPage .yiu-frame-rate-range.is-disabled .yiu-frame-rate-heading{color:#88828f!important}
#yiuSettingsPage .yiu-frame-rate-range.is-disabled .yiu-slider-track{background:#d8d4dd!important}
#yiuSettingsPage .yiu-frame-rate-range.is-disabled .yiu-slider-thumb{background:#f5f3f7!important;border-color:#c3bdca!important;box-shadow:none!important}
#yiuSettingsPage .yiu-global-res-slider{gap:8px!important;padding:11px 12px!important;border:1px solid #e3deea!important;border-radius:13px!important;background:#f8f6fb!important}
#yiuSettingsPage .yiu-global-res-heading{color:#302b3b!important;font-size:14px!important;font-weight:700!important;line-height:1.4!important}
#yiuSettingsPage .yiu-global-res-heading span,#yiuSettingsPage .yiu-global-res-heading em{color:#302b3b!important;font-weight:700!important}
#yiuSettingsPage .yiu-global-res-stops{opacity:1!important;color:#655e6e!important}
#yiuSettingsPage .yiu-global-res-stops span{color:#655e6e!important;font-size:11px!important;font-weight:600!important}
#yiuSettingsPage .yiu-global-res-note{opacity:1!important;color:#615a69!important;font-size:12px!important;line-height:1.55!important;padding:2px 2px 0!important}
#yiuSettingsPage .m3-setting-item .chk:has(.yiu-switch){grid-template-columns:minmax(0,1fr) 48px!important;min-height:52px!important}
#yiuSettingsPage .m3-setting-item .chk>.yiu-switch{grid-column:2!important;grid-row:1!important;justify-self:end!important;align-self:center!important}
#yiuSettingsPage .m3-theme-panel{display:flex;flex-direction:column;gap:12px}
#yiuSettingsPage .m3-theme-card{padding:14px;border:1px solid var(--yiu-theme-line);border-radius:15px;background:var(--yiu-theme-card)}
#yiuSettingsPage .m3-theme-card h3{margin:0 0 5px;color:var(--yiu-theme-ink);font-size:14px}
#yiuSettingsPage .m3-theme-card p{margin:0 0 12px;color:#625c6b;font-size:12px;line-height:1.5}
#yiuSettingsPage .m3-theme-presets{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
#yiuSettingsPage .m3-theme-preset{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0;padding:8px 3px;border:1px solid var(--yiu-theme-line);border-radius:11px;background:var(--yiu-theme-card);color:var(--yiu-theme-ink);font-size:10px}
#yiuSettingsPage .m3-theme-preset i{display:block;width:26px;height:26px;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 1px rgba(40,32,70,.16)}
#yiuSettingsPage .m3-theme-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#yiuSettingsPage .m3-theme-field{display:flex;flex-direction:column;gap:7px;min-width:0;color:var(--yiu-theme-ink);font-size:12px;font-weight:650}
#yiuSettingsPage .m3-theme-field input[type=color]{width:100%!important;min-width:0!important;height:42px!important;padding:3px!important;border:1px solid var(--yiu-theme-line)!important;border-radius:10px!important;background:var(--yiu-theme-card)!important}
#yiuSettingsPage .m3-theme-actions{display:flex;justify-content:flex-end;margin-top:12px}
#yiuSettingsPage .m3-theme-reset{min-height:40px;padding:0 14px;border:0;border-radius:10px;background:color-mix(in srgb,var(--yiu-theme-accent) 12%,var(--yiu-theme-card));color:var(--yiu-theme-accent);font-size:13px;font-weight:700}
@media(min-width:600px){#yiuSettingsPage{padding-left:28px;padding-right:28px}#yiuSettingsPage .m3-top{margin-left:-28px;margin-right:-28px;padding-left:25px;padding-right:28px}#yiuSettingsPage .m3-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}}
@media(max-width:380px){#yiuSettingsPage .m3-theme-presets{gap:5px}#yiuSettingsPage .m3-theme-preset{font-size:9px}#yiuSettingsPage .m3-setting-item .row:has(.yiu-slider){grid-template-columns:minmax(0,1fr) minmax(92px,1.2fr)!important;column-gap:8px!important}}
@media(prefers-reduced-motion:reduce){#yiuSettingsPage.is-open,#yiuSettingsPage .m3-category,#yiuSettingsPage .yiu-switch,#yiuSettingsPage .yiu-switch:before{animation:none!important;transition:none!important}}
/*yf-skin-v2*/
#yiuSettingsPage .m3-settings-body .m3-setting-item{border-radius:26px!important;padding:18px!important;gap:14px!important}
#yiuSettingsPage #yiuMirror_yiuFrameRateSettings{margin:0!important;padding:16px!important;border:0!important;border-radius:22px!important;background:#f3f6fb!important;gap:14px!important}
#yiuSettingsPage #yiuMirror_yiuFrameRateSettings>div:first-child b{font-size:20px!important;font-weight:800!important;color:var(--yiu-theme-ink)!important}
#yiuSettingsPage #yiuMirror_yiuFrameRateSettings .yiu-frame-rate-toggle{border:0!important;background:transparent!important;padding:6px 0!important}
#yiuSettingsPage #yiuMirror_yiuFrameRateStatus{display:inline-block!important;padding:4px 12px!important;border-radius:999px!important;background:#dff1e6!important;color:var(--yf-green-ink)!important;font-size:13px!important;font-weight:650!important}
#yiuSettingsPage #yiuMirror_yiuFrameRateValue{font-size:26px!important;font-weight:800!important;color:var(--yf-blue-ink)!important}
#yiuSettingsPage .yiu-frame-rate-range .qr>span{color:#7b8794!important;font-size:13px!important;font-weight:600!important}
#yiuSettingsPage .yiu-global-res-slider{background:#f5f3fb!important;border:0!important;border-radius:22px!important;padding:16px!important}
#yiuSettingsPage .m3-settings-body .yiu-switch,#yiuSettingsPage .m3-settings-body .yiu-frame-rate-toggle>.yiu-switch{width:51px!important;min-width:51px!important;max-width:51px!important;height:31px!important;min-height:31px!important;max-height:31px!important;border:0!important;background:#e5e5ea!important;box-shadow:none!important}
#yiuSettingsPage .m3-settings-body .yiu-switch:before,#yiuSettingsPage .m3-settings-body .yiu-frame-rate-toggle>.yiu-switch:before{top:2px!important;left:2px!important;width:27px!important;height:27px!important;box-shadow:0 2px 4px rgba(0,0,0,.25)!important}
#yiuSettingsPage .m3-settings-body .yiu-switch.is-on,#yiuSettingsPage .m3-settings-body .yiu-frame-rate-toggle>.yiu-switch.is-on{background:var(--yf-green)!important}
#yiuSettingsPage .m3-settings-body .yiu-switch.is-on:before,#yiuSettingsPage .m3-settings-body .yiu-frame-rate-toggle>.yiu-switch.is-on:before{transform:translateX(20px)!important}
#yiuSettingsPage .m3-settings-body .yiu-slider{height:48px!important;min-height:48px!important}
#yiuSettingsPage .m3-settings-body .yiu-slider-track{background:#dcdce2!important;box-shadow:none!important}
#yiuSettingsPage .m3-settings-body .yiu-slider-fill{background:#121214!important}
#yiuSettingsPage .m3-settings-body .yiu-slider-thumb{width:38px!important;height:26px!important;border:0!important;border-radius:999px!important;background:#fff!important;box-shadow:0 3px 10px rgba(20,20,40,.22)!important}
`;
  d.head.appendChild(style);

  var top=d.createElement('header');
  top.className='m3-top';
  top.innerHTML='<button type="button" class="m3-back" aria-label="返回">‹</button><div class="m3-title-wrap"><div class="m3-title">设置</div><div class="m3-subtitle" hidden></div></div>';
  page.appendChild(top);

  var home=d.createElement('div');
  home.className='m3-home';
  var search=d.createElement('label');
  search.className='m3-search';
  search.innerHTML='<svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.2 4.2"/></svg><input type="search" placeholder="搜索设置" aria-label="搜索设置" enterkeyhint="search" autocapitalize="off" spellcheck="false">';
  home.appendChild(search);

  var hero=d.createElement('section');
  hero.className='m3-hero';
  hero.innerHTML='<div class="m3-logo"><svg viewBox="0 0 32 32" width="31" height="31" aria-hidden="true"><path fill="currentColor" d="M22.5 4.2v17.1a5.2 5.2 0 1 1-2.3-4.3V9.1l-9.8 2.1v13.2a5.2 5.2 0 1 1-2.3-4.3V9.4z"/></svg></div><div><strong>Yiu.fm 2.0</strong><small>个性化你的 Yiu.fm 体验</small></div>';
  home.appendChild(hero);

  var sectionTitle=d.createElement('div');
  sectionTitle.className='m3-section-title';
  sectionTitle.setAttribute('aria-live','polite');
  sectionTitle.setAttribute('role','status');
  sectionTitle.textContent='所有设置';
  home.appendChild(sectionTitle);
  var list=d.createElement('div');
  list.className='m3-list';
  home.appendChild(list);
  var results=d.createElement('div');
  results.className='m3-search-results';
  results.hidden=true;
  results.setAttribute('aria-label','匹配的设置项');
  home.appendChild(results);
  var searchMatches=[];
  var empty=d.createElement('div');
  empty.className='m3-empty';
  empty.setAttribute('role','status');
  empty.setAttribute('aria-live','polite');
  empty.hidden=true;
  empty.innerHTML='<strong>没有找到相关设置</strong><span>试试其他关键词，或查看全部设置分类。</span><br><button type="button">清除搜索</button>';
  home.appendChild(empty);
  page.appendChild(home);

  var subpage=d.createElement('div');
  subpage.className='m3-subpage';
  subpage.hidden=true;
  page.appendChild(subpage);

  var foot=d.createElement('div');
  foot.className='m3-footer';
  foot.textContent='Yiu.fm 2.0 · 设置保存在本机 · dedicated-ui 20261112ac';
  page.appendChild(foot);
  d.body.appendChild(page);

  w.__yiuSettingsDiag=function(){
    var tag=function(u){return (u||'inline').split('/').slice(-2).join('/')};
    return {
      ui:'dedicated-ui 20261112ac',
      settingsDataRoot:!!sourceRoot,
      settingsDataSource:!!source,
      mirrorPage:!!d.getElementById('yiuSettingsPage'),
      settingsLauncher:!!d.getElementById('cmore'),
      isOpen:!!isOpen,
      events:(events||[]).slice(-12),
      scripts:[].map.call(d.scripts,function(s){return tag(s.src)}).filter(function(s){return /settings|frame-rate|devtools/.test(s)}),
      subVar:getComputedStyle(page).getPropertyValue('--sub'),
      whiteInline:page.querySelectorAll('[style*="255,255,255"],[style*="#fff"],[style*="var(--sub)"]').length,
      switches:page.querySelectorAll('[data-yiu-control=switch]').length,
      sliders:page.querySelectorAll('[data-yiu-control=range]').length
    };
  };
  try{console.log('[yiu-settings]',JSON.stringify(w.__yiuSettingsDiag()))}catch(_){}

  var sourceNodes=[source].concat([].slice.call(source.querySelectorAll('*')));
  var mirrorNodes=[];
  var categories=[];
  var configs=[
    {id:'system',title:'系统设置',desc:'界面动画速度、性能优化与基础偏好',icon:'<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#8da0e2" d="M13.2 3.5h5.6l.8 3.1a10 10 0 0 1 2.2 1.3l3.1-.8 2.8 4.8-2.3 2.2a10 10 0 0 1 0 2.6l2.3 2.2-2.8 4.8-3.1-.8a10 10 0 0 1-2.2 1.3l-.8 3.1h-5.6l-.8-3.1a10 10 0 0 1-2.2-1.3l-3.1.8-2.8-4.8 2.3-2.2a10 10 0 0 1 0-2.6l-2.3-2.2 2.8-4.8 3.1.8a10 10 0 0 1 2.2-1.3z"/><circle cx="16" cy="15.4" r="5.1" fill="#fff"/><circle cx="16" cy="15.4" r="2.5" fill="#5369b4"/></svg>',match:function(el){return el.classList.contains('grp')&&!el.id}},
    {id:'beta',title:'Beta 测试功能',desc:'体验正在测试中的新功能',icon:'<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#e9a56e" d="M12 3h8v2h-2v7.2l7.1 11.2A3.7 3.7 0 0 1 22 29H10a3.7 3.7 0 0 1-3.1-5.6L14 12.2V5h-2z"/><path fill="#fff1df" d="M10.2 22.2 8.7 24.5A1.8 1.8 0 0 0 10.2 27h11.6a1.8 1.8 0 0 0 1.5-2.5l-1.5-2.3z"/><circle cx="13" cy="19" r="1.3" fill="#c97942"/><circle cx="19.5" cy="17.5" r="1" fill="#c97942"/></svg>',match:function(el){return el.id==='betaBox'}},
    {id:'developer',title:'开发者选项',desc:'调试工具、运行状态与高级诊断',icon:'<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="5" width="24" height="22" rx="6" fill="#79b99a"/><path d="M10 12h12M10 20h12" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="14" cy="12" r="3" fill="#3e8060" stroke="#fff" stroke-width="1.5"/><circle cx="20" cy="20" r="3" fill="#3e8060" stroke="#fff" stroke-width="1.5"/></svg>',find:function(root){return root.querySelector('#devOptionsGroup')}}
  ];
  function bindTree(clone,original){
    var originals=[original].concat([].slice.call(original.querySelectorAll('*')));
    var clones=[clone].concat([].slice.call(clone.querySelectorAll('*')));
    clones.forEach(function(el,i){
      var index=sourceNodes.indexOf(originals[i]);
      el.setAttribute('data-yiu-source-index',String(index));
      mirrorNodes.push(el);
    });
  }
  function addSectionHeading(parent,title){
    var h=d.createElement('div');
    h.className='m3-hierarchy-title';
    h.textContent=title;
    parent.appendChild(h);
    return h;
  }
  function organizeSettingsHierarchy(clone,cfg){
    if(cfg.id==='system'){
      var items=[].slice.call(clone.querySelectorAll(':scope > .m3-setting-item'));
      if(items.length<4)return;
      var groups=[
        {title:'界面与动画',items:items.slice(0,3)},
        {title:'性能与效率',items:items.slice(3,4)},
        {title:'恢复与维护',items:items.slice(4)}
      ];
      groups.forEach(function(g){
        if(!g.items.length)return;
        var section=d.createElement('section');
        section.className='m3-setting-section';
        addSectionHeading(section,g.title);
        var body=d.createElement('div');
        body.className='m3-setting-section-body';
        g.items.forEach(function(item){body.appendChild(item)});
        section.appendChild(body);
        clone.appendChild(section);
      });
      return;
    }
    if(cfg.id==='developer'){
      var root=clone.querySelector('.m3-setting-item > div');
      if(!root)return;
      var nodes=[].slice.call(root.children);
      if(!nodes.length)return;
      var order=['performance','monitor','logs','behavior','command','maintenance','other'];
      var defs={
        performance:{title:'画面与性能',test:/devResMul|performanceMode|渲染分辨率|性能优化/},
        monitor:{title:'运行状态监测',test:/devJank|devFps|卡顿检测|实时帧率/},
        logs:{title:'日志与诊断',test:/devFloatLogChk|devPauseLogChk|log-entry-btn|sys-log-entry-btn|悬浮窗日志|全屏日志|系统日志/},
        behavior:{title:'界面行为',test:/dev_bgSwapDelay|dev_coverSwapDelay|背景换图等待|封面换图等待/},
        command:{title:'命令窗口',test:/dev_cm_|命令窗口|键盘弹出|键盘收起|窗口高度/},
        maintenance:{title:'维护工具',test:/force-reload-btn|强制刷新|节拍可视化/},
        other:{title:'其他工具',test:/.*/}
      };
      var buckets={};
      nodes.forEach(function(node){
        var txt=(node.textContent||'')+' '+[].slice.call(node.querySelectorAll('[id]')).map(function(el){return el.id}).join(' ');
        var key='other';
        for(var i=0;i<order.length-1;i++){var k=order[i];if(defs[k].test.test(txt)){key=k;break;}}
        (buckets[key]||(buckets[key]=[])).push(node);
      });
      root.textContent='';
      order.forEach(function(key){
        var group=buckets[key];if(!group||!group.length)return;
        group.sort(function(a,b){return (parseFloat(a.style.order)||0)-(parseFloat(b.style.order)||0)});
        var section=d.createElement('section');
        section.className='m3-setting-section';
        section.style.order=String(Math.min.apply(null,group.map(function(n){return parseFloat(n.style.order)||0})));
        addSectionHeading(section,defs[key].title);
        var body=d.createElement('div');
        body.className='m3-setting-section-body';
        group.forEach(function(node){node.style.order='0';body.appendChild(node)});
        section.appendChild(body);
        root.appendChild(section);
      });
    }
  }
  var themeDefaults={accent:'#7565dc',bg:'#f4f2ff',card:'#ffffff',ink:'#292536'};
  var themePresets={
    lavender:{accent:'#7565dc',bg:'#f4f2ff',card:'#ffffff',ink:'#292536'},
    blue:{accent:'#5486d8',bg:'#eef5ff',card:'#ffffff',ink:'#253247'},
    green:{accent:'#4d9b7a',bg:'#eff8f2',card:'#ffffff',ink:'#263b32'},
    peach:{accent:'#d58a63',bg:'#fff4ec',card:'#ffffff',ink:'#443127'},
    pink:{accent:'#cf729b',bg:'#fff1f6',card:'#ffffff',ink:'#432b38'}
  };
  var settingsTheme={};
  try{settingsTheme=Object.assign({},themeDefaults,JSON.parse(w.localStorage.getItem('yiu.settings.theme.v1')||'{}'))}catch(_){settingsTheme=Object.assign({},themeDefaults)}
  function applySettingsTheme(save){
    Object.keys(themeDefaults).forEach(function(key){var value=settingsTheme[key];if(!/^#[0-9a-fA-F]{6}$/.test(value||''))settingsTheme[key]=themeDefaults[key]});
    page.style.setProperty('--yiu-theme-accent',settingsTheme.accent);
    page.style.setProperty('--yiu-theme-bg',settingsTheme.bg);
    page.style.setProperty('--yiu-theme-card',settingsTheme.card);
    page.style.setProperty('--yiu-theme-ink',settingsTheme.ink);
    if(save)try{w.localStorage.setItem('yiu.settings.theme.v1',JSON.stringify(settingsTheme))}catch(_){}
    var fields=page.querySelectorAll('[data-theme-key]');
    fields.forEach(function(input){input.value=settingsTheme[input.getAttribute('data-theme-key')]||themeDefaults[input.getAttribute('data-theme-key')]});
  }
  function addThemeCategory(){
    var cfg={id:'theme',title:'主题与颜色',desc:'自定义设置页面的配色方案',icon:''};
    var card=d.createElement('button');card.type='button';card.className='m3-category';card.setAttribute('data-category','theme');
    card.innerHTML='<span class="m3-icon"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4a12 12 0 1 0 0 24h2.2a3 3 0 0 0 2.2-5c-.9-1-.3-2.5 1.1-2.5H23a5 5 0 0 0 5-5C28 9.1 22.6 4 16 4Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="13" r="1.7" fill="currentColor"/><circle cx="15" cy="9" r="1.7" fill="currentColor"/><circle cx="21" cy="12" r="1.7" fill="currentColor"/></svg></span><span class="m3-cat-copy"><strong>主题与颜色</strong><small>自定义设置页面的配色方案</small></span><span class="m3-chevron">›</span>';
    list.appendChild(card);
    var panel=d.createElement('section');panel.className='m3-category-panel';panel.setAttribute('data-panel','theme');panel.setAttribute('data-category','theme');
    var desc=d.createElement('p');desc.className='m3-subdesc';desc.textContent=cfg.desc;panel.appendChild(desc);
    var h=d.createElement('h2');h.className='m3-group-title';h.textContent=cfg.title;panel.appendChild(h);
    var body=d.createElement('div');body.className='m3-theme-panel';
    var presets=d.createElement('section');presets.className='m3-theme-card';
    presets.innerHTML='<h3>预设主题</h3><p>选择一套清爽配色，也可以在下方逐项微调。</p><div class="m3-theme-presets"><button type="button" class="m3-theme-preset" data-theme-preset="lavender"><i style="background:#7565dc"></i>薰衣草</button><button type="button" class="m3-theme-preset" data-theme-preset="blue"><i style="background:#5486d8"></i>晴空蓝</button><button type="button" class="m3-theme-preset" data-theme-preset="green"><i style="background:#4d9b7a"></i>薄荷绿</button><button type="button" class="m3-theme-preset" data-theme-preset="peach"><i style="background:#d58a63"></i>蜜桃橙</button><button type="button" class="m3-theme-preset" data-theme-preset="pink"><i style="background:#cf729b"></i>樱花粉</button></div>';
    body.appendChild(presets);
    var custom=d.createElement('section');custom.className='m3-theme-card';
    custom.innerHTML='<h3>自定义颜色</h3><p>这些颜色只影响 Yiu.fm 设置页面，不会改变播放器画面或歌词主题。</p><div class="m3-theme-fields"><label class="m3-theme-field">强调色<input type="color" data-theme-key="accent"></label><label class="m3-theme-field">页面底色<input type="color" data-theme-key="bg"></label><label class="m3-theme-field">卡片颜色<input type="color" data-theme-key="card"></label><label class="m3-theme-field">文字颜色<input type="color" data-theme-key="ink"></label></div><div class="m3-theme-actions"><button type="button" class="m3-theme-reset" data-theme-reset>恢复默认配色</button></div>';
    body.appendChild(custom);panel.appendChild(body);subpage.appendChild(panel);
    categories.push({cfg:cfg,card:card,panel:panel,clone:body});
    applySettingsTheme(false);
  }

  function scrubLegacyInline(root){
    var bad=/#fff\b|#ffffff|rgba?\(\s*255\s*,\s*255\s*,\s*255|var\(--(sub|fg|text|txt)\)/i;
    [root].concat([].slice.call(root.querySelectorAll('[style]'))).forEach(function(el){
      var s=el.style;if(!s)return;
      ['color','background','background-color','border','border-top','border-bottom','box-shadow'].forEach(function(p){
        var v=s.getPropertyValue(p);
        if(v&&bad.test(v))s.removeProperty(p);
      });
    });
  }

  function buildDedicatedControls(root){
    [].slice.call(root.querySelectorAll('input[type="checkbox"],input[type="range"]')).forEach(function(input){
      if(input.hasAttribute('data-yiu-control-built'))return;
      var sourceIndex=input.getAttribute('data-yiu-source-index');
      if(sourceIndex===null)return;
      input.setAttribute('data-yiu-control-built','1');
      input.classList.add('yiu-native-control');
      input.setAttribute('aria-hidden','true');
      input.tabIndex=-1;
      if(input.type==='checkbox'){
        var toggle=d.createElement('button');
        toggle.type='button';
        toggle.className='yiu-switch'+(input.checked?' is-on':'');
        toggle.setAttribute('role','switch');
        toggle.setAttribute('data-yiu-control','switch');
        toggle.setAttribute('data-yiu-source-index',sourceIndex);
        toggle.setAttribute('aria-checked',input.checked?'true':'false');
        toggle.setAttribute('aria-label',input.getAttribute('aria-label')||'切换设置');
        toggle.disabled=!!input.disabled;
        input.insertAdjacentElement('afterend',toggle);
        mirrorNodes.push(toggle);
        return;
      }
      var slider=d.createElement('div');
      slider.className='yiu-slider';
      slider.setAttribute('role','slider');
      slider.setAttribute('tabindex',input.disabled?'-1':'0');
      slider.setAttribute('data-yiu-control','range');
      slider.setAttribute('data-yiu-source-index',sourceIndex);
      slider.setAttribute('aria-label',input.getAttribute('aria-label')||'数值调节');
      slider.setAttribute('aria-valuemin',input.min||'0');
      slider.setAttribute('aria-valuemax',input.max||'100');
      slider.setAttribute('aria-valuenow',input.value);
      slider.setAttribute('aria-disabled',input.disabled?'true':'false');
      var track=d.createElement('span');track.className='yiu-slider-track';
      var fill=d.createElement('span');fill.className='yiu-slider-fill';
      var thumb=d.createElement('span');thumb.className='yiu-slider-thumb';
      track.appendChild(fill);track.appendChild(thumb);slider.appendChild(track);
      input.insertAdjacentElement('afterend',slider);
      mirrorNodes.push(slider);
      paintDedicatedSlider(slider,input);
      slider.addEventListener('pointerdown',function(e){
        if(input.disabled)return;
        e.preventDefault();
        slider.setPointerCapture&&slider.setPointerCapture(e.pointerId);
        updateDedicatedSlider(slider,input,e);
      });
      slider.addEventListener('pointermove',function(e){
        if(input.disabled||!slider.hasPointerCapture||!slider.hasPointerCapture(e.pointerId))return;
        updateDedicatedSlider(slider,input,e);
      });
      function finish(e){
        if(input.disabled)return;
        if(slider.hasPointerCapture&&slider.hasPointerCapture(e.pointerId))slider.releasePointerCapture(e.pointerId);
        input.dispatchEvent(new Event('change',{bubbles:true}));
      }
      slider.addEventListener('pointerup',finish);
      slider.addEventListener('pointercancel',finish);
      slider.addEventListener('keydown',function(e){
        if(input.disabled)return;
        var min=Number(input.min||0),max=Number(input.max||100),step=Number(input.step||1),v=Number(input.value||0);
        if(e.key==='ArrowRight'||e.key==='ArrowUp')v+=step;
        else if(e.key==='ArrowLeft'||e.key==='ArrowDown')v-=step;
        else if(e.key==='Home')v=min;
        else if(e.key==='End')v=max;
        else return;
        e.preventDefault();input.value=String(Math.max(min,Math.min(max,v)));
        input.dispatchEvent(new Event('input',{bubbles:true}));
        paintDedicatedSlider(slider,input);
        input.dispatchEvent(new Event('change',{bubbles:true}));
      });
    });
  }
  function paintDedicatedSlider(slider,input){
    if(!slider||!input)return;
    var min=Number(input.min||0),max=Number(input.max||100),value=Number(input.value||0);
    var p=max>min?Math.max(0,Math.min(1,(value-min)/(max-min))):0;
    slider.style.setProperty('--yiu-slider-progress',(p*100).toFixed(2)+'%');
    slider.setAttribute('aria-valuenow',String(value));
    slider.setAttribute('aria-valuetext',String(value));
  }
  function updateDedicatedSlider(slider,input,e){
    var rect=slider.getBoundingClientRect();
    var usable=Math.max(1,rect.width-20);
    var p=Math.max(0,Math.min(1,(e.clientX-(rect.left+10))/usable));
    var min=Number(input.min||0),max=Number(input.max||100),step=Number(input.step||1);
    var raw=min+(max-min)*p;
    var value=min+Math.round((raw-min)/step)*step;
    value=Math.max(min,Math.min(max,value));
    input.value=String(value);
    paintDedicatedSlider(slider,input);
    input.dispatchEvent(new Event('input',{bubbles:true}));
  }

  function rebuildCategories(){
    sourceNodes=[source].concat([].slice.call(source.querySelectorAll('*')));
    mirrorNodes=[];
    categories=[];
    list.textContent='';
    subpage.textContent='';
    configs.forEach(function(cfg){
      var original=cfg.find?cfg.find(source):[].slice.call(source.children).find(cfg.match);
      if(!original)return;
      // Do not mirror the legacy accordion shell (.grp > .gb > .gi).
      // Its collapsed-state CSS can keep cloned content invisible in WKWebView.
      // Mirror only the actual settings body (.gp), inside our own visible panel.
      var contentOriginal=original.querySelector('.gp')||original;
      // Recompose each setting block in a fresh card row. This avoids carrying
      // legacy accordion wrappers/styles into the full-screen Material layout.
      var clone=d.createElement('div');
      clone.className='m3-settings-body';
      clone.setAttribute('data-category',cfg.id);
      var sourceChildren=[].slice.call(contentOriginal.childNodes).filter(function(node){return !(node.nodeType===3&&!node.textContent.trim())});
      if(cfg.id==='system'){
        // The system group is one logical settings card: title, range, hint,
        // toggles and reset action must stay together instead of becoming five
        // unrelated cards with large gaps between them.
        var systemCard=d.createElement('div');
        systemCard.className='m3-setting-item';
        sourceChildren.forEach(function(node){
          var child=node.cloneNode(true);
          systemCard.appendChild(child);
          if(node.nodeType===1)bindTree(child,node);
        });
        if(systemCard.childNodes.length)clone.appendChild(systemCard);
      }else{
        sourceChildren.forEach(function(node){
          if(node.nodeType!==1){clone.appendChild(node.cloneNode(true));return;}
          var item=d.createElement('div');
          item.className='m3-setting-item';
          var child=node.cloneNode(true);
          item.appendChild(child);
          clone.appendChild(item);
          bindTree(child,node);
        });
      }
      // Legacy wrapRange() creates .rw > input[type=range] + .gt. Remove that
      // entire legacy skin from the cloned settings tree before adding our
      // single Yiu slider; otherwise both thumbs/tracks render on top of each other.
      clone.querySelectorAll('.rw').forEach(function(wrapper){
        var range=wrapper.querySelector('input[type="range"]');
        if(!range||!wrapper.parentNode)return;
        wrapper.parentNode.insertBefore(range,wrapper);
        wrapper.remove();
      });
      clone.removeAttribute('hidden');
      clone.style.setProperty('display','flex','important');
      clone.style.setProperty('flex-direction','column','important');
      clone.style.setProperty('visibility','visible','important');
      clone.style.setProperty('opacity','1','important');
      clone.style.setProperty('height','auto','important');
      clone.style.setProperty('min-height','0','important');
      clone.style.setProperty('max-height','none','important');
      clone.style.setProperty('overflow','visible','important');
      clone.querySelectorAll('[id]').forEach(function(el){el.id='yiuMirror_'+el.id});
      var frameRateToggle=clone.querySelector('#yiuMirror_yiuFrameRateEnabled');
      if(frameRateToggle&&frameRateToggle.closest('label'))frameRateToggle.closest('label').classList.add('yiu-frame-rate-toggle');
      clone.querySelectorAll('label[for]').forEach(function(el){el.setAttribute('for','yiuMirror_'+el.getAttribute('for'))});
      var frameRateSlider=clone.querySelector('#yiuMirror_yiuFrameRateSlider');
      if(frameRateSlider){var frameRateTrack=frameRateSlider.closest('.qr');var frameRateGroup=frameRateTrack&&frameRateTrack.parentElement;if(frameRateGroup){frameRateGroup.classList.add('yiu-frame-rate-range');if(frameRateGroup.firstElementChild)frameRateGroup.firstElementChild.classList.add('yiu-frame-rate-heading');}}
      scrubLegacyInline(clone);
      organizeSettingsHierarchy(clone,cfg);
      buildDedicatedControls(clone);
      var card=d.createElement('button');
      card.type='button';card.className='m3-category';
      card.innerHTML='<span class="m3-icon">'+cfg.icon+'</span><span class="m3-cat-copy"><strong>'+cfg.title+'</strong><small>'+cfg.desc+'</small></span><span class="m3-chevron">›</span>';
      card.setAttribute('data-category',cfg.id);
      list.appendChild(card);
      var panel=d.createElement('section');
      panel.className='m3-category-panel';
      panel.setAttribute('data-panel',cfg.id);
      panel.setAttribute('data-category',cfg.id);
      var desc=d.createElement('p');
      desc.className='m3-subdesc';desc.textContent=cfg.desc;
      panel.appendChild(desc);
      var content=d.createElement('div');
      var h=d.createElement('h2');
      h.className='m3-group-title';
      h.textContent=cfg.title;
      panel.appendChild(h);
      content.appendChild(clone);
      if(cfg.id==='beta'){
        var betaControls=clone.querySelectorAll('input,select,textarea,button:not(.gh),[role="switch"]');
        if(!betaControls.length){
          var notice=d.createElement('div');
          notice.className='m3-empty';
          notice.innerHTML='<strong>暂时没有单独开放的 Beta 开关</strong><span>当前版本的实验入口尚未注册独立控件。音乐模式、音频与歌词导入已保留在播放器底部「···」菜单中；后续有可用实验功能时会显示在这里。</span>';
          content.appendChild(notice);
        }
      }
      panel.appendChild(content);
      subpage.appendChild(panel);
      categories.push({cfg:cfg,card:card,panel:panel,clone:clone,original:original});
    });
    addThemeCategory();
    if(typeof updateSearch==='function')updateSearch();
  }
  rebuildCategories();

  function sourceFor(el){
    var node=el&&el.closest&&el.closest('[data-yiu-source-index]');
    if(!node)return null;
    var i=Number(node.getAttribute('data-yiu-source-index'));
    return Number.isInteger(i)&&i>=0?sourceNodes[i]||null:null;
  }
  function paintRange(el){
    if(!el||el.type!=='range')return;
    var min=Number(el.min||0),max=Number(el.max||100),value=Number(el.value||0);
    var progress=max>min?(value-min)/(max-min):0;
    el.style.setProperty('--yiu-range-progress',(Math.max(0,Math.min(1,progress))*100).toFixed(2)+'%');
  }
  function syncFrameRateDependency(){
    var slider=page.querySelector('#yiuMirror_yiuFrameRateSlider');
    var group=slider&&slider.closest('.yiu-frame-rate-range');
    if(!slider||!group)return;
    var toggle=page.querySelector('#yiuMirror_yiuFrameRateEnabled');
    var disabled=!!(toggle&&!toggle.checked)||slider.getAttribute('aria-disabled')==='true';
    slider.setAttribute('aria-disabled',disabled?'true':'false');
    slider.tabIndex=disabled?-1:0;
    group.classList.toggle('is-disabled',disabled);
    group.setAttribute('aria-disabled',disabled?'true':'false');
  }
  function sync(skipNode){
    mirrorNodes.forEach(function(el){
      if(el===skipNode)return;
      var src=sourceFor(el);if(!src)return;
      if(el.getAttribute&&el.getAttribute('data-yiu-control')==='switch'){
        el.classList.toggle('is-on',!!src.checked);
        el.setAttribute('aria-checked',src.checked?'true':'false');
        el.disabled=!!src.disabled;
        return;
      }
      if(el.getAttribute&&el.getAttribute('data-yiu-control')==='range'){
        el.setAttribute('aria-disabled',src.disabled?'true':'false');
        el.tabIndex=src.disabled?-1:0;
        paintDedicatedSlider(el,src);
        return;
      }
      if('checked' in src)el.checked=src.checked;
      if('value' in src&&src.type!=='button')el.value=src.value;
      if(src.tagName==='SELECT')el.selectedIndex=src.selectedIndex;
      if('disabled' in src)el.disabled=src.disabled;
      el.hidden=!!src.hidden;
      ['on','open','hide','show','active'].forEach(function(c){el.classList.toggle(c,src.classList.contains(c))});
      ['aria-pressed','aria-expanded','aria-checked','aria-disabled','aria-label','title'].forEach(function(a){if(src.hasAttribute(a))el.setAttribute(a,src.getAttribute(a));else el.removeAttribute(a)});
      if(src.textContent!==el.textContent&&src.children.length===0)el.textContent=src.textContent;
      paintRange(el);
    });
    syncFrameRateDependency();
  }
  function updateSearch(){
    var input=search.querySelector('input');
    var q=input.value.trim().toLocaleLowerCase();
    var visible=0;
    var exact=[];
    categories.forEach(function(c){
      var hay=(c.cfg.title+' '+c.cfg.desc+' '+c.clone.textContent).toLocaleLowerCase();
      c.card.hidden=!!q&&!hay.includes(q);
      if(!c.card.hidden)visible++;
      if(!q)return;
      var controls=[].slice.call(c.clone.querySelectorAll('input,button,select,textarea,[role="button"]'));
      controls.forEach(function(control){
        var holder=control.closest('.row,.chk,label,button')||control.parentElement||control;
        if(!holder||!c.clone.contains(holder))return;
        var label=(holder.textContent||'').trim();
        var aria=control.getAttribute('aria-label')||'';
        var id=control.id||'';
        var haystack=(label+' '+aria+' '+id).toLocaleLowerCase();
        if(!haystack.includes(q))return;
        if(!label)label=aria||id||'设置项';
        var key=c.cfg.id+'|'+label;
        if(exact.some(function(x){return x.key===key}))return;
        exact.push({key:key,category:c.cfg.id,title:label.replace(/\s+/g,' ').slice(0,90),target:holder});
      });
    });
    searchMatches=exact;
    results.textContent='';
    exact.forEach(function(match,index){
      var item=d.createElement('button');
      item.type='button';item.className='m3-search-result';
      item.setAttribute('data-search-match',String(index));
      var strong=d.createElement('strong');strong.textContent=match.title;
      var small=d.createElement('small');small.textContent=categories.find(function(c){return c.cfg.id===match.category}).cfg.title+' · 设置项';
      item.appendChild(strong);item.appendChild(small);results.appendChild(item);
    });
    results.hidden=!q||exact.length===0;
    list.hidden=!!q&&exact.length>0;
    sectionTitle.textContent=q?'匹配的设置项（'+exact.length+'）':'所有设置（'+categories.length+'）';
    empty.hidden=!q||exact.length>0;
  }
  results.addEventListener('click',function(e){
    var item=e.target.closest('[data-search-match]');
    if(!item)return;
    var match=searchMatches[Number(item.getAttribute('data-search-match'))];
    if(!match)return;
    openCategory(match.category);
    w.setTimeout(function(){
      if(!match.target||!match.target.isConnected)return;
      match.target.scrollIntoView({block:'center',behavior:'smooth'});
      match.target.classList.add('m3-search-hit');
      w.setTimeout(function(){match.target.classList.remove('m3-search-hit')},1400);
      var control=match.target.matches('input,button,select,textarea')?match.target:match.target.querySelector('input,button,select,textarea');
      if(control&&control.type!=='range')try{control.focus({preventScroll:true})}catch(_){}
    },80);
  });
  empty.querySelector('button').addEventListener('click',function(){
    search.querySelector('input').value='';
    updateSearch();
    search.querySelector('input').focus();
  });
  function showHome(){
    home.hidden=false;subpage.hidden=true;top.classList.remove('sub');
    top.querySelector('.m3-title').textContent='设置';
    top.querySelector('.m3-subtitle').hidden=true;
    top.querySelector('.m3-subtitle').textContent='';
    foot.style.display='';
    search.querySelector('input').value='';
    updateSearch();
    page.scrollTop=0;
  }
  function openCategory(id){
    var item=categories.find(function(c){return c.cfg.id===id});if(!item)return;
    sync();
    home.hidden=true;subpage.hidden=false;top.classList.add('sub');
    top.querySelector('.m3-title').textContent=item.cfg.title;
    top.querySelector('.m3-subtitle').textContent=item.cfg.desc;
    top.querySelector('.m3-subtitle').hidden=false;
    foot.style.display='none';
    categories.forEach(function(c){c.panel.hidden=c!==item});
    page.scrollTop=0;
  }
  list.addEventListener('click',function(e){
    var card=e.target.closest('[data-category]');if(card)openCategory(card.getAttribute('data-category'));
  });
  search.querySelector('input').addEventListener('input',updateSearch);
  subpage.addEventListener('click',function(e){
    var control=e.target.closest('button,[role="button"]');
    if(!control)return;
    if(control.getAttribute('data-yiu-control')==='switch'){
      e.preventDefault();e.stopPropagation();
      var toggleSource=sourceFor(control);if(!toggleSource||toggleSource.disabled)return;
      toggleSource.checked=!toggleSource.checked;
      toggleSource.dispatchEvent(new Event('input',{bubbles:true}));
      toggleSource.dispatchEvent(new Event('change',{bubbles:true}));
      sync();return;
    }
    var preset=control.getAttribute('data-theme-preset');
    if(preset&&themePresets[preset]){settingsTheme=Object.assign({},themePresets[preset]);applySettingsTheme(true);return;}
    if(control.hasAttribute('data-theme-reset')){settingsTheme=Object.assign({},themeDefaults);applySettingsTheme(true);return;}
    var src=sourceFor(control);if(!src)return;
    if(src.classList.contains('gh'))return;
    src.click();
    w.setTimeout(sync,0);
  });
  var activeRange=null;
  function forwardValue(e){
    var clone=e.target;
    var themeKey=clone&&clone.getAttribute&&clone.getAttribute('data-theme-key');
    if(themeKey&&Object.prototype.hasOwnProperty.call(themeDefaults,themeKey)){settingsTheme[themeKey]=clone.value;applySettingsTheme(true);return;}
    var src=sourceFor(clone);if(!src)return;
    if('checked' in clone)src.checked=clone.checked;
    if('value' in clone)src.value=clone.value;
    // A range drag is a hot path: forward only the value and paint the active
    // track. Never walk/synchronize the entire mirrored settings tree per frame.
    if(clone.type==='range'){
      activeRange=clone;
      paintRange(clone);
      src.dispatchEvent(new Event(e.type,{bubbles:true}));
      if(e.type==='change'){
        activeRange=null;
        sync();
      }
      return;
    }
    src.dispatchEvent(new Event(e.type,{bubbles:true}));
    sync(clone);
  }
  subpage.addEventListener('input',forwardValue);
  subpage.addEventListener('change',forwardValue);
  subpage.addEventListener('pointercancel',function(e){
    if(activeRange&&e.target===activeRange){activeRange=null;sync();}
  },true);
  top.querySelector('.m3-back').addEventListener('click',function(){if(!subpage.hidden)showHome();else close()});
  page.addEventListener('keydown',function(e){
    if(e.key!=='Tab')return;
    var focusable=[].slice.call(page.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(function(el){return !el.closest('[hidden]')&&el.getAttribute('aria-hidden')!=='true'&&el.getClientRects().length>0});
    if(!focusable.length){e.preventDefault();top.querySelector('.m3-back').focus();return;}
    var first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&d.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&d.activeElement===last){e.preventDefault();first.focus();}
  });

  var previousFocus=null;
  var previousBodyOverflow='';
  var isOpen=false;
  var events=[];
  function recordEvent(type,detail){
    var entry={at:Math.round(w.performance&&w.performance.now?w.performance.now():Date.now()),type:type,detail:detail||''};
    events.push(entry);
    if(events.length>60)events.shift();
    try{console.info('[yiu-settings]',entry)}catch(_){}
  }
  function open(){
    if(isOpen){recordEvent('open-ignored','already-open');return;}
    isOpen=true;
    previousFocus=d.activeElement;
    previousBodyOverflow=d.body.style.overflow;
    sync();
    page.classList.remove('is-hidden');
    page.classList.add('is-open');
    page.setAttribute('aria-hidden','false');
    d.body.classList.add('yiu-full-settings-open');
    d.body.style.overflow='hidden';
    if(settingsLauncher)settingsLauncher.setAttribute('aria-expanded','true');
    showHome();
    recordEvent('open','source='+((previousFocus&&previousFocus.id)||'unknown')+'; page='+page.className+'; dataRoot='+!!sourceRoot);
    top.querySelector('.m3-back').focus();
  }
  function close(){
    if(!isOpen)return;
    isOpen=false;
    page.classList.remove('is-open');
    page.classList.add('is-hidden');
    page.setAttribute('aria-hidden','true');
    d.body.classList.remove('yiu-full-settings-open');
    d.body.style.overflow=previousBodyOverflow;
    if(settingsLauncher)settingsLauncher.setAttribute('aria-expanded','false');
    recordEvent('close','page='+page.className+'; dataRoot='+!!sourceRoot);
    if(previousFocus&&typeof previousFocus.focus==='function')previousFocus.focus();
  }
  var settingsLauncher=d.getElementById('cmore');
  if(settingsLauncher){
    settingsLauncher.setAttribute('aria-haspopup','dialog');
    settingsLauncher.setAttribute('aria-controls','yiuSettingsPage');
    settingsLauncher.setAttribute('aria-label','系统设置');
    settingsLauncher.dataset.yiuSettingsEntrypoint='1';
    // Own the visible settings entry and route it directly to this page.
    settingsLauncher.addEventListener('click',function(e){
      e.preventDefault();
      e.stopImmediatePropagation();
      recordEvent('settings-entry-click','dedicated settings page');
      open();
    },true);
  }else{
    recordEvent('entry-missing','cmore was not found when settings page mounted');
  }
  d.addEventListener('keydown',function(e){if(e.key==='Escape'&&!page.classList.contains('is-hidden')){if(!subpage.hidden)showHome();else close()}});
  var observer=new MutationObserver(function(mutations){
    var structureChanged=mutations.some(function(m){return m.type==='childList'&&m.target===source});
    if(structureChanged)rebuildCategories();
    // Source readouts may mutate on every range input. Defer the expensive
    // mirror reconciliation until the user's finger leaves the slider.
    if(!page.classList.contains('is-hidden')&&!activeRange)sync();
  });
  observer.observe(source,{subtree:true,childList:true,attributes:true,characterData:true});
  var stateObserver=new MutationObserver(function(mutations){
    mutations.forEach(function(m){
      if(m.target===page&&m.attributeName==='class')recordEvent('page-class',page.className);
      if(m.target===d.body&&m.attributeName==='class'&&d.body.classList.contains('yiu-full-settings-open')!==isOpen)recordEvent('body-state-mismatch','isOpen='+isOpen+'; body='+d.body.className);
    });
  });
  stateObserver.observe(page,{attributes:true,attributeFilter:['class']});
  stateObserver.observe(d.body,{attributes:true,attributeFilter:['class']});
  w.addEventListener('yiu-dev-options-ready',function(){rebuildCategories();sync();});
  rebuildCategories();
  sync();
  return true;
}
var timer=w.setInterval(function(){attempts++;if(mount()||attempts>=80)w.clearInterval(timer)},100);
})(window,document);
