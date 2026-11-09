/* Fume Canvas engine — isolated, dependency-free port foundation.
 * Preserves the Folia concept: a continuous lyric article, timed glyph printing,
 * a camera that follows the current passage, passed-text decay and a living backdrop.
 * The player clock is authoritative; this engine never owns audio time.
 */
(function (global) {
  'use strict';
  var clamp=function(v,a,b){return Math.max(a,Math.min(b,v));};
  var mix=function(a,b,t){return a+(b-a)*t;};
  var ease=function(t){t=clamp(t,0,1);return t*t*(3-2*t);};
  function graphemes(s){
    s=String(s==null?'':s);
    if(typeof Intl!=='undefined'&&Intl.Segmenter){
      try{return Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(s),function(x){return x.segment;});}catch(_){}
    }
    return Array.from(s);
  }
  function safeColor(v,fallback){return typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:fallback;}
  function FumeCanvas(host,opts){
    this.host=host;this.opts=opts||{};this.canvas=null;this.ctx=null;this.raf=0;
    this.active=false;this.destroyed=false;this.time=0;this.lastFrame=0;
    this.lines=[];this.blocks=[];this.width=1;this.height=1;this.dpr=1;
    this.camera={x:0,y:0,vx:0,scale:1,vs:0};
    this.theme={text:'#f5f3ef',muted:'#a7a4a0',accent:'#d8c5a4',background:'#101116'};
    this.resizeObserver=null;this.boundResize=this.resize.bind(this);
    this.initCanvas();this.resize();this.observe();
  }
  FumeCanvas.prototype.initCanvas=function(){
    var c=document.createElement('canvas');
    c.setAttribute('aria-hidden','true');
    c.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;';
    this.host.appendChild(c);this.canvas=c;this.ctx=c.getContext('2d',{alpha:true,desynchronized:true});
    if(!this.ctx)throw new Error('Fume: Canvas 2D context unavailable');
  };
  FumeCanvas.prototype.observe=function(){
    var self=this;
    if(typeof ResizeObserver!=='undefined'){
      this.resizeObserver=new ResizeObserver(function(){self.resize();});this.resizeObserver.observe(this.host);
    }else global.addEventListener('resize',this.boundResize,{passive:true});
  };
  FumeCanvas.prototype.resize=function(){
    if(this.destroyed||!this.canvas)return;
    var r=this.host.getBoundingClientRect();this.width=Math.max(1,Math.floor(r.width));this.height=Math.max(1,Math.floor(r.height));
    this.dpr=Math.min(Math.max(global.devicePixelRatio||1,1),2);
    var w=Math.floor(this.width*this.dpr),h=Math.floor(this.height*this.dpr);
    if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.layout();
  };
  FumeCanvas.prototype.setTheme=function(t){
    t=t||{};this.theme.text=safeColor(t.textColor||t.primaryColor,'#f5f3ef');
    this.theme.muted=safeColor(t.secondaryColor,'#a7a4a0');
    this.theme.accent=safeColor(t.accentColor,'#d8c5a4');
    this.theme.background=safeColor(t.backgroundColor,'#101116');
  };
  FumeCanvas.prototype.setLyrics=function(TS,WT,LN){
    this.lines=[];TS=Array.isArray(TS)?TS:[];WT=Array.isArray(WT)?WT:[];
    LN=Array.isArray(LN)?LN:[];
    for(var i=0;i<LN.length;i++){
      var text=String(LN[i]==null?'':LN[i]),gs=graphemes(text),raw=WT[i]||[],start=Number(TS[i])||0;
      var next=Number(TS[i+1]),end=Number.isFinite(next)&&next>start?next:start+Math.max(2,gs.length*.22);
      var timings=[],valid=false;
      for(var j=0;j<gs.length;j++){
        var pair=raw[j];
        if(Array.isArray(pair)&&pair.length&&Number.isFinite(+pair[0])){
          var pairStart=+pair[0],pairEnd=Number.isFinite(+pair[1])?+pair[1]:end;
          timings.push({s:pairStart,e:pairEnd>pairStart?pairEnd:Math.max(pairStart,end)});valid=true;
        }else if(pair!==null&&pair!==''&&Number.isFinite(+pair)){
          /* Yiu WT stores one numeric start time per grapheme, not [start,end] pairs. */
          var charStart=+pair,charEnd=end;
          for(var k=j+1;k<raw.length;k++){
            var nextPair=raw[k];
            if(nextPair!==null&&nextPair!==''&&!Array.isArray(nextPair)&&Number.isFinite(+nextPair)&&+nextPair>charStart){
              charEnd=+nextPair;break;
            }
            if(Array.isArray(nextPair)&&nextPair.length&&Number.isFinite(+nextPair[0])&&+nextPair[0]>charStart){
              charEnd=+nextPair[0];break;
            }
          }
          timings.push({s:charStart,e:charEnd>charStart?charEnd:Math.max(charStart,end)});valid=true;
        }else timings.push(null);
      }
      this.lines.push({text:text,graphemes:gs,start:start,end:end,timings:valid?timings:null,index:i});
    }
    this.layout();
  };
  FumeCanvas.prototype.layout=function(){
    if(!this.ctx||!this.lines.length)return;
    var ctx=this.ctx,w=this.width,h=this.height;
    var paperW=clamp(Math.max(w*1.95,w+520),920,2400);
    var columns=paperW>=1120?4:paperW>=760?3:paperW>=500?2:1;
    var gap=clamp(Math.round(paperW*(columns>=4?.0065:columns===3?.0085:.0115)),6,14);
    var marginX=Math.max(w*.86,280),marginY=Math.max(h*.82,220);
    var colW=(paperW-gap*(columns-1))/columns;
    var heights=Array.from({length:columns},function(){return marginY;});
    var hash=function(s){var v=2166136261;for(var i=0;i<s.length;i++){v^=s.charCodeAt(i);v=Math.imul(v,16777619);}return v>>>0;};
    var seed=function(s){return (hash(s)%10000)/10000;};
    var entries=this.lines.map(function(line,index){return {line:line,index:index,seed:seed(line.text+":"+index)};})
      .filter(function(e){return e.line.text.trim().length>0;})
      .sort(function(x,y){return x.seed-y.seed;});
    var naturalHero=false;
    entries.forEach(function(e,i){
      var n=e.line.graphemes.length;
      if((e.line.isChorus&&n<=22)||(n>=4&&n<=28&&((i+1)%6===0||seed(e.line.text+":"+i)>.965)))naturalHero=true;
    });
    var forcedHero=-1;
    if(entries.length&&!naturalHero){
      var best=-Infinity;
      entries.forEach(function(e,i){
        var n=e.line.graphemes.length;if(!n||n>36)return;
        var center=1-Math.abs(i-entries.length/2)/Math.max(entries.length,1);
        var length=n>=6&&n<=22?1:n<=28?.72:.36;
        var score=center*.62+length*.34+(e.line.isChorus?.28:0)+seed(e.line.text+":"+i+":hero")*.04;
        if(score>best){best=score;forcedHero=i;}
      });
    }
    var blocks=[];
    for(var i=0;i<entries.length;i++){
      var e=entries[i],line=e.line,n=line.graphemes.length;
      var hero=i===forcedHero||(line.isChorus&&n<=22)||(n>=4&&n<=28&&((i+1)%6===0||seed(line.text+":"+i)>.965));
      var span=hero?Math.min(columns,columns<=1?1:2):1;
      var spanW=span>1?colW*span+gap*(span-1):colW;
      var blockW=hero?(span===1?paperW:(columns===2?colW*1.5+gap*.5:spanW)):colW;
      var innerW=Math.max(blockW,120);
      var density=Math.max(n+((line.wordCount||0)*1.4),1);
      var base=innerW/(Math.sqrt(density)*(hero?1.5:2.25));
      var font=hero?clamp(base,24,54):clamp(base,14,28);
      var lineH=font*(hero?1.02:1.06);
      ctx.save();ctx.font=(hero?"700 ":"500 ")+font+"px -apple-system, BlinkMacSystemFont, sans-serif";
      var parts=[],part="",partW=0,partGs=[];
      for(var g=0;g<line.graphemes.length;g++){
        var ch=line.graphemes[g],cw=ctx.measureText(ch).width;
        if(part&&partW+cw>innerW){parts.push({text:part,width:partW,graphemes:partGs});part="";partW=0;partGs=[];}
        part+=ch;partW+=cw;partGs.push(ch);
      }
      if(part||!parts.length)parts.push({text:part,width:partW,graphemes:partGs});
      ctx.restore();
      var blockH=parts.length*lineH+font*.55,x=marginX,y=0,startCol=0;
      if(hero&&span>1){
        var min=Infinity,candidates=[];
        for(var c=0;c<=columns-span;c++){
          var covered=0;for(var q=c;q<c+span;q++)covered=Math.max(covered,heights[q]||0);
          if(covered<min){min=covered;candidates=[c];}else if(covered===min)candidates.push(c);
        }
        startCol=candidates[i%candidates.length]||0;y=min;
        x=marginX+startCol*(colW+gap)+Math.max((spanW-blockW)*.5,0);
        for(var q=startCol;q<startCol+span;q++)heights[q]=y+blockH+font*.2;
      }else{
        var target=0;for(var c=1;c<columns;c++)if(heights[c]<heights[target])target=c;
        startCol=target;y=heights[target];x=marginX+target*(colW+gap);
        heights[target]=y+blockH+font*.5;
      }
      blocks.push({line:line,x:x,y:y,w:blockW,h:blockH,font:font,lineH:lineH,parts:parts,hero:hero,column:startCol});
    }
    blocks.sort(function(x,y){return x.line.index-y.line.index;});
    this.blocks=blocks;this.articleHeight=Math.max.apply(null,heights)+marginY;
    this.articleWidth=paperW+marginX*2;this.columns=columns;
  };
  FumeCanvas.prototype.lineProgress=function(line,t){
    if(t<line.start)return 0;
    if(t>=line.end)return 1;
    if(line.timings){
      var n=0;for(var i=0;i<line.timings.length;i++){var q=line.timings[i];if(q&&t>=q.s)n=i+1;else if(!q&&t>=line.start+(line.end-line.start)*(i+1)/Math.max(1,line.graphemes.length))n=i+1;else break;}
      return clamp(n/Math.max(1,line.graphemes.length),0,1);
    }
    return clamp((t-line.start)/Math.max(.08,line.end-line.start),0,1);
  };
  FumeCanvas.prototype.currentBlock=function(t){
    var found=0;for(var i=0;i<this.blocks.length;i++){if(this.blocks[i].line.start<=t)found=i;else break;}return found;
  };
  FumeCanvas.prototype.drawBackground=function(t){
    var c=this.ctx,w=this.width,h=this.height,theme=this.theme;
    var grad=c.createRadialGradient(w*.72,h*.24,4,w*.5,h*.5,Math.max(w,h)*.8);
    grad.addColorStop(0,'rgba(112,123,154,.13)');grad.addColorStop(.55,'rgba(73,83,112,.045)');grad.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=grad;c.fillRect(0,0,w,h);
    c.save();c.globalAlpha=.16;c.strokeStyle=theme.accent;c.lineWidth=1;
    for(var i=0;i<7;i++){
      var phase=t*.13+i*1.71,x=(w*(.12+i*.13)+Math.sin(phase)*28)%w,y=(h*(.16+(i%4)*.2)+Math.cos(phase*.8)*22)%h;
      c.beginPath();c.arc(x,y,7+(i%3)*6+Math.sin(phase)*2,0,Math.PI*2);c.stroke();
    }
    c.restore();
  };
  FumeCanvas.prototype.draw=function(now){
    if(!this.active||this.destroyed)return;
    var c=this.ctx,w=this.width,h=this.height,dt=this.lastFrame?clamp((now-this.lastFrame)/1000,0,.05):1/60;
    this.lastFrame=now;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,w,h);
    this.drawBackground(this.time);
    if(this.blocks.length){
      var idx=this.currentBlock(this.time),b=this.blocks[idx],camera=this.camera;
      c.font=(b.hero?"700 ":"500 ")+b.font+"px -apple-system, BlinkMacSystemFont, sans-serif";
      var progress=this.lineProgress(b.line,this.time);
      var count=Math.min(b.line.graphemes.length,Math.floor(progress*b.line.graphemes.length+(progress>0?1:0)));
      var targetX=b.x+b.w*.5,targetY=b.y+b.h*.5;
      if(count>0){
        var cursor=count-1,partIndex=0,local=cursor;
        while(partIndex<b.parts.length-1&&local>=b.parts[partIndex].graphemes.length){
          local-=b.parts[partIndex].graphemes.length;partIndex++;
        }
        var part=b.parts[partIndex],prefix=part.graphemes.slice(0,local+1).join('');
        targetX=b.x+c.measureText(prefix).width;
        targetY=b.y+partIndex*b.lineH+b.lineH*.5;
      }
      var targetScale=clamp((Math.min(w,h)*.115)/Math.max(b.lineH,1),.88,2.2);
      var follow=1-Math.exp(-dt*3.5);
      camera.x=mix(camera.x,targetX,follow);camera.y=mix(camera.y,targetY,follow);
      camera.scale=mix(camera.scale,targetScale,1-Math.exp(-dt*2.8));
      var visibleTop=camera.y-h*.58/camera.scale,visibleBottom=camera.y+h*.58/camera.scale;
      var first=this.blocks[0].line.start,last=this.blocks[this.blocks.length-1].line.end;
      var fadeDuration=clamp((last-first)*.5,2.4,130);
      c.save();c.translate(w*.5,h*.48);c.scale(camera.scale,camera.scale);c.translate(-camera.x,-camera.y);
      for(var k=0;k<this.blocks.length;k++){
        var block=this.blocks[k];
        if(block.y+block.h<visibleTop||block.y>visibleBottom)continue;
        var line=block.line,p=this.lineProgress(line,this.time),passed=this.time>=line.end;
        var base=passed?(block.hero?.74:.58):(k===idx?(block.hero?.985:.92):(block.hero?.06:.035));
        var fade=passed?clamp(1-(this.time-line.end)/fadeDuration,0,1):1;
        c.globalAlpha=passed?base*(.12+.88*fade):base;
        c.font=(block.hero?"700 ":"500 ")+block.font+"px -apple-system, BlinkMacSystemFont, sans-serif";
        c.textBaseline='top';
        var visible=Math.min(line.graphemes.length,Math.floor(p*line.graphemes.length+(p>0?1:0))),cursor=0;
        for(var q=0;q<block.parts.length;q++){
          var part=block.parts[q],gs=part.graphemes||graphemes(part.text);
          var remaining=clamp(visible-cursor,0,gs.length);
          c.fillStyle=passed?this.theme.muted:(k===idx?this.theme.text:this.theme.muted);
          c.fillText(gs.slice(0,remaining).join(''),block.x,block.y+q*block.lineH);
          cursor+=gs.length;
        }
        if(k===idx&&visible>0){
          c.save();c.globalAlpha=.7;c.fillStyle=this.theme.accent;
          c.fillRect(block.x,block.y+block.h-4,Math.min(block.w,visible*block.font*.42),1.5);c.restore();
        }
      }
      c.restore();
    }
    this.raf=global.requestAnimationFrame(this.draw.bind(this));
  };
  FumeCanvas.prototype.start=function(){if(this.destroyed||this.active)return;this.active=true;this.lastFrame=0;this.raf=global.requestAnimationFrame(this.draw.bind(this));};
  FumeCanvas.prototype.stop=function(){this.active=false;if(this.raf)global.cancelAnimationFrame(this.raf);this.raf=0;this.lastFrame=0;};
  FumeCanvas.prototype.setTime=function(t){if(Number.isFinite(+t))this.time=Math.max(0,+t);};
  FumeCanvas.prototype.destroy=function(){
    this.stop();this.destroyed=true;if(this.resizeObserver)this.resizeObserver.disconnect();else global.removeEventListener('resize',this.boundResize);
    if(this.canvas&&this.canvas.parentNode)this.canvas.parentNode.removeChild(this.canvas);
    this.canvas=null;this.ctx=null;this.blocks=[];this.lines=[];
  };
  global.FumeCanvasEngine={create:function(host,opts){return new FumeCanvas(host,opts);}};
})(window);
