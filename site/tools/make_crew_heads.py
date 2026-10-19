"""Cut the 8 photographer faces (mrg_faces sheet, 4x2 on white) into sticker heads crew_0..crew_7."""
import os
import numpy as np
from PIL import Image, ImageFilter
from rembg import new_session, remove

HERE = os.path.dirname(os.path.abspath(__file__))
SHEET = os.path.join(HERE, '..', '..', 'mrg_faces', 'indonesian_faces_sheet_v1.png')
OUT = os.path.join(HERE, '..', 'assets', 'heads')
session = new_session('isnet-general-use')
im = Image.open(SHEET).convert('RGB')
cw, ch = im.width / 4, im.height / 2
for i in range(8):
    r, c = divmod(i, 4)
    cell = im.crop((int(c * cw), int(r * ch), int((c + 1) * cw), int((r + 1) * ch)))
    cut = remove(cell, session=session).convert('RGBA')
    cut = cut.crop(cut.getbbox())
    pad = 14
    canvas = Image.new('RGBA', (cut.width + 2 * pad, cut.height + 2 * pad), (0, 0, 0, 0))
    canvas.paste(cut, (pad, pad), cut)
    alpha = canvas.getchannel('A').point(lambda v: 255 if v > 40 else 0).filter(ImageFilter.MaxFilter(15))
    out = Image.new('RGBA', canvas.size, (255, 252, 240, 255)); out.putalpha(alpha)
    out.alpha_composite(canvas)
    out.thumbnail((420, 420), Image.LANCZOS)
    out.save(os.path.join(OUT, f'crew_{i}.webp'), 'WEBP', quality=88)
    print(f'crew_{i}', out.size, flush=True)
