const finite=value=>value!==null&&value!==''&&Number.isFinite(Number(value));
const splitGraphemes=value=>{
 const text=String(value??'');
 if(typeof Intl!=='undefined'&&Intl.Segmenter){
  try{return Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text),item=>item.segment);}catch(_){}
 }
 return Array.from(text);
};
const segmentWords=text=>{
 const graphemes=splitGraphemes(text);
 if(typeof Intl!=='undefined'&&Intl.Segmenter){
  try{
   const segments=Array.from(new Intl.Segmenter('zh',{granularity:'word'}).segment(text));
   const tokens=[];let prefix='';
   for(const part of segments){
    if(/^\\s+$/u.test(part.segment)){if(tokens.length)tokens[tokens.length-1].suffix+=part.segment;else prefix+=part.segment;continue;}
    if(part.isWordLike){
     tokens.push({text:prefix+part.segment,suffix:''});prefix='';
    }else if(tokens.length)tokens[tokens.length-1].text+=part.segment;
    else prefix+=part.segment;
   }
   if(prefix){if(tokens.length)tokens[tokens.length-1].suffix+=prefix;else tokens.push({text:prefix,suffix:''});}
   return tokens.map(token=>({...token,graphemes:splitGraphemes(token.text)})).filter(token=>token.graphemes.length);
  }catch(_){}
 }
 const tokens=[];let current='';
 for(const g of graphemes){
  if(/^\\s+$/u.test(g)){if(current){tokens.push(current);current='';}if(tokens.length)tokens[tokens.length-1]+='';continue;}
  current+=g;
 }
 if(current)tokens.push(current);
 return tokens.map(text=>({text,suffix:'',graphemes:splitGraphemes(text)}));
};
const readGlyphTiming=(raw,index,start,end,count)=>{
 const value=raw[index],next=raw[index+1];
 let glyphStart=start,glyphEnd=end;
 if(Array.isArray(value)){
  if(finite(value[0]))glyphStart=Number(value[0]);
  if(finite(value[1]))glyphEnd=Number(value[1]);
 }else if(finite(value)){
  glyphStart=Number(value);
  if(Array.isArray(next)&&finite(next[0]))glyphEnd=Number(next[0]);
  else if(finite(next))glyphEnd=Number(next);
 }
 if(!(glyphEnd>glyphStart)){
  for(let i=index+1;i<raw.length;i++){
   const candidate=Array.isArray(raw[i])?raw[i][0]:raw[i];
   if(finite(candidate)&&Number(candidate)>glyphStart){glyphEnd=Number(candidate);break;}
  }
 }
 if(!(glyphEnd>glyphStart))glyphEnd=Math.max(glyphStart+0.01,end);
 return {startTime:glyphStart,endTime:glyphEnd};
};
const buildLineRenderHints=line=>{
 const rawDuration=Math.max(line.endTime-line.startTime,0);
 const timingClass=rawDuration<0.10?'micro':rawDuration<0.18?'short':'normal';
 const lineTransitionMode=timingClass==='micro'?'none':timingClass==='short'?'fast':'normal';
 const wordRevealMode=timingClass==='micro'?'instant':timingClass==='short'?'fast':'normal';
 const transition=lineTransitionMode==='none'?{exitDuration:0,linePassHold:0}:lineTransitionMode==='fast'?{exitDuration:Math.min(0.04,Math.max(rawDuration*0.22,0.03)),linePassHold:wordRevealMode==='instant'?0:0.03}:{exitDuration:Math.min(0.32,Math.max(0.18,Math.max(rawDuration,0.12)*0.18)),linePassHold:wordRevealMode==='instant'?0:0.06};
 const lastWordEnd=line.words[line.words.length-1]?.endTime??line.endTime;
 const linePassStart=Math.max(lastWordEnd,line.startTime)+transition.linePassHold;
 const exitStart=lineTransitionMode==='none'?line.endTime:lineTransitionMode==='fast'?Math.max(line.startTime+Math.min(0.06,Math.max(rawDuration*0.45,0.045))+0.01,linePassStart,line.endTime-transition.exitDuration):Math.max(linePassStart,line.endTime-transition.exitDuration);
 const renderEndTime=lineTransitionMode==='none'?Math.max(line.endTime,line.startTime+0.067):Math.max(line.endTime,exitStart+transition.exitDuration);
 return {rawDuration,timingClass,renderEndTime,lineTransitionMode,wordRevealMode};
};
export function buildLines(TS,WT,LN){
 const starts=Array.isArray(TS)?TS:[],times=Array.isArray(WT)?WT:[],texts=Array.isArray(LN)?LN:[];
 return texts.map((rawText,index)=>{
  const fullText=String(rawText??''),graphemes=splitGraphemes(fullText);
  const startTime=finite(starts[index])?Number(starts[index]):0;
  const nextStart=finite(starts[index+1])?Number(starts[index+1]):NaN;
  const raw=Array.isArray(times[index])?times[index]:[];
  const glyphs=graphemes.map((text,j)=>({text,...readGlyphTiming(raw,j,startTime,Number.isFinite(nextStart)&&nextStart>startTime?nextStart:startTime+Math.max(2,graphemes.length*0.22),graphemes.length)}));
  const inferredEnd=glyphs.reduce((latest,glyph)=>Math.max(latest,glyph.endTime),startTime);
  const endTime=Number.isFinite(nextStart)&&nextStart>startTime?Math.max(nextStart,inferredEnd):Math.max(inferredEnd,startTime+0.067);
  const tokens=segmentWords(fullText),words=[];let cursor=0;
  for(const token of tokens){
   let found=-1;
   for(let j=cursor;j<=graphemes.length-token.graphemes.length;j++){
    if(token.graphemes.every((g,k)=>graphemes[j+k]===g)){found=j;break;}
   }
   if(found<0)continue;
   const tokenGlyphs=glyphs.slice(found,found+token.graphemes.length);
   const syllables=tokenGlyphs.map(g=>({text:g.text,startTime:g.startTime,endTime:g.endTime}));
   words.push({text:token.text,startTime:syllables[0]?.startTime??startTime,endTime:syllables[syllables.length-1]?.endTime??endTime,syllables});
   cursor=found+token.graphemes.length;
  }
  const line={id:String(index),fullText,startTime,endTime,words};
  line.renderHints=buildLineRenderHints(line);
  return line;
 });
}
