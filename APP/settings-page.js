/* Yiu.fm 2.0 — native in-page settings.
 * The real settings controls live in #pg3; this module only binds their behavior.
 */
(function(w,d){
'use strict';
var page=d.getElementById('pg3');
if(!page)return;
function bindSettingsGroups(){
 page.querySelectorAll('.settings-native-group').forEach(function(group){
  var head=group.querySelector(':scope > .gh');
  if(!head||head.__yiuNativeBound)return;
  head.__yiuNativeBound=true;
  head.addEventListener('click',function(){var open=group.classList.toggle('open');head.setAttribute('aria-expanded',open?'true':'false')});
 });
}
function lum(h){var v=h.slice(1),r=parseInt(v.slice(0,2),16)/255,g=parseInt(v.slice(2,4),16)/255,b=parseInt(v.slice(4,6),16)/255;function f(n){return n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4)}return .2126*f(r)+.7152*f(g)+.0722*f(b)}
function ratio(a,b){var x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
function mix(a,b,p){var o='';for(var i=0;i<3;i++){var n=Math.round(parseInt(a.slice(1+i*2,3+i*2),16)*p+parseInt(b.slice(1+i*2,3+i*2),16)*(1-p));o+=('0'+n.toString(16)).slice(-2)}return '#'+o}
function readable(fg,bg){var lo=0,hi=1;for(var i=0;i<18;i++){var m=(lo+hi)/2;if(ratio(mix(fg,bg,m),bg)>=4.5)hi=m;else lo=m}return mix(fg,bg,hi)}
var defaults={accent:'#7b75d5',bg:'#f4f6fb',card:'#ffffff',ink:'#222536'};
var presets={lavender:{accent:'#7b75d5',bg:'#f4f6fb',card:'#ffffff',ink:'#222536'},blue:{accent:'#5486d8',bg:'#eef5ff',card:'#ffffff',ink:'#253247'},green:{accent:'#4d9b7a',bg:'#eff8f2',card:'#ffffff',ink:'#263b32'},peach:{accent:'#d58a63',bg:'#fff4ec',card:'#ffffff',ink:'#443127'},pink:{accent:'#cf729b',bg:'#fff1f6',card:'#ffffff',ink:'#432b38'}};
var theme=Object.assign({},defaults);
try{theme=Object.assign(theme,JSON.parse(w.localStorage.getItem('yiu.settings.theme.v1')||'{}'))}catch(_){}
function applyTheme(save){
 Object.keys(defaults).forEach(function(k){if(!/^#[0-9a-f]{6}$/i.test(theme[k]||''))theme[k]=defaults[k]});
 var ink=ratio(theme.ink,theme.bg)>=4.5?theme.ink:(ratio('#000000',theme.bg)>=ratio('#ffffff',theme.bg)?'#000000':'#ffffff');
 var cardInk=ratio(theme.ink,theme.card)>=4.5?theme.ink:(ratio('#000000',theme.card)>=ratio('#ffffff',theme.card)?'#000000':'#ffffff');
 page.style.setProperty('--yiu-settings-accent',theme.accent);page.style.setProperty('--yiu-settings-bg',theme.bg);page.style.setProperty('--yiu-settings-card',theme.card);
 page.style.setProperty('--yiu-settings-ink',ink);page.style.setProperty('--yiu-settings-sub',readable(ink,theme.bg));page.style.setProperty('--yiu-settings-card-ink',cardInk);page.style.setProperty('--yiu-settings-card-sub',readable(cardInk,theme.card));
 page.querySelectorAll('[data-theme-key]').forEach(function(el){el.value=theme[el.dataset.themeKey]});
 if(save)try{w.localStorage.setItem('yiu.settings.theme.v1',JSON.stringify(theme))}catch(_){}
}
function updateRanges(root){(root||page).querySelectorAll('input[type=range]').forEach(function(el){var min=Number(el.min||0),max=Number(el.max||100),v=Number(el.value||0),pct=max>min?Math.max(0,Math.min(100,(v-min)/(max-min)*100)):0;el.style.setProperty('--p',pct+'%');if(typeof w.sync==='function')try{w.sync(el)}catch(_){}})}
bindSettingsGroups();
page.querySelectorAll('#systemSettingsGroup input[type=range]').forEach(function(el){if(typeof w.wrapRange==='function'&&!(el.parentNode&&el.parentNode.classList.contains('rw')))try{w.wrapRange(el)}catch(_){}});
if(typeof w.bindUiSpd==='function')try{w.bindUiSpd()}catch(_){}
page.addEventListener('input',function(e){var el=e.target;if(el&&el.matches&&el.matches('[data-theme-key]')){var k=el.dataset.themeKey;if(Object.prototype.hasOwnProperty.call(defaults,k)){theme[k]=el.value;applyTheme(true)}}if(el&&el.matches&&el.matches('input[type=range]'))updateRanges(el.parentNode)});
page.addEventListener('change',function(e){var el=e.target;if(el&&el.matches&&el.matches('[data-theme-key]')){var k=el.dataset.themeKey;if(Object.prototype.hasOwnProperty.call(defaults,k)){theme[k]=el.value;applyTheme(true)}}if(el&&el.matches&&el.matches('input[type=range]'))updateRanges(el.parentNode)});
page.addEventListener('click',function(e){var p=e.target.closest&&e.target.closest('[data-preset]');if(p&&presets[p.dataset.preset]){theme=Object.assign({},presets[p.dataset.preset]);applyTheme(true);return}if(e.target.closest&&e.target.closest('[data-theme-reset]')){theme=Object.assign({},defaults);applyTheme(true)}});
var reset=d.getElementById('qrstMoved');
if(reset)reset.addEventListener('click',function(){if(typeof w.setUiSpdPct==='function')w.setUiSpdPct(100);var speed=d.getElementById('uiSpd');if(speed){speed.value='100';updateRanges(speed.parentNode)}['uiH','uiS','performanceMode'].forEach(function(id){var el=d.getElementById(id);if(el){el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}))}});if(w.YiuFrameRateLimit&&typeof w.YiuFrameRateLimit.reset==='function')w.YiuFrameRateLimit.reset();theme=Object.assign({},defaults);applyTheme(true)});
applyTheme(false);updateRanges(page);
w.__yiuSettingsDiag=function(){return {ui:'native-pg3-settings-20261113b',page:!!d.getElementById('pg3'),groups:['systemSettingsGroup','betaBox','themeSettingsGroup','devOptionsGroup'].map(function(id){return !!d.getElementById(id)})}};
})(window,document);