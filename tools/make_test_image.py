"""Draw the test image used by the website and the Python exercises.

Run from the project folder:
    python tools/make_test_image.py

It writes two files:
    images/landscape.png   the image students load with cv2.imread
    js/test-image.js       the same PNG as text, so the website also works
                           when opened straight from the folder (file://)
"""
import base64
import os

import cv2
import numpy as np

H, W = 240, 320
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

img = np.zeros((H, W, 3), np.float64)  # we draw in float, then round once

# Sky: a smooth vertical gradient (perfect for seeing false contours).
top = np.array([232, 168, 92], np.float64)     # B, G, R  (light blue)
bottom = np.array([170, 122, 72], np.float64)  # B, G, R  (darker blue)
for r in range(H):
    t = min(r / 170, 1.0)
    img[r, :] = top * (1 - t) + bottom * t

# Grass texture: blurred random noise, always the same thanks to the seed.
rng = np.random.default_rng(7)
noise = cv2.GaussianBlur(rng.normal(0, 1, (H, W)), (0, 0), 2.0)
noise = noise / np.abs(noise).max()

cols = np.arange(W)
back_hill = 150 + 12 * np.sin(cols / 40.0)      # top edge of the back hill
front_hill = 178 + 9 * np.sin(cols / 28.0 + 1)  # top edge of the front hill
for c in range(W):
    for r in range(H):
        if r >= front_hill[c]:
            base = np.array([40, 125, 45])        # dark green
            img[r, c] = base + 40 * noise[r, c]
        elif r >= back_hill[c]:
            base = np.array([60, 165, 75])        # light green
            img[r, c] = base + 30 * noise[r, c]

img = np.clip(np.round(img), 0, 255).astype(np.uint8)

# Sun, house, fence and two balls are flat colors (BGR order!).
cv2.circle(img, (258, 48), 24, (70, 205, 250), -1, cv2.LINE_AA)
cv2.rectangle(img, (62, 118), (114, 165), (45, 45, 195), -1)           # walls
roof = np.array([[54, 120], [88, 92], [122, 120]], np.int32)
cv2.fillPoly(img, [roof], (35, 35, 120), cv2.LINE_AA)                   # roof
cv2.rectangle(img, (80, 138), (93, 165), (235, 238, 240), -1)           # door
cv2.rectangle(img, (99, 128), (109, 138), (230, 200, 150), -1)          # window
for x in range(186, 252, 8):                                            # fence
    cv2.rectangle(img, (x, 150), (x + 3, 172), (245, 245, 245), -1)
cv2.rectangle(img, (184, 156), (254, 158), (245, 245, 245), -1)
cv2.circle(img, (40, 205), 9, (200, 70, 40), -1, cv2.LINE_AA)           # blue ball
cv2.circle(img, (292, 170), 10, (20, 175, 245), -1, cv2.LINE_AA)        # orange ball

png_path = os.path.join(ROOT, "images", "landscape.png")
cv2.imwrite(png_path, img)

with open(png_path, "rb") as f:
    b64 = base64.b64encode(f.read()).decode("ascii")
with open(os.path.join(ROOT, "js", "test-image.js"), "w") as f:
    f.write("// The test image (images/landscape.png) as text.\n")
    f.write("// Made by tools/make_test_image.py - do not edit by hand.\n")
    f.write("// Embedding it lets the site read pixels even when opened from the folder.\n")
    f.write('var TEST_IMAGE_DATA_URL = "data:image/png;base64,' + b64 + '";\n')

print("saved", png_path, img.shape, "mean", round(img.mean(), 2))
