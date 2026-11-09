const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','..','APP','fume','fume.js'),'utf8');

function createEngine(){
  const ctx={
    save(){},restore(){},setTransform(){},clearRect(){},
    measureText(text){return {width:Array.from(String(text)).length*12};}
  };
  const document={
    createElement(tag){
      assert.equal(tag,'canvas');
      return {style:{},setAttribute(){},getContext(){return ctx;},parentNode:null};
    }
  };
  const host={
    children:[],
    appendChild(node){node.parentNode=this;this.children.push(node);},
    removeChild(node){this.children=this.children.filter(x=>x!==node);node.parentNode=null;},
    getBoundingClientRect(){return {width:390,height:844};}
  };
  const window={
    devicePixelRatio:1,
    addEventListener(){},removeEventListener(){},
    requestAnimationFrame(){return 1;},cancelAnimationFrame(){}
  };
  class ResizeObserver{observe(){}disconnect(){}}
  vm.runInNewContext(source,{window,document,ResizeObserver,Intl,Math,Number,String,Array,Object,Map,Set,Date,Error,Promise});
  return window.FumeCanvasEngine.create(host,{});
}

test('Fume accepts Yiu numeric per-grapheme WT timestamps',()=>{
  const engine=createEngine();
  engine.setLyrics([0],[[0,0.5,1]],['ABC']);
  assert.deepEqual(Array.from(engine.lines[0].timings, t=>({s:t.s,e:t.e})),[
    {s:0,e:0.5},{s:0.5,e:1},{s:1,e:2}
  ]);
  assert.ok(Math.abs(engine.lineProgress(engine.lines[0],0.75)-2/3)<1e-9);
  engine.destroy();
});

test('Fume keeps legacy [start,end] WT pair compatibility',()=>{
  const engine=createEngine();
  engine.setLyrics([0],[[[0,0.5],[0.5,1],[1,2]]],['ABC']);
  assert.ok(Math.abs(engine.lineProgress(engine.lines[0],0.75)-2/3)<1e-9);
  engine.destroy();
});
