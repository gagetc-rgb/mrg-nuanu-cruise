"""Hero sun with a photo face: cut the head out of src_photos/solon.avif (hair + face, cut along the jaw,
no neck or shirt) and repaint the cartoon sun's disc plain so the photo head can sit on it.

Outputs: assets/heads/solon.webp (paper cut-out head), assets/sun_rays.webp (rays + empty disc).
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
from rembg import new_session, remove

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', 'assets')

# ---------------- head ----------------
photo = Image.open(os.path.join(HERE, 'src_photos', 'solon.avif')).convert('RGB')
W, H = photo.size
cut = remove(photo, session=new_session('birefnet-general-lite')).convert('RGBA')
a = np.array(cut).astype(float)

# jaw line measured on the photo (649x466): ear lobe -> chin -> right cheek; everything below it is neck/shirt
JAW = [(222, 238), (238, 250), (248, 263), (256, 276), (272, 287), (295, 295), (315, 298), (332, 298),
       (353, 293), (370, 282), (385, 267), (398, 254), (404, 238), (412, 200)]
SS = 4   # draw the mask supersampled so the jaw edge is anti-aliased
poly = [(0, 0), (W, 0), (W, 200)] + JAW[::-1] + [(0, 238)]
m = Image.new('L', (W * SS, H * SS), 0)
ImageDraw.Draw(m).polygon([(x * SS, y * SS) for x, y in poly], fill=255)
m = m.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(.6))
a[:, :, 3] *= np.array(m) / 255

# the matting keeps a few thin dark strands of the curtain above the hair: a smooth silhouette (opening drops
# strands, hole filling keeps the hair solid) decides what stays; inside it the head is fully opaque
yk, xk = np.mgrid[-4:5, -4:5]
disk = xk ** 2 + yk ** 2 <= 16
sil = ndimage.binary_opening(a[:, :, 3] > 100, structure=disk)
lab, _ = ndimage.label(sil)
sil = ndimage.binary_fill_holes(lab == lab[180, 310])
inner = ndimage.binary_erosion(sil, iterations=3)
a[:, :, 3] = np.where(inner, np.maximum(a[:, :, 3], np.array(m) * 1.0), a[:, :, 3])
a[:, :, 3] *= ndimage.binary_dilation(sil, iterations=1)

head = Image.fromarray(a.astype('uint8'))
head = head.crop(head.getbbox())
head = head.resize((head.width * 2, head.height * 2), Image.LANCZOS)   # small source: upscale before the border
pad = 16
canvas = Image.new('RGBA', (head.width + 2 * pad, head.height + 2 * pad), (0, 0, 0, 0))
canvas.paste(head, (pad, pad), head)
alpha = canvas.getchannel('A').point(lambda v: 255 if v > 40 else 0).filter(ImageFilter.MaxFilter(17))
sticker = Image.new('RGBA', canvas.size, (255, 252, 240, 255))
sticker.putalpha(alpha.filter(ImageFilter.GaussianBlur(.7)))
sticker.alpha_composite(canvas)
sticker.thumbnail((440, 440), Image.LANCZOS)
sticker.save(os.path.join(ASSETS, 'heads', 'solon.webp'), 'WEBP', quality=90)
print('head', sticker.size)

# ---------------- sun with an empty disc ----------------
sun = Image.open(os.path.join(ASSETS, 'sun_face.webp')).convert('RGBA')
S = sun.size[0]
CX, CY, RX, RY = 395, 388.5, 211, 219.5      # inside the disc's inner outline (measured on the 783x788 art)
yy, xx = np.mgrid[0:sun.size[1], 0:S].astype(float)
d = np.sqrt(((xx - CX) / RX) ** 2 + ((yy - CY) / RY) ** 2)
# warm radial gradient, light from the upper left
g = np.clip(np.sqrt(((xx - CX + 60) / RX) ** 2 + ((yy - CY + 70) / RY) ** 2) / 1.5, 0, 1)[..., None]
col = (1 - g) * np.array([255, 221, 92]) + g * np.array([238, 166, 30])
# comic halftone shading toward the lower right rim
shade = np.clip((((xx - CX) / RX) * .55 + ((yy - CY) / RY) * .75 + d * .6 - .55) / .8, 0, 1)
cell = 9
fx, fy = (xx % cell) - cell / 2, (yy % cell) - cell / 2
dots = np.sqrt(fx ** 2 + fy ** 2) < shade * cell * .52
col[dots] = col[dots] * .72 + np.array([190, 95, 10]) * .28
disc = np.clip(1 - (d - 1) * RX, 0, 1)        # ~1px anti-aliased edge
arr = np.array(sun).astype(float)
# the old glasses' hinges sit on the ring's inner line: copy the ring from a clean spot further round
th = np.degrees(np.arctan2((yy - CY) / RY, (xx - CX) / RX)) % 360
for at, shift in ((191, -22), (349, 22)):
    win = (np.abs((th - at + 180) % 360 - 180) < 9) & (d > .97) & (d < 1.08)
    ts = np.radians(th[win] + shift)
    sx = np.clip(np.round(CX + d[win] * RX * np.cos(ts)).astype(int), 0, S - 1)
    sy = np.clip(np.round(CY + d[win] * RY * np.sin(ts)).astype(int), 0, sun.size[1] - 1)
    arr[win] = arr[sy, sx]
arr[:, :, :3] = arr[:, :, :3] * (1 - disc[..., None]) + col * disc[..., None]
Image.fromarray(arr.astype('uint8')).save(os.path.join(ASSETS, 'sun_rays.webp'), 'WEBP', quality=90)
print('sun', sun.size)
