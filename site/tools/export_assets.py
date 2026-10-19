"""Export site assets: clean stray fragments, resize, save as WebP into ../assets."""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'recovered_mrg_assets', 'png')
CELLS = os.path.join(HERE, 'cells')
OUT = os.path.join(HERE, '..', 'assets')
os.makedirs(OUT, exist_ok=True)

# sprites made of many small pieces: never drop fragments
MULTIPART = {'bit_7', 'shape_7', 'props_0', 'fly_1', 'props_1', 'cloud_4'}


def clean(im):
    """Drop small detached fragments (neighbour leftovers from sheet slicing)."""
    a = np.array(im)
    lab, n = ndimage.label(a[:, :, 3] > 24)
    if n < 2:
        return im
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 0.03 * sizes.max()])
    a[:, :, 3] = np.where(ndimage.binary_dilation(keep, iterations=3), a[:, :, 3], 0)
    out = Image.fromarray(a)
    return out.crop(out.getbbox())


def save(im, name, max_side, q=86):
    im = im.copy()
    im.thumbnail((max_side, max_side), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=q, method=6)


# full images: source file -> (asset name, max side)
FULL = {
    '01_dice_palette_f_0002af': None,
    '02_mrg_character_v1_f_0002b3': ('mrg_welcome', 1100),
    '05_mrg_waving_f_0002c1': ('mrg_wave', 1100),
    '06_mrg_phone_f_0002c7': ('mrg_champagne', 1100),
    '07_cadillac_white_f_0002cf': ('car_white', 1400),
    '08_cadillac_yellow_f_0002d5': ('car_gold', 1400),
    '09_cadillac_pink_f_0002db': ('car_pink', 1400),
    '10_purple_hat_feather_f_0002e4': ('hat', 700),
    '12_whitewall_wheel_f_0002ef': ('wheel', 400),
    '15_sunset_background_f_00030b': ('bg_sky', 1600),
    '16_palms_background_f_00030f': ('bg_hills', 1600),
    '17_palms_foreground_f_000315': ('bg_palms', 1600),
    '18_road_strip_f_000319': ('bg_road', 1600),
    '21_ornate_hand_f_00033d': ('giant_hand', 1000),
    '22_sun_face_v1_f_000341': ('sun_face', 800),
    '23_bare_foot_f_000346': ('giant_foot', 1100),
    '27_party_crowd_v1_f_00035f': ('crowd', 1600),
    '28_pink_curtain_f_000366': ('curtain', 1200),
    '29_gold_frame_landscape_f_00036c': ('frame_gold', 1600),
    '30_temple_sides_f_000372': ('gate', 1600),
    '36_scroll_paper_f_00039f': ('scroll_paper', 1300),
    '38_gold_frame_portrait_f_0003a8': ('vip_menu', 1100),
    '42_dark_dot_texture_f_0003c6': ('tex_dots', 600),
    '43_cream_texture_f_0003c7': ('tex_paper', 800),
    '44_pink_sleeve_hand_f_0003c8': ('mrg_arm', 800),
}
TRIM_FULL = {'mrg_welcome', 'mrg_wave', 'mrg_champagne', 'car_white', 'car_gold', 'car_pink', 'hat', 'wheel',
             'giant_hand', 'sun_face', 'giant_foot', 'curtain', 'scroll_paper', 'vip_menu', 'mrg_arm'}

for f, spec in FULL.items():
    if not spec:
        continue
    name, side = spec
    im = Image.open(os.path.join(SRC, f + '.png'))
    if name in TRIM_FULL:
        im = clean(im.convert('RGBA'))
        im = im.crop(im.getbbox())
    save(im, name, side, q=82 if name.startswith(('bg_', 'tex_')) else 86)

for fn in sorted(os.listdir(CELLS)):
    base = fn[:-4]
    im = Image.open(os.path.join(CELLS, fn)).convert('RGBA')
    if base not in MULTIPART:
        im = clean(im)
    save(im, base, 520 if base.startswith(('body', 'fly', 'light')) else 420)

print(len(os.listdir(OUT)), 'assets,', sum(os.path.getsize(os.path.join(OUT, x)) for x in os.listdir(OUT)) // 1024, 'KB')
