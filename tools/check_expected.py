"""Print what every exercise solution prints for the test images.

Use it to check that the "Expected values" tables on the website are right:
    cd images
    python ../tools/check_expected.py            (or pass another image path)
"""
import sys

import cv2
import numpy as np

path = sys.argv[1] if len(sys.argv) > 1 else "landscape.png"
img = cv2.imread(path)
print("== Section 1 ==")
print(img.shape)
print(img.dtype)
print(img.min(), img.max(), round(img.mean(), 2))
h, w = img.shape[:2]
print(img[h // 2, w // 2])
img2 = img.copy()
img2[0:50, 0:50] = 0
print(round(img2.mean(), 2))

print("== Section 2 ==")
b, g, r = cv2.split(img.astype(np.float64))
avg = np.round((b + g + r) / 3).astype(np.uint8)
weighted = 0.114 * b + 0.587 * g + 0.299 * r
weighted = np.clip(np.round(weighted), 0, 255).astype(np.uint8)
ref = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
print(round(avg.mean(), 2), round(weighted.mean(), 2), round(ref.mean(), 2))
print(avg[h // 2, w // 2], weighted[h // 2, w // 2], ref[h // 2, w // 2])
diff = np.abs(weighted.astype(int) - ref.astype(int))
print(np.count_nonzero(diff), diff.max())


def quantize(gray, levels):
    step = 256 / levels
    q = np.floor(gray.astype(np.float64) / step) * step + step / 2
    return np.clip(q, 0, 255).astype(np.uint8)


def floyd_steinberg(gray, levels=2):
    f = gray.astype(np.float64)
    step = 255 / (levels - 1)
    h, w = f.shape
    for y in range(h):
        for x in range(w):
            old = f[y, x]
            new = np.round(old / step) * step
            f[y, x] = new
            err = old - new
            if x + 1 < w: f[y, x + 1] += err * 7 / 16
            if y + 1 < h:
                if x > 0: f[y + 1, x - 1] += err * 3 / 16
                f[y + 1, x] += err * 5 / 16
                if x + 1 < w: f[y + 1, x + 1] += err * 1 / 16
    return np.clip(f, 0, 255).astype(np.uint8)


print("== Section 3 ==")
gray = ref
q4 = quantize(gray, 4)
print(np.unique(q4), round(q4.mean(), 2))
fs = floyd_steinberg(gray, 2)
print(np.unique(fs), round(fs.mean(), 2))
print(round(gray.mean(), 2), np.count_nonzero(fs == 255))

print("== Section 4 ==")
hist = np.bincount(gray.ravel(), minlength=256)
print(len(hist), hist.sum(), gray.size)
print(hist.argmax(), hist.max())
print(np.count_nonzero(hist))
H = np.cumsum(hist)
print(H[127], H[-1])

print("== Section 6 ==")
crop = gray[100:160, 100:180].astype(np.float32)
kernel = np.ones((3, 3), np.float32) / 9
out = np.zeros_like(crop)
for r in range(1, crop.shape[0] - 1):
    for c in range(1, crop.shape[1] - 1):
        out[r, c] = (crop[r-1:r+2, c-1:c+2] * kernel).sum()
ref = cv2.filter2D(crop, -1, kernel)
print(round(float(out[30, 40]), 2))
print(np.abs(out - ref)[1:-1, 1:-1].max() < 1e-3)
shift = cv2.filter2D(gray, -1, np.array([[0, 0, 0], [0, 0, 1], [0, 0, 0]], np.float32))
print(np.array_equal(shift[:, :-1], gray[:, 1:]))
flat = np.full((5, 5), 100, np.uint8)
zero = cv2.blur(flat, (3, 3), borderType=cv2.BORDER_CONSTANT)
refl = cv2.blur(flat, (3, 3), borderType=cv2.BORDER_REFLECT)
print(zero[0, 0], zero[0, 4], zero[4, 0], zero[4, 4], zero[0, 2])
print(refl[0, 0], refl[0, 4], refl[4, 0], refl[4, 4], refl[0, 2])

print("== Section 7 ==")
gx8 = cv2.Sobel(gray, cv2.CV_8U, 1, 0)
gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0)
gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1)
print(np.count_nonzero(gx8), np.count_nonzero(gx > 0), np.count_nonzero(gx < 0))
print(round(float(cv2.magnitude(gx, gy).max()), 1))
lap = cv2.Laplacian(gray, cv2.CV_32F)
print(lap.min(), lap.max())
minus = np.clip(gray - lap, 0, 255).astype(np.uint8)
plus = np.clip(gray + lap, 0, 255).astype(np.uint8)
print(round(minus.mean(), 2), round(plus.mean(), 2))

