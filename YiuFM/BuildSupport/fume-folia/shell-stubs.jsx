import React from 'react';
const css=`
.yiu-folia-fume-shell{position:absolute;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:none}
.yiu-folia-fume-shell>.relative{position:absolute;inset:0;width:100%;height:100%}
.yiu-folia-fume-shell .relative{position:relative}.yiu-folia-fume-shell .absolute{position:absolute}
.yiu-folia-fume-shell .inset-0{inset:0}.yiu-folia-fume-shell .left-1\\/2{left:50%}
.yiu-folia-fume-shell .top-0{top:0}.yiu-folia-fume-shell .-translate-x-1\\/2{translate:-50% 0}
.yiu-folia-fume-shell .h-full{height:100%}.yiu-folia-fume-shell .w-full{width:100%}
.yiu-folia-fume-shell .pointer-events-none{pointer-events:none}.yiu-folia-fume-shell .z-10{z-index:10}
.yiu-folia-fume-shell .flex{display:flex}.yiu-folia-fume-shell .items-center{align-items:center}
.yiu-folia-fume-shell .justify-center{justify-content:center}
`;
export default function VisualizerShell({children}){return <><style>{css}</style><div className="yiu-folia-fume-shell">{children}</div></>;}
export function VisualizerSubtitleOverlay(){return null;}
export function useFirstFrameDrawn(){return ()=>{};}
export const ARRIVING_MARK='data-arriving';
