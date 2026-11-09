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
        if(Array.isArray(pair)&&Number.isFinite(+pair[0])){timings.push({s:+pair[0],e:Number.isFinite(+pair[1])?+pair[1]:+pair[0]});valid=true;}
        else timings.push(null);
      }
      this.lines.push({text:text,graphemes:gs,start:start,end:end,timings:valid?timings:null,index:i});
    }
    this.layout();
  };
  FumeCanvas.prototype.layout=function(){
    if(!this.ctx||!this.lines.length)return;
    var ctx=this.ctx,w=this.width,margin=Math.max(30,w*.12),columnW=Math.max(180,w-margin*2);
    var font=Math.max(22,Math.min(40,w*.075)),lineH=font*1.55,y=margin;
    ctx.save();ctx.font='500 '+font+'px -apple-system, BlinkMacSystemFont, sans-serif';
    var blocks=[];
    for(var i=0;i<this.lines.length;i++){
      var line=this.lines[i],parts=[],part='',width=0;
      for(var g=0;g<line.graphemes.length;g++){
        var ch=line.graphemes[g],cw=ctx.measureText(ch).width;
        if(part&&width+cw>columnW){parts.push({text:part,width:width});part='';width=0;}
        part+=ch;width+=cw;
      }
      if(part||!parts.length)parts.push({text:part,width:width});
      var h=parts.length*lineH+font*.7;
      blocks.push({line:line,x:margin,y:y,w:columnW,h:h,font:font,lineH:lineH,parts:parts});
      y+=h+font*.85;
    }
    ctx.restore();this.blocks=blocks;this.articleHeight=y+margin;
  };
  FumeCanvas.prototype.lineProgress=function(line,t){
    if(t<line.start)return 0;
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
      var idx=this.currentBlock(this.time),b=this.blocks[idx],targetY=b.y+b.h*.42;
      var targetX=b.x+b.w*.5,focusScale=clamp(Math.min(w/(b.w*.92),h/(b.h*2.4)),.72,1.12);
      var camera=this.camera;
      camera.vx+=(targetX-camera.x)*Math.min(1,dt*3.6);camera.x+=camera.vx*dt*3.6;
      camera.vs+=(focusScale-camera.scale)*Math.min(1,dt*3);camera.scale+=camera.vs*dt*3;
      var offsetY=targetY-h*.48;
      c.save();c.translate(w*.5,h*.48);c.scale(camera.scale,camera.scale);c.translate(-camera.x,-offsetY);
      for(var k=0;k<this.blocks.length;k++){
        var block=this.blocks[k],line=block.line,progress=this.lineProgress(line,this.time);
        var passed=this.time>=line.end,alpha=passed?.24:(k===idx?1:(k<idx?.4:.22));
        c.globalAlpha=alpha;c.font='500 '+block.font+'px -apple-system, BlinkMacSystemFont, sans-serif';
        c.textBaseline='top';var visible=Math.floor(progress*line.graphemes.length+(progress>0?1:0)),cursor=0;
        for(var p=0;p<block.parts.length;p++){
          var part=block.parts[p],count=0;
          for(var q=0;q<part.text.length;){var g=graphemes(part.text);break;}
          var remaining=clamp(visible-cursor,0,graphemes(part.text).length);
          c.fillStyle=passed?this.theme.muted:(k===idx?this.theme.text:this.theme.muted);
          c.fillText(graphemes(part.text).slice(0,remaining).join(''),block.x,block.y+p*block.lineH);
          cursor+=graphemes(part.text).length;
        }
        if(k===idx&&visible>0){c.save();c.globalAlpha=.75;c.fillStyle=this.theme.accent;c.fillRect(block.x,block.y+block.h-5,Math.min(block.w,visible*block.font*.48),2);c.restore();}
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
