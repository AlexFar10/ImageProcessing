"""Make the images of the frequency filtering lab (section 7).

Run from the project folder:
    python tools/make_frequency_images.py

It writes:
    images/sign.png           a clean cafe sign (the reference for every score)
    images/sign_noisy.png     the sign + Gaussian noise (sigma 40)
    images/sign_stripes.png   the sign + vertical stripes that repeat 40 times across
    images/scan_damaged.png   the sign + stripes + noise: the "your turn" image
    js/frequency-images.js    the four PNGs as text, so the site works from the folder too
"""
import base64
import os

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H, W = 240, 320

# the clean sign: a dark panel with rounded corners on a light frame
sign = np.full((H, W), 190, np.uint8)
x0, y0, x1, y1, r = 10, 10, W - 11, H - 11, 14
cv2.rectangle(sign, (x0 + r, y0), (x1 - r, y1), 70, -1)
cv2.rectangle(sign, (x0, y0 + r), (x1, y1 - r), 70, -1)
for cx, cy in [(x0 + r, y0 + r), (x1 - r, y0 + r), (x0 + r, y1 - r), (x1 - r, y1 - r)]:
    cv2.circle(sign, (cx, cy), r, 70, -1, cv2.LINE_AA)
# a cup and its saucer
cup = np.array([[36, 52], [100, 52], [92, 102], [44, 102]], np.int32)
cv2.fillPoly(sign, [cup], 180, cv2.LINE_AA)
cv2.circle(sign, (104, 70), 12, 180, 4, cv2.LINE_AA)
cv2.rectangle(sign, (30, 110), (106, 118), 180, -1)
# the text
font = cv2.FONT_HERSHEY_DUPLEX
cv2.putText(sign, "CAFE", (138, 78), font, 1.55, 190, 3, cv2.LINE_AA)
cv2.putText(sign, "OPEN", (160, 140), font, 1.05, 190, 2, cv2.LINE_AA)
cv2.putText(sign, "8-18", (166, 185), font, 1.05, 190, 2, cv2.LINE_AA)
# a gray ramp, from bright to dark
for x in range(34, 130):
    sign[170:186, x] = int(round(200 - (x - 34) * 100 / 95))

f = sign.astype(np.float64)
rng = np.random.default_rng(7)
stripes = 40 * np.cos(2 * np.pi * np.arange(W) / 8)[None, :]   # period 8 pixels: 320 / 8 = 40 repetitions
images = {
    "sign": sign,
    "sign_noisy": np.clip(np.round(f + rng.normal(0, 40, f.shape)), 0, 255).astype(np.uint8),
    "sign_stripes": np.clip(np.round(f + stripes), 0, 255).astype(np.uint8),
    "scan_damaged": np.clip(np.round(f + stripes + rng.normal(0, 30, f.shape)), 0, 255).astype(np.uint8),
}

lines = [
    "// The images of the frequency filtering lab (images/sign*.png, images/scan_damaged.png) as text.",
    "// Made by tools/make_frequency_images.py - do not edit by hand.",
    "var FREQUENCY_IMAGES = {",
]
for name, img in images.items():
    cv2.imwrite(os.path.join(ROOT, "images", name + ".png"), img)
    ok, png = cv2.imencode(".png", img)
    lines.append('  %s: "data:image/png;base64,%s",' % (name, base64.b64encode(png.tobytes()).decode()))
lines.append("};")
with open(os.path.join(ROOT, "js", "frequency-images.js"), "w") as fh:
    fh.write("\n".join(lines) + "\n")
print("wrote", ", ".join("images/%s.png" % n for n in images), "and js/frequency-images.js")
