// core.js - shared code for every page.
//
// What lives here:
//   1. Page layout: sidebar navigation, prev/next links
//   2. The current image (test image or the student's photo) and its bar
//   3. Image operations that copy what OpenCV / NumPy do, number for number
//   4. Drawing helpers (images and histograms)
//   5. Code blocks, glossary pop-ups, quick questions, expected-value tables
//
// Image formats used everywhere:
//   color image: { width, height, data }  RGBA bytes, like the canvas ImageData
//   gray image:  { width, height, data }  one Uint8Array value per pixel
// Note: Python/OpenCV keeps channels as B, G, R. In JS we keep R, G, B, A
// (that is how the canvas gives them to us) and convert when we show numbers.

var IP = {};

/* =====================================================================
   1. Page chrome
   ===================================================================== */

IP.SECTIONS = [
  { id: 'grid', file: 'grid.html', short: 'Grid of numbers', title: 'The image as a grid of numbers' },
  { id: 'color', file: 'color.html', short: 'Color & gray', title: 'Color and grayscale' },
  { id: 'quantization', file: 'quantization.html', short: 'Quantization', title: 'Quantization and dithering' },
  { id: 'histograms', file: 'histograms.html', short: 'Histograms', title: 'Histograms' },
  { id: 'binarization', file: 'binarization.html', short: 'Binarization', title: 'Binarization' },
  { id: 'glossary', file: 'glossary.html', short: 'Glossary', title: 'Glossary' }
];

// Small helper to build DOM elements: IP.el('p', { class: 'x' }, 'text', child)
IP.el = function (tag, attrs) {
  var node = document.createElement(tag);
  for (var key in attrs || {}) {
    if (key === 'text') node.textContent = attrs[key];
    else if (key === 'html') node.innerHTML = attrs[key];
    else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2), attrs[key]);
    else node.setAttribute(key, attrs[key]);
  }
  for (var i = 2; i < arguments.length; i++) {
    var child = arguments[i];
    if (child == null) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
};

// localStorage / sessionStorage can be blocked (private mode), so never let it crash.
IP.store = {
  get: function (area, key) { try { return window[area].getItem(key); } catch (e) { return null; } },
  set: function (area, key, value) { try { window[area].setItem(key, value); return true; } catch (e) { return false; } },
  remove: function (area, key) { try { window[area].removeItem(key); } catch (e) { /* ignore */ } }
};

// The dashboard frame: a sidebar with all topics, and on a topic page
// four tabs (Theory, Demo, Code, Quick questions) made from <section class="part">.
function buildLayout() {
  var page = document.body.getAttribute('data-page');
  var main = document.querySelector('main');
  var parts = main.querySelectorAll('section.part');
  var nav = IP.el('nav', { class: 'side-nav', 'aria-label': 'Topics' });
  nav.appendChild(IP.el('a', { href: 'index.html', class: page === 'home' ? 'current' : '' }, 'Overview'));
  IP.SECTIONS.forEach(function (s, i) {
    var num = s.id === 'glossary' ? '' : (i + 1) + '  ';
    nav.appendChild(IP.el('a', { href: s.file, class: s.id === page ? 'current' : '' },
      IP.el('span', { class: 'num', text: num }), s.short));
    if (s.id === page && parts.length) {
      var sub = IP.el('div', { class: 'sub' });
      parts.forEach(function (p) { sub.appendChild(IP.el('a', { href: '#' + p.id, text: p.dataset.title })); });
      nav.appendChild(sub);
    }
  });
  var menuBtn = IP.el('button', { class: 'menu-btn', type: 'button', 'aria-expanded': 'false', text: 'Menu' });
  menuBtn.onclick = function () {
    var open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) nav.classList.remove('open'); });
  var sidebar = IP.el('aside', { class: 'sidebar' },
    IP.el('a', { class: 'brand', href: 'index.html', text: 'Image Processing Lab' }), menuBtn, nav);

  var layout = IP.el('div', { class: 'layout' });
  document.body.insertBefore(layout, main);
  layout.append(sidebar, main);
  if (parts.length) buildTabs(parts);
}

// Show one part at a time. The address (#demo, #code ...) remembers which one.
function buildTabs(parts) {
  var bar = IP.el('div', { class: 'tabs', role: 'tablist' });
  parts.forEach(function (p) {
    bar.appendChild(IP.el('a', { href: '#' + p.id, role: 'tab', 'data-part': p.id, text: p.dataset.title }));
  });
  parts[0].parentNode.insertBefore(bar, parts[0]);
  function show() {
    var id = location.hash.slice(1);
    if (!document.getElementById(id) || !document.getElementById(id).classList.contains('part')) id = parts[0].id;
    parts.forEach(function (p) { p.hidden = p.id !== id; });
    document.querySelectorAll('.tabs a, .side-nav .sub a').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + id);
    });
  }
  window.addEventListener('hashchange', function () { show(); window.scrollTo(0, 0); });
  show();
}

/* =====================================================================
   2. The current image
   ===================================================================== */

IP.MAX_PHOTO_SIDE = 480;   // photos are shrunk to this size so every demo stays fast
IP.testColor = null;       // the test image, always loaded
IP.photoColor = null;      // the student's photo (already shrunk), or null
IP.source = 'test';        // which one the demos use: 'test' or 'photo'

var changeListeners = [];
var readyListeners = [];
var isReady = false;

// Run fn once the images are loaded.
IP.ready = function (fn) { if (isReady) fn(); else readyListeners.push(fn); };
// Run fn every time the student switches image (or loads a new photo).
IP.onChange = function (fn) { changeListeners.push(fn); };
function emitChange() {
  grayCache = new WeakMap();
  changeListeners.forEach(function (fn) { fn(); });
  renderImageBar();
}

IP.color = function () { return IP.source === 'photo' && IP.photoColor ? IP.photoColor : IP.testColor; };
IP.gray = function () { return IP.grayOf(IP.color()); };
IP.fileName = function () { return IP.source === 'photo' && IP.photoColor ? 'my_photo.png' : 'landscape.png'; };

var grayCache = new WeakMap();
IP.grayOf = function (color) {
  if (!grayCache.has(color)) grayCache.set(color, IP.toGray(color));
  return grayCache.get(color);
};

// Draw any image source onto a canvas and read back its RGBA numbers.
function readPixels(source, w, h) {
  var c = document.createElement('canvas');
  c.width = w; c.height = h;
  var ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  var data = ctx.getImageData(0, 0, w, h);
  for (var i = 3; i < data.data.length; i += 4) data.data[i] = 255; // OpenCV ignores transparency
  return data;
}

// Decode an image file or data URL without color-profile changes,
// so the numbers match what cv2.imread reads.
function decode(blobOrUrl) {
  var opts = { imageOrientation: 'from-image', colorSpaceConversion: 'none' };
  var blobPromise = typeof blobOrUrl === 'string' ? fetch(blobOrUrl).then(function (r) { return r.blob(); }) : Promise.resolve(blobOrUrl);
  return blobPromise
    .then(function (blob) { return createImageBitmap(blob, opts); })
    .catch(function () {
      // Older browsers: fall back to a plain <img>
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = reject;
        img.src = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
      });
    });
}

IP.loadPhoto = function (file) {
  return decode(file).then(function (bmp) {
    var w = bmp.width, h = bmp.height;
    var scale = Math.min(1, IP.MAX_PHOTO_SIDE / Math.max(w, h));
    IP.photoColor = readPixels(bmp, Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale)));
    IP.source = 'photo';
    savePhoto();
    emitChange();
  }).catch(function () {
    alert('Sorry, this file could not be opened as an image. Try a JPG or PNG.');
  });
};

IP.useSource = function (source) {
  IP.source = source === 'photo' && IP.photoColor ? 'photo' : 'test';
  IP.store.set('sessionStorage', 'ip-source', IP.source);
  emitChange();
};

// The photo is kept for this browser tab only, so it survives moving between pages.
function photoAsPngUrl() {
  var c = document.createElement('canvas');
  c.width = IP.photoColor.width; c.height = IP.photoColor.height;
  c.getContext('2d').putImageData(IP.photoColor, 0, 0);
  return c.toDataURL('image/png');
}
function savePhoto() {
  if (!IP.store.set('sessionStorage', 'ip-photo', photoAsPngUrl())) {
    IP.store.remove('sessionStorage', 'ip-photo');
  }
  IP.store.set('sessionStorage', 'ip-source', IP.source);
}

// "Save my photo as PNG": the exact pixels the site uses, so Python gets the same numbers.
IP.downloadPhoto = function () {
  if (!IP.photoColor) return;
  var a = IP.el('a', { href: photoAsPngUrl(), download: 'my_photo.png' });
  document.body.appendChild(a); a.click(); a.remove();
};

function renderImageBar() {
  var bar = document.getElementById('image-bar');
  if (!bar) return;
  bar.innerHTML = '';
  bar.className = 'image-bar';
  var testBtn = IP.el('label', {}, radio('test'), ' Test image');
  var photoBtn = IP.el('label', {}, radio('photo'), ' My photo');
  if (!IP.photoColor) photoBtn.querySelector('input').disabled = true;
  var fileInput = IP.el('input', { type: 'file', accept: 'image/*', 'aria-label': 'Load your own photo' });
  fileInput.onchange = function () { if (fileInput.files[0]) IP.loadPhoto(fileInput.files[0]); };
  var loadBtn = IP.el('span', { class: 'btn secondary file-btn' }, 'Load photo', fileInput);
  var c = IP.color();
  bar.append(testBtn, photoBtn, loadBtn);
  if (IP.photoColor) {
    bar.append(IP.el('button', { class: 'btn secondary', onclick: IP.downloadPhoto, text: 'Save as PNG', title: 'The exact pixels used here, for your Python script' }));
  }
  bar.append(IP.el('span', { class: 'status', text: c.height + ' rows × ' + c.width + ' columns' }));

  function radio(value) {
    var input = IP.el('input', { type: 'radio', name: 'img-source', value: value });
    input.checked = IP.source === value;
    input.onchange = function () { IP.useSource(value); };
    return input;
  }
}

function loadImages() {
  var jobs = [decode(TEST_IMAGE_DATA_URL).then(function (bmp) {
    IP.testColor = readPixels(bmp, bmp.width, bmp.height);
  })];
  var savedPhoto = IP.store.get('sessionStorage', 'ip-photo');
  if (savedPhoto) {
    jobs.push(decode(savedPhoto).then(function (bmp) {
      IP.photoColor = readPixels(bmp, bmp.width, bmp.height);
      if (IP.store.get('sessionStorage', 'ip-source') === 'photo') IP.source = 'photo';
    }).catch(function () { /* a broken saved photo is simply ignored */ }));
  }
  return Promise.all(jobs).then(function () {
    isReady = true;
    renderImageBar();
    readyListeners.forEach(function (fn) { fn(); });
  });
}

/* =====================================================================
   3. Image operations (each one matches a line of Python)
   ===================================================================== */

IP.makeGray = function (w, h) { return { width: w, height: h, data: new Uint8Array(w * h) }; };
IP.copyColor = function (c) { return { width: c.width, height: c.height, data: new Uint8ClampedArray(c.data) }; };

// NumPy's np.round and Python's round() send halves to the even number: 2.5 -> 2, 3.5 -> 4.
IP.roundHalfEven = function (x) {
  var r = Math.round(x);
  if (r - x === 0.5 && r % 2 !== 0) return r - 1;
  return r;
};
function clip255(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

// gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
// OpenCV uses whole-number weights (0.299, 0.587, 0.114 scaled by 2^15) and rounds.
// This is that exact formula: checked against OpenCV for all 16.7 million colors.
IP.cvGray = function (r, g, b) { return (r * 9798 + g * 19235 + b * 3735 + 16384) >> 15; };
IP.toGray = function (c) {
  var g = IP.makeGray(c.width, c.height), d = c.data;
  for (var i = 0, j = 0; j < g.data.length; i += 4, j++) g.data[j] = IP.cvGray(d[i], d[i + 1], d[i + 2]);
  return g;
};

// gray = wb * b + wg * g + wr * r   (float64), then np.clip(np.round(gray), 0, 255).astype(np.uint8)
IP.grayWeighted = function (c, wb, wg, wr) {
  var g = IP.makeGray(c.width, c.height), d = c.data;
  for (var i = 0, j = 0; j < g.data.length; i += 4, j++) {
    var v = wb * d[i + 2] + wg * d[i + 1] + wr * d[i];
    g.data[j] = clip255(IP.roundHalfEven(v));
  }
  return g;
};

// avg = (b + g + r) / 3   (float64), then np.round(avg).astype(np.uint8)
IP.grayAverage = function (c) {
  var g = IP.makeGray(c.width, c.height), d = c.data;
  for (var i = 0, j = 0; j < g.data.length; i += 4, j++) {
    g.data[j] = IP.roundHalfEven((d[i + 2] + d[i + 1] + d[i]) / 3);
  }
  return g;
};

// img[:, :, k] with k in OpenCV order: 0 = blue, 1 = green, 2 = red
IP.channel = function (c, k) {
  var g = IP.makeGray(c.width, c.height), offset = 2 - k; // RGBA offset of BGR index k
  for (var i = 0, j = 0; j < g.data.length; i += 4, j++) g.data[j] = c.data[i + offset];
  return g;
};
// img[:, :, k] = 0
IP.zeroChannel = function (c, k) {
  var out = IP.copyColor(c), offset = 2 - k;
  for (var i = offset; i < out.data.length; i += 4) out.data[i] = 0;
  return out;
};

// Apply fn(value) to every pixel of a gray image and return a new one.
IP.mapGray = function (g, fn) {
  var out = IP.makeGray(g.width, g.height);
  for (var i = 0; i < g.data.length; i++) out.data[i] = fn(g.data[i]);
  return out;
};

// cv2.add(gray, v): results are clipped to 0..255 ("saturate")
IP.cvAdd = function (g, v) { return IP.mapGray(g, function (x) { return clip255(x + v); }); };
// gray + v in NumPy uint8: results wrap around like a car odometer
IP.npAddWrap = function (g, v) { return IP.mapGray(g, function (x) { return ((x + v) % 256 + 256) % 256; }); };
// 255 - gray
IP.negative = function (g) { return IP.mapGray(g, function (x) { return 255 - x; }); };
// np.clip(gray * alpha + beta, 0, 255).astype(np.uint8)   (astype cuts off the decimals)
IP.scaleClip = function (g, alpha, beta) {
  return IP.mapGray(g, function (x) { return Math.floor(clip255(x * alpha + beta)); });
};

// quantize(gray, levels) from the lab:
//   step = 256 / levels
//   q = np.floor(gray / step) * step + step / 2
//   np.clip(q, 0, 255).astype(np.uint8)
IP.quantize = function (g, levels) {
  var step = 256 / levels;
  return IP.mapGray(g, function (x) { return Math.floor(clip255(Math.floor(x / step) * step + step / 2)); });
};

// Round every pixel to the nearest of `levels` values spread from 0 to 255 (no dithering).
//   step = 255 / (levels - 1);  np.clip(np.round(gray / step) * step, 0, 255).astype(np.uint8)
IP.nearestLevel = function (g, levels) {
  var step = 255 / (levels - 1);
  return IP.mapGray(g, function (x) { return Math.floor(clip255(IP.roundHalfEven(x / step) * step)); });
};

// A small random generator with a seed, so "random" pictures do not flicker.
IP.seededRandom = function (seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Random dithering: add noise of up to half a step, then round to the nearest level.
IP.randomDither = function (g, levels, seed) {
  var step = 255 / (levels - 1), rand = IP.seededRandom(seed || 1);
  return IP.mapGray(g, function (x) {
    var noisy = x + (rand() - 0.5) * step;
    return Math.floor(clip255(IP.roundHalfEven(noisy / step) * step));
  });
};

// floyd_steinberg(gray, levels) exactly as in the exercise solution (float64).
// variant 'bug-left' sends the 3/16 share to the left neighbour instead of below-left.
IP.floydSteinberg = function (g, levels, variant) {
  var w = g.width, h = g.height, f = new Float64Array(g.data);
  var step = 255 / (levels - 1);
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var i = y * w + x;
      var old = f[i];
      var nw = IP.roundHalfEven(old / step) * step;
      f[i] = nw;
      var err = old - nw;
      if (x + 1 < w) f[i + 1] += err * 7 / 16;
      if (y + 1 < h) {
        if (x > 0) {
          if (variant === 'bug-left') f[i - 1] += err * 3 / 16;   // the bug: f[y, x - 1]
          else f[i + w - 1] += err * 3 / 16;
        }
        f[i + w] += err * 5 / 16;
        if (x + 1 < w) f[i + w + 1] += err * 1 / 16;
      }
    }
  }
  var out = IP.makeGray(w, h);
  for (var k = 0; k < f.length; k++) out.data[k] = Math.floor(clip255(f[k]));
  return out;
};

// A smooth left-to-right ramp from 0 to 255, handy for showing bands.
IP.gradient = function (w, h) {
  var g = IP.makeGray(w, h);
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) g.data[y * w + x] = Math.round(x * 255 / (w - 1));
  return g;
};

// np.bincount(gray.ravel(), minlength=256)
IP.histogram = function (g) {
  var hist = new Array(256).fill(0);
  for (var i = 0; i < g.data.length; i++) hist[g.data[i]]++;
  return hist;
};

// np.cumsum(hist): H[i] = number of pixels with value <= i
IP.cumulative = function (hist) {
  var out = [], sum = 0;
  for (var i = 0; i < hist.length; i++) { sum += hist[i]; out.push(sum); }
  return out;
};

// cv2.threshold(gray, T, 255, cv2.THRESH_BINARY): 255 where gray > T, else 0 (INV swaps them)
IP.threshold = function (g, T, inverse) {
  return IP.mapGray(g, function (x) { return (x > T) !== Boolean(inverse) ? 255 : 0; });
};

// The local mean that cv2.adaptiveThreshold(..., ADAPTIVE_THRESH_MEAN_C, ...) uses:
// a block x block box filter with "replicate" borders, rounded back to uint8.
IP.boxMean = function (g, block) {
  var w = g.width, h = g.height, r = (block - 1) / 2, out = IP.makeGray(w, h);
  var cols = new Float64Array(w);   // running column sums over the current window of rows
  function clampR(y) { return y < 0 ? 0 : y >= h ? h - 1 : y; }
  function clampC(x) { return x < 0 ? 0 : x >= w ? w - 1 : x; }
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var s = 0;
      for (var dy = -r; dy <= r; dy++) s += g.data[clampR(y + dy) * w + x];
      cols[x] = s;
    }
    for (x = 0; x < w; x++) {
      var sum = 0;
      for (var dx = -r; dx <= r; dx++) sum += cols[clampC(x + dx)];
      out.data[y * w + x] = IP.roundHalfEven(sum / (block * block));
    }
  }
  return out;
};

// cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, block, C):
// white where the pixel is brighter than (local mean - C)
IP.adaptiveMean = function (g, block, C) {
  var mean = IP.boxMean(g, block), idelta = Math.ceil(C);
  var out = IP.makeGray(g.width, g.height);
  for (var i = 0; i < g.data.length; i++) out.data[i] = g.data[i] - mean.data[i] > -idelta ? 255 : 0;
  return out;
};

// The local mean of ADAPTIVE_THRESH_GAUSSIAN_C: a Gaussian-weighted block, replicate borders.
// Close to OpenCV, but not bit-exact (only used for pictures, never for expected values).
IP.gaussianMean = function (g, block) {
  var w = g.width, h = g.height, r = (block - 1) / 2, sigma = 0.3 * ((block - 1) * 0.5 - 1) + 0.8;
  var k = [], total = 0;
  for (var i = -r; i <= r; i++) { k.push(Math.exp(-i * i / (2 * sigma * sigma))); total += k[k.length - 1]; }
  k = k.map(function (v) { return v / total; });
  function clamp(v, n) { return v < 0 ? 0 : v >= n ? n - 1 : v; }
  var tmp = new Float64Array(w * h), out = IP.makeGray(w, h);
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {      // blur the rows
    var s = 0;
    for (var d = -r; d <= r; d++) s += k[d + r] * g.data[y * w + clamp(x + d, w)];
    tmp[y * w + x] = s;
  }
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {              // then the columns
    s = 0;
    for (d = -r; d <= r; d++) s += k[d + r] * tmp[clamp(y + d, h) * w + x];
    out.data[y * w + x] = Math.round(s);
  }
  return out;
};

// cv2.adaptiveThreshold with either method ('mean' or 'gaussian')
IP.adaptive = function (g, method, block, C) {
  if (method === 'mean') return IP.adaptiveMean(g, block, C);
  var mean = IP.gaussianMean(g, block), idelta = Math.ceil(C), out = IP.makeGray(g.width, g.height);
  for (var i = 0; i < g.data.length; i++) out.data[i] = g.data[i] - mean.data[i] > -idelta ? 255 : 0;
  return out;
};

// Uneven light, as in the lab: the left side gets darker.
//   shade = 0.3 + 0.7 * np.arange(w) / (w - 1);  dark = (gray * shade).astype(np.uint8)
IP.unevenLight = function (g) {
  var w = g.width, out = IP.makeGray(g.width, g.height);
  for (var i = 0; i < g.data.length; i++) out.data[i] = Math.floor(g.data[i] * (0.3 + 0.7 * (i % w) / (w - 1)));
  return out;
};

// min, max, mean and std of any list of numbers
IP.stats = function (data) {
  var min = Infinity, max = -Infinity, sum = 0, n = data.length;
  for (var i = 0; i < n; i++) {
    var v = data[i];
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  var mean = sum / n, sq = 0;
  for (var k = 0; k < n; k++) sq += (data[k] - mean) * (data[k] - mean);
  return { min: min, max: max, mean: mean, std: Math.sqrt(sq / n), sum: sum, n: n };
};

// Values of a color image in OpenCV order, as a flat list (for img.mean(), img.min() ...)
IP.bgrValues = function (c) {
  var out = new Uint8Array(c.width * c.height * 3);
  for (var i = 0, j = 0; i < c.data.length; i += 4, j += 3) {
    out[j] = c.data[i + 2]; out[j + 1] = c.data[i + 1]; out[j + 2] = c.data[i];
  }
  return out;
};
// [B, G, R] of the pixel at img[r, c]
IP.bgrAt = function (c, r, col) {
  var i = (r * c.width + col) * 4;
  return [c.data[i + 2], c.data[i + 1], c.data[i]];
};
IP.distinct = function (data) {
  var seen = {};
  for (var i = 0; i < data.length; i++) seen[data[i]] = true;
  return Object.keys(seen).map(Number).sort(function (a, b) { return a - b; });
};

// Format numbers the way Python prints them
IP.fmt = {
  // print(round(x, 2)) in Python: exact rounding, halves go to even, no trailing zeros
  round2: function (x) {
    var scaled = x * 100;
    if (Math.abs(scaled % 1) === 0.5) return String(IP.roundHalfEven(scaled) / 100);
    return String(Number(x.toFixed(2)));
  },
  // print(np.array([92, 168, 232])) -> "[ 92 168 232]" (NumPy pads to equal width)
  array: function (list) {
    var width = Math.max.apply(null, list.map(function (v) { return String(v).length; }));
    return '[' + list.map(function (v) { return String(v).padStart(width, ' '); }).join(' ') + ']';
  },
  shape: function (list) { return '(' + list.join(', ') + (list.length === 1 ? ',' : '') + ')'; }
};

/* =====================================================================
   4. Drawing helpers
   ===================================================================== */

// Draw a gray or color image onto a canvas (the canvas takes the image size).
IP.draw = function (canvas, img) {
  canvas.width = img.width; canvas.height = img.height;
  var ctx = canvas.getContext('2d');
  var out = ctx.createImageData(img.width, img.height);
  if (img.data.length === img.width * img.height * 4) {
    out.data.set(img.data);
  } else {
    for (var i = 0, j = 0; j < img.data.length; i += 4, j++) {
      out.data[i] = out.data[i + 1] = out.data[i + 2] = img.data[j];
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
};
IP.canvasOf = function (img, cls) { return IP.draw(IP.el('canvas', { class: cls || '' }), img); };

// A figure: canvas plus caption
IP.figure = function (img, caption) {
  return IP.el('figure', { class: 'figure' }, IP.canvasOf(img), IP.el('figcaption', { text: caption || '' }));
};

// Draw a histogram (a list of counts) as bars.
// opts: { from, to } value range shown, band: [lo, hi] shaded area, line: a value marked with a red line,
//       clipTallest: true to cut the highest bar
IP.drawHistogram = function (canvas, hist, opts) {
  opts = opts || {};
  var from = opts.from == null ? 0 : opts.from, to = opts.to == null ? 255 : opts.to;
  var W = canvas.width = 512, H = canvas.height = 200;
  var ctx = canvas.getContext('2d');
  var pad = { l: 8, r: 8, t: 10, b: 22 };
  var plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
  ctx.clearRect(0, 0, W, H);

  var top = Math.max.apply(null, hist);
  var cut = false;
  if (opts.clipTallest) {
    var sorted = hist.slice().sort(function (a, b) { return b - a; });
    if (sorted[0] > 3 * sorted[1] && sorted[1] > 0) { top = sorted[1] * 1.3; cut = true; }
  }
  top = Math.max(top, 1);

  var n = hist.length, barW = plotW / n;
  if (opts.band) {
    var a = (opts.band[0] - from) / (to + 1 - from) * plotW;
    var b = (opts.band[1] - from) / (to + 1 - from) * plotW;
    ctx.fillStyle = 'rgba(47, 111, 222, 0.10)';
    ctx.fillRect(pad.l + Math.max(0, a), pad.t, Math.min(plotW, b) - Math.max(0, a), plotH);
  }
  ctx.fillStyle = opts.color || '#2f6fde';
  for (var i = 0; i < n; i++) {
    var hgt = Math.min(hist[i], top) / top * plotH;
    ctx.fillRect(pad.l + i * barW, pad.t + plotH - hgt, Math.max(barW - (barW > 3 ? 1 : 0), 1), hgt);
    if (cut && hist[i] > top) {   // mark a bar that is too tall to fit
      ctx.fillStyle = '#d64545';
      ctx.fillRect(pad.l + i * barW, pad.t, Math.max(barW, 2), 4);
      ctx.fillStyle = opts.color || '#2f6fde';
    }
  }
  // x axis with a few labels
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(pad.l, pad.t + plotH, plotW, 1);
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  (opts.ticks || [0, 64, 128, 192, 255]).forEach(function (v) {
    var x = pad.l + (v - from) / (to - from) * plotW;
    ctx.fillText(String(v), Math.min(Math.max(x, 14), W - 14), H - 6);
  });
  if (cut) { ctx.textAlign = 'right'; ctx.fillStyle = '#6b7280'; ctx.fillText('tallest bar cut to fit', W - pad.r, pad.t + 12); }
  if (opts.line != null) {
    var lx = pad.l + (opts.line + 0.5 - from) / (to + 1 - from) * plotW;
    ctx.fillStyle = '#d64545';
    ctx.fillRect(lx - 1, pad.t, 2, plotH);
  }
  return canvas;
};

// Small histogram for games: a single huge bar (like a pile-up at 0) is cut so the rest stays readable.
IP.histogramCanvas = function (gray, opts) {
  return IP.drawHistogram(IP.el('canvas', { class: 'hist' }), IP.histogram(gray), opts || { clipTallest: true });
};

// Which pixel (row, col) is under a mouse / touch event on a canvas?
IP.pixelAt = function (canvas, event) {
  var rect = canvas.getBoundingClientRect();
  var col = Math.floor((event.clientX - rect.left) / rect.width * canvas.width);
  var row = Math.floor((event.clientY - rect.top) / rect.height * canvas.height);
  return { row: Math.max(0, Math.min(canvas.height - 1, row)), col: Math.max(0, Math.min(canvas.width - 1, col)) };
};

/* =====================================================================
   5. Code blocks, glossary terms, quick questions, expected values
   ===================================================================== */

// Very small Python highlighter: comments, strings, keywords, numbers.
var PY_TOKENS = /(#.*$)|("[^"\n]*"|'[^'\n]*')|\b(def|for|in|if|else|elif|return|import|as|from|while|and|or|not|True|False|None|print|range)\b|\b(\d+\.?\d*)\b/gm;
function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
IP.highlight = function (text) {
  var html = '', last = 0, m;
  PY_TOKENS.lastIndex = 0;
  while ((m = PY_TOKENS.exec(text))) {
    html += escapeHtml(text.slice(last, m.index));
    var cls = m[1] ? 'com' : m[2] ? 'str' : m[3] ? 'kw' : 'num';
    html += '<span class="tok-' + cls + '">' + escapeHtml(m[0]) + '</span>';
    last = m.index + m[0].length;
  }
  return html + escapeHtml(text.slice(last));
};

// Turn every <div class="code"><pre>...</pre></div> into a highlighted block with a Copy button.
IP.setupCode = function (root) {
  (root || document).querySelectorAll('.code').forEach(setupCodeBox);
};
function setupCodeBox(box) {
  if (box.dataset.ready) return;
  box.dataset.ready = '1';
  var pre = box.querySelector('pre');
  var text = pre.textContent.replace(/^\n/, '').replace(/\s+$/, '');
  pre.innerHTML = IP.highlight(text);
  var btn = IP.el('button', { class: 'copy', type: 'button', text: 'Copy' });
  btn.onclick = function () {
    var done = function () { btn.textContent = 'Copied!'; setTimeout(function () { btn.textContent = 'Copy'; }, 1400); };
    text = pre.textContent;   // read it now: some code boxes change while you play
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
    function fallback() {   // older browsers and file:// pages
      var ta = IP.el('textarea'); ta.value = text; document.body.appendChild(ta);
      ta.select(); try { document.execCommand('copy'); } catch (e) { /* ignore */ }
      ta.remove(); done();
    }
  };
  box.appendChild(btn);
}
// Make a code box from a string (used by the games)
IP.codeBox = function (text) {
  var box = IP.el('div', { class: 'code' }, IP.el('pre', { text: text }));
  setupCodeBox(box);
  return box;
};

// Glossary pop-ups: <span class="term" data-term="pixel">pixels</span>
var pop = null;
function hidePop() { if (pop) { pop.remove(); pop = null; } }
function showPop(target) {
  hidePop();
  var t = GLOSSARY[target.dataset.term];
  if (!t) return;
  pop = IP.el('div', { class: 'term-pop', role: 'tooltip' },
    IP.el('b', { text: t.term }), document.createTextNode(': ' + t.short + ' '),
    IP.el('a', { href: 'glossary.html#term-' + target.dataset.term, text: '→' }));
  document.body.appendChild(pop);
  var r = target.getBoundingClientRect();
  var left = Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - pop.offsetWidth - 8);
  pop.style.left = Math.max(8, left) + 'px';
  pop.style.top = (window.scrollY + r.bottom + 6) + 'px';
  pop.addEventListener('mouseleave', hidePop);
}
IP.setupTerms = function (root) {
  (root || document).querySelectorAll('.term').forEach(function (el) {
    if (el.dataset.ready) return;
    el.dataset.ready = '1';
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.addEventListener('mouseenter', function (e) { if (e.pointerType !== 'touch') showPop(el); });
    el.addEventListener('focus', function () { showPop(el); });
    el.addEventListener('click', function (e) { e.stopPropagation(); showPop(el); });
    el.addEventListener('mouseleave', function (e) {
      setTimeout(function () { if (pop && !pop.matches(':hover') && document.activeElement !== el) hidePop(); }, 120);
    });
    el.addEventListener('blur', function () { setTimeout(function () { if (pop && !pop.matches(':hover')) hidePop(); }, 150); });
  });
};
document.addEventListener('click', function (e) { if (pop && !pop.contains(e.target)) hidePop(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hidePop(); });

// Fill <ul id="term-list"> with every term used on this page.
function fillTermList() {
  var list = document.getElementById('term-list');
  if (!list) return;
  var seen = {};
  document.querySelectorAll('main .term').forEach(function (el) { seen[el.dataset.term] = true; });
  Object.keys(seen).sort(function (a, b) { return GLOSSARY[a].term.localeCompare(GLOSSARY[b].term); })
    .forEach(function (id) {
      list.appendChild(IP.el('li', {}, IP.el('span', { class: 'term', 'data-term': id, text: GLOSSARY[id].term })));
    });
}

// Quick questions: .quiz with buttons; the right one has data-correct.
// A Reset button in the top-right corner of a box (quizzes and code exercises).
function addReset(box, onReset) {
  var btn = IP.el('button', { class: 'btn secondary corner-reset', type: 'button', text: 'Reset' });
  btn.onclick = onReset;
  box.insertBefore(btn, box.firstChild);
}

function setupQuizzes() {
  document.querySelectorAll('.quiz').forEach(function (quiz) {
    var buttons = quiz.querySelectorAll('.choices button');
    var explain = quiz.querySelector('.explain');
    buttons.forEach(function (btn) {
      btn.onclick = function () {
        buttons.forEach(function (b) {
          b.disabled = true;
          if (b.hasAttribute('data-correct')) b.classList.add('ok');
        });
        if (!btn.hasAttribute('data-correct')) btn.classList.add('wrong');
        explain.hidden = false;
      };
    });
    addReset(quiz, function () {
      buttons.forEach(function (b) { b.disabled = false; b.classList.remove('ok', 'wrong'); });
      explain.hidden = true;
    });
  });
}

// Code exercises: Reset hides the solution again.
function setupExercises() {
  document.querySelectorAll('.exercise').forEach(function (ex) {
    addReset(ex, function () { ex.querySelectorAll('details').forEach(function (d) { d.open = false; }); });
  });
}

// Expected values for an exercise, for the test image and (if loaded) the photo.
// rowsFor(colorImage) returns [[label, value], ...]
// note: optional extra sentence; testLabel: column title for the test image (default landscape.png)
IP.expected = function (containerId, rowsFor, note, testLabel) {
  var box = document.getElementById(containerId);
  function render() {
    var testRows = rowsFor(IP.testColor);
    var photoRows = IP.photoColor ? rowsFor(IP.photoColor) : null;
    var head = IP.el('tr', {}, IP.el('th', { text: '' }), IP.el('th', { text: testLabel || 'landscape.png' }));
    if (photoRows) head.appendChild(IP.el('th', { text: 'my_photo.png' }));
    var table = IP.el('table', {}, IP.el('thead', {}, head));
    var body = IP.el('tbody');
    testRows.forEach(function (row, i) {
      var tr = IP.el('tr', {}, IP.el('td', { html: row[0] }), IP.el('td', { class: 'val', text: row[1] }));
      if (photoRows) tr.appendChild(IP.el('td', { class: 'val', text: photoRows[i][1] }));
      body.appendChild(tr);
    });
    table.appendChild(body);
    box.innerHTML = '';
    box.append(IP.el('h3', { text: 'Expected output' }), IP.el('div', { class: 'table-wrap' }, table));
    if (note) box.append(IP.el('p', { class: 'caption', text: note }));
  }
  IP.ready(render);
  IP.onChange(render);
};

/* =====================================================================
   Start
   ===================================================================== */
document.addEventListener('DOMContentLoaded', function () {
  buildLayout();
  fillTermList();
  IP.setupTerms();
  IP.setupCode();
  setupQuizzes();
  setupExercises();
  if (typeof TEST_IMAGE_DATA_URL !== 'undefined') loadImages();
});
