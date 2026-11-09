import React from 'react';
import {createRoot} from 'react-dom/client';
import {motionValue} from 'framer-motion';
import VisualizerFume from '@folia/src/components/visualizer/fume/VisualizerFume.tsx';
import { buildLines } from './lyrics-adapter.mjs';
const finite=value=>value!==null&&value!==''&&Number.isFinite(Number(value));
const defaultTheme=()=>({name:'Yiu.fm',backgroundColor:'#101116',primaryColor:'#f5f3ef',secondaryColor:'#a7a4a0',accentColor:'#d8c5a4',fontStyle:'sans',fontFamilyStack:['-apple-system','BlinkMacSystemFont','sans-serif'],fontWeight:500,animationIntensity:'normal',wordColors:[]});
const normalizeTheme=value=>({...defaultTheme(),...(value||{})});
const DEFAULT_TUNING={hidePrintSymbols:false,disableGeometricBackground:true,backgroundObjectOpacity:0.5,textHoldRatio:1,cameraTrackingMode:'smooth',cameraSpeed:1,glowIntensity:1,heroScale:1};
function create(host,options={}){
 if(!host)throw new Error('Folia Fume requires a host element');
 const currentTime=motionValue(0),audioPower=motionValue(0);
 const audioBands={bass:motionValue(0),lowMid:motionValue(0),mid:motionValue(0),vocal:motionValue(0),treble:motionValue(0)};
 let lines=[],theme=normalizeTheme(options.theme),tuning={...DEFAULT_TUNING,...(options.tuning||{})};
 let currentLineIndex=-1,paused=true,destroyed=false;
 const root=createRoot(host);
 const resolveLineIndex=time=>{let found=-1;for(let i=0;i<lines.length;i++){if(time>=lines[i].startTime)found=i;else break;}return found;};
 const render=()=>{if(destroyed)return;root.render(<VisualizerFume currentTime={currentTime} currentLineIndex={currentLineIndex} lines={lines} theme={theme} subtitleTheme={theme} audioPower={audioPower} audioBands={audioBands} fumeTuning={tuning} showText={true} seed={options.seed??'yiu-fume'} lyricsFontScale={options.lyricsFontScale??1} subtitleFontScale={1} isPlayerChromeHidden={true} hideTranslationSubtitle={true} showSubtitleTranslation={false} subtitleContentMode="none" paused={paused} staticMode={false}/>);};
 render();
 return {
  setLyrics(TS,WT,LN){lines=buildLines(TS,WT,LN);currentLineIndex=resolveLineIndex(currentTime.get());render();},
  setTime(value){const t=Number(value);if(!Number.isFinite(t))return;currentTime.set(Math.max(0,t));const next=resolveLineIndex(t);if(next!==currentLineIndex){currentLineIndex=next;render();}},
  setTheme(value){theme=normalizeTheme(value);render();},
  setTuning(patch){tuning={...tuning,...(patch||{})};render();},
  setAudioBands(value={}){if(finite(value.power))audioPower.set(Math.max(0,Math.min(1,Number(value.power))));for(const key of Object.keys(audioBands))if(finite(value[key]))audioBands[key].set(Math.max(0,Math.min(1,Number(value[key]))));},
  start(){if(destroyed||!paused)return;paused=false;render();},
  stop(){if(destroyed||paused)return;paused=true;render();},
  destroy(){if(destroyed)return;destroyed=true;root.unmount();}
 };
}
window.FumeFoliaBundle={create,buildLines};
