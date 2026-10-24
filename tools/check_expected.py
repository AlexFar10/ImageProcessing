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

print("== Section 5 ==")
src = (gray * 0.4 + 30).astype(np.uint8)
lo, hi = int(src.min()), int(src.max())
out = (src.astype(np.float64) - lo) * 255 / (hi - lo)
stretched = np.clip(np.round(out), 0, 255).astype(np.uint8)
print(lo, hi, np.count_nonzero(np.bincount(stretched.ravel())))
hist5 = np.bincount(src.ravel(), minlength=256)
cdf = np.cumsum(hist5)
lut = np.round(cdf / cdf[-1] * 255).astype(np.uint8)
mine = lut[src]
cv = cv2.equalizeHist(src)
print(round(mine.mean(), 2), round(cv.mean(), 2))
print(np.count_nonzero(mine != cv), np.abs(mine.astype(int) - cv).max())

print("== Section 6 ==")
h, w = gray.shape
shade = 0.3 + 0.7 * np.arange(w) / (w - 1)
dark = (gray * shade).astype(np.uint8)
T, binary = cv2.threshold(gray, 128, 255, cv2.THRESH_BINARY)
mine = np.where(gray > 128, 255, 0).astype(np.uint8)
print(np.count_nonzero(binary), np.array_equal(binary, mine))
T, one = cv2.threshold(dark, 128, 255, cv2.THRESH_BINARY)
adapt = cv2.adaptiveThreshold(dark, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 31, 10)
print(np.count_nonzero(one), np.count_nonzero(adapt))
