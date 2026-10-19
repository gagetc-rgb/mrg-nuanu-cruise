"""Cut talent heads out of square face crops: background removal, chin-level cut, white paper-cut border."""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
from rembg import new_session, remove

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'talent_gallery', 'cruise', 'heads')
OUT = os.path.join(HERE, '..', 'assets', 'heads')
os.makedirs(OUT, exist_ok=True)
session = new_session('isnet-general-use')
# manual erase boxes (x0, y0, x1, y1 as fractions of the crop) for leftovers the matting keeps
ERASE = {'007': [(0.76, 0, 1, 1)], '009': [(0, 0, 0.14, 1), (0.86, 0, 1, 1)]}

for fn in sorted(os.listdir(SRC)):
    if not fn.endswith('.jpg'):
        continue
    name = fn[:-4]
    im = Image.open(os.path.join(SRC, fn)).convert('RGB')
    im = im.resize((640, 640), Image.LANCZOS) if im.width < 640 else im
    cut = remove(im, session=session).convert('RGBA')
    a = np.array(cut).astype(float)
    s = a.shape[0]
    # face crops are centred on the face (crop = 2.2 x face width): fade out below the chin, keep a short neck
    y = np.arange(s)[:, None] / s
    cut_lo, cut_hi = (0.86, 0.93) if name == 'mrg' else (0.80, 0.87)
    a[:, :, 3] *= np.clip((cut_hi - y) / (cut_hi - cut_lo), 0, 1)
    for x0, y0, x1, y1 in ERASE.get(name, []):
        a[int(y0 * s):int(y1 * s), int(x0 * s):int(x1 * s), 3] = 0
    # keep only the blob under the face centre (drops background leftovers, hands, other people)
    lab, _ = ndimage.label(ndimage.binary_opening(a[:, :, 3] > 40, iterations=2))
    centre = lab[int(s * 0.5), int(s * 0.5)] or np.bincount(lab.ravel())[1:].argmax() + 1
    a[:, :, 3] *= ndimage.binary_dilation(lab == centre, iterations=2)
    head = Image.fromarray(a.astype('uint8'))
    head = head.crop(head.getbbox())
    # white sticker border, like a paper cut-out
    pad = 14
    canvas = Image.new('RGBA', (head.width + 2 * pad, head.height + 2 * pad), (0, 0, 0, 0))
    canvas.paste(head, (pad, pad), head)
    alpha = canvas.getchannel('A').point(lambda v: 255 if v > 40 else 0).filter(ImageFilter.MaxFilter(15))
    border = Image.new('RGBA', canvas.size, (255, 252, 240, 255))
    border.putalpha(alpha)
    border.alpha_composite(canvas)
    border.thumbnail((420, 420), Image.LANCZOS)
    border.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=88)
    print(name, border.size, flush=True)
