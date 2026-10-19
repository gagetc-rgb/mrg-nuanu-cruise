"""'Attention! / Thank you for attention' meme: straighten the paper sheet off the brick wall (perspective warp)."""
import os
import cv2
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
im = cv2.imread(os.path.join(HERE, 'src_photos', 'meme_attention.jpg'))
# sheet corners in the screenshot: TL, TR, BR, BL
src = np.float32([[117, 461], [512, 455], [517, 901], [124, 906]])
W, H = 800, 910
dst = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
warp = cv2.warpPerspective(im, cv2.getPerspectiveTransform(src, dst), (W, H), flags=cv2.INTER_CUBIC)
out = Image.fromarray(cv2.cvtColor(warp, cv2.COLOR_BGR2RGB))
out.save(os.path.join(HERE, '..', 'assets', 'meme_attention.webp'), 'WEBP', quality=90)
print(out.size)
