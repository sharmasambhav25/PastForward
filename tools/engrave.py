# Turn a brand collage tile into a blind-debossed paper texture.
import sys, numpy as np
from PIL import Image, ImageFilter
src, out, ink = sys.argv[1], sys.argv[2], sys.argv[3]   # ink: 'none' or 'oxblood'
im = Image.open(src).convert('L')
W, H = im.size
a = np.asarray(im).astype(np.float32) / 255.0
# shapes are the lighter parts of the collage; normalise to a 0..1 relief
lo, hi = np.percentile(a, 30), np.percentile(a, 92)
m = np.clip((a - lo) / (hi - lo + 1e-6), 0, 1)
relief = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))).astype(np.float32) / 255.0
# light from the top-left; debossed means the shapes sit lower than the paper
gy, gx = np.gradient(-relief)
lx, ly = -0.7, -0.7
shade = (gx * lx + gy * ly) * 9.0          # >0 lit edge, <0 shadowed edge
paper = np.array([237, 231, 221], np.float32) / 255.0   # --paper
rng = np.random.default_rng(7)
grain = rng.normal(0, 1, (H, W)).astype(np.float32)
grain = np.asarray(Image.fromarray(((grain * 18) + 128).clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32) / 255.0 - 0.5
col = np.ones((H, W, 3), np.float32) * paper
col *= (1 - 0.035 * relief)[..., None]                   # pressed areas a hair darker
if ink == 'oxblood':
    ox = np.array([142, 31, 43], np.float32) / 255.0
    col = col * (1 - 0.13 * relief[..., None]) + ox * (0.13 * relief[..., None])
col += (np.clip(shade, 0, None) * 0.10)[..., None]       # highlight on the lit wall
col -= (np.clip(-shade, 0, None) * 0.16)[..., None]      # shadow on the far wall
col += (grain * 0.03)[..., None]
Image.fromarray((np.clip(col, 0, 1) * 255).astype(np.uint8)).save(out, quality=86, method=6)
print(out, W, H)
