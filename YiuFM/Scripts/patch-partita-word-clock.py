from pathlib import Path

path = Path("YiuFM/Resources/Web/APP/P1.js")
source = path.read_text(encoding="utf-8")

# Preserve Folia's original waiting-state entrance offsets. They are intentional motion,
# not a layout correction. Restore the original AnimatePresence popLayout behavior below.
for token, label in (
    ("x:n.x+Math.sin(n.y)*100", "per-word entrance offset"),
    ('x:p==="waiting"?n.x+(g==="left"?-40:40):n.x', "chunk entrance offset"),
):
    if source.count(token) != 1:
        raise SystemExit(f"Expected exactly one original {label}, found {source.count(token)}")

# Partita's normal per-character entrance transition lasts 6x that character's
# timestamp span, and each character is additionally delayed by its offset
# from the word start. The state must not switch to "passed" until the final
# character's actual entrance transition has completed.
helper_anchor = "k0=(t,e)=>t.syllables?.length?t.syllables.flatMap(n=>Wd(n.text,n.startTime,n.endTime,e)):Wd(t.text,t.startTime,t.endTime,e),G2="
helper = """k0=(t,e)=>t.syllables?.length?t.syllables.flatMap(n=>Wd(n.text,n.startTime,n.endTime,e)):Wd(t.text,t.startTime,t.endTime,e),wordAnimationEnd=(t,e)=>{let n=k0(t),i=mc(t,e),o=_A(t,e);if(e.wordRevealMode==="normal"&&n.length>1)return Math.max(i,...n.map(a=>a.startTime+Math.max(a.endTime-a.startTime,.001)*6));let r=e.wordRevealMode==="instant"?Math.min(o||.08,.12):e.wordRevealMode==="fast"?Math.min(Math.max(o||.12,.12),.2):o||.1;return Math.max(i,t.startTime+r)},G2="""
if source.count(helper_anchor) != 1:
    raise SystemExit(f"Expected one Partita character segmentation anchor, found {source.count(helper_anchor)}")
if source.count("x:n.x+Math.sin(n.y)*100") != 1:
    raise SystemExit("Expected Folia's original per-word horizontal entrance motion.")
if source.count('x:p==="waiting"?n.x+(g==="left"?-40:40):n.x') != 1:
    raise SystemExit("Expected Folia's original chunk horizontal entrance motion.")

if "wordAnimationEnd=" not in source:
    source = source.replace(helper_anchor, helper, 1)

# The line container already defines an exit variant, but without an
# AnimatePresence boundary React removes the keyed previous line immediately.
# Keep it mounted through the longest child word/character entrance deadline.
profile_anchor = 'b=p?NA(p):null,E=b?zA(b):{initial:{opacity:1},animate:{opacity:1},exit:{opacity:0}},v=(0,We.useMemo)(()=>p?J0(m.current,p,o,c,d):nM,[p,o,c,d]),g=v.columns.length'
profile_replacement = 'b=p?NA(p):null,E=b?zA(b):{initial:{opacity:1},animate:{opacity:1},exit:{opacity:0}},v=(0,We.useMemo)(()=>p?J0(m.current,p,o,c,d):nM,[p,o,c,d]),lineAnimationEnd=b?Math.max(0,...v.columns.flatMap(Y=>Y.words.flatMap(X=>(X.displayWords??[]).map(Gt=>wordAnimationEnd(Gt,b))))):0,g=v.columns.length'
if source.count(profile_anchor) != 1:
    raise SystemExit(f"Expected one Partita line-profile anchor, found {source.count(profile_anchor)}")
source = source.replace(profile_anchor, profile_replacement, 1)


# A newly mounted line can already be part-way through playback. MotionValue
# change subscriptions do not replay their current value, so initializing
# every word/chunk as "waiting" creates a stale first frame and a spurious
# horizontal entrance when the next animation frame arrives.
word_state_old = 'let[m,p]=(0,gc.useState)("waiting"),x=(0,gc.useMemo)(()=>1.5+Math.random()*2,[]),b=_A(t,u),E=mc(t,u),v=(0,gc.useMemo)(()=>k0(t),[t]);'
word_state_new = 'let[m,p]=(0,gc.useState)(()=>{let g=n.get(),h=wordAnimationEnd(t,u);return g>=t.startTime&&g<=h?"active":g>h?"passed":"waiting"}),x=(0,gc.useMemo)(()=>1.5+Math.random()*2,[]),b=_A(t,u),E=mc(t,u),v=(0,gc.useMemo)(()=>k0(t),[t]);'
if source.count(word_state_old) != 1:
    raise SystemExit(f"Expected one GlowWord initial-state anchor, found {source.count(word_state_old)}")
source = source.replace(word_state_old, word_state_new, 1)

chunk_state_old = 'let[p,x]=(0,cM.useState)("waiting"),b=t[0].startTime,E=mc(t[t.length-1],c);'
chunk_state_new = 'let[p,x]=(0,cM.useState)(()=>{let y=o.get(),h=Math.max(mc(t[t.length-1],c),...e.map(w=>wordAnimationEnd(w,c)));return y>=t[0].startTime&&y<=h?"active":y>h?"passed":"waiting"}),b=t[0].startTime,E=mc(t[t.length-1],c);'
if source.count(chunk_state_old) != 1:
    raise SystemExit(f"Expected one PartitaChunk initial-state anchor, found {source.count(chunk_state_old)}")
source = source.replace(chunk_state_old, chunk_state_new, 1)

initial_old = 'initial:"waiting",animate:m,className:"inline-block origin-center relative will-change-transform whitespace-nowrap"'
initial_new = 'initial:m,animate:m,className:"inline-block origin-center relative will-change-transform whitespace-nowrap"'
if source.count(initial_old) != 1:
    raise SystemExit(f"Expected one GlowWord initial variant, found {source.count(initial_old)}")
source = source.replace(initial_old, initial_new, 1)

word_old = 'v=(0,gc.useMemo)(()=>k0(t),[t]);return Yn(n,"change",g=>{let y="waiting";g>=t.startTime-u.wordLookahead&&g<=E?y="active":g>E&&(y="passed")'
word_new = 'v=(0,gc.useMemo)(()=>k0(t),[t]),h=wordAnimationEnd(t,u);return Yn(n,"change",g=>{let y="waiting";g>=t.startTime&&g<=h?y="active":g>h&&(y="passed")'
chunk_old = 'b=t[0].startTime,E=mc(t[t.length-1],c);Yn(o,"change",y=>{let S="waiting";y>=b-c.wordLookahead&&y<=E?S="active":y>E&&(S="passed")'
chunk_new = 'b=t[0].startTime,E=mc(t[t.length-1],c),h=Math.max(E,...e.map(w=>wordAnimationEnd(w,c)));Yn(o,"change",y=>{let S="waiting";y>=b&&y<=h?S="active":y>h&&(S="passed")'

for old, new, label in ((word_old, word_new, "word state"), (chunk_old, chunk_new, "chunk state")):
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one {label} timing gate, found {count}")
    source = source.replace(old, new, 1)

if "startTime-u.wordLookahead" in source or "b-c.wordLookahead" in source:
    raise SystemExit("A Partita early-reveal gate remains; refusing to continue.")
if "E+0.08" in source:
    raise SystemExit("The obsolete fixed 80ms grace remains; refusing to continue.")

line_wrapper_old = 'children:[u&&p&&b&&(0,In.jsx)(St.div,'
line_wrapper_new = 'children:[u&&p&&b&&(0,In.jsx)(Pl,{initial:!1,mode:"popLayout",children:(0,In.jsx)(St.div,'
if source.count(line_wrapper_old) != 1:
    raise SystemExit(f"Expected one active Partita line container, found {source.count(line_wrapper_old)}")
source = source.replace(line_wrapper_old, line_wrapper_new, 1)
line_close_old = '},p.startTime),u&&p&&!b&&'
line_close_new = '},p.startTime)}),u&&p&&!b&&'
if source.count(line_close_old) != 1:
    raise SystemExit(f"Expected one active Partita line close, found {source.count(line_close_old)}")
source = source.replace(line_close_old, line_close_new, 1)
exit_old = 'variants:{leave:Y=>Y?LV:E.exit}'
exit_new = 'variants:{leave:Y=>Y?LV:{...E.exit,transition:{...(E.exit.transition??{}),duration:Math.max(E.exit.transition?.duration??0,lineAnimationEnd-e.get())}}}'
if source.count(exit_old) != 1:
    raise SystemExit(f"Expected one Partita line exit variant, found {source.count(exit_old)}")
source = source.replace(exit_old, exit_new, 1)
if source.count("wordAnimationEnd=") != 1:
    raise SystemExit("Expected exactly one actual animation-end helper.")
if source.count("lineAnimationEnd=b?Math.max(0,...v.columns.flatMap") != 1:
    raise SystemExit("Expected exactly one full-line animation deadline.")
if source.count('Pl,{initial:!1,mode:"popLayout",children:(0,In.jsx)(St.div,') != 1:
    raise SystemExit("Expected the active lyric line to be retained by AnimatePresence.")
if source.count("duration:Math.max(E.exit.transition?.duration??0,lineAnimationEnd-e.get())") != 1:
    raise SystemExit("Expected the line exit to wait for its final word animation.")

path.write_text(source, encoding="utf-8")
print("Partita word clock patched: exact start timestamps + per-character animation completion deadlines.")
