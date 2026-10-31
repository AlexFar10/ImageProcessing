// filter.js - spatial filtering, shared by sections 6 (kernel and blur) and 7 (edges and sharpening).
//
// Images here hold decimals: { width, height, data: Float32Array }.
// Filters are applied as CORRELATION (the kernel is not flipped), like cv2.filter2D.
// Border modes: 'zeros' (BORDER_CONSTANT), 'replicate' (BORDER_REPLICATE),
//               'reflect' (BORDER_REFLECT_101, the OpenCV default).

var Filter = {};

Filter.make = function (w, h) { return { width: w, height: h, data: new Float32Array(w * h) }; };

// uint8 gray image -> decimals
Filter.fromGray = function (g) {
  var f = Filter.make(g.width, g.height);
  f.data.set(g.data);
  return f;
};

// A kernel: { size, data } with size x size coefficients, row by row
Filter.kernel = function (rows) {
  var size = rows.length, data = new Float32Array(size * size);
  rows.forEach(function (row, r) { row.forEach(function (v, c) { data[r * size + c] = v; }); });
  return { size: size, data: data };
};

// Where to read pixel i of a line of n pixels; -1 means "outside, use 0"
Filter.borderIndex = function (i, n, mode) {
  if (i >= 0 && i < n) return i;
  if (mode === 'zeros') return -1;
  if (mode === 'replicate') return i < 0 ? 0 : n - 1;
  if (n === 1) return 0;
  while (i < 0 || i >= n) i = i < 0 ? -i : 2 * (n - 1) - i;   // reflect-101: ... 2 1 | 0 1 2 ... n-2 n-1 | n-2 ...
  return i;
};

// For every padded position -r..n-1+r, the pixel to read (or -1)
function indexTable(n, r, mode) {
  var t = new Int32Array(n + 2 * r);
  for (var i = -r; i < n + r; i++) t[i + r] = Filter.borderIndex(i, n, mode);
  return t;
}

// g(x, y) = sum of w(s, t) * f(x + t, y + s): correlation with any square kernel
Filter.correlate = function (img, k, border) {
  var w = img.width, h = img.height, r = (k.size - 1) / 2, out = Filter.make(w, h);
  var cols = indexTable(w, r, border), rows = indexTable(h, r, border), src = img.data;
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var sum = 0;
      for (var s = 0; s < k.size; s++) {
        var yy = rows[y + s];
        if (yy < 0) continue;
        for (var t = 0; t < k.size; t++) {
          var xx = cols[x + t];
          if (xx >= 0) sum += k.data[s * k.size + t] * src[yy * w + xx];
        }
      }
      out.data[y * w + x] = sum;
    }
  }
  return out;
};

// The fast path for separable kernels: one 1D pass along the rows, one along the columns.
Filter.separable = function (img, rowK, colK, border) {
  var w = img.width, h = img.height, tmp = Filter.make(w, h), out = Filter.make(w, h);
  var rx = (rowK.length - 1) / 2, ry = (colK.length - 1) / 2;
  var cols = indexTable(w, rx, border), rows = indexTable(h, ry, border);
  var y, x, i, sum, j;
  for (y = 0; y < h; y++) {
    for (x = 0; x < w; x++) {
      sum = 0;
      for (i = 0; i < rowK.length; i++) { j = cols[x + i]; if (j >= 0) sum += rowK[i] * img.data[y * w + j]; }
      tmp.data[y * w + x] = sum;
    }
  }
  for (y = 0; y < h; y++) {
    for (x = 0; x < w; x++) {
      sum = 0;
      for (i = 0; i < colK.length; i++) { j = rows[y + i]; if (j >= 0) sum += colK[i] * tmp.data[j * w + x]; }
      out.data[y * w + x] = sum;
    }
  }
  return out;
};

// cv2.blur(img, (size, size)): every weight 1 / size^2
Filter.box1D = function (size) { var k = []; for (var i = 0; i < size; i++) k.push(1 / size); return k; };
Filter.box = function (img, size, border) { var k = Filter.box1D(size); return Filter.separable(img, k, k, border); };

// cv2.getGaussianKernel(size, sigma): exp(-x^2 / (2 sigma^2)), then divided by the sum
Filter.gaussian1D = function (size, sigma) {
  var r = (size - 1) / 2, k = [], sum = 0;
  for (var i = -r; i <= r; i++) { k.push(Math.exp(-i * i / (2 * sigma * sigma))); sum += k[k.length - 1]; }
  return k.map(function (v) { return v / sum; });
};
// The usual size for a given sigma: 3 sigma on each side (values further away are tiny)
Filter.gaussianSize = function (sigma) { return 2 * Math.ceil(3 * sigma) + 1; };
Filter.gaussian = function (img, sigma, border) {
  var k = Filter.gaussian1D(Filter.gaussianSize(sigma), sigma);
  return Filter.separable(img, k, k, border);
};

// Ready-made 3x3 kernels. divide: the editor divides by the sum when this is true.
Filter.PRESETS = {
  identity:  { name: 'Identity', rows: [[0, 0, 0], [0, 1, 0], [0, 0, 0]] },
  box:       { name: 'Box', rows: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], divide: true },
  gaussian:  { name: 'Gaussian', rows: [[1, 2, 1], [2, 4, 2], [1, 2, 1]], divide: true },
  sharpen:   { name: 'Sharpen', rows: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]] },
  laplacian: { name: 'Laplacian', rows: [[0, 1, 0], [1, -4, 1], [0, 1, 0]] },
  sobelX:    { name: 'Sobel dx', rows: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]] },
  sobelY:    { name: 'Sobel dy', rows: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]] }
};

// cv2.Sobel(gray, cv2.CV_32F, 1, 0) and (0, 1); cv2.Laplacian(gray, cv2.CV_32F)
Filter.sobelX = function (img) { return Filter.correlate(img, Filter.kernel(Filter.PRESETS.sobelX.rows), 'reflect'); };
Filter.sobelY = function (img) { return Filter.correlate(img, Filter.kernel(Filter.PRESETS.sobelY.rows), 'reflect'); };
Filter.laplacian = function (img) { return Filter.correlate(img, Filter.kernel(Filter.PRESETS.laplacian.rows), 'reflect'); };

// One number -> one stored uint8 value.
//   'clip'   like CV_8U output: round, then cut to 0..255 (negatives become 0)
//   'abs'    absolute value first, then cut
//   'offset' add 128 first, so 0 shows as middle gray
Filter.store = function (v, mode) {
  if (mode === 'abs') v = Math.abs(v);
  else if (mode === 'offset') v += 128;
  v = IP.roundHalfEven(v);
  return v < 0 ? 0 : v > 255 ? 255 : v;
};
Filter.toGray = function (f, mode) {
  var g = IP.makeGray(f.width, f.height);
  for (var i = 0; i < f.data.length; i++) g.data[i] = Filter.store(f.data[i], mode || 'clip');
  return g;
};

// a + c * b, pixel by pixel (both decimals)
Filter.add = function (a, b, c) {
  var out = Filter.make(a.width, a.height);
  for (var i = 0; i < a.data.length; i++) out.data[i] = a.data[i] + c * b.data[i];
  return out;
};
// Cut every value to 0..255 (an 8-bit image in between steps)
Filter.saturate = function (f) {
  var out = Filter.make(f.width, f.height);
  for (var i = 0; i < f.data.length; i++) out.data[i] = Filter.store(f.data[i], 'clip');
  return out;
};

// Redraw at most once per frame, so sliders stay smooth
Filter.onFrame = function (fn) {
  var waiting = false;
  return function () {
    if (waiting) return;
    waiting = true;
    requestAnimationFrame(function () { waiting = false; fn(); });
  };
};

/* ---------- the images: the test image (or photo), edges.png, noisy.png ---------- */

Filter.extra = {};   // name -> gray image, filled once the two PNGs are decoded
var extraReady = [];
(function load() {
  var names = { edges: EDGES_IMAGE_DATA_URL, noisy: NOISY_IMAGE_DATA_URL };
  Promise.all(Object.keys(names).map(function (name) {
    return IP.decode(names[name]).then(function (bmp) {
      Filter.extra[name] = IP.toGray(IP.readPixels(bmp, bmp.width, bmp.height));
    });
  })).then(function () { var waiting = extraReady; extraReady = null; waiting.forEach(function (fn) { fn(); }); });
})();

// Run fn when the test image AND the two extra images are ready
Filter.ready = function (fn) {
  IP.ready(function () { if (extraReady) extraReady.push(fn); else fn(); });
};

// True once the test image and the two extra images are decoded
Filter.loaded = function () { return !!IP.testColor && !extraReady; };


/* ---------- drawings ---------- */

// rows of a separable kernel: outer product of two 1D kernels
Filter.outer = function (a, b) { return a.map(function (x) { return b.map(function (y) { return x * y; }); }); };
