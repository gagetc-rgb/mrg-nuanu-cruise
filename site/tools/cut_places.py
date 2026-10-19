"""Cut Nuanu landmarks out of phone screenshots: stone head sculpture, Luna Beach Club entrance, glowing wire sculpture."""
import os
import numpy as np
from PIL import Image, ImageFilter
from rembg import new_session, remove

HERE = os.path.dirname(os.path.abspath(__file__))
SRC, OUT = os.path.join(HERE, 'src_photos'), os.path.join(HERE, '..', 'assets')
session = new_session('isnet-general-use')


def sticker(im, pad=12, border=11):
    """White paper-cut border around a cut-out, like the rest of the collage."""
    canvas = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0))
    canvas.paste(im, (pad, pad), im)
    alpha = canvas.getchannel('A').point(lambda v: 255 if v > 60 else 0).filter(ImageFilter.MaxFilter(border))
    out = Image.new('RGBA', canvas.size, (255, 252, 240, 255)); out.putalpha(alpha)
    out.alpha_composite(canvas)
    return out


def cut(name, box, out, max_side=900):
    im = Image.open(os.path.join(SRC, name)).convert('RGB').crop(box)
    im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)  # small screenshots: upscale before matting
    c = remove(im, session=session).convert('RGBA')
    c = c.crop(c.getbbox())
    s = sticker(c)
    s.thumbnail((max_side, max_side), Image.LANCZOS)
    s.save(os.path.join(OUT, out + '.webp'), 'WEBP', quality=88)
    print(out, s.size)


cut('nuanu_head.jpg', (0, 420, 597, 1040), 'place_nuanu_head')
cut('luna_entrance.jpg', (0, 400, 597, 1040), 'place_luna_entrance')

# wire sculpture: glowing lines on black -> alpha from brightness, colours kept luminous
im = Image.open(os.path.join(SRC, 'luna_wire.jpg')).convert('RGB').crop((70, 190, 1000, 800))
a = np.asarray(im).astype(float)
lum = a.max(axis=2)
alpha = np.clip((lum - 28) * 2.4, 0, 255)
rgb = np.clip(a * 1.25 + 20, 0, 255)
w = Image.fromarray(np.dstack([rgb, alpha]).astype('uint8'), 'RGBA')
w = w.crop(w.getbbox())
w.thumbnail((900, 900), Image.LANCZOS)
w.save(os.path.join(OUT, 'place_luna_wire.webp'), 'WEBP', quality=88)
print('place_luna_wire', w.size)

# Luna entrance: matting fails (straw dome vs cloudy sky), so cut it by a hand-traced outline (screenshot coords)
from PIL import ImageDraw
ent = Image.open(os.path.join(SRC, 'luna_entrance.jpg')).convert('RGBA')
poly = [(0, 930), (0, 560), (20, 522), (60, 484), (110, 458), (170, 449), (230, 460), (280, 492), (320, 542), (352, 600),
        (376, 660), (390, 730), (400, 775), (425, 775), (438, 625), (537, 625), (537, 790), (560, 860), (597, 875), (597, 930)]
m = Image.new('L', ent.size, 0)
ImageDraw.Draw(m).polygon(poly, fill=255)
ent.putalpha(m.filter(ImageFilter.GaussianBlur(1.2)))
ent = ent.crop(ent.getbbox())
ent = ent.resize((ent.width * 2, ent.height * 2), Image.LANCZOS)
s = sticker(ent, pad=16, border=15)
s.thumbnail((1000, 1000), Image.LANCZOS)
s.save(os.path.join(OUT, 'place_luna_entrance.webp'), 'WEBP', quality=88)
print('place_luna_entrance (traced)', s.size)
