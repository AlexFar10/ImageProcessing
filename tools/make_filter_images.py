"""Make the two extra images for the filtering labs (sections 6 and 7).

Run from the project folder, after make_test_image.py:
    python tools/make_filter_images.py

It writes:
    images/noisy.png       landscape.png in gray + Gaussian noise (sigma 20)
    images/edges.png       sharp shapes, thin lines and some text
    js/filter-images.js    both PNGs as text, so the site works from the folder too
"""
import base64
import os

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H, W = 240, 320

# noisy.png: the test image in gray plus noise, always the same thanks to the seed
gray = cv2.cvtColor(cv2.imread(os.path.join(ROOT, "images", "landscape.png")), cv2.COLOR_BGR2GRAY)
rng = np.random.default_rng(5)
noisy = np.clip(np.round(gray + rng.normal(0, 20, gray.shape)), 0, 255).astype(np.uint8)

# edges.png: flat gray areas with sharp borders, in every direction
edges = np.full((H, W), 200, np.uint8)
cv2.rectangle(edges, (20, 20), (110, 100), 40, -1)                      # square
cv2.circle(edges, (170, 60), 40, 90, -1)                                # circle (no anti-aliasing)
tri = np.array([[230, 100], [270, 20], [305, 100]], np.int32)
cv2.fillPoly(edges, [tri], 40)                                          # triangle
edges[120:240, 160:320] = 60                                            # dark corner
for i, t in enumerate([1, 2, 4]):                                       # thin lines
    x = 20 + 18 * i
    cv2.rectangle(edges, (x, 125), (x + t - 1, 225), 40, -1)
cv2.putText(edges, "EDGES", (175, 200), cv2.FONT_HERSHEY_SIMPLEX, 1.2, 230, 3)
cv2.circle(edges, (110, 180), 22, 120, -1)                              # a softer step

os.makedirs(os.path.join(ROOT, "images"), exist_ok=True)
names = {"NOISY_IMAGE_DATA_URL": ("noisy.png", noisy), "EDGES_IMAGE_DATA_URL": ("edges.png", edges)}
lines = [
    "// The two images of the filtering labs (images/noisy.png, images/edges.png) as text.",
    "// Made by tools/make_filter_images.py - do not edit by hand.",
]
for var, (name, img) in names.items():
    cv2.imwrite(os.path.join(ROOT, "images", name), img)
    ok, png = cv2.imencode(".png", img)
    lines.append('var %s = "data:image/png;base64,%s";' % (var, base64.b64encode(png.tobytes()).decode()))
with open(os.path.join(ROOT, "js", "filter-images.js"), "w") as f:
    f.write("\n".join(lines) + "\n")
print("wrote images/noisy.png, images/edges.png, js/filter-images.js")
