"""Render the matching geometric submission mark. Requires Pillow; no fonts or network.
Usage: python scripts/export-logo.py /absolute/output.png
SVG source: assets/brand/tradepilot-mark.svg
"""
from pathlib import Path
import sys
from PIL import Image, ImageDraw
if len(sys.argv)!=2:raise SystemExit('Usage: python scripts/export-logo.py output.png')
s=4
im=Image.new('RGB',(1024*s,1024*s),'#11131b');d=ImageDraw.Draw(im)
def points(p):return [(x*s,y*s) for x,y in p]
d.ellipse((192*s,192*s,832*s,832*s),outline='#303344',width=12*s)
for p in [[(512,154),(512,210)],[(814,512),(870,512)],[(512,814),(512,870)],[(154,512),(210,512)]]:
 d.line(points(p),fill='#62677e',width=12*s)
 for x,y in p:d.ellipse(((x-6)*s,(y-6)*s,(x+6)*s,(y+6)*s),fill='#62677e')
d.polygon(points([(716,294),(571,656),(491,513),(348,433)]),fill='#9f8bff')
d.polygon(points([(716,294),(491,513),(571,656)]),fill='#6f55dd')
p=[(312,600),(401,689),(531,559)];d.line(points(p),fill='#f1f3fa',width=48*s,joint='curve')
for x,y in p:d.ellipse(((x-24)*s,(y-24)*s,(x+24)*s,(y+24)*s),fill='#f1f3fa')
out=Path(sys.argv[1]);out.parent.mkdir(parents=True,exist_ok=True);im.resize((1024,1024),Image.Resampling.LANCZOS).save(out,optimize=True)
with Image.open(out) as check:check.load();assert check.size==(1024,1024) and check.mode=='RGB'
assert out.stat().st_size<2*1024*1024
print(f'PNG 1024x1024 RGB, {out.stat().st_size} bytes')
