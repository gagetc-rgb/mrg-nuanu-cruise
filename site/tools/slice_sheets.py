"""Slice transparent sprite sheets into separate trimmed sprites (alpha connected components, row-major order)."""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage

def slice_sheet(path, out_prefix, min_area=0.002, pad=6):
    im = Image.open(path).convert('RGBA')
    a = np.array(im)[:, :, 3] > 24
    a = ndimage.binary_dilation(a, iterations=12)  # glue nearby fragments (sparkles, confetti)
    lab, n = ndimage.label(a)
    boxes = [s for s in ndimage.find_objects(lab) if s and (s[0].stop - s[0].start) * (s[1].stop - s[1].start) > min_area * a.size]
    H = im.height
    boxes.sort(key=lambda s: (round(((s[0].start + s[0].stop) / 2) / (H / 3)), s[1].start))
    out = []
    for i, (ys, xs) in enumerate(boxes):
        box = (max(0, xs.start - pad), max(0, ys.start - pad), min(im.width, xs.stop + pad), min(H, ys.stop + pad))
        crop = im.crop(box)
        crop = crop.crop(crop.getbbox())
        p = f'{out_prefix}_{i}.png'; crop.save(p); out.append((p, crop.size))
    return out

if __name__ == '__main__':
    for p, s in slice_sheet(sys.argv[1], sys.argv[2]):
        print(p, s)


def slice_grid(path, out_prefix, cols, rows):
    """Cut a sheet into an even grid and trim each cell to its non-transparent content."""
    im = Image.open(path).convert('RGBA')
    cw, ch = im.width / cols, im.height / rows
    out = []
    for r in range(rows):
        for c in range(cols):
            cell = im.crop((int(c * cw), int(r * ch), int((c + 1) * cw), int((r + 1) * ch)))
            a = np.array(cell)[:, :, 3]
            cell.putalpha(Image.fromarray(np.where(a > 24, a, 0).astype('uint8')))
            bb = cell.getbbox()
            if not bb: continue
            p = f'{out_prefix}_{len(out)}.png'; cell.crop(bb).save(p); out.append((p, bb[2] - bb[0], bb[3] - bb[1]))
    return out
