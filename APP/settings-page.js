/* Yiu.fm 2.0 — approved soft-lavender settings visual system.
 * Independent full-screen settings experience. Legacy #pg5 stays intact.
 * Mirrored controls forward events to the original controls to reuse their
 * existing handlers and persistence.
 */
(function(w,d){
'use strict';
var attempts=0;
function mount(){
  var legacy=d.getElementById('pg5');
  var source=legacy&&legacy.querySelector('.pm-box');
  if(!legacy||!source||d.getElementById('yiuSettingsPage'))return false;
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
:root{--yiu-m3-bg:#f4f2ff;--yiu-m3-surface:#fff;--yiu-m3-ink:#211d2c;--yiu-m3-sub:#57516a;--yiu-m3-primary:#6655e8;--yiu-m3-line:#e8e4f5}
#yiuSettingsPage{position:fixed;inset:0;z-index:2147482000;box-sizing:border-box;width:100vw;height:100vh;height:100dvh;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:calc(env(safe-area-inset-top,0px) + 8px) 18px calc(env(safe-area-inset-bottom,0px) + 30px);background:radial-gradient(ellipse at 50% -12%,#e8e3ff 0%,#f4f2ff 48%,#f8f7ff 100%);color:var(--yiu-m3-ink);font-family:inherit;color-scheme:light}
#yiuSettingsPage.is-hidden{display:none!important}#yiuSettingsPage.is-open{display:block;animation:yiuM3In .2s ease-out both}@keyframes yiuM3In{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
#yiuSettingsPage *{box-sizing:border-box}#yiuSettingsPage button,#yiuSettingsPage input,#yiuSettingsPage select,#yiuSettingsPage textarea{font:inherit}#yiuSettingsPage [hidden]{display:none!important}
#yiuSettingsLauncher{position:fixed;left:15px;top:calc(env(safe-area-inset-top,0px) + 12px);z-index:2147481500;width:44px;height:44px;padding:0;border:1px solid rgba(255,255,255,.3);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#6655e8;background:rgba(255,255,255,.9);border-color:#e5defb;-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:0 5px 18px rgba(86,69,160,.13);-webkit-tap-highlight-color:transparent}
#yiuSettingsLauncher svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#yiuSettingsPage .m3-top{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:12px;min-height:58px;margin:0 -18px 8px;padding:0 18px;background:rgba(247,245,255,.94);border-bottom:1px solid rgba(105,87,180,.09);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}
#yiuSettingsPage .m3-back{display:flex;align-items:center;justify-content:center;flex:none;width:42px;height:42px;border:0;border-radius:14px;background:transparent;color:#302b38;font-size:27px;line-height:1;-webkit-tap-highlight-color:transparent}
#yiuSettingsPage .m3-title{font-size:22px;line-height:1.2;font-weight:750;letter-spacing:-.45px}#yiuSettingsPage .m3-top.sub .m3-title{font-size:20px}
#yiuSettingsPage :focus-visible{outline:2px solid #8069bd;outline-offset:3px}#yiuSettingsPage button:disabled,#yiuSettingsPage input:disabled,#yiuSettingsPage select:disabled{opacity:.55;cursor:not-allowed}
#yiuSettingsPage .m3-home,#yiuSettingsPage .m3-subpage{width:100%;max-width:680px;margin:0 auto}
#yiuSettingsPage .m3-search{display:flex;align-items:center;gap:11px;height:50px;margin:13px 0 17px;padding:0 15px;border:1px solid #e6e1f4;border-radius:17px;background:rgba(255,255,255,.96);color:#625b76;box-shadow:0 3px 12px rgba(75,60,140,.045)}
#yiuSettingsPage .m3-search:focus-within{border-color:#b9a9d7;box-shadow:0 0 0 3px rgba(104,82,163,.10)}#yiuSettingsPage .m3-search svg{width:19px;height:19px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8}
#yiuSettingsPage .m3-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#25222d;font-size:15px}#yiuSettingsPage .m3-search input::placeholder{color:#77717e;opacity:1}
#yiuSettingsPage .m3-hero{display:flex;align-items:center;gap:14px;min-height:96px;margin:0 0 25px;padding:17px 17px;border:1px solid #e3dcff;border-radius:22px;background:linear-gradient(112deg,#e8e2ff 0%,#f0ecff 58%,#fff0f5 100%);color:#29223f;box-shadow:0 7px 20px rgba(91,72,170,.07)}
#yiuSettingsPage .m3-logo{display:flex;align-items:center;justify-content:center;flex:none;width:56px;height:56px;border-radius:18px;background:linear-gradient(145deg,#8b79ff,#6655e8);color:#fff;font-size:22px;font-weight:800;box-shadow:0 5px 12px rgba(102,85,232,.22)}
#yiuSettingsPage .m3-hero strong{display:block;font-size:16px;font-weight:750}#yiuSettingsPage .m3-hero small{display:block;margin-top:4px;color:#554d61;font-size:12px;line-height:1.5}
#yiuSettingsPage .m3-section-title{margin:0 3px 10px;color:#514b59;font-size:13px;font-weight:750;letter-spacing:.2px}
#yiuSettingsPage .m3-list{display:flex;flex-direction:column;gap:9px;overflow:visible}
#yiuSettingsPage .m3-category{display:flex;align-items:center;gap:13px;width:100%;min-height:82px;padding:14px 15px;border:1px solid #e9e5f6!important;border-radius:20px;background:rgba(255,255,255,.97)!important;color:#26222e;text-align:left;box-shadow:0 4px 13px rgba(68,54,130,.055);cursor:pointer;transition:transform .14s ease,border-color .14s ease;-webkit-tap-highlight-color:transparent}
#yiuSettingsPage .m3-category:active{transform:scale(.99);border-color:#d9d0e7!important}
#yiuSettingsPage .m3-icon{display:flex;align-items:center;justify-content:center;flex:none;width:48px;height:48px;border-radius:16px;background:#eeeaff;color:#6655e8}#yiuSettingsPage .m3-icon svg{display:block;width:25px;height:25px;overflow:visible}
#yiuSettingsPage .m3-category[data-category=system] .m3-icon{background:#e9f0ff;color:#5574c8}#yiuSettingsPage .m3-category[data-category=beta] .m3-icon{background:#fff0e5;color:#c17a43}#yiuSettingsPage .m3-category[data-category=developer] .m3-icon{background:#e7f5ed;color:#478568}
#yiuSettingsPage .m3-cat-copy{flex:1;min-width:0}#yiuSettingsPage .m3-cat-copy strong{display:block;color:#26222e;font-size:15px;line-height:1.35;font-weight:750}#yiuSettingsPage .m3-cat-copy small{display:block;margin-top:4px;color:#625c6a;font-size:11.5px;line-height:1.45}#yiuSettingsPage .m3-chevron{flex:none;color:#817a8a;font-size:25px;font-weight:300}
#yiuSettingsPage .m3-subpage{padding:4px 0 18px}
#yiuSettingsPage .m3-subdesc{margin:0 0 14px;padding:11px 13px;border:1px solid var(--cat-border,#e7e1ed);border-radius:14px;background:var(--cat-soft,#faf8fc);color:#494451;font-size:12px;line-height:1.55}
#yiuSettingsPage .m3-group-title{margin:0 2px 13px;color:var(--cat-ink,#49366f);font-size:19px;line-height:1.3;font-weight:780}
#yiuSettingsPage .m3-category-panel[data-category=system]{--cat-soft:#f4f7fd;--cat-border:#dfe7f5;--cat-ink:#526bb2}#yiuSettingsPage .m3-category-panel[data-category=beta]{--cat-soft:#fff8f1;--cat-border:#f1dfce;--cat-ink:#a96636}#yiuSettingsPage .m3-category-panel[data-category=developer]{--cat-soft:#f3f9f5;--cat-border:#dcebe1;--cat-ink:#3e795d}
#yiuSettingsPage .m3-settings-body{display:flex!important;flex-direction:column!important;gap:13px!important;width:100%;min-width:0;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;color:#25222d!important;box-shadow:none!important}
#yiuSettingsPage .m3-settings-body>*{visibility:visible!important;opacity:1!important;max-height:none}
#yiuSettingsPage .m3-setting-item{display:flex;flex-direction:column;gap:10px;min-width:0;width:100%;padding:14px!important;border:1px solid #e9e5f5!important;border-radius:19px!important;background:#fff!important;box-shadow:0 4px 13px rgba(68,54,130,.045)!important}
#yiuSettingsPage .m3-setting-item>*{max-width:100%;min-width:0}#yiuSettingsPage .m3-setting-section{display:flex;flex-direction:column;gap:8px;min-width:0;margin:0}
#yiuSettingsPage .m3-hierarchy-title{display:flex;align-items:center;gap:8px;margin:5px 2px 2px;color:var(--cat-ink,#6550a0)!important;font-size:13px;font-weight:780}#yiuSettingsPage .m3-hierarchy-title:before{content:"";width:4px;height:14px;border-radius:4px;background:var(--cat-ink,#8b78c5)}
#yiuSettingsPage .m3-setting-section-body{display:flex;flex-direction:column;gap:8px;min-width:0}#yiuSettingsPage .m3-setting-section-body>.m3-setting-item{margin:0}
#yiuSettingsPage .m3-settings-body[data-category=developer]>.m3-setting-item{padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
#yiuSettingsPage .m3-settings-body[data-category=developer] .m3-setting-section{padding:12px;border:1px solid var(--cat-border,#e8e2ef);border-radius:16px;background:var(--cat-soft,#faf9fc)}
#yiuSettingsPage .m3-subpage .m3-group-title{color:var(--cat-ink,#49366f)!important}
#yiuSettingsPage .m3-subpage .m3-setting-item{color:#25222d!important}#yiuSettingsPage .m3-subpage .m3-setting-item :is(.qh,strong,b,label,.row,.chk span){color:#25222d!important}#yiuSettingsPage .m3-subpage .m3-setting-item :is(.qr,.qtip,.hint,.desc,.subtext,small,p){color:#57515f!important}
#yiuSettingsPage .m3-subpage .m3-setting-item .qh{display:flex!important;align-items:center;justify-content:space-between;gap:10px;margin:0!important;padding:0!important;font-size:14px;line-height:1.4;font-weight:740}
#yiuSettingsPage .m3-subpage .m3-setting-item .qr{display:flex!important;align-items:center;gap:10px;margin:0!important;padding:0!important;font-size:12px;line-height:1.45}
#yiuSettingsPage .m3-subpage .m3-setting-item .qtip{display:block!important;margin:0!important;padding:9px 11px;border:1px solid #ebe7f0;border-radius:12px;background:#f8f6fa!important;color:#57515f!important;font-size:11.5px;line-height:1.55}
#yiuSettingsPage .m3-subpage .m3-setting-item .chk{display:flex!important;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:46px;margin:0!important;padding:10px 12px!important;border:1px solid #e8e3ed!important;border-radius:13px!important;background:#faf9fc!important;color:#25222d!important}
#yiuSettingsPage .m3-subpage .m3-setting-item .chk span{font-size:13px;line-height:1.4}
#yiuSettingsPage .m3-subpage .m3-setting-item .chip{display:inline-flex;align-items:center;justify-content:center;min-height:39px;padding:9px 12px!important;border:1px solid #ddd3ec!important;border-radius:12px!important;background:#f4eff9!important;color:#503d79!important;font-size:13px;font-weight:700}
#yiuSettingsPage .m3-subpage .m3-setting-item .qd{margin:0!important;padding-top:9px;border-top:1px solid #eeeaf2}
#yiuSettingsPage .m3-subpage .m3-settings-body input:not([type=checkbox]):not([type=range]),#yiuSettingsPage .m3-subpage .m3-settings-body select,#yiuSettingsPage .m3-subpage .m3-settings-body textarea{max-width:100%;min-height:40px;padding:9px 11px;border:1px solid #ded8e6;border-radius:11px;background:#fff;color:#25222d;-webkit-text-fill-color:#25222d}
#yiuSettingsPage .m3-subpage .m3-settings-body input::placeholder,#yiuSettingsPage .m3-subpage .m3-settings-body textarea::placeholder{color:#716b78;-webkit-text-fill-color:#716b78;opacity:1}
#yiuSettingsPage .m3-subpage .m3-settings-body .chk input[type=checkbox],#yiuSettingsPage .m3-subpage .m3-settings-body input[type=checkbox][role=switch]{-webkit-appearance:none!important;appearance:none!important;position:relative!important;display:inline-block!important;flex:0 0 48px!important;width:48px!important;min-width:48px!important;height:28px!important;min-height:28px!important;margin:0!important;padding:0!important;border:1px solid #aaa4b2!important;border-radius:999px!important;background:#d8d4de!important;box-shadow:inset 0 1px 2px rgba(35,25,50,.1)!important;vertical-align:middle;cursor:pointer;transition:background .16s ease,border-color .16s ease!important}
#yiuSettingsPage .m3-subpage .m3-settings-body .chk input[type=checkbox]::before,#yiuSettingsPage .m3-subpage .m3-settings-body input[type=checkbox][role=switch]::before{content:"";position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(30,24,40,.24);transform:translateX(0);transition:transform .16s ease}
#yiuSettingsPage .m3-subpage .m3-settings-body .chk input[type=checkbox]:checked,#yiuSettingsPage .m3-subpage .m3-settings-body input[type=checkbox][role=switch]:checked{border-color:#6550a4!important;background:#6550a4!important}
#yiuSettingsPage .m3-subpage .m3-settings-body .chk input[type=checkbox]:checked::before,#yiuSettingsPage .m3-subpage .m3-settings-body input[type=checkbox][role=switch]:checked::before{transform:translateX(20px)}
#yiuSettingsPage .m3-subpage .m3-settings-body .chk input[type=checkbox]:focus-visible,#yiuSettingsPage .m3-subpage .m3-settings-body input[type=checkbox][role=switch]:focus-visible{outline:3px solid rgba(101,80,164,.22)!important;outline-offset:3px!important}
#yiuSettingsPage .m3-subpage .m3-settings-body input[type=range]{--yiu-range-progress:0%;display:block!important;flex:1;min-width:96px;width:100%;height:42px!important;min-height:42px!important;margin:0;padding:0 2px!important;border:0;background:transparent!important;touch-action:pan-y;-webkit-appearance:none!important;appearance:none!important;cursor:pointer}
#yiuSettingsPage .m3-subpage .m3-settings-body input[type=range]::-webkit-slider-runnable-track{height:10px;border:1px solid #b9b2c4;border-radius:999px;background:linear-gradient(to right,#6550a4 0%,#6550a4 var(--yiu-range-progress),#d6d1dd var(--yiu-range-progress),#d6d1dd 100%)}
#yiuSettingsPage .m3-subpage .m3-settings-body input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:24px;height:24px;margin-top:-8px;border:3px solid #fff;border-radius:50%;background:#6550a4;box-shadow:0 1px 5px rgba(35,25,55,.28),0 0 0 1px rgba(67,49,103,.2)}
#yiuSettingsPage .m3-subpage .m3-settings-body input[type=range]::-moz-range-track{height:10px;border:1px solid #b9b2c4;border-radius:999px;background:#d6d1dd}#yiuSettingsPage .m3-subpage .m3-settings-body input[type=range]::-moz-range-progress{height:10px;border-radius:999px;background:#6550a4}#yiuSettingsPage .m3-subpage .m3-settings-body input[type=range]::-moz-range-thumb{width:18px;height:18px;border:3px solid #fff;border-radius:50%;background:#6550a4}
#yiuSettingsPage .m3-subpage .m3-settings-body input[type=range]:focus-visible{outline:3px solid rgba(101,80,164,.2);outline-offset:4px;border-radius:999px}
#yiuSettingsPage .m3-search-results{display:flex;flex-direction:column;gap:8px;margin:0 0 12px}#yiuSettingsPage .m3-search-result{display:flex;flex-direction:column;align-items:flex-start;gap:3px;width:100%;padding:12px 14px;border:1px solid #e8e3ed;border-radius:14px;background:#fff;color:#25222d;text-align:left}#yiuSettingsPage .m3-search-result strong{font-size:14px}#yiuSettingsPage .m3-search-result small{color:#625c6a;font-size:12px}
#yiuSettingsPage .m3-search-hit{outline:2px solid #9b8acb!important;outline-offset:3px!important;border-radius:10px!important;background:rgba(232,224,248,.35)!important}
#yiuSettingsPage .m3-empty{margin-top:12px;padding:20px 18px;border:1px solid #e9e5ef;border-radius:18px;background:#fff;color:#625c6a;text-align:center;font-size:13px}#yiuSettingsPage .m3-empty strong{display:block;margin-bottom:5px;color:#25222d;font-size:15px}#yiuSettingsPage .m3-empty button{margin-top:12px;padding:9px 15px;border:0;border-radius:999px;background:#eee8f6;color:#503d79;font-size:13px;font-weight:700}
#yiuSettingsPage .m3-footer{max-width:680px;margin:0 auto;padding:23px 0 5px;color:#77717e;text-align:center;font-size:11px}
@media(min-width:600px){#yiuSettingsPage{padding-left:28px;padding-right:28px}#yiuSettingsPage .m3-top{margin-left:-28px;margin-right:-28px;padding-left:25px;padding-right:28px}#yiuSettingsPage .m3-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}}
@media(prefers-reduced-motion:reduce){#yiuSettingsPage.is-open,#yiuSettingsPage .m3-category,#yiuSettingsPage .m3-subpage .m3-settings-body input[type=checkbox],#yiuSettingsPage .m3-subpage .m3-settings-body input[type=checkbox]::before{animation:none!important;transition:none!important}}

/* Yiu.fm settings controls v3: stable geometry, predictable spacing, and theme tokens. */
#yiuSettingsPage{--yiu-theme-accent:#7565dc;--yiu-theme-bg:#f4f2ff;--yiu-theme-card:#fff;--yiu-theme-ink:#292536;--yiu-theme-line:#e6e1f1;background:var(--yiu-theme-bg)!important;color:var(--yiu-theme-ink)!important}
#yiuSettingsPage .m3-top{background:color-mix(in srgb,var(--yiu-theme-bg) 94%,white)!important;border-bottom-color:var(--yiu-theme-line)!important}
#yiuSettingsPage .m3-title,#yiuSettingsPage .m3-group-title{color:var(--yiu-theme-ink)!important}
#yiuSettingsPage .m3-category,#yiuSettingsPage .m3-setting-item{background:var(--yiu-theme-card)!important;border-color:var(--yiu-theme-line)!important}
#yiuSettingsPage .m3-icon{color:var(--yiu-theme-accent)!important}
#yiuSettingsPage .m3-category:active{border-color:var(--yiu-theme-accent)!important}
#yiuSettingsPage .m3-subdesc{background:color-mix(in srgb,var(--yiu-theme-accent) 7%,var(--yiu-theme-card))!important;border-color:var(--yiu-theme-line)!important;color:var(--yiu-theme-ink)!important}
#yiuSettingsPage .m3-hierarchy-title{color:var(--yiu-theme-accent)!important}
#yiuSettingsPage .m3-hierarchy-title:before{background:var(--yiu-theme-accent)!important}
#yiuSettingsPage .m3-setting-item{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:12px!important;padding:15px!important;border:1px solid var(--yiu-theme-line)!important;border-radius:17px!important;box-shadow:0 2px 8px rgba(40,32,70,.035)!important}
#yiuSettingsPage .m3-setting-item>*{width:100%;min-width:0}
#yiuSettingsPage .m3-setting-item .qr:has(input[type=range]){display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;align-items:center!important;gap:10px!important;width:100%!important;min-width:0!important;margin:0!important;padding:0!important}
#yiuSettingsPage .m3-setting-item .qr>span{flex:none!important;white-space:nowrap!important;font-size:11px!important;color:#6a6574!important}
#yiuSettingsPage .m3-setting-item .qr>input[type=range]{grid-column:2!important;min-width:0!important;width:100%!important;flex:none!important}
#yiuSettingsPage .m3-setting-item .row:has(input[type=range]){display:grid!important;grid-template-columns:minmax(78px,.78fr) minmax(0,1.55fr)!important;align-items:center!important;column-gap:12px!important;width:100%!important;min-width:0!important}
#yiuSettingsPage .m3-setting-item .row:has(input[type=range])>span:first-child{width:auto!important;min-width:0!important;flex:none!important;line-height:1.35!important}
#yiuSettingsPage .m3-setting-item .row:has(input[type=range])>input[type=range]{grid-column:2;min-width:0!important;width:100%!important;flex:none!important}
#yiuSettingsPage .m3-setting-item .chk{display:grid!important;grid-template-columns:minmax(0,1fr) 52px!important;align-items:center!important;column-gap:12px!important;width:100%!important;min-height:54px!important;margin:0!important;padding:11px 13px!important;border:1px solid var(--yiu-theme-line)!important;border-radius:14px!important;background:color-mix(in srgb,var(--yiu-theme-card) 90%,var(--yiu-theme-bg))!important;text-align:left!important;line-height:1.35!important}
#yiuSettingsPage .m3-setting-item .chk>:not(input[type=checkbox]){grid-column:1!important;grid-row:1!important;min-width:0!important;max-width:100%!important;overflow-wrap:anywhere!important;text-align:left!important}
#yiuSettingsPage .m3-setting-item .chk input[type=checkbox],#yiuSettingsPage .m3-setting-item input[type=checkbox][role=switch]{-webkit-appearance:none!important;appearance:none!important;position:relative!important;inset:auto!important;float:none!important;display:block!important;grid-column:2!important;grid-row:1!important;justify-self:end!important;flex:none!important;width:50px!important;min-width:50px!important;max-width:50px!important;height:30px!important;min-height:30px!important;margin:0!important;padding:0!important;border:0!important;border-radius:999px!important;background:#d7d4df!important;box-shadow:inset 0 0 0 1px rgba(50,42,70,.08)!important;transform:none!important;overflow:hidden!important;cursor:pointer!important}
#yiuSettingsPage .m3-setting-item .chk input[type=checkbox]::before,#yiuSettingsPage .m3-setting-item input[type=checkbox][role=switch]::before{content:""!important;position:absolute!important;left:3px!important;top:3px!important;width:24px!important;height:24px!important;margin:0!important;border:0!important;border-radius:50%!important;background:#fff!important;box-shadow:0 1px 3px rgba(30,24,40,.2)!important;transform:translateX(0)!important;transition:transform .18s ease!important}
#yiuSettingsPage .m3-setting-item .chk input[type=checkbox]:checked,#yiuSettingsPage .m3-setting-item input[type=checkbox][role=switch]:checked{background:var(--yiu-theme-accent)!important}
#yiuSettingsPage .m3-setting-item .chk input[type=checkbox]:checked::before,#yiuSettingsPage .m3-setting-item input[type=checkbox][role=switch]:checked::before{transform:translateX(20px)!important}
#yiuSettingsPage .m3-setting-item input[type=range]{display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;height:42px!important;min-height:42px!important;margin:0!important;padding:0 12px!important;border:0!important;background:transparent!important;-webkit-appearance:none!important;appearance:none!important;touch-action:pan-y!important}
#yiuSettingsPage .m3-setting-item input[type=range]::-webkit-slider-runnable-track{height:6px!important;border:0!important;border-radius:999px!important;background:linear-gradient(to right,var(--yiu-theme-accent) 0%,var(--yiu-theme-accent) var(--yiu-range-progress),#dedbe7 var(--yiu-range-progress),#dedbe7 100%)!important}
#yiuSettingsPage .m3-setting-item input[type=range]::-webkit-slider-thumb{-webkit-appearance:none!important;appearance:none!important;width:22px!important;height:22px!important;margin-top:-8px!important;border:3px solid #fff!important;border-radius:50%!important;background:var(--yiu-theme-accent)!important;box-shadow:0 1px 4px rgba(30,24,40,.22)!important}
#yiuSettingsPage .m3-setting-item input[type=range]::-moz-range-track{height:6px!important;border:0!important;border-radius:999px!important;background:#dedbe7!important}
#yiuSettingsPage .m3-setting-item input[type=range]::-moz-range-progress{height:6px!important;border-radius:999px!important;background:var(--yiu-theme-accent)!important}
#yiuSettingsPage .m3-setting-item input[type=range]::-moz-range-thumb{width:16px!important;height:16px!important;border:3px solid #fff!important;border-radius:50%!important;background:var(--yiu-theme-accent)!important;box-shadow:0 1px 4px rgba(30,24,40,.22)!important}
#yiuSettingsPage .m3-setting-item input[type=range]:focus-visible{outline:2px solid color-mix(in srgb,var(--yiu-theme-accent) 28%,transparent)!important;outline-offset:2px!important;border-radius:999px!important}
#yiuSettingsPage .m3-theme-panel{display:flex;flex-direction:column;gap:14px}
#yiuSettingsPage .m3-theme-card{padding:15px;border:1px solid var(--yiu-theme-line);border-radius:17px;background:var(--yiu-theme-card)}
#yiuSettingsPage .m3-theme-card h3{margin:0 0 5px;color:var(--yiu-theme-ink);font-size:14px}
#yiuSettingsPage .m3-theme-card p{margin:0 0 12px;color:#686273;font-size:12px;line-height:1.5}
#yiuSettingsPage .m3-theme-presets{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}
#yiuSettingsPage .m3-theme-preset{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0;padding:8px 3px;border:1px solid var(--yiu-theme-line);border-radius:12px;background:var(--yiu-theme-card);color:var(--yiu-theme-ink);font-size:10px}
#yiuSettingsPage .m3-theme-preset i{display:block;width:27px;height:27px;border:3px solid rgba(255,255,255,.9);border-radius:50%;box-shadow:0 0 0 1px rgba(40,32,70,.12)}
#yiuSettingsPage .m3-theme-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#yiuSettingsPage .m3-theme-field{display:flex;flex-direction:column;gap:7px;min-width:0;color:var(--yiu-theme-ink);font-size:12px;font-weight:650}
#yiuSettingsPage .m3-theme-field input[type=color]{width:100%!important;min-width:0!important;height:42px!important;padding:3px!important;border:1px solid var(--yiu-theme-line)!important;border-radius:11px!important;background:var(--yiu-theme-card)!important}
#yiuSettingsPage .m3-theme-actions{display:flex;justify-content:flex-end;margin-top:12px}
#yiuSettingsPage .m3-theme-reset{min-height:40px;padding:0 15px;border:0;border-radius:12px;background:color-mix(in srgb,var(--yiu-theme-accent) 12%,var(--yiu-theme-card));color:var(--yiu-theme-accent);font-size:13px;font-weight:700}
@media(max-width:380px){#yiuSettingsPage .m3-theme-presets{gap:5px}#yiuSettingsPage .m3-theme-preset{font-size:9px}}

/* Dedicated controls: native inputs are data-only; all visible interaction is rendered by our own components. */
#yiuSettingsPage .m3-settings-body input.yiu-native-control{display:none!important;position:absolute!important;width:1px!important;height:1px!important;min-width:1px!important;min-height:1px!important;opacity:0!important;pointer-events:none!important}
/* Match the app-wide glass controls: 50×30 switch and 44×28 frosted slider thumb. */
#yiuSettingsPage .yiu-switch{grid-column:2!important;grid-row:1!important;justify-self:end!important;position:relative!important;display:inline-flex!important;align-items:center!important;width:50px!important;min-width:50px!important;height:30px!important;min-height:30px!important;margin:0!important;padding:0!important;border:1px solid rgba(110,125,155,.22)!important;border-radius:15px!important;background:rgba(125,140,165,.18)!important;box-shadow:inset 0 2px 5px rgba(35,45,65,.12)!important;cursor:pointer!important;transition:background calc(.3s/var(--ui-spd,1)) ease,border-color calc(.3s/var(--ui-spd,1)) ease!important;-webkit-tap-highlight-color:transparent!important}
#yiuSettingsPage .yiu-switch:before{content:""!important;position:absolute!important;top:2px!important;left:2px!important;width:24px!important;height:24px!important;border-radius:50%!important;background:linear-gradient(180deg,#fff,#e8ecff)!important;box-shadow:0 2px 6px rgba(0,0,0,.18),inset 0 -1px 2px rgba(120,140,200,.25)!important;transform:translateX(0)!important;transition:transform calc(.3s/var(--ui-spd,1)) cubic-bezier(.3,.8,.3,1)!important}
#yiuSettingsPage .yiu-switch.is-on{border-color:rgba(110,160,255,.7)!important;background:rgba(110,160,255,.9)!important;box-shadow:inset 0 2px 5px rgba(35,45,65,.08)!important}
#yiuSettingsPage .yiu-switch.is-on:before{transform:translateX(20px)!important}
#yiuSettingsPage .yiu-switch:focus-visible{outline:3px solid rgba(110,160,255,.25)!important;outline-offset:3px!important}
#yiuSettingsPage .yiu-switch:disabled{opacity:.45!important;cursor:not-allowed!important}
#yiuSettingsPage .yiu-slider{grid-column:2!important;position:relative!important;display:block!important;width:100%!important;min-width:0!important;height:46px!important;min-height:46px!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;touch-action:pan-y!important;cursor:pointer!important;user-select:none!important;-webkit-user-select:none!important;-webkit-tap-highlight-color:transparent!important}
#yiuSettingsPage .yiu-slider-track{position:absolute!important;left:22px!important;right:22px!important;top:50%!important;height:10px!important;transform:translateY(-50%)!important;border:0!important;border-radius:5px!important;background:#dce2ed!important;box-shadow:inset 0 1px 3px rgba(35,45,65,.16)!important;overflow:visible!important}
#yiuSettingsPage .yiu-slider-fill{position:absolute!important;left:0!important;top:0!important;bottom:0!important;width:var(--yiu-slider-progress,0%)!important;border-radius:5px!important;background:rgba(150,185,255,.95)!important;box-shadow:0 0 5px rgba(120,165,255,.18)!important}
#yiuSettingsPage .yiu-slider-thumb{position:absolute!important;left:var(--yiu-slider-progress,0%)!important;top:50%!important;width:44px!important;height:28px!important;transform:translate(-50%,-50%)!important;border:1px solid rgba(255,255,255,.96)!important;border-radius:14px!important;background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(232,238,255,.9))!important;-webkit-backdrop-filter:blur(14px) saturate(1.35)!important;backdrop-filter:blur(14px) saturate(1.35)!important;box-shadow:0 4px 12px rgba(0,0,0,.18),inset 0 -2px 4px rgba(120,140,200,.2)!important;transition:transform calc(.45s/var(--ui-spd,1)) var(--spring-pop,cubic-bezier(.32,.72,0,1)),box-shadow calc(.3s/var(--ui-spd,1)) ease!important}
#yiuSettingsPage .yiu-slider:active .yiu-slider-thumb{transform:translate(-50%,-50%) scale(1.1)!important;box-shadow:0 8px 20px rgba(0,0,0,.24)!important}
#yiuSettingsPage .yiu-slider:focus-visible{outline:3px solid rgba(150,185,255,.24)!important;outline-offset:4px!important;border-radius:999px!important}
#yiuSettingsPage .yiu-slider[aria-disabled=true]{opacity:.45!important;cursor:not-allowed!important}
#yiuSettingsPage .m3-setting-item .qr:has(.yiu-slider){display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;align-items:center!important;gap:10px!important}
#yiuSettingsPage .m3-setting-item .row:has(.yiu-slider){display:grid!important;grid-template-columns:minmax(78px,.78fr) minmax(0,1.55fr)!important;align-items:center!important;column-gap:12px!important}
#yiuSettingsPage .m3-setting-item .chk:has(.yiu-switch){display:grid!important;grid-template-columns:minmax(0,1fr) 58px!important;align-items:center!important;column-gap:12px!important;min-height:58px!important}
#yiuSettingsPage .m3-setting-item .chk:has(.yiu-switch)>span{grid-column:1!important;grid-row:1!important}


`;
  d.head.appendChild(style);

  var top=d.createElement('header');
  top.className='m3-top';
  top.innerHTML='<button type="button" class="m3-back" aria-label="返回">‹</button><div class="m3-title">设置</div>';
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
  foot.textContent='Yiu.fm 2.0 · 设置保存在本机';
  page.appendChild(foot);
  d.body.appendChild(page);

  var sourceNodes=[source].concat([].slice.call(source.querySelectorAll('*')));
  var mirrorRoot=d.createElement('div');
  mirrorRoot.id='yiuSettingsMirror';
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
    var usable=Math.max(1,rect.width-44);
    var p=Math.max(0,Math.min(1,(e.clientX-(rect.left+22))/usable));
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
      clone.querySelectorAll('label[for]').forEach(function(el){el.setAttribute('for','yiuMirror_'+el.getAttribute('for'))});
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
  function open(){
    if(isOpen)return;
    isOpen=true;
    previousFocus=d.activeElement;
    previousBodyOverflow=d.body.style.overflow;
    sync();
    page.classList.remove('is-hidden');
    page.classList.add('is-open');
    page.setAttribute('aria-hidden','false');
    d.body.classList.add('yiu-full-settings-open');
    d.body.style.overflow='hidden';
    showHome();
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
    if(previousFocus&&typeof previousFocus.focus==='function')previousFocus.focus();
  }
  var launcher=d.createElement('button');
  launcher.type='button';launcher.id='yiuSettingsLauncher';
  launcher.setAttribute('aria-label','打开设置');launcher.setAttribute('aria-haspopup','dialog');
  launcher.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.1a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8Z"/><path d="m19.4 13.5 1.1.8-1.1 2-1.3-.5a7.8 7.8 0 0 1-1.4.8l-.2 1.4h-2.3l-.3-1.4a7.8 7.8 0 0 1-1.5-.1l-.9 1.1-2-1.1.4-1.4a7.7 7.7 0 0 1-1-1.2l-1.4.1-.8-2.2 1.2-.8a7.7 7.7 0 0 1 .1-1.6L6.9 8.5 8 6.6l1.4.4a7.8 7.8 0 0 1 1.3-.9l.1-1.4H13l.4 1.4a7.8 7.8 0 0 1 1.5.2l.9-1.1 2 1.2-.4 1.3a7.7 7.7 0 0 1 1 1.3l1.4-.1.8 2.2-1.2.8a7.7 7.7 0 0 1 0 1.6Z"/></svg>';
  d.body.appendChild(launcher);
  launcher.addEventListener('click',open);
  d.addEventListener('keydown',function(e){if(e.key==='Escape'&&!page.classList.contains('is-hidden')){if(!subpage.hidden)showHome();else close()}});
  var observer=new MutationObserver(function(mutations){
    var structureChanged=mutations.some(function(m){return m.type==='childList'&&m.target===source});
    if(structureChanged)rebuildCategories();
    // Source readouts may mutate on every range input. Defer the expensive
    // mirror reconciliation until the user's finger leaves the slider.
    if(!page.classList.contains('is-hidden')&&!activeRange)sync();
  });
  observer.observe(source,{subtree:true,childList:true,attributes:true,characterData:true});
  w.addEventListener('yiu-dev-options-ready',function(){rebuildCategories();sync();});
  rebuildCategories();
  sync();
  return true;
}
var timer=w.setInterval(function(){attempts++;if(mount()||attempts>=80)w.clearInterval(timer)},100);
})(window,document);
