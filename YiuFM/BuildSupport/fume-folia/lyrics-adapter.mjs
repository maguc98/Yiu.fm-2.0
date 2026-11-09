const finite=value=>value!==null&&value!==''&&Number.isFinite(Number(value));
const splitGraphemes=value=>{
 const text=String(value??'');
 if(typeof Intl!=='undefined'&&Intl.Segmenter){
  try{return Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text),item=>item.segment);}catch(_){}
 }
 return Array.from(text);
};
export function buildLines(TS,WT,LN){
 const starts=Array.isArray(TS)?TS:[],times=Array.isArray(WT)?WT:[],texts=Array.isArray(LN)?LN:[];
 return texts.map((rawText,index)=>{
  const fullText=String(rawText??''),chars=splitGraphemes(fullText);
  const startTime=finite(starts[index])?Number(starts[index]):0;
  const nextStart=finite(starts[index+1])?Number(starts[index+1]):NaN;
  const endTime=Number.isFinite(nextStart)&&nextStart>startTime?nextStart:startTime+Math.max(2,chars.length*0.22);
  const raw=Array.isArray(times[index])?times[index]:[];
  const startsForChars=chars.map((_,j)=>{
   const value=raw[j];
   if(Array.isArray(value)&&finite(value[0]))return Number(value[0]);
   if(finite(value))return Number(value);
   return startTime+(endTime-startTime)*j/Math.max(chars.length,1);
  });
  const words=chars.map((text,j)=>{
   const start=startsForChars[j],pair=raw[j];let end=endTime;
   if(Array.isArray(pair)&&finite(pair[1])&&Number(pair[1])>start)end=Number(pair[1]);
   else for(let k=j+1;k<startsForChars.length;k++)if(startsForChars[k]>start){end=startsForChars[k];break;}
   if(!(end>start))end=start+0.01;
   return {text,startTime:start,endTime:end};
  });
  return {id:String(index),fullText,startTime,endTime,words};
 });
}
