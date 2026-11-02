from pathlib import Path

path = Path("YiuFM/Resources/Web/APP/P1.js")
source = path.read_text(encoding="utf-8")

# Partita's normal per-character entrance transition lasts 6x that character's
# timestamp span, and each character is additionally delayed by its offset
# from the word start. The state must not switch to "passed" until the final
# character's actual entrance transition has completed.
helper_anchor = "k0=(t,e)=>t.syllables?.length?t.syllables.flatMap(n=>Wd(n.text,n.startTime,n.endTime,e)):Wd(t.text,t.startTime,t.endTime,e),G2="
helper = """k0=(t,e)=>t.syllables?.length?t.syllables.flatMap(n=>Wd(n.text,n.startTime,n.endTime,e)):Wd(t.text,t.startTime,t.endTime,e),wordAnimationEnd=(t,e)=>{let n=k0(t),i=mc(t,e),o=_A(t,e);if(e.wordRevealMode==="normal"&&n.length>1)return Math.max(i,...n.map(a=>a.startTime+Math.max(a.endTime-a.startTime,.001)*6));let r=e.wordRevealMode==="instant"?Math.min(o||.08,.12):e.wordRevealMode==="fast"?Math.min(Math.max(o||.12,.12),.2):o||.1;return Math.max(i,t.startTime+r)},G2="""
if source.count(helper_anchor) != 1:
    raise SystemExit(f"Expected one Partita character segmentation anchor, found {source.count(helper_anchor)}")
if "wordAnimationEnd=" not in source:
    source = source.replace(helper_anchor, helper, 1)

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
if source.count("wordAnimationEnd=") != 1:
    raise SystemExit("Expected exactly one actual animation-end helper.")

path.write_text(source, encoding="utf-8")
print("Partita word clock patched: exact start timestamps + per-character animation completion deadlines.")
