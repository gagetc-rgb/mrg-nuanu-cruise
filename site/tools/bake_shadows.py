"""Bake the cut-out drop shadow into head and camera sprites so the page needs no CSS filter on them (smoother scrolling).
Idempotent: processed files are recorded in assets/.baked.json."""
import json, os, glob
from PIL import Image, ImageFilter

A = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')
log_p = os.path.join(A, '.baked.json')
done = set(json.load(open(log_p))) if os.path.exists(log_p) else set()
files = glob.glob(os.path.join(A, 'heads', '*.webp')) + glob.glob(os.path.join(A, 'cam_*.webp'))
for f in files:
    key = os.path.relpath(f, A).replace('\\', '/')
    if key in done:
        continue
    im = Image.open(f).convert('RGBA')
    dx, dy = round(im.width * .022), round(im.width * .032)
    out = Image.new('RGBA', (im.width + dx + 2, im.height + dy + 2), (0, 0, 0, 0))
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0))
    sh.putalpha(im.getchannel('A').point(lambda v: int(v * .4)))
    out.alpha_composite(sh.filter(ImageFilter.GaussianBlur(1)), (dx, dy))
    out.alpha_composite(im, (0, 0))
    out.save(f, 'WEBP', quality=88)
    done.add(key)
json.dump(sorted(done), open(log_p, 'w'))
print('baked', len(files))
