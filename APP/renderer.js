// app/renderer.js — 舞台渲染、动效面板
var LIVE=true,dirty=0,eIn="cubic-bezier(.2,.8,.2,1)",eOut="cubic-bezier(.4,0,.8,.3)",CF=[],shownSig="",statT=0,skyT=0,sonnetOn=false,sonnetKillT=0,
    glOn=null,glKillT=0,glTok=0,GLM={sonnet:1,tempera:1,lumiere:1,partita:1};   // GL 引擎风格：同一时刻最多一个（glOn = 当前显示的引擎名）
/* 把「凝彩」登记进风格列表：放在「商籁」同一个列表里、紧跟其后（chips / 下拉都在下面几行才建，所以必须在这里先插）。
   core.js 不动：这里按 id 找到商籁所在的列表；找不到就放进最后一个存在的列表。图标沿用商籁的。 */
(function(){
  try{
    var lists=[typeof STY!=="undefined"?STY:null,typeof STY2!=="undefined"?STY2:null,typeof STY3!=="undefined"?STY3:null,typeof STY4!=="undefined"?STY4:null].filter(Boolean);
    var has=false,host=null,pos=-1,label="凝彩";
    lists.forEach(function(L){L.forEach(function(e,i){if(e[0]==="tempera")has=true;if(e[0]==="sonnet"){host=L;pos=i}})});
    if(has)return;
    var sonnetLabel=host?host[pos][1]:null;
    if(host)host.splice(pos+1,0,["tempera",label]);else if(lists.length)lists[lists.length-1].push(["tempera",label]);
    if(typeof FX_IC!=="undefined"&&FX_IC&&!FX_IC[label]&&sonnetLabel&&FX_IC[sonnetLabel])FX_IC[label]=FX_IC[sonnetLabel];
  }catch(e){console.warn("register tempera style failed",e)}
})();
/* register lumiere right after tempera in the same style list */
(function(){
  try{
    var lists=[typeof STY!=="undefined"?STY:null,typeof STY2!=="undefined"?STY2:null,typeof STY3!=="undefined"?STY3:null,typeof STY4!=="undefined"?STY4:null].filter(Boolean);
    var has=false,host=null,pos=-1,label="绘光",tLabel=null;
    lists.forEach(function(L){L.forEach(function(e,i){if(e[0]==="lumiere")has=true;if(e[0]==="tempera"){host=L;pos=i;tLabel=e[1]}})});
    if(has)return;
    if(host)host.splice(pos+1,0,["lumiere",label]);else if(lists.length)lists[lists.length-1].push(["lumiere",label]);
    if(typeof FX_IC!=="undefined"&&FX_IC&&!FX_IC[label]&&tLabel&&FX_IC[tLabel])FX_IC[label]=FX_IC[tLabel];
  }catch(e){console.warn("register lumiere style failed",e)}
})();
/* register partita (云阶) right after lumiere in the same style list */
(function(){
  try{
    var lists=[typeof STY!=="undefined"?STY:null,typeof STY2!=="undefined"?STY2:null,typeof STY3!=="undefined"?STY3:null,typeof STY4!=="undefined"?STY4:null].filter(Boolean);
    var has=false,host=null,pos=-1,label="云阶",lLabel=null;
    lists.forEach(function(L){L.forEach(function(e,i){if(e[0]==="partita")has=true;if(e[0]==="lumiere"){host=L;pos=i;lLabel=e[1]}})});
    if(has)return;
    if(host)host.splice(pos+1,0,["partita",label]);else if(lists.length)lists[lists.length-1].push(["partita",label]);
    if(typeof FX_IC!=="undefined"&&FX_IC&&!FX_IC[label]&&lLabel&&FX_IC[lLabel])FX_IC[label]=FX_IC[lLabel];
  }catch(e){console.warn("register partita style failed",e)}
})();
/* group-two style icons (distinct per engine); keyed by id so label changes do not matter */
(function(){
  try{
    var IC={
      sonnet:'<path d="M12 7c-2-1.6-5-2-8-1.5v12c3-.5 6-.1 8 1.5 2-1.6 5-2 8-1.5v-12c-3-.5-6-.1-8 1.5z"/><path d="M12 7v12"/>',
      tempera:'<path d="M12 3.5c3.6 4.3 6 7.1 6 10.3a6 6 0 0 1-12 0c0-3.2 2.4-6 6-10.3z"/><path d="M9 14.2a3 3 0 0 0 2.3 2.8"/>',
      lumiere:'<circle cx="12" cy="12" r="3.5"/><path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2L18 18M18 6l-1.8 1.8M7.8 16.2L6 18"/>',
      partita:'<path d="M4 19h4v-4h4v-4h4V7h4"/><path d="M4 19h16" opacity=".4"/>'
    };
    if(typeof FX_IC==="undefined"||!FX_IC)return;
    [typeof STY!=="undefined"?STY:null,typeof STY2!=="undefined"?STY2:null,typeof STY3!=="undefined"?STY3:null,typeof STY4!=="undefined"?STY4:null].forEach(function(L){
      if(L)L.forEach(function(e){if(IC[e[0]])FX_IC[e[1]]=IC[e[0]]})
    });
  }catch(e){console.warn("style icons failed",e)}
})();
function cfgOf(i){return CF[i]||{}}
function markStyles(){[$("styles"),$("styles2"),$("styles3")].forEach(function(box,b){var L=b===2?STY3:b?STY2:STY;[].forEach.call(box.children,function(c,i){c.classList.toggle("on",L[i][0]===style)})})}
function setStyle(v){
  if(v===style||!LIVE||!window.StyleFX){style=v;idx=0;prog=0;reqRender();markStyles();return}   // 原逻辑：同风格重点 / 手动刷新模式 / 过渡模块未加载
  style=v;markStyles();syncBoxes();                          // 立刻反馈：chip 选中态、下拉文字、参数面板开合
  StyleFX.swap(function(){idx=0;prog=0;reqRender()});       // 旧内容通用退场 → 提交真正的切换 → 新内容升起淡入
}
chips($("styles"),STY,function(){return style},setStyle);
chips($("styles2"),STY2,function(){return style},setStyle);
chips($("styles3"),STY3,function(){return style},setStyle);
chips($("themes"),THEMES.map(function(t,i){return [i,t[0]]}),function(){return theme},function(v){theme=v;applyPreset(v);reqBg(true)});
chips($("bgm"),[["grad","混色渐变"],["solid","纯色"],["img","自选图片"]],function(){return bgMode},function(v){bgMode=v;$("gbox").classList.toggle("hide",v!=="grad");$("solidbox").classList.toggle("hide",v!=="solid");$("ibox").classList.toggle("hide",v!=="img");reqBg(true)});
glide($("styles"));glide($("styles2"));glide($("styles3"));glide($("bgm"));
/* ---- 动效风格下拉：两组并排，共用一个弹层（GNAMES 里改组名） ---- */
(function(){
  var GNAMES=["经典","光影"],GB={sonnet:1,tempera:1,lumiere:1,partita:1},EN={sonnet:"Sonnet",tempera:"Tempera",lumiere:"Lumiere",partita:"Partita"};
  var GICON=['<path d="M12 4l8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4"/>','<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15v5M16.5 17.5h5"/>'];

  var AN={
    scatter:'<rect class="a-sc" style="--x:-3px;--y:-3px;--r:-14deg" x="4.5" y="4.5" width="6" height="6" rx="1.4"/><rect class="a-sc" style="--x:3px;--y:-3px;--r:14deg" x="13.5" y="4.5" width="6" height="6" rx="1.4"/><rect class="a-sc" style="--x:-3px;--y:3px;--r:14deg" x="4.5" y="13.5" width="6" height="6" rx="1.4"/><rect class="a-sc" style="--x:3px;--y:3px;--r:-14deg" x="13.5" y="13.5" width="6" height="6" rx="1.4"/>',
    pan:'<path d="M3 5v14M21 5v14" opacity=".4"/><g class="a-pan"><rect x="7" y="7.5" width="10" height="9" rx="2"/><circle cx="12" cy="12" r="1.5"/></g>',
    star:'<path class="a-tw" d="M11 5l1.7 4.4 4.6.4-3.5 3 1.1 4.5L11 14.9 7.1 17.3l1.1-4.5-3.5-3 4.6-.4z"/><path class="a-bl" d="M19 3.5v5M16.5 6h5"/>',
    fade:'<circle class="a-f1" cx="9.3" cy="12" r="5.6"/><circle class="a-f2" cx="14.7" cy="12" r="5.6"/>',
    type:'<path class="a-ty a-ty1" d="M5 7.5h12"/><path class="a-ty a-ty2" d="M5 12h14"/><path class="a-ty a-ty3" d="M5 16.5h7"/><path class="a-cr" d="M15 14.5v4"/>',
    poster:'<rect class="a-pb1" x="4" y="4" width="9" height="9" rx="1.6"/><circle cx="17.5" cy="7" r="2.4"/><path class="a-pb3" d="M4 17h12M4 20.5h8"/>',
    bounce:'<circle class="a-bn" cx="12" cy="6.5" r="3"/><path class="a-bs" d="M8 20h8"/><path d="M5 20.5h14" opacity=".35"/>',
    flip:'<rect class="a-fl" x="6.5" y="4.5" width="11" height="15" rx="2.2"/><path d="M12 9v6" opacity=".5"/>',
    focus:'<circle cx="12" cy="12" r="2.3"/><path class="a-fc" d="M4 9V4.5h4.5M20 9V4.5h-4.5M4 15v4.5h4.5M20 15v4.5h-4.5"/>',
    wave:'<path class="a-w1" d="M3 9.5c3-4 6-4 9 0s6 4 9 0"/><path class="a-w2" d="M3 15.5c3-4 6-4 9 0s6 4 9 0"/>',
    glitch:'<rect class="a-gl1" x="6" y="6" width="12" height="12" rx="2.2" opacity=".55"/><rect class="a-gl2" x="6" y="6" width="12" height="12" rx="2.2"/><path d="M9 12h6" opacity=".7"/>',
    sonnet:'<path d="M12 7c-2-1.6-5-2-8-1.5v12c3-.5 6-.1 8 1.5"/><path class="a-pg" d="M12 7c2-1.6 5-2 8-1.5v12c-3-.5-6-.1-8 1.5"/><path d="M12 7v12"/>',
    tempera:'<g class="a-dr"><path d="M12 3.5c3.6 4.3 6 7.1 6 10.3a6 6 0 0 1-12 0c0-3.2 2.4-6 6-10.3z"/><path d="M9 14.2a3 3 0 0 0 2.3 2.8"/></g>',
    lumiere:'<circle class="a-sun" cx="12" cy="12" r="3.5"/><path class="a-rs" d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2L18 18M18 6l-1.8 1.8M7.8 16.2L6 18"/>',
    partita:'<path d="M4 19h4v-4h4v-4h4V7h4"/><path d="M4 19h16" opacity=".4"/><circle class="a-st" cx="6" cy="17.3" r="1.5" fill="currentColor" stroke="none"/>',
    _g0:'<path class="a-ly1" d="M12 4l8 4-8 4-8-4z"/><path class="a-ly2" d="M4 12l8 4 8-4M4 16l8 4 8-4"/>',
    _g1:'<path class="a-tw" d="M11 5l1.7 4.4 4.6.4-3.5 3 1.1 4.5L11 14.9 7.1 17.3l1.1-4.5-3.5-3 4.6-.4z"/><path class="a-bl" d="M19 14v6M16 17h6"/>'
  };
  /* 优先用带动画的图标（按 id）；没有的退回 FX_IC（静态，包一层轻微浮动 .fb）；都没有就用该组默认图标 */
  function svgFor(id,label,gi){
    var a=id&&AN[id];
    if(a)return{h:'<svg viewBox="0 0 24 24" class="ai">'+a+'</svg>',fb:false};
    var f=label&&typeof FX_IC!=="undefined"&&FX_IC&&FX_IC[label];
    if(f)return{h:'<svg viewBox="0 0 24 24">'+f+'</svg>',fb:true};
    return{h:'<svg viewBox="0 0 24 24" class="ai">'+AN[gi?"_g1":"_g0"]+'</svg>',fb:false};
  }
  var AV={sonnet:typeof sonnetOK==="function"?sonnetOK:null,tempera:typeof temperaOK==="function"?temperaOK:null,lumiere:typeof lumiereOK==="function"?lumiereOK:null,partita:typeof partitaOK==="function"?partitaOK:null};
  var pop=$("stylePop"),first=pop.firstChild,ALL=STY.concat(STY2,STY3,STY4),WIDE={};
  STY3.forEach(function(e){WIDE[e[0]]=1});
  var sel2=$("styleSel2"),two=!!sel2;
  var GROUPS=two?[
    {name:GNAMES[0],sel:$("styleSel"),tx:$("styleSelTx"),list:ALL.filter(function(e){return!GB[e[0]]}),allWide:false},
    {name:GNAMES[1],sel:sel2,tx:$("styleSelTx2"),list:ALL.filter(function(e){return GB[e[0]]}),allWide:true}
  ]:[
    {name:"动画样式",sel:$("styleSel"),tx:$("styleSelTx"),list:ALL,allWide:false}
  ];
  if(!two)ALL.forEach(function(e){if(GB[e[0]])WIDE[e[0]]=1});
  var hd=document.createElement("div");hd.className="dd-h";hd.style.display="flex";
  var tt=document.createElement("b");tt.className="dd-t";tt.textContent=GROUPS[0].name;hd.appendChild(tt);
  pop.insertBefore(hd,first);pop.classList.add("rich");
  var cur=null;
  function avail(id){var f=AV[id];return !f||!!f()}
  GROUPS.forEach(function(g,gi){
    var grid;
    if(gi===0)grid=first;else{grid=document.createElement("div");grid.className="sp-grid";pop.appendChild(grid)}
    g.grid=grid;g.btns=[];g.si=document.createElement("span");g.si.className="si";g.si.setAttribute("aria-hidden","true");g.icon="";
    if(g.tx&&g.tx.parentNode===g.sel)g.sel.insertBefore(g.si,g.tx);else g.sel.insertBefore(g.si,g.sel.firstChild);
    var sepDone=false;
    g.list.forEach(function(e){var b=document.createElement("button");b.type="button";b.setAttribute("role","option");b.setAttribute("aria-selected","false");
      var ic=document.createElement("i");ic.className="ic";var rs=svgFor(e[0],e[1],gi);ic.innerHTML=rs.h;if(rs.fb)ic.classList.add("fb");b.appendChild(ic);
      var sp=document.createElement("span"),en=EN[e[0]];
      if(en){sp.appendChild(document.createTextNode(e[1].replace(/\s*[（(].*[）)]\s*$/,"")+" "));var em=document.createElement("em");em.className="en";em.textContent="("+en+")";sp.appendChild(em)}else sp.textContent=e[1];   // 光影组：中文名 + (English)，四行同一格式
      b.appendChild(sp);
      if(g.allWide||WIDE[e[0]]){b.classList.add("wide");if(!g.allWide&&!sepDone){sepDone=true;var d=document.createElement("div");d.className="dd-sep";grid.appendChild(d)}}
      b.onclick=function(ev){ev.stopPropagation();if(!avail(e[0]))return;setStyle(e[0]);close()};grid.appendChild(b);g.btns.push(b)});
    function fade(){var t=grid.scrollTop>2,bt=grid.scrollTop+grid.clientHeight<grid.scrollHeight-2;
      grid.style.setProperty("--ft",t?"18px":"0px");grid.style.setProperty("--fb",bt?"18px":"0px")}
    g.fade=fade;grid.addEventListener("scroll",fade,{passive:true});
  });
  document.body.appendChild(pop);
  function label(){
    GROUPS.forEach(function(g,gi){
      var hit=-1;for(var i=0;i<g.list.length;i++)if(g.list[i][0]===style){hit=i;break}
      g.btns.forEach(function(b,j){var on=j===hit;b.classList.toggle("on",on);b.setAttribute("aria-selected",on?"true":"false");
        var ok=avail(g.list[j][0]);b.classList.toggle("na",!ok);if(ok)b.removeAttribute("aria-disabled");else b.setAttribute("aria-disabled","true")});
      g.sel.classList.toggle("is-on",hit>=0);
      var t=hit>=0?g.list[hit][1]:g.name;if(g.tx&&g.tx.textContent!==t)g.tx.textContent=t;
      var rs=hit>=0?svgFor(g.list[hit][0],g.list[hit][1],gi):svgFor(null,null,gi);
      if(rs.h!==g.icon){g.icon=rs.h;g.si.innerHTML=rs.h;g.si.classList.toggle("fb",rs.fb)}
      g.sel.setAttribute("aria-label",g.name+(hit>=0?"："+g.list[hit][1]:""));
    });
  }
  function place(g,keepScroll){
    var pw=Math.min(272,window.innerWidth-24);
    pop.style.width=pw+"px";
    PopFX.place(pop,g.sel,{inner:g.grid,maxH:440,width:pw});
    if(keepScroll!==true){var on=g.grid.querySelector("button.on");g.grid.scrollTop=on?Math.max(0,on.offsetTop-g.grid.clientHeight/2+on.offsetHeight/2):0}
    g.fade();
  }
  function open(g){
    label();cur=g;
    GROUPS.forEach(function(o){o.grid.style.display=o===g?"":"none";o.sel.setAttribute("aria-expanded",o===g?"true":"false")});
    tt.textContent=g.name;
    place(g);
    if(!pop.classList.contains("show"))PopFX.show(pop);
  }
  function close(){
    GROUPS.forEach(function(o){o.sel.setAttribute("aria-expanded","false")});
    cur=null;
    if(pop.classList.contains("show"))PopFX.hide(pop);
  }
  GROUPS.forEach(function(g){
    g.sel.addEventListener("click",function(e){e.stopPropagation();if(pop.classList.contains("show")&&cur===g)close();else open(g)});
  });
  document.addEventListener("pointerdown",function(e){
    if(!pop.classList.contains("show")||pop.contains(e.target))return;
    for(var i=0;i<GROUPS.length;i++)if(GROUPS[i].sel.contains(e.target))return;
    close();
  },true);
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&pop.classList.contains("show"))close()});
  var _rz=0;window.addEventListener("resize",function(){if(_rz||!cur||!pop.classList.contains("show"))return;_rz=requestAnimationFrame(function(){_rz=0;if(cur&&pop.classList.contains("show"))place(cur,true)})});
  document.addEventListener("scroll",function(e){if(pop.classList.contains("show")&&!pop.contains(e.target))close()},true);
  var _ms=markStyles;markStyles=function(){_ms();label()};
  label();
})();

function applyLayout(){
  var fx={left:"flex-start",center:"center",right:"flex-end"},fy={top:"flex-start",center:"center",bottom:"flex-end"};
  var set=function(k,v){stage.style.setProperty(k,v)};
  set("--ta",LY.a);set("--jc",fx[LY.a]);set("--ai",fy[LY.v]);
  set("--py",LY.v==="center"?"0px":"28px");
  set("--px",$("lyPad").value+"px");
  set("--fw",String($("lyFw").value*100));
  set("--lhm",($("lyLh").value/100).toFixed(2));
  set("--wb",LY.w==="fill"?"break-all":"normal");
  stage.dataset.wrap=LY.w;
}
function sec(){return (11-$("speed").value)*0.6}
function lh(){return Math.round($("size").value*2.1)}

function render(){
  applyItems();
  stage.style.setProperty("--hl",$("fg").value);
  stage.style.setProperty("--aspd", ASPD);
  stage.style.setProperty("--tc",$("tc").value);
  stage.style.setProperty("--sw",$("sw").value+"px");stage.style.setProperty("--sc",$("sc").value);
  stage.style.setProperty("--po",(+$("sw").value>0)?"stroke fill":"normal");
  var sh=+$("shd").value,rg=+($("rgb")?$("rgb").value:0)||0,tp=[];
  /* RGB 分离：红、青两层左右错开的实色阴影，叠在普通阴影之上，与阴影 / 描边互相独立 */
  if(rg>0)tp.push((-rg).toFixed(1)+"px 0 0 rgba(255,0,60,.9)",rg.toFixed(1)+"px 0 0 rgba(0,229,255,.9)");
  if(sh)tp.push("0 2px "+(sh*.24).toFixed(1)+"px rgba(0,0,0,"+Math.min(.95,.35+sh*.006).toFixed(2)+")","0 0 "+(sh*.1).toFixed(1)+"px rgba(0,0,0,.6)");
  stage.style.setProperty("--tsh",tp.length?tp.join(","):"0 0 0 transparent");
  stage.style.setProperty("--fs",$("size").value+"px");
  stage.style.setProperty("--fs2",Math.round($("size").value*1.7)+"px");
  stage.style.setProperty("--lh",lh()+"px");
  applyLayout();
  stage.classList.toggle("paused",!playing);stage.classList.toggle("gtext",$("gtext").checked);
  one.innerHTML="";cur=null;wx=0;wy=0;panGen++;one.style.transition="none";one.style.transform="none";one.style.filter="";
  syncBoxes();
  if(!sky.children.length)buildSky();
  update();
}

/* 出场时间选项：视频节奏 / 随机 / 自定义 */
function pdMarkSeg(boxId,hid,list){
  var b=$(boxId);if(!b)return;
  if(!b.children.length)list.forEach(function(e){var c=document.createElement("button");c.className="chip";c.textContent=e[1];c.onclick=function(){$(hid).value=e[0];pdSync();renderRaf()};b.appendChild(c)});
  [].forEach.call(b.children,function(c,i){c.classList.toggle("on",list[i][0]===$(hid).value)});
}
function pdSync(){
  if(!$("pdT"))return;
  pdMarkSeg("pdTs","pdT",[["0","视频节奏"],["1","随机"],["2","自定义"]]);
  pdMarkSeg("pdOs","pdO",[["0","顺序"],["1","倒序"],["2","大字优先"]]);
  $("pdCustom").classList.toggle("hide",$("pdT").value!=="2");
}
/* ---- 开屏 / 停在开头时，舞台显示「当前歌曲名」，而不是第一句歌词的第一个字 ---- */
var shownIdle=false,shownTitle="";
function songTitleText(){
  var el=document.getElementById("miT")||document.getElementById("musicPanelTitle");
  var t=el?(el.textContent||"").trim():"";
  return(!t||t==="—"||t==="暂无播放歌曲")?"":t;
}
function titleIdle(){
  if(typeof AUDIO_ON==="undefined"||!AUDIO_ON||typeof audio==="undefined"||!audio)return false;
  return idx===0&&audio.paused&&(audio.currentTime||0)<0.3&&!!songTitleText();
}
function titleSync(){
  if(typeof update!=="function"||typeof LN==="undefined"||!LN.length)return;
  var now=titleIdle(),t=now?songTitleText():"";
  if(now!==shownIdle||(now&&t!==shownTitle))update();
}
function update(){
  var tIdle=titleIdle(),m=modeOf(idx),pan=m==="pan",cfg=cfgOf(idx),dur=secOf(idx),text=tIdle?songTitleText():LN[idx];
  shownIdle=tIdle;shownTitle=tIdle?text:"";
  if(tIdle)dur=Math.max(dur,4);   // 歌名要停留，别按第一句只有 0.1 秒的时长来播动画
  if(glOn&&!GLM[m])glLeave();               // 离开 GL 风格（回到 DOM 风格）
if(m!=="poster"){ [].forEach.call(one.children,function(c){ if(c.classList&&(c.classList.contains("vig")||c.classList.contains("noise")))c.remove(); }); }
  if(cur){
    /* 切句前：如果旧 box 是海报排版，把它的当前 cam 位置存到交接对象，
       新句的 buildPoster 会从这里继续，镜头跨句不重置。 */
    if(cur._posterCamSnapshot){
      try{
        var snap = cur._posterCamSnapshot();
        window.__posterCam.x = snap.x;
        window.__posterCam.y = snap.y;
        window.__posterCam.vx = snap.vx;
        window.__posterCam.vy = snap.vy;
      }catch(_){}
    }
    var o=cur;
    if(o._posterCamCleanup)try{o._posterCamCleanup()}catch(_){}
    // 逐字歌词的已点亮字符必须先完成入场动画，再启动整句退场。
    var _retireWait=o._kara?Math.max(0,(o._kDoneAt||0)-performance.now()+50):0;
    function _retireOld(){
      if(!o.isConnected)return;
      o.classList.add("out");
      if(!pan){var _outs=one.querySelectorAll(".one.out");if(_outs.length>2)_outs[0].remove()}
      if(!pan)setTimeout(function(){o.remove()},o.classList.contains("m-poster")?900:1800);
    }
    if(_retireWait>0)setTimeout(_retireOld,_retireWait);else _retireOld();
  }
  if(!pan&&(wx||wy||(one.style.transform&&one.style.transform!=="none"))){panGen++;one.style.transition="none";one.style.transform="none";one.style.filter="";wx=0;wy=0}
  if(GLM[m]){                        // 商籁 / 凝彩自己画整首歌：这里不建 DOM 文字，只保证画布已显示
    [].forEach.call(one.querySelectorAll(".one"),function(c){c.remove()});   // 进入 GL 风格：旧 DOM 文字立刻清掉，不留 1.8s 淡出尾巴（否则切换时会闪一下文字）
    glEnter(m);skyShow(false);
    cur=null;curMode=m;shown=text;shownSig=sigOf(idx);paintStat(true);
    return;
  }
  var box=document.createElement("div");
  box.className="one "+({scatter:"m-scatter",star:"m-star",pan:"m-scatter m-pan",fade:"m-fade",type:"m-type",bounce:"m-bounce",flip:"m-flip",focus:"m-focus",wave:"m-wave",glitch:"m-glitch",poster:"m-poster"})[m];
  if(cfg.color){box.classList.add("cc");box.style.setProperty("--tc",cfg.color)}
  if(cfg.size)box.style.setProperty("--fs2",Math.round(cfg.size*1.7)+"px");
  if(m==="scatter"||pan){box.style.setProperty("--ein",eIn);box.style.setProperty("--eout",eOut)}
  if(m==="fade")box.style.setProperty("--fade",($("fadeT").value/100).toFixed(2)+"s");
  if(m==="type"&&!$("caret").checked)box.classList.add("nocaret");
  if(FXM[m])box.style.setProperty("--k",($("fxK").value/100).toFixed(2));
  if(pan&&cur){var W=stage.clientWidth,H=stage.clientHeight,ang=Math.random()*6.2832,dist=Math.max(W,H)*0.75*($("pdist").value/100)*(0.7+Math.random()*0.6);wx+=Math.cos(ang)*dist;wy+=Math.sin(ang)*dist}
  if(pan)box.style.transform="translate("+wx.toFixed(0)+"px,"+wy.toFixed(0)+"px)";
  if(m==="poster"){
    buildPoster(box,text,dur,cfg);
    one.appendChild(box);cur=box;curMode=m;skyShow(false);
    shown=text;shownSig=sigOf(idx);paintStat(true);
    requestAnimationFrame(function(){requestAnimationFrame(function(){box.classList.add("in")})});
    return;
  }
  var p=document.createElement("p"),chars=[].slice.call(text),n=chars.length;
  /* 逐字延迟的「节拍序号」：空格不占拍、标点跟着前一个字、英文整词算一拍，避免字与字之间出现空档 */
  var ui=[],U=0,pw0=false,po0=false;
  chars.forEach(function(ch,i){
    var isW0=WORDCH.test(ch)&&!CJKCH.test(ch),isT0=TAILCH.test(ch),sp0=/\s/.test(ch);
    if(sp0)ui[i]=Math.max(0,U-1);
    else if(U>0&&((isW0&&pw0)||isT0||po0))ui[i]=U-1;
    else{ui[i]=U;U++}
    pw0=isW0;po0=OPENCH.test(ch);
  });
  U=Math.max(1,U);
  var step=Math.min(1/$("typeV").value,dur*.7/U);
  var sf=Math.min(1,dur*.5/2.4);     /* 打散重组：整句拼完的时间不超过这句时长的一半（最长延迟 .8s + 时长 1.6s = 2.4s） */
  var smart=LY.w!=="fill",unit=null,prevWord=false,prevOpen=false;
  var kara=!!(!tIdle&&AUDIO_ON&&window.WT&&WT[idx]&&m!=="poster"&&WT[idx].length===chars.length); // 逐字歌词：字按时间一个个出现
  chars.forEach(function(ch,i){
    var s=document.createElement("span");s.className="c";s.textContent=ch===" "?"\u00a0":ch;
    s.style.setProperty("--i",i);
    if(m==="scatter"||pan){
      var rd=$("rnd").checked,A=$("amp").value/100,q=pol(A),st=function(k,v){s.style.setProperty(k,v)};
      if(rd){
        st("--x",q[0].toFixed(0)+"px");st("--y",q[1].toFixed(0)+"px");st("--r",(rnd(720)*A).toFixed(0)+"deg");st("--s",(1.2+Math.random()*3).toFixed(2));
        st("--dl",(Math.random()*0.8*sf).toFixed(2)+"s");st("--du",Math.max(.25,(0.6+Math.random())*sf).toFixed(2)+"s");
        q=pol(A);st("--x2",q[0].toFixed(0)+"px");st("--y2",q[1].toFixed(0)+"px");st("--r2",(rnd(720)*A).toFixed(0)+"deg");st("--s2",(0.1+Math.random()*0.6).toFixed(2));
        st("--dlo",(Math.random()*0.2*sf).toFixed(2)+"s");st("--duo",Math.max(.2,(0.3+Math.random()*0.35)*Math.max(.5,sf)).toFixed(2)+"s");
      }else{
        st("--x",(rnd(320)*A).toFixed(0)+"px");st("--y",(rnd(380)*A).toFixed(0)+"px");st("--r",(rnd(300)*A).toFixed(0)+"deg");
      }
    }else if(m==="type"){s.style.setProperty("--dl",(ui[i]*step).toFixed(3)+"s")}
    else if(FXM[m]){
      var gap=Math.min($("fxS").value/1000,dur*.4/U);
      if(m==="glitch"){s.style.setProperty("--dl",(Math.random()*Math.min(.6,dur*.3)).toFixed(2)+"s");s.style.setProperty("--gx",((Math.random()<.5?-1:1)*(8+Math.random()*20)).toFixed(0)+"px")}
      else if(m==="focus")s.style.setProperty("--dl",(ui[i]*gap*.6).toFixed(3)+"s");
      else s.style.setProperty("--dl",(ui[i]*gap).toFixed(3)+"s");
    }
    if(kara)s.style.setProperty("--dl","0s");
    if(smart){
      var isW=WORDCH.test(ch)&&!CJKCH.test(ch),isT=TAILCH.test(ch);
      if(unit&&((isW&&prevWord)||isT||prevOpen)){
        if(unit.className!=="wd"){var w=document.createElement("span");w.className="wd";p.replaceChild(w,unit);w.appendChild(unit);unit=w}
        unit.appendChild(s);
      }else{p.appendChild(s);unit=s}
      prevWord=isW;prevOpen=OPENCH.test(ch);
    }else p.appendChild(s);
  });
  box.appendChild(p);one.appendChild(box);cur=box;curMode=m;
  skyShow(m==="star");
  if(pan)panMove(box);
  shown=text;shownSig=sigOf(idx);paintStat(true);
  if(kara){
    // 逐字歌词：不加 .in，字由 player.js 的 karaPaint 按时间一个个点亮；等两帧后再开始，保证入场动画能播
    box._kara=1;
    requestAnimationFrame(function(){requestAnimationFrame(function(){box._kgo=1;if(cur===box&&window.karaPaint)karaPaint(audio.currentTime-LYR_OFF)})});
  }else requestAnimationFrame(function(){requestAnimationFrame(function(){box.classList.add("in")})});
}

/* ---- 逐条配置：LN 文本 + CF 每条的独立设置（字号/颜色/动画/停留） ---- */
/* ---- 商籁（Sonnet）：全局风格；画布与 Pixi Ticker 由 SonnetAdapter 管理 ---- */
var SONNET_KEEP_MS=15000;   // 离开 GL 风格后，隐藏画布并停掉 Ticker；超过这个时间没回来就销毁 WebGL 释放显存
function sonnetOK(){var A=window.SonnetAdapter;return !!(A&&typeof A.show==="function"&&typeof A.hide==="function")}
/* 引擎脚本改为按需加载后，运行时全局要到第一次切换才存在；加载器登记了该引擎就视为可用 */
function engLazy(n){var L=window.__EngineLoader;return !!(L&&L.groups&&L.groups[n])}
function temperaOK(){var A=window.TemperaAdapter;return !!(window.VisualizerManager&&(window.TemperaRuntime||engLazy("tempera"))&&A&&typeof A.show==="function"&&typeof A.hide==="function")}
function lumiereOK(){var A=window.LumiereAdapter;return !!(window.VisualizerManager&&(window.LumiereRuntime||engLazy("lumiere"))&&A&&typeof A.show==="function"&&typeof A.hide==="function")}
function partitaOK(){var A=window.PartitaAdapter;return !!(window.VisualizerManager&&window.Partita&&A&&typeof A.show==="function"&&typeof A.hide==="function")}
function glClassOff(){stage.classList.remove("mode-sonnet","mode-tempera","mode-lumiere","mode-partita")}
/* 进入 GL 风格：走 VisualizerManager.switchTo。
   · 先同步挂 mode-xxx 类（CSS 显示对应宿主、隐藏 #one / #sky；StyleFX 入场动画也据此选宿主）
   · {reuse:true}：该引擎正被保留（离开后 15 秒内、且没有别的引擎存活）时只 show()，不销毁重建
   · 其它情况（比如商籁 → 凝彩）Manager 串行：销毁旧引擎 → 等两帧 → 创建新引擎
   · 创建是异步的：用 glTok 作废过期回调（用户已经切走 / 又切了别的） */
function glEnter(name){
  clearTimeout(glKillT);
  if(glOn===name)return;                    // 幂等：每句换句都会走到这里
  glOn=name;sonnetOn=(name==="sonnet");
  var tk=++glTok,VM=window.VisualizerManager;
  glClassOff();stage.classList.add("mode-"+name);
  function fail(e){
    if(tk!==glTok)return;
    console.warn(name+" 启动失败:",e);
    glOn=null;sonnetOn=false;glClassOff();
    setTimeout(function(){if(style===name)setStyle("scatter")},0);
  }
  try{
    var p;
    if(VM)p=VM.switchTo(name,{reuse:true});
    else if(name==="sonnet")window.SonnetAdapter.show();     // Manager 没加载时的兜底（仅商籁）
    else throw new Error("VisualizerManager 未加载");
    Promise.resolve(p).then(function(){if(tk!==glTok&&!glOn)glHide()},fail);   // 创建期间用户已离开：补一次隐藏
  }catch(e){fail(e)}
}
function glLeave(){
  if(!glOn)return;
  glOn=null;sonnetOn=false;glTok++;         // 作废进行中的创建回调
  glHide();
}
function glHide(){
  glClassOff();
  clearTimeout(glKillT);
  var VM=window.VisualizerManager;
  if(VM){
    try{VM.hide()}catch(_){}                // 立刻停 Ticker + 藏画布
    glKillT=setTimeout(function(){if(!glOn){try{VM.destroy()}catch(_){}}},SONNET_KEEP_MS);
  }else{
    var A=window.SonnetAdapter;if(!A)return;
    try{A.hide()}catch(_){}
    if(typeof A.destroy==="function")glKillT=setTimeout(function(){if(!glOn){try{A.destroy()}catch(_){}}},SONNET_KEEP_MS);
  }
}
function sonnetEnter(){glEnter("sonnet")}                       // 兼容旧调用
function sonnetLeave(){if(glOn==="sonnet")glLeave()}
/* 适配器异步建画布失败（WebGL 拿不到等）时调用：退回默认风格，免得一片空白 */
window.__sonnetFailed=function(){if(style==="sonnet")setStyle("scatter")};
window.__temperaFailed=function(){if(style==="tempera")setStyle("scatter")};
function modeOf(i){
  if(style==="sonnet")return sonnetOK()?"sonnet":"scatter";   // 商籁不参与逐句覆盖；适配器没加载时退回打散重组
  if(style==="tempera")return temperaOK()?"tempera":"scatter"; // 凝彩同理
  if(style==="lumiere")return lumiereOK()?"lumiere":"scatter";
  if(style==="partita")return partitaOK()?"partita":"scatter";
  var m=cfgOf(i).mode;return(m&&!GLM[m])?m:style;             // 逐句覆盖里不允许出现 GL 风格
}
function pdUnits(t){var c=window._pdN=window._pdN||{},v=c[t];if(v==null){v=0;posterWords(t).forEach(function(w){v+=pchars(w).length});c[t]=v=v||1}return v}
function secOf(i){
  if(AUDIO_ON && TS.length && audio.duration){
    var s = TS[i] || 0;
    var e = (i+1 < TS.length) ? TS[i+1] : (audio.duration || s + 5);
    return Math.max(0.1, e - s);
  }
  var d=cfgOf(i).dur;if(d>0)return d;
  var b=sec(),pt=$("pdT");
  if(pt&&pt.value==="0"&&modeOf(i)==="poster"){var need=.25+.3*(pdUnits(LN[i])-1)+.65+.4;if(need>b)b=need}
  return b;
}
function sigOf(i){var c=cfgOf(i);return LN[i]+"|"+JSON.stringify([c.size,c.color,c.mode,c.dur])}
function applyItems(){
  var it=window.ITEMS||[];
  var arr=it.map(function(x){return x.t});
  if(!arr.length)arr=["请输入文字"];
  var chg=!LN||arr.length!==LN.length;
  if(!chg){for(var k=0;k<arr.length;k++){if(arr[k]!==LN[k]){chg=true;break}}}
  if(chg)LN=arr;
  CF=it.slice();
  if(!it.length)CF=[{}];
  if(idx>=LN.length)idx=0;
}
/* ---- 预览：实时 / 手动刷新 ---- */
function markDirty(){dirty=1;$("refresh").classList.add("dirty")}
function reqRender(){syncBoxes();if(LIVE)render();else markDirty()}
function reqBg(f){if(LIVE){applyBg();if(f)fadeBg()}else markDirty()}
function reqSky(){if(LIVE)buildSky();else markDirty()}
function refreshAll(){dirty=0;$("refresh").classList.remove("dirty");applyItems();buildSky();render();applyBg();fadeBg()}
$("live").addEventListener("change",function(){LIVE=this.checked;$("refresh").classList.toggle("hide",LIVE);if(LIVE&&dirty)refreshAll()});
$("refresh").onclick=refreshAll;
/* ---- 各动画模式的参数面板：默认风格 + 各条字幕用到的模式 ---- */
function syncBoxes(){
  var u={};u[style]=1;(window.ITEMS||[]).forEach(function(x){if(x.mode)u[x.mode]=1});
  $("sbox").classList.toggle("hide",!(u.scatter||u.pan));
  $("pbox").classList.toggle("hide",!u.pan);
  $("starbox").classList.toggle("hide",!u.star);
  $("fadebox").classList.toggle("hide",!u.fade);
  $("typebox").classList.toggle("hide",!u.type);
  $("fxbox").classList.toggle("hide",!(u.bounce||u.flip||u.focus||u.wave||u.glitch));
  $("posterbox").classList.toggle("hide",!u.poster);
  $("sonnetbox").classList.toggle("hide",style!=="sonnet");
  var gt=$("gtextRow");if(gt)gt.classList.toggle("hide",style==="sonnet"||style==="tempera"||style==="lumiere"||style==="partita");
  pdSync();
}
/* ---- 星空：数量 / 大小 / 速度（星星与流星各自独立） ---- */
function buildSky(){
  sky.innerHTML="";
  var n=+$("stN").value,sz=$("stS").value/100,sp=$("stV").value/100,k,d;
  for(k=0;k<n;k++){
    d=document.createElement("i");
    d.style.left=Math.random()*100+"%";d.style.top=Math.random()*100+"%";
    var w=((2+Math.random()*3)*sz).toFixed(1);d.style.width=w+"px";d.style.height=w+"px";
    if(Math.random()<.1){d.className="big";d.style.opacity=.85;d.style.width=d.style.height=(6*sz).toFixed(1)+"px"}
    else d.style.opacity=(.35+Math.random()*.6).toFixed(2);
    if(Math.random()<.18)d.style.background="rgba(195,215,255,.9)";
    d.style.animationDelay=(-Math.random()*3).toFixed(1)+"s";d.style.animationDuration=((2+Math.random()*3)/sp).toFixed(2)+"s";
    sky.appendChild(d);
  }
  var mon=$("meteorOn").checked;$("mtbox").classList.toggle("hide",!mon);
  if(mon){
    var mn=+$("mtN").value,ms=$("mtS").value/100,mv=$("mtV").value/100;
    for(var m=0;m<mn;m++){
      var me=document.createElement("i");me.className="meteor";
      me.style.left=(5+Math.random()*70)+"%";me.style.top=(5+Math.random()*45)+"%";
      me.style.width=(70*ms).toFixed(0)+"px";me.style.setProperty("--ms",ms);
      var per=(6+Math.random()*3)/mv;
      me.style.animationDuration=per.toFixed(2)+"s";me.style.animationDelay=(m*per/Math.max(1,mn)+Math.random()*1.2).toFixed(2)+"s";
      sky.appendChild(me);
    }
  }
}
function skyShow(on){
  clearTimeout(skyT);
  if(on){sky.classList.remove("hide");void sky.offsetWidth;sky.classList.remove("off")}
  else{sky.classList.add("off");skyT=setTimeout(function(){sky.classList.add("hide")},900)}
}
/* ---- 状态栏：第几条 / 总条数 · 剩余时长 ---- */
var cntCache=null;   // perf: 缓存 .cnt 节点，避免 10Hz 的 querySelectorAll
function cntNodes(){
  if(!cntCache||!cntCache.length||!cntCache[0].isConnected)cntCache=[].slice.call(document.querySelectorAll(".cnt"));
  return cntCache;
}
function paintStat(force){
  var now=performance.now();if(!force&&now-statT<90)return;statT=now;
  var rm=Math.max(0,(1-prog)*secOf(idx)).toFixed(1),t="第 "+(idx+1)+" / "+LN.length+" 条 · 剩余 "+rm+"s";
  var ns=cntNodes();
  if(!force&&ns.length&&ns[0].textContent===t)return;   // perf: 文本没变就不写 DOM（暂停时几乎每次相同）
  ns.forEach(function(c){c.textContent=t});
}
window.onItemsChanged=function(){
  bag=null;syncBoxes();
  if(!LIVE){markDirty();return}
  applyItems();clearTimeout(txtT);
  txtT=setTimeout(function(){if(sigOf(idx)!==shownSig)update();paintStat(true)},350);
};
var renderRaf=raf1(reqRender),applyBgRaf=raf1(function(){reqBg(false)}),skyRaf=raf1(reqSky);
["size","fg","rnd","amp","pcomb","pdist","gtext","tc","sw","sc","shd","rgb","fadeT","typeV","caret","fxS","fxK","pdN","pdC","pdS","pdD","pdE"].forEach(function(id){$(id).addEventListener("input",renderRaf)});
(function(){
  var el=$("camFollow"),lab=$("camFollowV");if(!el)return;
  function label(){
    var v=+el.value,t="跟随";
    if(v<30)t="慵懒";else if(v<55)t="自然";else if(v<80)t="跟随";else t="紧跟";
    if(lab)lab.textContent=t;
  }
  el.addEventListener("input",function(){
    label();
    if(typeof modeOf==="function"&&modeOf(idx)==="poster"){prog=0;update();}
  });
  label();
})();
["stN","stS","stV","meteorOn","mtN","mtS","mtV"].forEach(function(id){$(id).addEventListener("input",skyRaf)});
$("meteorOn").addEventListener("change",function(){$("mtbox").classList.toggle("hide",!this.checked)});
$("speed").addEventListener("input",function(){paintStat(true)});
var aspdRaf = raf1(function(){
  ASPD = $("aspd").value / 100;
  stage.style.setProperty("--aspd", ASPD);
  $("aspdv").textContent = ASPD.toFixed(2) + "×";
  if (LIVE) render(); else markDirty();
});
$("aspd").addEventListener("input", aspdRaf);
$("aspd").dispatchEvent(new Event("input")); // 初始化一次
$("shuf").addEventListener("change",function(){bag=null});
var EIN=[["cubic-bezier(.2,.8,.2,1)","默认"],["ease-in-out","平滑"],["cubic-bezier(.32,.72,0,1)","弹性"],["linear","匀速"]],
    EOUT=[["cubic-bezier(.4,0,.8,.3)","默认"],["cubic-bezier(.7,0,.84,0)","加速"],["ease-in-out","平滑"],["linear","匀速"]];
chips($("easeIn"),EIN,function(){return eIn},function(v){eIn=v;reqRender()});
chips($("easeOut"),EOUT,function(){return eOut},function(v){eOut=v;reqRender()});
function fadeBg(){[$("bg"),$("bgf")].forEach(function(b){if(b.animate)b.animate([{opacity:0},{opacity:1}],{duration:500,easing:"ease-out"})})}
var panGen=0,wx=0,wy=0;
function panMove(box){
  var g=++panGen,dur=Math.min(1.4,secOf(idx)*0.7);
  void one.offsetWidth;
  one.style.transition="transform "+dur+"s cubic-bezier(.65,0,.25,1)";
  one.style.transform="translate("+(-wx).toFixed(0)+"px,"+(-wy).toFixed(0)+"px)";
  var cr=$("camRot").checked,cb=true;
  if((wx||wy)&&one.animate&&cr){
    var ra=(Math.random()<.5?-1:1)*(8+Math.random()*14),kf=[],N=18,k,t,w;
    for(k=0;k<=N;k++){
      t=k/N;w=Math.pow(Math.sin(Math.PI*Math.pow(t,.9)),2);
      kf.push({rotate:(ra*w).toFixed(2)+"deg",offset:t});
    }
    one.animate(kf,{duration:dur*1000,easing:"linear"});
  }
  /* 运动模糊：沿平移方向的定向模糊，强度随移动速度变化（SVG 高斯模糊，x/y 分别取值） */
  if(cb&&(wx||wy)){
    var L=Math.sqrt(wx*wx+wy*wy),peak=Math.min(20,Math.max(6,L/dur/60)),bx=peak*Math.abs(wx)/L,by=peak*Math.abs(wy)/L,mb=$("mbg"),t0=performance.now();
    one.style.filter="url(#mblur)";
    (function step(now){
      if(g!==panGen)return;
      var p=Math.min(1,(now-t0)/(dur*1000)),e=Math.pow(Math.sin(Math.PI*Math.pow(p,.9)),2);
      mb.setAttribute("stdDeviation",(bx*e).toFixed(2)+" "+(by*e).toFixed(2));
      if(p<1)requestAnimationFrame(step);else{mb.setAttribute("stdDeviation","0 0");one.style.filter=""}
    })(t0);
  }else{one.style.filter=""}
  setTimeout(function(){
    if(g!==panGen)return;
    [].slice.call(one.children).forEach(function(c){if(c!==box)c.remove()});
    one.style.transition="none";one.style.transform="none";box.style.transform="none";one.style.filter="";wx=0;wy=0;
  },dur*1000+80);
}
/* ---- 调节页分组菜单：点击标题展开/收起，各组互不影响 ---- */
[].forEach.call(document.querySelectorAll(".gh"),function(b){
  b.addEventListener("click",function(){
    var g=b.parentNode,on=g.classList.toggle("open");
    b.setAttribute("aria-expanded",on?"true":"false");
    if(on)setTimeout(function(){g.scrollIntoView({block:"nearest",behavior:"smooth"})},uiT(460));
  });
});
/* ---- 排版：对齐 / 位置 / 断行 / 边距 / 粗细 / 行距 ---- */
chips($("lyAlign"),[["left","靠左"],["center","居中"],["right","靠右"]],function(){return LY.a},function(v){LY.a=v;renderRaf()});
chips($("lyPos"),[["top","靠上"],["center","居中"],["bottom","靠下"]],function(){return LY.v},function(v){LY.v=v;renderRaf()});
chips($("lyWrap"),[["fill","挤满断行"],["word","按词断行"],["balance","均衡断行"]],function(){return LY.w},function(v){LY.w=v;renderRaf()});
["lyPad","lyFw","lyLh"].forEach(function(id){$(id).addEventListener("input",renderRaf)});
/* ---- 歌曲名显示：音频状态 / 标题变化时刷新舞台 ---- */
(function(){
  var a=document.getElementById("audio");
  if(a)["play","pause","seeked","loadedmetadata","emptied","durationchange"].forEach(function(ev){a.addEventListener(ev,titleSync)});
  ["miT","musicPanelTitle"].forEach(function(id){
    var el=document.getElementById(id);
    if(el&&window.MutationObserver)new MutationObserver(titleSync).observe(el,{childList:true,characterData:true,subtree:true});
  });
})();
