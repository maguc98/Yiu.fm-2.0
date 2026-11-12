/* Yiu.fm 2.0 — Android / Material You inspired settings.
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
:root{--yiu-m3-bg:#f6f3fb;--yiu-m3-surface:#fff;--yiu-m3-surface2:#eee9f6;--yiu-m3-primary:#6750a4;--yiu-m3-ink:#211f26;--yiu-m3-sub:#625d6b}
#yiuSettingsPage .m3-category-panel[data-category=system]{--cat-bg:#eaf0fc;--cat-soft:#f5f7fe;--cat-border:#d9e3f7;--cat-ink:#536bb0}
#yiuSettingsPage .m3-category-panel[data-category=beta]{--cat-bg:#fff0e3;--cat-soft:#fff8f1;--cat-border:#f5dfcb;--cat-ink:#ad6a38}
#yiuSettingsPage .m3-category-panel[data-category=developer]{--cat-bg:#e8f4ec;--cat-soft:#f4faf6;--cat-border:#d4e9dc;--cat-ink:#3f8060}
#yiuSettingsPage .m3-category-panel .m3-subdesc{padding:10px 13px;border-radius:14px;background:var(--cat-bg);color:var(--cat-ink)}
#yiuSettingsPage .m3-category-panel .m3-group-title{color:var(--cat-ink)}

#yiuSettingsLauncher{position:fixed;left:15px;top:calc(env(safe-area-inset-top,0px) + 12px);z-index:2147481500;width:44px;height:44px;padding:0;border:1px solid rgba(255,255,255,.25);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;background:rgba(35,32,45,.48);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:0 3px 12px rgba(0,0,0,.18);-webkit-tap-highlight-color:transparent}
#yiuSettingsLauncher svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#yiuSettingsPage{position:fixed;inset:0;z-index:2147482000;box-sizing:border-box;width:100vw;height:100vh;height:100dvh;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:calc(env(safe-area-inset-top,0px) + 8px) 18px calc(env(safe-area-inset-bottom,0px) + 30px);background:var(--yiu-m3-bg);color:var(--yiu-m3-ink);font-family:inherit;color-scheme:light}
#yiuSettingsPage.is-hidden{display:none!important}
#yiuSettingsPage.is-open{display:block;animation:yiuM3In .22s cubic-bezier(.2,.8,.2,1) both}
@keyframes yiuM3In{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
#yiuSettingsPage *{box-sizing:border-box}
#yiuSettingsPage button,#yiuSettingsPage input{font:inherit}
#yiuSettingsPage .m3-top{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:14px;min-height:54px;margin:0 -18px;padding:0 18px;background:rgba(246,243,251,.94);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}
#yiuSettingsPage .m3-back{display:flex;align-items:center;justify-content:center;flex:none;width:42px;height:42px;border:0;border-radius:50%;background:transparent;color:var(--yiu-m3-ink);font-size:25px;line-height:1;-webkit-tap-highlight-color:transparent}#yiuSettingsPage .m3-back:active{background:#e9e3f1}#yiuSettingsPage .m3-back:focus-visible,#yiuSettingsPage .m3-category:focus-visible,#yiuSettingsPage .m3-search-result:focus-visible,#yiuSettingsPage .m3-empty button:focus-visible{outline:2px solid var(--yiu-m3-primary);outline-offset:2px}#yiuSettingsPage button:disabled,#yiuSettingsPage input:disabled,#yiuSettingsPage select:disabled{opacity:.48;cursor:not-allowed}
#yiuSettingsPage .m3-title{font-size:23px;line-height:1.2;font-weight:650;letter-spacing:-.4px}
#yiuSettingsPage .m3-top.sub .m3-back{display:block}
#yiuSettingsPage .m3-top.sub .m3-title{font-size:20px}
#yiuSettingsPage .m3-search{display:flex;align-items:center;gap:10px;margin:12px 0 18px;padding:0 16px;height:54px;border-radius:18px;background:var(--yiu-m3-surface2);color:var(--yiu-m3-sub)}
#yiuSettingsPage .m3-search svg{width:20px;height:20px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8}
#yiuSettingsPage .m3-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--yiu-m3-ink);font-size:15px}#yiuSettingsPage .m3-search:focus-within{background:#e8e1f1;box-shadow:0 0 0 2px rgba(103,80,164,.14)}#yiuSettingsPage .m3-search input:focus{outline:0}
#yiuSettingsPage .m3-search input::placeholder{color:#77717f}
#yiuSettingsPage .m3-hero{display:flex;align-items:center;gap:15px;margin:0 0 23px;padding:19px;border-radius:24px;background:#e8def8;color:#302747}
#yiuSettingsPage .m3-logo{display:flex;align-items:center;justify-content:center;flex:none;width:52px;height:52px;border-radius:17px;background:#d0bcf2;color:#4d3a79;font-size:24px;font-weight:800}
#yiuSettingsPage .m3-hero strong{display:block;font-size:18px;font-weight:700}
#yiuSettingsPage .m3-hero small{display:block;margin-top:4px;font-size:12px;line-height:1.5;color:#594f6b}
#yiuSettingsPage .m3-section-title{margin:20px 4px 9px;font-size:14px;font-weight:700;color:#514b59;letter-spacing:.1px}
#yiuSettingsPage .m3-list{overflow:hidden;border-radius:22px;background:var(--yiu-m3-surface);box-shadow:0 1px 2px rgba(35,25,50,.04)}#yiuSettingsPage .m3-empty{margin-top:12px;padding:22px 18px;border-radius:20px;background:#fff;text-align:center;color:var(--yiu-m3-sub);box-shadow:0 1px 2px rgba(35,25,50,.04)}#yiuSettingsPage .m3-empty strong{display:block;margin-bottom:5px;color:var(--yiu-m3-ink);font-size:15px}#yiuSettingsPage .m3-empty button{margin-top:12px;padding:9px 15px;border:0;border-radius:999px;background:#eee7f8;color:#59458b;font-size:13px;font-weight:650}
#yiuSettingsPage .m3-category{display:flex;align-items:center;gap:15px;width:100%;min-height:76px;padding:12px 16px;border:0;border-bottom:1px solid #eeeaf1;background:transparent;text-align:left;color:var(--yiu-m3-ink);-webkit-tap-highlight-color:transparent}
#yiuSettingsPage .m3-category:last-child{border-bottom:0}
#yiuSettingsPage .m3-search-results{display:flex;flex-direction:column;gap:7px;margin:0 0 12px}#yiuSettingsPage [hidden]{display:none!important}#yiuSettingsPage .m3-search-result{display:flex;flex-direction:column;align-items:flex-start;gap:3px;width:100%;padding:12px 14px;border:1px solid #e9e4ef;border-radius:14px;background:#fff;color:var(--yiu-m3-ink);text-align:left}#yiuSettingsPage .m3-search-result strong{font-size:14px}#yiuSettingsPage .m3-search-result small{font-size:12px;color:var(--yiu-m3-sub)}#yiuSettingsPage .m3-search-hit{outline:2px solid #9b8acb!important;outline-offset:3px!important;border-radius:10px!important;background:rgba(232,224,248,.35)!important;}
#yiuSettingsPage .m3-category{cursor:pointer;transition:background .16s ease,transform .16s ease}#yiuSettingsPage .m3-category:active{background:#f1edf6;transform:scale(.995)}#yiuSettingsPage .m3-chevron{transition:transform .16s ease}#yiuSettingsPage .m3-category:active .m3-chevron{transform:translateX(2px)}
#yiuSettingsPage .m3-icon{display:flex;align-items:center;justify-content:center;flex:none;width:44px;height:44px;border-radius:15px;background:#eee7f8;color:#6750a4}#yiuSettingsPage .m3-icon svg{display:block;width:27px;height:27px;overflow:visible}#yiuSettingsPage .m3-category[data-category=system] .m3-icon{background:#e6eafa;color:#5369b4}#yiuSettingsPage .m3-category[data-category=beta] .m3-icon{background:#fcebdc;color:#b66a35}#yiuSettingsPage .m3-category[data-category=developer] .m3-icon{background:#e2f2e9;color:#3e8060}
#yiuSettingsPage .m3-cat-copy{flex:1;min-width:0}
#yiuSettingsPage .m3-cat-copy strong{display:block;font-size:15px;font-weight:650}
#yiuSettingsPage .m3-cat-copy small{display:block;margin-top:4px;font-size:12px;line-height:1.4;color:var(--yiu-m3-sub)}
#yiuSettingsPage .m3-chevron{color:#797381;font-size:23px;font-weight:300}
#yiuSettingsPage .m3-home[hidden],#yiuSettingsPage .m3-subpage[hidden]{display:none!important}
#yiuSettingsPage .m3-subpage{padding-bottom:12px}
#yiuSettingsPage .m3-subdesc{margin:0 3px 16px;color:var(--yiu-m3-sub);font-size:13px;line-height:1.55}
#yiuSettingsPage .m3-subpage .grp{margin:0 0 14px;padding:15px 16px;border-radius:22px;background:var(--yiu-m3-surface);box-shadow:0 1px 2px rgba(35,25,50,.04)}
#yiuSettingsPage .m3-subpage .gh{display:none!important}
#yiuSettingsPage .m3-subpage .gb{display:block!important;height:auto!important;max-height:none!important;overflow:visible!important;padding:0!important}
#yiuSettingsPage .m3-subpage .gi{padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
#yiuSettingsPage .m3-subpage .gp{padding:0!important}
#yiuSettingsPage .m3-subpage .m3-settings-body{display:flex!important;flex-direction:column!important;gap:15px!important;width:100%;min-width:0;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;visibility:visible!important;opacity:1!important;padding:18px!important;border-radius:22px!important;background:#fff!important;color:var(--yiu-m3-ink)!important;box-shadow:0 2px 8px rgba(45,35,65,.045)!important}
#yiuSettingsPage .m3-subpage .m3-settings-body>*{visibility:visible!important;opacity:1!important;max-height:none}
#yiuSettingsPage .m3-setting-item{display:flex;flex-direction:column;gap:10px;min-width:0;width:100%;padding:14px!important;border:1px solid var(--cat-border,#eeeaf3)!important;border-radius:17px!important;background:var(--cat-soft,#faf9fc)!important;box-shadow:0 1px 3px rgba(35,25,50,.035)}
#yiuSettingsPage .m3-setting-item:first-child{padding-top:14px!important}
#yiuSettingsPage .m3-setting-item:last-child{padding-bottom:14px!important;border-bottom:0}
#yiuSettingsPage .m3-setting-item>*{max-width:100%;min-width:0}
#yiuSettingsPage .m3-setting-section{display:flex;flex-direction:column;gap:9px;min-width:0}
#yiuSettingsPage .m3-hierarchy-title{display:flex;align-items:center;gap:9px;margin:2px 0 0;padding:0 2px;color:var(--cat-ink,#6750a4);font-size:13px;font-weight:750;letter-spacing:.2px}
#yiuSettingsPage .m3-hierarchy-title:before{content:"";width:4px;height:15px;border-radius:4px;background:var(--cat-ink,#8b78c5)}
#yiuSettingsPage .m3-setting-section-body{display:flex;flex-direction:column;gap:9px;min-width:0}
#yiuSettingsPage .m3-setting-section-body>.m3-setting-item{margin:0}
#yiuSettingsPage .m3-settings-body[data-category=system]{gap:19px!important}
#yiuSettingsPage .m3-settings-body[data-category=developer]>.m3-setting-item{padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
#yiuSettingsPage .m3-settings-body[data-category=developer] .m3-setting-section{padding:14px;border:1px solid var(--cat-border,#e8e2ef);border-radius:17px;background:var(--cat-soft,#faf9fc)}

#yiuSettingsPage .m3-setting-item .qtip{background:rgba(255,255,255,.78)!important;color:#625d6b!important}
#yiuSettingsPage .m3-setting-item .chk{background:rgba(255,255,255,.9)!important;border:1px solid var(--cat-border,#eee9f4)!important;border-radius:14px!important;padding:13px 14px!important}
#yiuSettingsPage .m3-setting-item .chk span{color:#282431!important}
#yiuSettingsPage .m3-setting-item input[type=range]{accent-color:var(--cat-ink,#8b78c5)}
#yiuSettingsPage .m3-subpage .m3-settings-body .qh{display:flex!important;align-items:center;justify-content:space-between;margin:0!important;padding:0!important;color:var(--yiu-m3-ink)!important;font-size:15px;font-weight:700}
#yiuSettingsPage .m3-subpage .m3-settings-body .qr{display:flex!important;align-items:center;gap:10px;margin:0!important;padding:0!important;color:var(--yiu-m3-sub)!important}
#yiuSettingsPage .m3-subpage .m3-settings-body input[type=range]{--yiu-range-progress:0%;display:block!important;flex:1;min-width:80px;width:100%;height:32px;margin:0;padding:0;border:0;border-radius:999px;background:transparent!important;accent-color:#6550a4;touch-action:none;-webkit-appearance:none;appearance:none;cursor:pointer;}
#yiuSettingsPage .m3-subpage .m3-settings-body input[type=range]::-webkit-slider-runnable-track{height:7px;border-radius:999px;background:linear-gradient(to right,#6550a4 0%,#6550a4 var(--yiu-range-progress),#c9c3d3 var(--yiu-range-progress),#c9c3d3 100%);border:1px solid rgba(66,53,88,.12);}
#yiuSettingsPage .m3-subpage .m3-settings-body input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:22px;height:22px;margin-top:-8px;border:3px solid #fff;border-radius:50%;background:#6550a4;box-shadow:0 1px 4px rgba(35,25,55,.28),0 0 0 1px rgba(67,49,103,.22);}
#yiuSettingsPage .m3-subpage .m3-settings-body input[type=range]::-moz-range-track{height:7px;border-radius:999px;background:#c9c3d3;border:1px solid rgba(66,53,88,.12);}
#yiuSettingsPage .m3-subpage .m3-settings-body input[type=range]::-moz-range-progress{height:7px;border-radius:999px;background:#6550a4;}
#yiuSettingsPage .m3-subpage .m3-settings-body input[type=range]::-moz-range-thumb{width:16px;height:16px;border:3px solid #fff;border-radius:50%;background:#6550a4;box-shadow:0 1px 4px rgba(35,25,55,.28);}
#yiuSettingsPage .m3-subpage .m3-settings-body input[type=range]:focus-visible{outline:2px solid rgba(101,80,164,.45);outline-offset:4px;border-radius:999px;}
#yiuSettingsPage .m3-subpage .m3-settings-body .qtip{display:block!important;margin:0!important;padding:10px 12px;border-radius:13px;background:#f6f3fb;color:var(--yiu-m3-sub)!important;font-size:12px;line-height:1.55}
#yiuSettingsPage .m3-subpage .m3-settings-body .chk{display:flex!important;align-items:center;justify-content:space-between;gap:12px;width:100%;margin:0!important;padding:13px 14px!important;border:1px solid #eeeaf3;border-radius:15px;background:#faf9fc!important;color:var(--yiu-m3-ink)!important}
#yiuSettingsPage .m3-subpage .m3-settings-body .chk span{color:var(--yiu-m3-ink)!important;font-size:14px}
#yiuSettingsPage .m3-subpage .m3-settings-body input[type=checkbox]{width:20px;height:20px;accent-color:var(--yiu-m3-primary)}
#yiuSettingsPage .m3-subpage .m3-settings-body .chip{min-height:42px;padding:10px 14px!important;border:1px solid #e3d9f0!important;border-radius:14px!important;background:#f2edf9!important;color:#5d478b!important;font-size:13px;font-weight:650}
#yiuSettingsPage .m3-subpage .m3-settings-body .qd{margin:0!important;padding-top:8px;border-top:1px solid #eeeaf3}
#yiuSettingsPage .m3-subpage .m3-settings-body [style*="display:flex"][style*="flex-direction:column"]{gap:12px!important}

#yiuSettingsPage .m3-subpage .qh{color:var(--yiu-m3-ink)}
#yiuSettingsPage .m3-subpage .qtip{color:var(--yiu-m3-sub)!important}
#yiuSettingsPage .m3-subpage .chk{color:var(--yiu-m3-ink)!important}
#yiuSettingsPage .m3-subpage .row>span{color:var(--yiu-m3-ink)!important}
#yiuSettingsPage .m3-subpage .chip{color:var(--yiu-m3-primary)!important;border-color:#d7c9eb!important;background:#f5f0fb!important}
#yiuSettingsPage .m3-subpage input[type=range]{accent-color:var(--yiu-m3-primary)}
#yiuSettingsPage .m3-subpage input[type=checkbox]{accent-color:var(--yiu-m3-primary)}
#yiuSettingsPage .m3-subpage .m3-group-title{margin:0 0 12px;font-size:17px;font-weight:700}
#yiuSettingsPage .m3-empty{padding:20px;border-radius:18px;background:#fff;color:var(--yiu-m3-sub);font-size:13px}

/* High-contrast typography: pastel surfaces stay soft, text stays readable. */
#yiuSettingsPage .m3-subpage .m3-settings-body,
#yiuSettingsPage .m3-subpage .m3-setting-item{color:#19171f!important}
#yiuSettingsPage .m3-subpage .m3-setting-item :is(.qh,strong,b,label,.row,.chk span,.m3-group-title){color:#19171f!important}
#yiuSettingsPage .m3-subpage .m3-setting-item :is(.qr,.qtip,.hint,.desc,.subtext,small,p){color:#48434f!important}
#yiuSettingsPage .m3-subpage .m3-setting-item .qtip{background:#fff!important;color:#48434f!important;border:1px solid #e4dfeb}
#yiuSettingsPage .m3-subpage .m3-setting-item .chk{background:#fff!important;border-color:#d9d3e1!important}
#yiuSettingsPage .m3-subpage .m3-setting-item .chk span{color:#211e28!important}
#yiuSettingsPage .m3-subpage .m3-setting-item button,
#yiuSettingsPage .m3-subpage .m3-setting-item .chip{color:#49366f!important}
#yiuSettingsPage .m3-subpage .m3-hierarchy-title{color:var(--cat-ink,#49366f)!important}
#yiuSettingsPage .m3-subdesc{color:#45404c!important}


/* Final readability pass: cover inherited/inline WebKit text-fill colors too. */
#yiuSettingsPage .m3-subpage .m3-settings-body :is(div,span,p,label,strong,b,small,em,i,a,output,summary){
  color:#24212b!important;
  -webkit-text-fill-color:#24212b!important;
  text-shadow:none!important;
}
#yiuSettingsPage .m3-subpage .m3-settings-body :is(.m3-hierarchy-title,.m3-group-title){
  color:var(--cat-ink,#49366f)!important;
  -webkit-text-fill-color:var(--cat-ink,#49366f)!important;
}
#yiuSettingsPage .m3-subpage .m3-settings-body :is(.qtip,.hint,.desc,.subtext,.qr,small,p){
  color:#514b58!important;
  -webkit-text-fill-color:#514b58!important;
}
#yiuSettingsPage .m3-subpage .m3-settings-body :is(button,.chip){
  color:#49366f!important;
  -webkit-text-fill-color:#49366f!important;
}
#yiuSettingsPage .m3-subpage .m3-settings-body input:not([type=checkbox]):not([type=range]),
#yiuSettingsPage .m3-subpage .m3-settings-body select,
#yiuSettingsPage .m3-subpage .m3-settings-body textarea{
  color:#24212b!important;
  -webkit-text-fill-color:#24212b!important;
  background-color:#fff!important;
}
#yiuSettingsPage .m3-subpage .m3-settings-body input::placeholder,
#yiuSettingsPage .m3-subpage .m3-settings-body textarea::placeholder{
  color:#6a6471!important;
  -webkit-text-fill-color:#6a6471!important;
  opacity:1!important;
}
#yiuSettingsPage .m3-subpage .m3-settings-body :disabled,
#yiuSettingsPage .m3-subpage .m3-settings-body [aria-disabled=true]{
  opacity:.72!important;
}
#yiuSettingsPage .m3-subpage .m3-settings-body :disabled :is(span,small,label),
#yiuSettingsPage .m3-subpage .m3-settings-body [aria-disabled=true] :is(span,small,label){
  color:#625c69!important;
  -webkit-text-fill-color:#625c69!important;
}


/* Layout refinement — consistent rhythm, calmer hierarchy, less visual nesting. */
#yiuSettingsPage{padding-left:20px;padding-right:20px;background:#f5f3f8}
#yiuSettingsPage .m3-top{min-height:58px;margin-left:-20px;margin-right:-20px;padding-left:17px;padding-right:20px;gap:12px;background:rgba(245,243,248,.96);border-bottom:1px solid rgba(83,72,101,.06)}
#yiuSettingsPage .m3-back{width:40px;height:40px;font-size:27px}
#yiuSettingsPage .m3-title{font-size:21px;letter-spacing:-.35px;font-weight:720}
#yiuSettingsPage .m3-home,#yiuSettingsPage .m3-subpage{width:100%;max-width:680px;margin-left:auto;margin-right:auto}
#yiuSettingsPage .m3-search{height:50px;margin:14px 0 16px;padding:0 15px;border:1px solid #e7e2ed;border-radius:16px;background:#fff;box-shadow:0 2px 8px rgba(42,32,58,.035)}
#yiuSettingsPage .m3-search:focus-within{border-color:#c8b9e2;background:#fff;box-shadow:0 0 0 3px rgba(103,80,164,.10)}
#yiuSettingsPage .m3-hero{min-height:88px;margin:0 0 23px;padding:16px 17px;border:1px solid #e2d8f1;border-radius:21px;background:linear-gradient(110deg,#eee8fa 0%,#f4effa 58%,#f8f0f6 100%);gap:14px}
#yiuSettingsPage .m3-logo{width:48px;height:48px;border-radius:15px;background:#d9cbed;color:#55417f;font-size:22px}
#yiuSettingsPage .m3-hero strong{font-size:17px;letter-spacing:-.2px}
#yiuSettingsPage .m3-hero small{font-size:12px;line-height:1.45;color:#5b5367}
#yiuSettingsPage .m3-section-title{margin:0 3px 11px;font-size:14px;font-weight:750;color:#4d4855;letter-spacing:.15px}
#yiuSettingsPage .m3-list{display:flex;flex-direction:column;gap:10px;overflow:visible;border-radius:0;background:transparent;box-shadow:none}
#yiuSettingsPage .m3-category{position:relative;min-height:78px;padding:13px 15px;gap:13px;border:1px solid #ebe7f0!important;border-radius:19px;background:#fff;box-shadow:0 2px 8px rgba(42,32,58,.035);transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}
#yiuSettingsPage .m3-category:last-child{border-bottom:1px solid #ebe7f0!important}
#yiuSettingsPage .m3-category:active{transform:scale(.99);background:#fcfbfe;box-shadow:0 1px 3px rgba(42,32,58,.035)}
#yiuSettingsPage .m3-icon{width:46px;height:46px;border-radius:15px}
#yiuSettingsPage .m3-icon svg{width:25px;height:25px}
#yiuSettingsPage .m3-cat-copy strong{font-size:15px;line-height:1.35;font-weight:720}
#yiuSettingsPage .m3-cat-copy small{margin-top:4px;font-size:11.5px;line-height:1.45;color:#686271}
#yiuSettingsPage .m3-chevron{font-size:25px;color:#8b8493}
#yiuSettingsPage .m3-subpage{padding-top:7px;padding-bottom:18px}
#yiuSettingsPage .m3-subdesc{margin:0 0 13px;padding:11px 13px;border:1px solid var(--cat-border,#e7e1ed);border-radius:14px;background:var(--cat-soft,#faf8fc);font-size:12px;line-height:1.5;color:#514b58}
#yiuSettingsPage .m3-subpage .m3-group-title{margin:0 2px 13px;font-size:18px;line-height:1.3;font-weight:760;letter-spacing:-.25px;color:#292530}
#yiuSettingsPage .m3-subpage .m3-settings-body{gap:16px!important;padding:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
#yiuSettingsPage .m3-subpage .m3-setting-section{gap:9px;padding:0;margin:0}
#yiuSettingsPage .m3-subpage .m3-hierarchy-title{margin:1px 3px 1px;padding:0 0 0 1px;font-size:13px;font-weight:760;letter-spacing:.1px}
#yiuSettingsPage .m3-subpage .m3-hierarchy-title:before{width:4px;height:14px}
#yiuSettingsPage .m3-subpage .m3-setting-section-body{gap:9px}
#yiuSettingsPage .m3-subpage .m3-setting-item{gap:9px;padding:14px!important;border:1px solid #eae6ef!important;border-radius:17px!important;background:#fff!important;box-shadow:0 2px 7px rgba(42,32,58,.03)!important}
#yiuSettingsPage .m3-subpage .m3-setting-item:first-child,#yiuSettingsPage .m3-subpage .m3-setting-item:last-child{padding:14px!important}
#yiuSettingsPage .m3-subpage .m3-settings-body[data-category=developer] .m3-setting-section{padding:0;border:0;border-radius:0;background:transparent}
#yiuSettingsPage .m3-subpage .m3-settings-body[data-category=developer]>.m3-setting-item{padding:0!important}
#yiuSettingsPage .m3-subpage .m3-setting-item .qh{font-size:14px;line-height:1.4}
#yiuSettingsPage .m3-subpage .m3-setting-item .qr{font-size:12px;line-height:1.45}
#yiuSettingsPage .m3-subpage .m3-setting-item .qtip{padding:9px 11px;border:1px solid #ece8f1;border-radius:12px;background:#faf9fc!important;font-size:11.5px;line-height:1.55}
#yiuSettingsPage .m3-subpage .m3-setting-item .chk{min-height:46px;padding:11px 12px!important;border-radius:13px!important;background:#faf9fc!important}
#yiuSettingsPage .m3-subpage .m3-setting-item .chk span{font-size:13px;line-height:1.4}
#yiuSettingsPage .m3-subpage .m3-setting-item .chip{min-height:39px;padding:9px 12px!important;border-radius:12px!important}
#yiuSettingsPage .m3-subpage .m3-setting-item .qd{padding-top:10px}
#yiuSettingsPage .m3-search-results{gap:8px}
#yiuSettingsPage .m3-search-result{padding:13px 14px;border-radius:15px;border-color:#e8e3ed;box-shadow:0 1px 4px rgba(42,32,58,.025)}
#yiuSettingsPage .m3-empty{border:1px solid #eae5ef;box-shadow:0 2px 8px rgba(42,32,58,.03)}

/* Control polish: consistent toggle switches and visible, touch-friendly range tracks. */
#yiuSettingsPage .m3-subpage .m3-settings-body .chk input[type="checkbox"],
#yiuSettingsPage .m3-subpage .m3-settings-body input[type="checkbox"][role="switch"]{
  -webkit-appearance:none!important;appearance:none!important;
  position:relative!important;display:inline-block!important;flex:0 0 48px!important;
  width:48px!important;min-width:48px!important;height:28px!important;min-height:28px!important;
  margin:0!important;padding:0!important;border:1px solid #aaa4b2!important;border-radius:999px!important;
  background:#d8d4de!important;box-shadow:inset 0 1px 2px rgba(35,25,50,.10)!important;
  vertical-align:middle;cursor:pointer;transition:background .18s ease,border-color .18s ease!important;
}
#yiuSettingsPage .m3-subpage .m3-settings-body .chk input[type="checkbox"]::before,
#yiuSettingsPage .m3-subpage .m3-settings-body input[type="checkbox"][role="switch"]::before{
  content:"";position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;
  background:#fff;box-shadow:0 1px 3px rgba(30,24,40,.24);transform:translateX(0);
  transition:transform .18s cubic-bezier(.2,.8,.2,1);
}
#yiuSettingsPage .m3-subpage .m3-settings-body .chk input[type="checkbox"]:checked,
#yiuSettingsPage .m3-subpage .m3-settings-body input[type="checkbox"][role="switch"]:checked{
  border-color:#6550a4!important;background:#6550a4!important;
}
#yiuSettingsPage .m3-subpage .m3-settings-body .chk input[type="checkbox"]:checked::before,
#yiuSettingsPage .m3-subpage .m3-settings-body input[type="checkbox"][role="switch"]:checked::before{transform:translateX(20px)}
#yiuSettingsPage .m3-subpage .m3-settings-body .chk input[type="checkbox"]:focus-visible,
#yiuSettingsPage .m3-subpage .m3-settings-body input[type="checkbox"][role="switch"]:focus-visible{
  outline:3px solid rgba(101,80,164,.22)!important;outline-offset:3px!important;
}
#yiuSettingsPage .m3-subpage .m3-settings-body .chk input[type="checkbox"]:disabled,
#yiuSettingsPage .m3-subpage .m3-settings-body input[type="checkbox"][role="switch"]:disabled{opacity:.52!important;cursor:not-allowed!important}
#yiuSettingsPage .m3-subpage .m3-settings-body input[type="range"]{
  height:42px!important;min-height:42px!important;min-width:96px!important;
  padding:0 2px!important;overflow:visible!important;background:transparent!important;
  -webkit-appearance:none!important;appearance:none!important;touch-action:pan-y!important;
}
#yiuSettingsPage .m3-subpage .m3-settings-body input[type="range"]::-webkit-slider-runnable-track{
  height:11px!important;min-height:11px!important;border:1px solid #b9b2c4!important;
  border-radius:999px!important;
  background:linear-gradient(to right,#6550a4 0%,#6550a4 var(--yiu-range-progress,0%),#d6d1dd var(--yiu-range-progress,0%),#d6d1dd 100%)!important;
  box-shadow:inset 0 1px 2px rgba(35,25,50,.10)!important;
}
#yiuSettingsPage .m3-subpage .m3-settings-body input[type="range"]::-webkit-slider-thumb{
  width:25px!important;height:25px!important;margin-top:-8px!important;
  border:3px solid #fff!important;border-radius:50%!important;background:#6550a4!important;
  box-shadow:0 1px 5px rgba(35,25,55,.30),0 0 0 1px rgba(67,49,103,.24)!important;
}
#yiuSettingsPage .m3-subpage .m3-settings-body input[type="range"]::-moz-range-track{
  height:11px!important;border:1px solid #b9b2c4!important;border-radius:999px!important;
  background:#d6d1dd!important;box-shadow:inset 0 1px 2px rgba(35,25,50,.10)!important;
}
#yiuSettingsPage .m3-subpage .m3-settings-body input[type="range"]::-moz-range-progress{
  height:11px!important;border-radius:999px!important;background:#6550a4!important;
}
#yiuSettingsPage .m3-subpage .m3-settings-body input[type="range"]::-moz-range-thumb{
  width:19px!important;height:19px!important;border:3px solid #fff!important;border-radius:50%!important;
  background:#6550a4!important;box-shadow:0 1px 5px rgba(35,25,55,.30)!important;
}
#yiuSettingsPage .m3-subpage .m3-settings-body input[type="range"]:focus-visible{
  outline:3px solid rgba(101,80,164,.20)!important;outline-offset:5px!important;
}
@media(prefers-reduced-motion:reduce){
  #yiuSettingsPage .m3-subpage .m3-settings-body .chk input[type="checkbox"],
  #yiuSettingsPage .m3-subpage .m3-settings-body .chk input[type="checkbox"]::before{transition:none!important}
}

#yiuSettingsPage .m3-footer{padding:24px 0 8px;color:#77717f}
@media(min-width:600px){
  #yiuSettingsPage{padding-left:28px;padding-right:28px}
  #yiuSettingsPage .m3-top{margin-left:-28px;margin-right:-28px;padding-left:25px;padding-right:28px}
  #yiuSettingsPage .m3-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
}
@media(prefers-reduced-motion:reduce){
  #yiuSettingsPage .m3-category{transition:none}
}
#yiuSettingsPage .m3-footer{padding:22px 0 5px;text-align:center;font-size:11px;color:#817b88}
@media(prefers-reduced-motion:reduce){#yiuSettingsPage.is-open{animation:none}}
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
  hero.innerHTML='<div class="m3-logo">Y</div><div><strong>Yiu.fm 设置</strong><small>管理应用偏好、实验功能与高级选项</small></div>';
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
      [].slice.call(contentOriginal.childNodes).forEach(function(node){
        if(node.nodeType===3&&!node.textContent.trim())return;
        if(node.nodeType!==1){clone.appendChild(node.cloneNode(true));return;}
        var item=d.createElement('div');
        item.className='m3-setting-item';
        var child=node.cloneNode(true);
        item.appendChild(child);
        clone.appendChild(item);
        bindTree(child,node);
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
      clone.querySelectorAll('label[for]').forEach(function(el){el.setAttribute('for','yiuMirror_'+el.getAttribute('for'))});
      organizeSettingsHierarchy(clone,cfg);
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
    var src=sourceFor(control);if(!src)return;
    if(src.classList.contains('gh'))return;
    src.click();
    w.setTimeout(sync,0);
  });
  var activeRange=null;
  function forwardValue(e){
    var src=sourceFor(e.target);if(!src)return;
    var clone=e.target;
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
