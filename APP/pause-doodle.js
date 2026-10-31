/* 暂停涂鸦页 pause-doodle.js
   规则：只要 #audio 处于暂停（含播放前、播完），就隐藏舞台上的歌词/特效内容，
         保留 #bg 背景，在 #stage 里显示：像素山峰插画 + Y logo + 当前歌曲信息。
   对外：window.__pauseDoodle.setInfo({title,artist}) 手动指定歌名/歌手；.refresh() 立即刷新。 */
(function(){
'use strict';
var audio=document.getElementById('audio'), stage=document.getElementById('stage');
if(!audio||!stage) return;

/* ---------- 样式 ---------- */
var css=
'#pdoodle{position:absolute;inset:0;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;'+
  'pointer-events:none;opacity:0;visibility:hidden;scale:.94;'+
  'transition:opacity calc(.32s/var(--ui-spd,1)) ease,scale calc(.5s/var(--ui-spd,1)) cubic-bezier(.34,1.56,.64,1),visibility 0s linear calc(.32s/var(--ui-spd,1));'+
  '--pd-ink:#1c2540;--pd-ac:#8fb0ff}'+
'body.pd-on #pdoodle{opacity:1;visibility:visible;scale:1;transition-delay:0s}'+
/* 隐藏歌词与特效层，保留 #bg / #bgf */
'body.pd-on #stage>#one,body.pd-on #stage>#sonnetHost,body.pd-on #stage>#sky,body.pd-on [class*="nolyric"]{opacity:0!important;visibility:hidden!important;pointer-events:none!important}'+
'#pdoodle .pd-logo{width:64px;height:64px;padding:12px;border-radius:20px;background:#fff;border:3px solid var(--pd-ink);box-shadow:4px 4px 0 var(--pd-ink);rotate:-6deg;box-sizing:border-box}'+
'#pdoodle .pd-logo svg{display:block;width:100%;height:100%}'+
'#pdoodle .pd-card{padding:8px;border-radius:22px;background:#fff;border:3px solid var(--pd-ink);box-shadow:6px 6px 0 var(--pd-ink);rotate:-1.5deg}'+
'#pdoodle canvas{display:block;width:min(74vw,320px);aspect-ratio:76/44;image-rendering:pixelated;border-radius:14px}'+
'#pdoodle .pd-tag{max-width:min(82vw,340px);padding:10px 18px 11px;border-radius:18px;background:var(--pd-ac);color:var(--pd-ink);'+
  'border:3px solid var(--pd-ink);box-shadow:4px 4px 0 var(--pd-ink);rotate:1deg;text-align:center}'+
'#pdoodle .pd-t{font-size:18px;font-weight:800;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
'#pdoodle .pd-a{margin-top:2px;font-size:13px;font-weight:600;opacity:.72;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
'#pdoodle .pd-a:empty{display:none}'+
'#pdoodle .pd-logo{animation:pdBob 1.6s steps(2,end) infinite}'+
'@keyframes pdBob{0%{translate:0 0}50%{translate:0 -3px}100%{translate:0 0}}'+
'body.low-power #pdoodle .pd-logo,body.performance-mode #pdoodle .pd-logo{animation:none}';
var st=document.createElement('style'); st.id='pdoodleCSS'; st.textContent=css; document.head.appendChild(st);

/* ---------- DOM ---------- */
var root=document.createElement('div'); root.id='pdoodle'; root.setAttribute('aria-hidden','true');
root.innerHTML=
 '<div class="pd-logo"><svg viewBox="380 370 1170 1190" aria-hidden="true">'+
   '<polygon fill="#000" points="400,390 728,390 1110,1070 1110,1542 822,1542 822,1088"/>'+
   '<polygon fill="#000" points="1225,390 1532,390 1170,985 1042,692"/></svg></div>'+
 '<div class="pd-card"><canvas width="76" height="44"></canvas></div>'+
 '<div class="pd-tag"><div class="pd-t"></div><div class="pd-a"></div></div>'+
 '<div class="pd-eg"><canvas></canvas><div class="nm"><div class="zh"></div><div class="en"></div></div></div>';
stage.appendChild(root);
var cv=root.querySelector('canvas'), cx=cv.getContext('2d');
var elT=root.querySelector('.pd-t'), elA=root.querySelector('.pd-a');

/* ---------- 主题色：跟随开屏动画里设置的主题色 ---------- */
function applyAccent(){
  var c='#8fb0ff';
  try{var s=JSON.parse(localStorage.getItem('splashCfg')||'{}'); if(s&&s.ac) c=s.ac;}catch(_){}
  root.style.setProperty('--pd-ac',c);
}

/* ---------- 彩蛋文案（想改字就改这里） ---------- */
var EGG={zh:'周德英',en:'ZDY'};

/* ---------- 设置（存 localStorage）：on=是否启用，scene=random 或具体封面 ---------- */
var CFG={on:true,scene:'random'}, CK='pdoodleCfg';
try{var _c=JSON.parse(localStorage.getItem(CK)||'{}'); if(_c.on===false)CFG.on=false; if(typeof _c.scene==='string')CFG.scene=_c.scene}catch(_){}
function saveCfg(){try{localStorage.setItem(CK,JSON.stringify(CFG))}catch(_){}}

/* ---------- 像素绘制工具（画布 76x44 格） ---------- */
var W=76,H=44,PX=38,PY=9;
var FONT={ // 3x5 像素字母
 a:'010101111101101',b:'110101110101110',c:'011100100100011',d:'110101101101110',e:'111100111100111',
 f:'111100110100100',g:'011100101101011',h:'101101111101101',i:'111010010010111',j:'001001001101010',
 k:'101101110101101',l:'100100100100111',m:'101111111101101',n:'110101101101101',o:'010101101101010',
 p:'111101111100100',q:'010101101111011',r:'110101110101101',s:'011100010001110',t:'111010010010010',
 u:'101101101101111',v:'101101101101010',w:'101101111111101',x:'101101010101101',y:'101101010010010',z:'111001010100111'};
function R(x,y,w,h,c){cx.fillStyle=c;cx.fillRect(x,y,w,h)}
function P(x,y,c){cx.fillStyle=c;cx.fillRect(x,y,1,1)}
function disc(x0,y0,r,c){for(var y=-r;y<=r;y++)for(var x=-r;x<=r;x++)if(x*x+y*y<=r*r+r*.6)P(x0+x,y0+y,c)}
function rnd(x,y){var n=Math.sin(x*12.9898+y*78.233)*43758.5453;return n-Math.floor(n)}
function TL(str,x,y,s,c){ // 从 x 起向右画字
  for(var k=0;k<str.length;k++){var gl=FONT[str[k]];
    if(gl)for(var r=0;r<5;r++)for(var q=0;q<3;q++)if(gl[r*3+q]==='1')R(x+k*4*s+q*s,y+r*s,s,s,c)}
}
function T(str,mid,y,s,c){TL(str,mid-Math.floor((str.length*4*s-s)/2),y,s,c)}
function heart(x,y,c){R(x+1,y,2,1,c);R(x+4,y,2,1,c);R(x,y+1,7,2,c);R(x+1,y+3,5,1,c);R(x+2,y+4,3,1,c);R(x+3,y+5,1,1,c)}
function stars(n,c,f,maxY){for(var i=0;i<n;i++){if((i+f)%3===0)continue;var x=Math.floor(rnd(i,1)*W),y=Math.floor(rnd(i,2)*maxY);P(x,y,c)}}

var C={sky:'#e4ebf5',hill:'#cfdbea',snow:'#f7f3f5',gray:'#a5a3b8',blue:'#a3b8d6',dark:'#50658a',white:'#fff',flag:'#3b82f6',pole:'#a3b8d6'};
var mBase=null;
function mountBase(){
  var o=document.createElement('canvas'); o.width=W; o.height=H; var g=o.getContext('2d');
  function p(x,y,c){g.fillStyle=c;g.fillRect(x,y,1,1)}
  g.fillStyle=C.sky; g.fillRect(0,0,W,H);
  var x,y,hw,top;
  for(x=0;x<W;x++){top=H-Math.max(0,13-Math.abs(x-9)*1.1,11-Math.abs(x-68)*1.0);for(y=Math.floor(top);y<H;y++)p(x,y,C.hill)}
  for(y=PY;y<H;y++){hw=Math.floor((y-PY)*1.15)+1;
    for(x=PX-hw;x<=PX+hw;x++){ if(x<0||x>=W)continue;
      var left=x<PX,d=y-PY,c;
      if(left)c=d<13+Math.floor(rnd(x,y)*3)-Math.floor((PX-x)*.35)?C.snow:C.gray; else c=C.blue;
      if(y>PY+15+Math.floor(rnd(x,y)*3)&&(!left||x>PX-14||rnd(y,x)>.6))c=C.dark;
      if(!left&&d>8&&d<20&&rnd(x*2,y)>.9)c=C.dark;
      p(x,y,c)}}
  for(x=0;x<W;x++)p(x,H-1,C.dark);
  mBase=o;
}

/* ---------- 各个封面（f = 帧号，每帧 480ms，逐帧跳动保持像素感） ---------- */
var SCENES={
 mount:function(f){
  if(!mBase)mountBase(); cx.clearRect(0,0,W,H); cx.drawImage(mBase,0,0);
  var fy=PY-8,w=f%2?4:5,i,yy,xx;
  for(i=0;i<8;i++)P(PX,fy+i,C.pole);
  for(yy=0;yy<4;yy++)for(xx=0;xx<w;xx++)P(PX+1+xx,fy+yy+(f%2&&xx>2?1:0),C.flag);
  P(PX+2,fy+1,C.white);P(PX+4-(f%2?1:0),fy+1,C.white);
  T('pause',PX,29,2,'#fff');
  var sp=[[8,5],[66,8],[20,14],[58,4]];
  for(i=0;i<sp.length;i++)if((f+i)%3===0){P(sp[i][0],sp[i][1],'#fff');P(sp[i][0]+1,sp[i][1],'#fff');P(sp[i][0],sp[i][1]+1,'#fff')}
 },
 beach:function(f){
  var x,y,i;
  R(0,0,W,10,'#d9effb');R(0,10,W,8,'#c5e6f7');R(0,18,W,6,'#b2dcf3');
  disc(58,12,5,'#ffd86b');
  if(f%2){P(58,4,'#ffd86b');P(58,20,'#ffd86b');P(50,12,'#ffd86b');P(66,12,'#ffd86b')}
  else{P(52,6,'#ffd86b');P(64,6,'#ffd86b');P(52,18,'#ffd86b');P(64,18,'#ffd86b')}
  var cxo=(8+f*2)%90-12;R(cxo,9,9,2,'#fff');R(cxo+2,7,5,2,'#fff');
  R(0,24,W,12,'#6fb7e6');R(0,33,W,3,'#4f9fd8');
  for(y=26;y<33;y+=3)for(x=0;x<W;x++)if((x+f*2+y)%8<3)P(x,y,'#a8dcf5');
  R(0,36,W,8,'#f2d9a6');for(i=0;i<20;i++)P(Math.floor(rnd(i,5)*W),37+Math.floor(rnd(i,6)*6),'#e3c48a');
  var bx=8+(f*2)%52,by=f%2;
  R(bx,22+by,9,2,'#50658a');R(bx+4,13+by,1,9,'#50658a');
  for(i=0;i<7;i++)R(bx+5,14+by+i,Math.max(1,7-i),1,'#fff');
  T('chill',38,26,2,'#fff');
 },
 night:function(f){
  var x,top;
  R(0,0,W,44,'#1d2547');R(0,26,W,18,'#232c58');
  stars(16,'#fff6d6',f,24);
  disc(56,11,6,'#ffe9a8');disc(59,9,5,'#1d2547');
  for(x=0;x<W;x++){top=34+Math.round(3*Math.sin(x/9));R(x,top,1,44-top,'#121a35')}
  var b=f%2;
  TL('z',28,28-b,1,'#cdd8ff');TL('z',34,19-b,2,'#cdd8ff');TL('z',43,6-b,3,'#cdd8ff');
 },
 city:function(f){
  var ws=[9,8,10,9,11,8,10,11],hs=[16,24,14,20,27,15,22,12],x=0,i,wy,wx;
  R(0,0,W,12,'#ffe3d0');R(0,12,W,8,'#fdd0c4');R(0,20,W,24,'#f6b9c4');
  disc(38,28,8,'#ffb36b');
  for(i=0;i<ws.length;i++){
    var h=hs[i],col=i%2?'#3d4d70':'#50658a';
    R(x,44-h,ws[i],h,col);
    for(wy=44-h+2;wy<41;wy+=4)for(wx=x+2;wx<x+ws[i]-2;wx+=3){
      var k=rnd(wx*3+(rnd(wx,wy)>.88?f:0),wy);
      if(k>.55)R(wx,wy,1,2,'#ffe08a');
    }
    x+=ws[i];
  }
  var bx=(f*3)%90-6;P(bx,8,'#50658a');P(bx+1,9,'#50658a');P(bx+2,8,'#50658a');
  T('rest',38,3,2,'#50658a');
 },
 cat:function(f){
  var b=f%2;
  R(0,0,W,32,'#fbe9d7');R(0,32,W,12,'#e8c9a2');R(0,32,W,1,'#d9b78a');
  R(8,6,14,12,'#8a5a3a');R(9,7,12,10,'#cfe8fb');R(14,7,1,10,'#8a5a3a');R(9,11,12,1,'#8a5a3a');
  R(28,23,24,10,'#f0a35e');R(30,21-b,20,2+b,'#f0a35e');
  R(24,25,10,8,'#f0a35e');R(24,22,3,3,'#f0a35e');R(31,22,3,3,'#f0a35e');
  R(26,28,2,1,'#6b3f22');R(31,28,2,1,'#6b3f22');P(29,30,'#e57b7b');
  R(38,23,2,4,'#d98842');R(43,23,2,4,'#d98842');R(48,24,2,4,'#d98842');
  R(52,28,6,2,'#f0a35e');R(57,25,2,5,'#f0a35e');R(24,33,30,1,'#d9b78a');
  TL('z',34,17-(f%3),1,'#8a5a3a');TL('z',39,12-(f%3),2,'#8a5a3a');
  T('nap',60,5,2,'#8a5a3a');
 },
 fire:function(f){
  var i,h=10+(f%3);
  R(0,0,W,44,'#232a4d');R(0,34,W,10,'#3b3150');
  stars(14,'#fff6d6',f,26);
  for(i=0;i<h;i++){
    var hw=Math.round(5*Math.sin(Math.PI*(i+.5)/h)*(1-i/(h*1.6)));
    R(38-hw,34-i,hw*2+1,1,'#ff7a3d');
    if(i<h*.75){var h2=Math.round(hw*.62);R(38-h2,34-i,h2*2+1,1,'#ffb84d')}
    if(i<h*.5){var h3=Math.round(hw*.3);R(38-h3,34-i,h3*2+1,1,'#fff2a8')}
  }
  R(29,35,18,3,'#7a4a2b');R(32,33,12,2,'#935a33');
  for(i=0;i<4;i++){var sy=30-((f*2+i*5)%24),sx=38+(i%2?6:-6)+((i*7+f)%3)-1;if(sy>14)P(sx,sy,'#ffb84d')}
  T('fire',38,3,2,'#fff');
 },
 rain:function(f){
  var i,x,y;
  R(0,0,W,44,'#b9c6d6');R(0,0,W,14,'#9fb0c6');
  function cloud(a,b){R(a+2,b,10,2,'#e9eef5');R(a,b+2,14,3,'#e9eef5');R(a+4,b-1,5,1,'#e9eef5')}
  cloud(6+(f%2),4);cloud(34-(f%2),7);cloud(56+(f%2),3);
  R(0,36,W,8,'#6f819b');R(8,38,26,3,'#8fa3bf');R(0,36,W,1,'#5d6f89');
  for(i=0;i<28;i++){x=Math.floor(rnd(i,3)*W);y=(Math.floor(rnd(i,4)*30)+f*5)%30+10;P(x,y,'#eef5fc');P(x,y+1,'#cfdcec')}
  if(f%2){R(15,39,5,1,'#d6e2f2');R(24,39,4,1,'#d6e2f2')}else{R(17,39,6,1,'#d6e2f2');R(10,39,3,1,'#d6e2f2')}
  T('rain',38,19,2,'#fff');
 },
 snow:function(f){
  var i,x,top;
  R(0,0,W,44,'#26335c');R(0,0,W,12,'#1d2850');stars(10,'#cfd8ff',f,14);
  for(x=0;x<W;x++){top=31+Math.round(2*Math.sin(x/7));R(x,top,1,44-top,'#f2f6fb')}
  R(0,40,W,4,'#dfe8f5');
  disc(56,31,5,'#fff');disc(56,24,3,'#fff');
  P(55,23,'#26335c');P(57,23,'#26335c');P(56,25,'#ff8a3d');P(57,25,'#ff8a3d');
  P(56,29,'#26335c');P(56,32,'#26335c');R(50,29,3,1,'#7a4a2b');R(60,29,3,1,'#7a4a2b');
  R(53,19,7,1,'#e5566d');R(54,17,5,2,'#e5566d');
  for(i=0;i<26;i++){x=(Math.floor(rnd(i,7)*W)+((f+i)%3)-1+W)%W;var y=(Math.floor(rnd(i,8)*40)+f*2+i)%40;P(x,y,'#fff')}
  T('snow',24,10,2,'#fff');
 },
 sunset:function(f){
  var i,w,y;
  R(0,0,W,8,'#5b4b8a');R(0,8,W,7,'#a35c9a');R(0,15,W,6,'#e8707a');R(0,21,W,5,'#ff9a6b');R(0,26,W,5,'#ffc874');
  disc(38,27,9,'#fff0a8');
  R(0,31,W,13,'#3f4e87');R(0,31,W,1,'#6d7bb0');
  for(y=32,i=0;y<44;y+=2,i++){w=7-Math.floor(i*.6)+((f+i)%2);R(38-w,y,w*2+1,1,'#ffc874')}
  for(i=0;i<10;i++)if((f+i)%3)R(Math.floor(rnd(i,11)*W),33+Math.floor(rnd(i,12)*10),3,1,'#8fa0d6');
  var bx=(f*3)%90-6;P(bx,12,'#3b2f5c');P(bx+1,13,'#3b2f5c');P(bx+2,12,'#3b2f5c');
  var b2=(f*2+40)%90-6;P(b2,16,'#3b2f5c');P(b2+1,17,'#3b2f5c');P(b2+2,16,'#3b2f5c');
  T('dusk',38,2,2,'#fff');
 },
 space:function(f){
  var x,e,cy,yy,hw;
  R(0,0,W,44,'#0f1030');stars(34,'#fff',f,44);
  disc(12,9,3,'#cfd6ee');P(11,8,'#aab3d6');P(13,10,'#aab3d6');
  disc(54,23,9,'#e8a46a');
  for(yy=17;yy<=29;yy+=4){hw=Math.floor(Math.sqrt(Math.max(0,81-(yy-23)*(yy-23))));R(54-hw,yy,hw*2+1,1,'#c97a45')}
  for(x=-17;x<=17;x++){e=Math.round(3*Math.sqrt(Math.max(0,1-(x/17)*(x/17))));cy=23+Math.round(x*-.22);
   P(54+x,cy+e,'#f4d9a8');if(Math.abs(x)>9)P(54+x,cy-e,'#d9b988')}
  var rx=(f*4)%90-12;
  R(rx,13,8,3,'#fff');P(rx+8,14,'#f55');R(rx,12,2,1,'#f55');R(rx,16,2,1,'#f55');P(rx+4,14,'#5ab0ff');
  if(f%2)R(rx-3,14,3,1,'#ffb84d');else R(rx-2,14,2,1,'#ffd86b');
  T('space',22,34,2,'#fff');
 },
 coffee:function(f){
  var i;
  R(0,0,W,34,'#f4e4cf');R(0,34,W,10,'#b98a5e');R(0,34,W,1,'#9c7048');
  R(26,34,24,2,'#fff');R(28,36,20,1,'#e6dccd');
  R(29,22,18,12,'#fff');R(30,34,16,1,'#fff');R(29,29,18,1,'#ece3d4');
  R(30,22,16,2,'#7a4a2b');R(47,25,4,2,'#fff');R(50,25,2,6,'#fff');R(47,30,4,2,'#fff');
  for(i=0;i<3;i++){var sx=33+i*5;for(var k=0;k<9;k++){var o=Math.round(Math.sin((k+f*2+i*2)/2)*1.5);P(sx+o,20-k*2,'#cdbba3')}}
  disc(62,31,3,'#d9a05b');P(61,30,'#7a4a2b');P(63,31,'#7a4a2b');P(61,32,'#7a4a2b');
  heart(8,24-(f%2),'#e5566d');
  T('cafe',58,6,2,'#8a5a3a');
 },
 forest:function(f){
  var x,i,top;
  R(0,0,W,44,'#d8efd0');disc(12,9,4,'#fff3a8');
  for(x=0;x<W;x++){top=26+Math.round(3*Math.sin(x/8));R(x,top,1,44-top,'#9fd4a0')}
  R(0,38,W,6,'#5aa35e');
  function tree(a,h,c){R(a,44-7,2,7,'#6b4a2b');for(var j=0;j<h;j++){var hw=Math.floor(j/2)+1;R(a+1-hw,44-7-h+j,hw*2,1,c)}}
  tree(6,14,'#3f8f5a');tree(18,18,'#58a96b');tree(52,16,'#3f8f5a');tree(64,20,'#58a96b');tree(40,12,'#4a9d62');
  for(i=0;i<6;i++){var fx=Math.floor(rnd(i,13)*W)+Math.round(Math.sin((f+i*2)/2)*2),fy=18+Math.floor(rnd(i,14)*20)-((f+i)%2);if((f+i)%3)P(fx,fy,'#fff27a')}
  T('leaf',46,5,2,'#2f6f48');
 },
 sakura:function(f){
  var i;
  R(0,0,W,16,'#ffdbe6');R(0,16,W,28,'#ffeaf0');R(0,38,W,6,'#f7c6d3');
  R(10,16,3,28,'#7a4a3a');R(13,18,12,2,'#7a4a3a');R(5,24,6,2,'#7a4a3a');R(24,14,2,6,'#7a4a3a');
  var bl=[[8,12,6],[20,12,6],[28,18,5],[14,7,5],[4,19,4],[24,6,4]];
  for(i=0;i<bl.length;i++){disc(bl[i][0],bl[i][1],bl[i][2],i%2?'#ff94b0':'#ffb3c7');disc(bl[i][0]-1,bl[i][1]-1,Math.max(2,bl[i][2]-3),'#ffc9d8')}
  for(i=0;i<22;i++){var px=(Math.floor(rnd(i,9)*W)+Math.round(Math.sin((f+i)/2)*2)+f)%W,py=(Math.floor(rnd(i,10)*40)+f*2+i*3)%40;P(px,py,'#ff9ab5');if(i%3===0)P(px+1,py,'#ffc0d0')}
  T('sakura',52,27,2,'#e0587f');
 }
};
var SCENE_LIST=[['random','随机'],['mount','山峰'],['beach','海边'],['night','夜空'],['city','城市'],['cat','小猫'],['fire','篝火'],['rain','雨天'],['snow','雪夜'],['sunset','日落'],['space','太空'],['coffee','咖啡'],['forest','森林'],['sakura','樱花'],['zdy','彩蛋']];
var cur='mount',lastScene='',frame=0;
function pickScene(){
  if(CFG.scene==='zdy'||(CFG.scene!=='random'&&SCENES[CFG.scene])) return CFG.scene;
  if(Math.random()<0.07) return 'zdy';              // 随机模式下 7% 概率出彩蛋
  var pool=Object.keys(SCENES).filter(function(k){return k!=='zdy'&&k!==lastScene});
  return pool[Math.floor(Math.random()*pool.length)];
}
function draw(){cx.clearRect(0,0,W,H);SCENES[cur](frame)}

/* ---------- 设置面板：塞进「其他选项」二级页 ----------
   布局和「开屏封面」一致：一行带 > 的入口（右侧显示当前选择），点开是同风格的二级悬浮窗，里面一行行选项 + 对勾。 */
(function(){
  var CHECK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var css2=
    /* 入口行右侧的当前值（.qs-open 本体样式沿用开屏封面的） */
    'html body #qpop #pdOpen .pd-cur{margin-left:auto;margin-right:8px;font-size:14px;font-weight:500;opacity:.6;white-space:nowrap}'+
    'html body #qpop #pdOpen.off{opacity:.45}'+
    /* 二级窗口：材质 / 描边 / 投影 / 动效与 #saWin 完全一致 */
    '#pdWin{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;'+
      'padding:max(16px,env(safe-area-inset-top,0px)) 14px max(16px,env(safe-area-inset-bottom,0px));'+
      'visibility:hidden;pointer-events:none;color:#fff;transition:visibility 0s linear calc(.3s/var(--ui-spd,1))}'+
    '#pdWin.on{visibility:visible;pointer-events:auto;transition:visibility 0s}'+
    '#pdWin .pw-scrim{position:absolute;inset:0;background:rgba(0,0,0,.28);opacity:0;transition:opacity calc(.26s/var(--ui-spd,1)) ease}'+
    '#pdWin.on .pw-scrim{opacity:1}'+
    '#pdWin .pw-card{position:relative;display:flex;flex-direction:column;width:100%;max-width:440px;height:min(88%,780px);overflow:hidden;border-radius:24px;'+
      'background:var(--g-fill,rgba(255,255,255,.14));-webkit-backdrop-filter:var(--g-blur,blur(23px));backdrop-filter:var(--g-blur,blur(23px));'+
      'box-shadow:inset 0 0 0 1px rgba(255,255,255,.16),0 14px 34px rgba(0,0,0,.32);opacity:0;transform:translateY(12px) scale(.97);'+
      'transition:transform calc(.4s/var(--ui-spd,1)) cubic-bezier(.22,1,.36,1),opacity calc(.22s/var(--ui-spd,1)) ease}'+
    '#pdWin.on .pw-card{opacity:1;transform:none}'+
    '#pdWin .pw-head{flex:none;display:flex;align-items:center;justify-content:space-between;padding:16px 14px 8px 22px}'+
    '#pdWin .pw-tt{font-size:17px;font-weight:800}'+
    '#pdWin .pw-x{width:34px;height:34px;border:none;border-radius:50%;padding:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.12);color:inherit;cursor:pointer}'+
    '#pdWin .pw-x svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round}'+
    '#pdWin .pw-body{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;padding:12px 20px 26px}'+
    '#pdWin .pw-d,#pdWin .pw-tip{font-size:12px;line-height:1.55;color:var(--sub,rgba(255,255,255,.6))}'+
    '#pdWin .pw-d{margin:2px 4px 12px}#pdWin .pw-tip{margin:12px 4px 0}'+
    '#pdWin .pw-grp{border-radius:16px;background:rgba(255,255,255,.09);overflow:hidden}'+
    '#pdWin .pw-opt{position:relative;display:flex;align-items:center;gap:10px;width:100%;min-height:52px;padding:0 16px;border:none;background:transparent;color:inherit;font:inherit;font-size:15px;text-align:left;cursor:pointer}'+
    '#pdWin .pw-opt+.pw-opt::before{content:"";position:absolute;left:16px;right:0;top:0;height:1px;background:rgba(255,255,255,.1)}'+
    '#pdWin .pw-opt:active{background:rgba(255,255,255,.08)}'+
    '#pdWin .pw-opt span{flex:1}'+
    '#pdWin .pw-opt svg{width:18px;height:18px;flex:none;fill:none;stroke:#8fb0ff;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;opacity:0}'+
    '#pdWin .pw-opt.on{font-weight:700}#pdWin .pw-opt.on svg{opacity:1}'+
    /* 顶部预览：和暂停时的涂鸦卡片同款（白底 + 深色描边 + 硬阴影） */
    '#pdWin .pw-pvarea{flex:none;display:flex;justify-content:center;padding:6px 16px 18px;border-bottom:1px solid rgba(255,255,255,.14)}'+
    '#pdWin .pw-pv{position:relative;box-sizing:border-box;width:min(78%,300px);padding:8px;border-radius:22px;background:#fff;border:3px solid #1c2540;box-shadow:6px 6px 0 #1c2540;rotate:-1.5deg}'+
    '#pdWin .pw-pv canvas{display:block;width:100%;aspect-ratio:76/44;image-rendering:pixelated;border-radius:14px}'+
    '#pdWin .pw-pv .pw-egg{display:none;position:absolute;inset:8px;border-radius:14px;overflow:hidden;flex-direction:column;align-items:center;justify-content:center;gap:6px;'+
      'background:radial-gradient(120% 90% at 30% 20%,#5b97ff 0%,#2f63f0 45%,#0f2fa8 100%)}'+
    '#pdWin .pw-pv.egg canvas{visibility:hidden}#pdWin .pw-pv.egg .pw-egg{display:flex}'+
    '#pdWin .pw-egg .zh{font-size:34px;font-weight:800;line-height:1.1;letter-spacing:.08em;color:#fff;filter:drop-shadow(0 4px 12px rgba(30,90,255,.65))}'+
    '#pdWin .pw-egg .en{font-size:11px;font-weight:800;letter-spacing:.55em;padding-left:.55em;color:rgba(255,255,255,.92)}'+
    '@media (prefers-reduced-motion:reduce){#pdWin .pw-card,#pdWin .pw-scrim{transition:none}}';
  var s2=document.createElement('style'); s2.textContent=css2; document.head.appendChild(s2);
  var p2=document.getElementById('qpP2'); if(!p2) return;

  /* 「其他选项」里：开关 + 一行入口 + 说明 */
  var wrap=document.createElement('div'); wrap.id='pdSet';
  wrap.innerHTML=
    '<div class="qh" style="margin-top:14px"><b>暂停涂鸦页</b></div>'+
    '<div class="qg" style="margin-top:6px"><label class="chk"><input type="checkbox" id="pdOn"> 暂停时显示涂鸦页</label></div>'+
    '<button type="button" class="qs-open" id="pdOpen" aria-haspopup="dialog" aria-expanded="false"><span>涂鸦封面</span><span class="pd-cur" id="pdCur"></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>'+
    '<div class="qtip" id="pdTip"></div>';
  var anchor=document.getElementById('splashOpen');
  if(anchor&&anchor.parentNode===p2) p2.insertBefore(wrap,anchor); else p2.appendChild(wrap);
  var chk=wrap.querySelector('#pdOn'), openBtn=wrap.querySelector('#pdOpen'), cur=wrap.querySelector('#pdCur'), tip=wrap.querySelector('#pdTip');

  /* 二级悬浮窗（挂在 body 上，和 #saWin 同级） */
  var win=document.createElement('div'); win.id='pdWin'; win.setAttribute('aria-hidden','true');
  win.innerHTML=
    '<div class="pw-scrim" id="pdScrim"></div>'+
    '<div class="pw-card" role="dialog" aria-modal="true" aria-label="涂鸦封面">'+
      '<div class="pw-head"><span class="pw-tt">涂鸦封面</span><button type="button" class="pw-x" id="pdClose" aria-label="关闭"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'+
      '<div class="pw-pvarea"><div class="pw-pv" id="pdPv"><canvas width="76" height="44"></canvas><div class="pw-egg"><div class="zh"></div><div class="en"></div></div></div></div>'+
      '<div class="pw-body"><div class="pw-d">暂停播放时显示的涂鸦页画面</div>'+
        '<div class="pw-grp" id="pdList" role="radiogroup" aria-label="涂鸦封面">'+
          SCENE_LIST.map(function(x){return '<button type="button" class="pw-opt" data-v="'+x[0]+'" role="radio" aria-checked="false"><span>'+x[1]+'</span>'+CHECK+'</button>'}).join('')+
        '</div><div class="pw-tip" id="pdWinTip"></div></div>'+
    '</div>';
  document.body.appendChild(win);
  var list=win.querySelector('#pdList'), winTip=win.querySelector('#pdWinTip'), isOpen=false;

  /* 预览：把真正的场景函数画到预览画布上（临时借用 cx），选哪个就预览哪个；「随机」轮流播放各场景；彩蛋用静态蓝色卡片 */
  var pvBox=win.querySelector('#pdPv'), pvCv=pvBox.querySelector('canvas'), pvCx=pvCv.getContext('2d');
  pvBox.querySelector('.zh').textContent=EGG.zh; pvBox.querySelector('.en').textContent=EGG.en;
  var pvT=0, pvF=0, pvR=0;
  function pvKeys(){return SCENE_LIST.map(function(x){return x[0]}).filter(function(k){return k!=='random'&&k!=='zdy'&&SCENES[k]})}
  function pvRender(){
    var k=CFG.scene;
    if(k==='random'){var ks=pvKeys();k=ks[pvR%ks.length]}
    var egg=(k==='zdy'); pvBox.classList.toggle('egg',egg);
    if(egg||!SCENES[k]) return;
    var old=cx; cx=pvCx;
    try{pvCx.clearRect(0,0,W,H);SCENES[k](pvF)}catch(_){}
    cx=old;
  }
  function pvStop(){clearInterval(pvT);pvT=0}
  function pvStart(){
    pvStop(); pvF=0; pvR=0; pvRender();
    if(document.body.classList.contains('low-power')||document.body.classList.contains('performance-mode')) return;   /* 省电模式：只画静态一帧 */
    pvT=setInterval(function(){pvF++; if(CFG.scene==='random'&&pvF%6===0)pvR++; pvRender()},480);
  }

  function nameOf(v){return (SCENE_LIST.filter(function(x){return x[0]===v})[0]||['',''])[1]}
  function tipText(){return CFG.scene==='random'?'每次暂停随机换一张封面。':CFG.scene==='zdy'?'彩蛋：蓝色流光，固定显示这一张。':'每次暂停都显示「'+nameOf(CFG.scene)+'」。'}
  function paint(){
    chk.checked=CFG.on;
    cur.textContent=nameOf(CFG.scene);
    tip.textContent=winTip.textContent=tipText();
    openBtn.classList.toggle('off',!CFG.on);
    [].forEach.call(list.children,function(b){var o=b.getAttribute('data-v')===CFG.scene;b.classList.toggle('on',o);b.setAttribute('aria-checked',o?'true':'false')});
  }
  function openWin(){
    if(isOpen) return; isOpen=true; paint();
    document.body.classList.add('sa-open');                 /* 和开屏封面窗口一样：打开时让灵动岛 / 返回键 / 工具栏先让开 */
    win.classList.add('on'); win.setAttribute('aria-hidden','false'); openBtn.setAttribute('aria-expanded','true');
    pvStart();
  }
  function closeWin(){
    if(!isOpen) return; isOpen=false;
    var sa=document.getElementById('saWin');
    if(!(sa&&sa.classList.contains('on'))) document.body.classList.remove('sa-open');
    win.classList.remove('on'); win.setAttribute('aria-hidden','true'); openBtn.setAttribute('aria-expanded','false');
    pvStop();
  }
  openBtn.addEventListener('click',openWin);
  win.querySelector('#pdClose').addEventListener('click',closeWin);
  win.querySelector('#pdScrim').addEventListener('click',closeWin);
  document.addEventListener('keydown',function(e){if(isOpen&&e.key==='Escape')closeWin()});
  /* 窗口里的点按不要冒泡到外面，免得「其他选项」面板被当成点了空白处而收起 */
  ['pointerdown','mousedown','touchstart','click'].forEach(function(t){win.addEventListener(t,function(e){e.stopPropagation()})});

  chk.addEventListener('change',function(){CFG.on=chk.checked;saveCfg();paint();window.__pauseDoodle&&window.__pauseDoodle.refresh()});
  list.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.pw-opt'); if(!b) return;
    CFG.scene=b.getAttribute('data-v'); saveCfg(); paint(); pvStart(); window.__pauseDoodle&&window.__pauseDoodle.reshow();
  });
  paint();
})();

/* ---------- 彩蛋：蓝色流光画面，60fps（requestAnimationFrame 连续动画，不走像素逐帧） ---------- */
(function(){
  var css3=
  '#pdoodle.pd-egg .pd-logo,#pdoodle.pd-egg .pd-card,#pdoodle.pd-egg .pd-tag{display:none}'+
  '#pdoodle .pd-eg{display:none;position:relative;width:min(90vw,380px);aspect-ratio:1/1.08;border-radius:34px;overflow:hidden;'+
    'border:1px solid rgba(255,255,255,.38);box-shadow:0 26px 70px rgba(14,56,190,.55);transform:translateZ(0);isolation:isolate}'+
  '#pdoodle.pd-egg .pd-eg{display:block;animation:egIn .8s cubic-bezier(.2,.9,.3,1.15) both}'+
  '@keyframes egIn{from{opacity:0;transform:translateY(22px) scale(.94)}to{opacity:1;transform:none}}'+
  '#pdoodle .pd-eg canvas{position:absolute;inset:0;width:100%;height:100%;display:block}'+
  '#pdoodle .pd-eg .nm{position:absolute;left:0;right:0;top:41%;transform:translateY(-50%);text-align:center;'+
    'font-family:-apple-system,"PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif;filter:drop-shadow(0 6px 22px rgba(30,90,255,.65))}'+
  '#pdoodle .pd-eg .zh{display:flex;justify-content:center;gap:.12em;font-size:clamp(58px,21vw,88px);font-weight:800;line-height:1.1}'+
  '#pdoodle .pd-eg .zh span{display:inline-block;background:linear-gradient(105deg,#fff 0%,#fff 36%,#a9d4ff 50%,#fff 64%,#fff 100%);background-size:320% 100%;'+
    '-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;'+
    'animation:egRise .95s cubic-bezier(.2,.9,.25,1.2) both,egShine 3.8s ease-in-out infinite}'+
  '@keyframes egRise{from{opacity:0;transform:translateY(26px) scale(.8);filter:blur(6px)}to{opacity:1;transform:none;filter:blur(0)}}'+
  '@keyframes egShine{0%{background-position:130% 0}100%{background-position:-130% 0}}'+
  '#pdoodle .pd-eg .en{margin-top:14px;font-size:19px;font-weight:800;letter-spacing:.62em;padding-left:.62em;color:rgba(255,255,255,.92);animation:egFade 1.2s .5s ease both}'+
  '@keyframes egFade{from{opacity:0;letter-spacing:.2em}to{opacity:1;letter-spacing:.62em}}'+
  'body.low-power #pdoodle .pd-eg .zh span,body.performance-mode #pdoodle .pd-eg .zh span{animation:none;-webkit-text-fill-color:#fff}';
  var st3=document.createElement('style'); st3.textContent=css3; document.head.appendChild(st3);

  var box=root.querySelector('.pd-eg'), cv2=box.querySelector('canvas'), c=cv2.getContext('2d');
  var zh=box.querySelector('.zh'), en=box.querySelector('.en');
  EGG.zh.split('').forEach(function(ch,i){var sp=document.createElement('span');sp.textContent=ch;sp.style.animationDelay=(i*.14)+'s,'+(i*.4)+'s';zh.appendChild(sp)});
  en.textContent=EGG.en;

  var raf=0,t0=0,w=0,h=0,dpr=1,pts=null,sts=null,tries=0;
  function init(){
    var i; pts=[];sts=[];
    for(i=0;i<56;i++)pts.push({x:Math.random(),y:Math.random(),r:.8+Math.random()*3.2,v:.03+Math.random()*.07,ph:Math.random()*6.28,sw:.01+Math.random()*.02});
    for(i=0;i<24;i++)sts.push({x:Math.random(),y:Math.random()*.62,ph:Math.random()*6.28,r:.8+Math.random()*1.4});
  }
  function resize(){
    var W2=box.offsetWidth,H2=box.offsetHeight; if(!W2||!H2) return false;
    var d=Math.min(window.devicePixelRatio||1,2.5);
    if(W2!==w||H2!==h||d!==dpr){w=W2;h=H2;dpr=d;cv2.width=Math.round(w*d);cv2.height=Math.round(h*d)}
    return true;
  }
  function frame(t){
    var i,x,p,a;
    c.setTransform(dpr,0,0,dpr,0,0);
    var bg=c.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#0a1f5c');bg.addColorStop(.55,'#1b56d8');bg.addColorStop(1,'#59a9ff');
    c.fillStyle=bg;c.fillRect(0,0,w,h);
    c.globalCompositeOperation='lighter';                       // 流动的光斑
    for(i=0;i<3;i++){
      var ox=w*(.5+.32*Math.sin(t*.35+i*2.1)),oy=h*(.3+.18*Math.cos(t*.28+i*1.7)),rr=w*(.55+.1*i);
      var og=c.createRadialGradient(ox,oy,0,ox,oy,rr);og.addColorStop(0,'rgba(120,190,255,.34)');og.addColorStop(1,'rgba(120,190,255,0)');
      c.fillStyle=og;c.fillRect(0,0,w,h);
    }
    c.globalCompositeOperation='source-over';
    var cx0=w/2,cy0=h*.41,pu=1+.04*Math.sin(t*1.6);                // 名字背后的光球 + 向外扩散的涟漪
    var ob=c.createRadialGradient(cx0,cy0,0,cx0,cy0,w*.46*pu);ob.addColorStop(0,'rgba(190,225,255,.55)');ob.addColorStop(.45,'rgba(110,175,255,.22)');ob.addColorStop(1,'rgba(90,150,255,0)');
    c.fillStyle=ob;c.fillRect(0,0,w,h);
    for(i=0;i<3;i++){var ph=((t*.22+i/3)%1),rg=w*(.2+.62*ph);c.strokeStyle='rgba(255,255,255,'+(.32*(1-ph)).toFixed(3)+')';c.lineWidth=1.2;c.beginPath();c.arc(cx0,cy0,rg,0,6.2832);c.stroke()}
    for(i=0;i<sts.length;i++){                                  // 闪烁的十字星
      p=sts[i];a=.25+.75*Math.abs(Math.sin(t*1.3+p.ph));c.fillStyle='rgba(255,255,255,'+a.toFixed(2)+')';
      var sx=p.x*w,sy=p.y*h,L=p.r*2.2;c.fillRect(sx-L,sy-.45,L*2,.9);c.fillRect(sx-.45,sy-L,.9,L*2);
    }
    var sp=((t%6)/6)*1.8-.4,x0=w*sp,bw=w*.2;                      // 斜向扫光
    var lg=c.createLinearGradient(x0,0,x0+bw,0);lg.addColorStop(0,'rgba(255,255,255,0)');lg.addColorStop(.5,'rgba(255,255,255,.14)');lg.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=lg;c.beginPath();c.moveTo(x0,0);c.lineTo(x0+bw,0);c.lineTo(x0+bw-h*.3,h);c.lineTo(x0-h*.3,h);c.closePath();c.fill();
    for(i=0;i<pts.length;i++){                                  // 上升的气泡光点
      p=pts[i];var yy=(((p.y-t*p.v)%1)+1)%1*h,xx=(p.x+Math.sin(t*.7+p.ph)*p.sw*3)*w;
      a=.25+.5*Math.pow(Math.sin(t*1.5+p.ph),2);
      c.fillStyle='rgba(170,215,255,'+(a*.22).toFixed(3)+')';c.beginPath();c.arc(xx,yy,p.r*2.4,0,6.2832);c.fill();
      c.fillStyle='rgba(255,255,255,'+a.toFixed(2)+')';c.beginPath();c.arc(xx,yy,p.r*.9,0,6.2832);c.fill();
      if(p.r>2.4){c.strokeStyle='rgba(255,255,255,.45)';c.lineWidth=.8;c.beginPath();c.arc(xx,yy,p.r*1.5,0,6.2832);c.stroke()}
    }
    var cols=['rgba(150,205,255,.28)','rgba(95,165,255,.36)','rgba(45,115,240,.5)','rgba(12,58,190,.78)'];
    for(i=0;i<4;i++){                                           // 四层海浪
      c.beginPath();c.moveTo(0,h);
      var base=h*(.64+.07*i),A=8+i*4.5,k=(3.2+i*.9)*6.2832/w,s2=.55+i*.22;
      for(x=0;x<=w+5;x+=5)c.lineTo(x,base+Math.sin(x*k+t*s2+i*1.7)*A+Math.sin(x*k*2.3-t*s2*1.4)*A*.35);
      c.lineTo(w,h);c.closePath();c.fillStyle=cols[i];c.fill();
    }
  }
  function loop(ts){raf=requestAnimationFrame(loop);frame((ts-t0)/1000)}
  function stop(){if(raf){cancelAnimationFrame(raf);raf=0}}
  function start(){
    stop(); if(!pts) init();
    if(!resize()){ if(tries++<30) raf=requestAnimationFrame(function(){raf=0;start()}); return }
    tries=0;
    if(document.body.classList.contains('low-power')||document.body.classList.contains('performance-mode')){frame(2);return}   // 省电模式：只画静态一帧
    raf=requestAnimationFrame(function(ts){t0=ts;loop(ts)});
  }
  window.addEventListener('resize',function(){if(raf&&resize()){}});
  window.__pdEgg={start:start,stop:stop};
})();

/* ---------- 歌曲信息 ---------- */
var manual=null;
function pick(sel){var e=document.querySelector(sel);return e&&e.textContent.trim()}
function readInfo(){
  if(manual) return manual;
  var t='',a='';
  try{var m=navigator.mediaSession&&navigator.mediaSession.metadata; if(m){t=m.title||'';a=m.artist||''}}catch(_){}
  if(!t) t=pick('[data-song-title]')||pick('#songTitle')||pick('#title')||pick('.song-title')||'';
  if(!a) a=pick('[data-song-artist]')||pick('#songArtist')||pick('#artist')||pick('.song-artist')||'';
  if(!t){var d=(document.title||'').trim(); t=d}
  return {title:t,artist:a};
}
function paintInfo(){
  var i=readInfo();
  if(cur==='zdy') return;
  elT.textContent=i.title||'已暂停'; elA.textContent=i.artist||'';
}

/* ---------- 显隐逻辑 ---------- */
var timer=0, tick=0, on=false;
function hasSong(){return !!(audio.currentSrc||audio.src)}
function want(){return CFG.on&&audio.paused&&hasSong()}
function startAnim(){
  clearInterval(tick); window.__pdEgg.stop();
  if(cur==='zdy'){window.__pdEgg.start();return}
  tick=setInterval(function(){
    if(document.body.classList.contains('low-power')||document.body.classList.contains('performance-mode')) return;
    frame++;draw()},480);
}
function stopAnim(){clearInterval(tick);window.__pdEgg.stop()}
function show(){
  applyAccent();cur=pickScene();lastScene=cur;
  root.classList.toggle('pd-egg',cur==='zdy');
  paintInfo();frame=0;if(cur!=='zdy')draw();
  startAnim();
}
function setOn(v){
  if(v===on) return; on=v;
  document.body.classList.toggle('pd-on',v);
  if(v) show(); else stopAnim();
}
function sync(){clearTimeout(timer); timer=setTimeout(function(){setOn(want())},120)} // 去抖：切歌时会先 pause 再 play
['pause','ended','emptied','play','playing','loadedmetadata','loadstart','durationchange'].forEach(function(ev){audio.addEventListener(ev,sync)});
document.addEventListener('visibilitychange',function(){if(document.hidden)stopAnim();else if(on)startAnim()});
setInterval(function(){if(want()!==on) sync()},1500); // 兜底：防止应用自己改 audio 状态时漏事件
sync();


/* ---------- 恢复播放 / 拖动后的音频重新对齐 ----------
   iOS WebView 里用 Blob 播放的音频，暂停再继续或 seek 之后，实际出声位置可能和 currentTime 差零点几~一秒，
   而歌词是按 currentTime 走的，于是“声音和歌词对不上”。
   做法：每次继续播放时，显式对 currentTime 再 seek 一次（暂停点 / 拖动后的位置），让解码器重新对齐。
   用户自己 seek（拖时间轴、点歌词）则以新位置为准。 */
var g={at:-1,src:'',user:false,fixing:false,tu:0,tuW:0,ft:0};
function rebase(){g.tu=audio.currentTime;g.tuW=performance.now()}
function resync(){
  if(audio.ended||g.fixing||audio.currentSrc!==g.src&&g.at>=0) return;
  var t=(g.at>=0&&!g.user)?g.at:audio.currentTime;
  if(!(t>0.05)) return;                       // 刚开始播的新歌不动
  g.fixing=true; clearTimeout(g.ft);
  g.ft=setTimeout(function(){g.fixing=false;rebase()},500);   // 兜底：seeked 没触发也会解锁
  try{audio.currentTime=t}catch(_){g.fixing=false}
}
audio.addEventListener('seeked',function(){ if(g.fixing){g.fixing=false;clearTimeout(g.ft)} rebase() });
audio.addEventListener('timeupdate',function(){ if(!audio.paused&&!g.fixing) rebase() });
audio.addEventListener('pause',function(){
  if(audio.ended||audio.seeking) return;
  var est=g.tuW?g.tu+(performance.now()-g.tuW)/1000*(audio.playbackRate||1):audio.currentTime;
  g.at=Math.min(audio.currentTime,est); g.src=audio.currentSrc; g.user=false;
});
/* 外部 seek（拖时间轴、点歌词、切歌…）：以新位置为准 */
audio.addEventListener('seeking',function(){ if(!g.fixing){g.user=true;g.at=-1} });
audio.addEventListener('loadstart',function(){ g.at=-1; g.tuW=0; g.user=false });
audio.addEventListener('play',function(){ rebase(); resync(); });

window.__pauseDoodle={
  setInfo:function(i){manual=i||null;if(on)paintInfo()},
  refresh:function(){if(on)paintInfo();sync()},
  reshow:function(){ if(on) show() }
};
})();
