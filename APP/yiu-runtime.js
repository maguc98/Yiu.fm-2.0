(function (global) {
'use strict';
if (global.YiuRuntimeV2) return;
var scheduler=global.YiuTimelineScheduler.create(), clock=global.YiuAudioClock||null;
var refs={TS:null,WT:null,LN:null}, enabled=true;
var stats={mode:'shadow',samples:0,lineStarts:0,lineEnds:0,wordStarts:0,timelineVersion:0,indexComparisons:0,indexMismatches:0,lastExpectedLineIndex:null,lastLegacyLineIndex:null,lastLyricTime:null,lastAudioTime:null,lastEvent:null,errors:0};
function refreshTimeline(currentTime) {
 var TS=global.TS||[], WT=global.WT||[], LN=global.LN||[];
 if(refs.TS===TS&&refs.WT===WT&&refs.LN===LN)return false;
 var options={currentTime:currentTime,includeCurrent:true};
 scheduler.setTimeline(TS,WT,LN,options); refs={TS:TS,WT:WT,LN:LN}; stats.timelineVersion++; return true;
}
function expectedLineIndex(currentTime,TS,LN) {
 var lo=0,hi=Math.min(TS.length,LN.length)-1,index=0;
 while(lo<=hi){var mid=(lo+hi)>>1;if((Number(TS[mid])||0)<=currentTime){index=mid;lo=mid+1;}else hi=mid-1;}
 return index;
}
function sample(lyricTime,legacyLineIndex) {
 if(!enabled)return;
 var current=Number(lyricTime); if(!isFinite(current)||current<0)return; stats.samples++;
 try {
  if(clock&&typeof clock.refresh==='function')clock.refresh();
  refreshTimeline(current);
  var TS=global.TS||[],LN=global.LN||[],expected=expectedLineIndex(current,TS,LN);
  if(typeof legacyLineIndex==='number'&&isFinite(legacyLineIndex)){
   stats.indexComparisons++;stats.lastExpectedLineIndex=expected;stats.lastLegacyLineIndex=legacyLineIndex;
   if(expected!==legacyLineIndex)stats.indexMismatches++;
  }
  scheduler.advance(current).forEach(function(e){
   if(e.type==='line-start')stats.lineStarts++;
   else if(e.type==='line-end')stats.lineEnds++;
   else if(e.type==='word-start')stats.wordStarts++;
   stats.lastEvent=e;
  });
  var a=clock&&typeof clock.getSnapshot==='function'?clock.getSnapshot():null;
  stats.lastAudioTime=a?a.currentTime:null; stats.lastLyricTime=current;
 } catch(error) { stats.errors++; if(global.console&&console.warn)console.warn('[YiuRuntimeV2] shadow sample failed',error); }
}
global.YiuRuntimeV2={version:'2.0-phase2-shadow-validation',mode:'shadow',sample:sample,
 refreshTimeline:function(){return refreshTimeline(stats.lastLyricTime==null?0:stats.lastLyricTime);},
 setEnabled:function(v){enabled=!!v;},
 snapshot:function(){return {mode:stats.mode,samples:stats.samples,lineStarts:stats.lineStarts,lineEnds:stats.lineEnds,wordStarts:stats.wordStarts,timelineVersion:stats.timelineVersion,indexComparisons:stats.indexComparisons,indexMismatches:stats.indexMismatches,lastExpectedLineIndex:stats.lastExpectedLineIndex,lastLegacyLineIndex:stats.lastLegacyLineIndex,lastLyricTime:stats.lastLyricTime,lastAudioTime:stats.lastAudioTime,lastEvent:stats.lastEvent,errors:stats.errors,scheduler:scheduler.getSnapshot()};}
};
})(window);
