#!/usr/bin/env python3
"""Apply the event-driven refresh bridge to the pinned Run #13 mini-player copy.

This intentionally patches only the build workspace after the exact legacy UI
baseline is restored. The repository's original APP/mini-player.js is untouched.
"""
from pathlib import Path

path = Path("YiuFM/Resources/Web/APP/mini-player.js")
source = path.read_text(encoding="utf-8")

replacements = [
    (
        'var npImg=npCard.querySelector("#npImg"),npTt=npCard.querySelector("#npTt"),npS1=npCard.querySelector("#npS1"),npS2=npCard.querySelector("#npS2"),npTimer=0;',
        'var npImg=npCard.querySelector("#npImg"),npTt=npCard.querySelector("#npTt"),npS1=npCard.querySelector("#npS1"),npS2=npCard.querySelector("#npS2");\n  var npRefreshRaf=0;'
    ),
    (
        '    npRefresh();clearInterval(npTimer);npTimer=setInterval(npRefresh,document.body.classList.contains("performance-mode")?100:50);',
        '    npRefresh();'
    ),
    (
        '    clearInterval(npTimer);\n    npCard.classList.remove("show");',
        '    if(npRefreshRaf){cancelAnimationFrame(npRefreshRaf);npRefreshRaf=0;}\n    npCard.classList.remove("show");'
    ),
    (
        '  window.addEventListener("performance-mode-change",function(){\n    if(!npCard.classList.contains("show"))return;\n    clearInterval(npTimer);\n    npTimer=setInterval(npRefresh,document.body.classList.contains("performance-mode")?100:50);\n  });',
        '  window.addEventListener("performance-mode-change",function(){requestNpRefresh();});'
    ),
    (
        '    isNpDragging = false;\n  }\n\n  if (miGrab) {',
        '    isNpDragging = false;\n    requestNpRefresh();\n  }\n\n  if (miGrab) {'
    ),
]

for old, new in replacements:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one mini-player patch anchor, found {count}: {old[:100]!r}")
    source = source.replace(old, new, 1)

bridge_anchor = '  function npOpen(){'
bridge = r'''  // Event-driven card refresh: coalesce all state/DOM signals into one animation frame.
  function requestNpRefresh(){
    if(!npCard.classList.contains("show")&&!isNpDragging)return;
    if(npRefreshRaf)return;
    npRefreshRaf=requestAnimationFrame(function(){
      npRefreshRaf=0;
      if(npCard.classList.contains("show")||isNpDragging)npRefresh();
    });
  }
  if(window.YiuPlayback&&typeof window.YiuPlayback.subscribe==="function"){
    window.YiuPlayback.subscribe(function(){requestNpRefresh();});
  }
  if(window.YiuLibrary&&typeof window.YiuLibrary.subscribe==="function"){
    window.YiuLibrary.subscribe(function(){requestNpRefresh();});
  }
  // The legacy renderer updates .mi-s only when its displayed status actually changes.
  // Observe that real DOM change instead of polling it every 50ms.
  if(window.MutationObserver&&mini){
    var npMiniObserver=new MutationObserver(function(){requestNpRefresh();});
    npMiniObserver.observe(mini,{
      childList:true,characterData:true,subtree:true,
      attributes:true,attributeFilter:["class"]
    });
  }

'''
if source.count(bridge_anchor) != 1:
    raise SystemExit("Expected exactly one npOpen insertion anchor.")
source = source.replace(bridge_anchor, bridge + bridge_anchor, 1)

path.write_text(source, encoding="utf-8")
print("Applied event-driven mini-player refresh bridge to the build workspace.")
