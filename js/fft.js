// fft.js - the Fourier transform for section 7 (frequency filtering).
//
// FFT.fft2(gray) gives the spectrum F (like np.fft.fft2), FFT.ifft2(F) gives the image back
// (like np.fft.ifft2(...).real). Masks are built around the center of the shifted spectrum,
// exactly like the lab code with np.fft.fftshift and D = distance to (h // 2, w // 2).

var FFT = {};

// 1D FFT of any length whose prime factors are small (240 = 2^4·3·5, 320 = 2^6·5).
// Split into p interleaved parts (p = smallest factor), transform each, combine.
function fft1(re, im, sign) {
  var n = re.length;
  if (n === 1) return [re, im];
  var p = 2;
  while (n % p) p++;
  var m = n / p, parts = [];
  for (var r = 0; r < p; r++) {
    var sr = new Float64Array(m), si = new Float64Array(m);
    for (var j = 0; j < m; j++) { sr[j] = re[j * p + r]; si[j] = im[j * p + r]; }
    parts.push(fft1(sr, si, sign));
  }
  var outR = new Float64Array(n), outI = new Float64Array(n);
  for (var k = 0; k < n; k++) {
    var sumR = 0, sumI = 0, km = k % m;
    for (r = 0; r < p; r++) {
      var a = sign * 2 * Math.PI * r * k / n, c = Math.cos(a), s = Math.sin(a);
      var xr = parts[r][0][km], xi = parts[r][1][km];
      sumR += xr * c - xi * s;
      sumI += xr * s + xi * c;
    }
    outR[k] = sumR; outI[k] = sumI;
  }
  return [outR, outI];
}

// 2D transform: every row, then every column. sign -1 = forward, +1 = inverse (not scaled).
function fft2d(w, h, re, im, sign) {
  var R = new Float64Array(w * h), I = new Float64Array(w * h), x, y, t;
  for (y = 0; y < h; y++) {
    t = fft1(re.slice(y * w, y * w + w), im.slice(y * w, y * w + w), sign);
    R.set(t[0], y * w); I.set(t[1], y * w);
  }
  var cr = new Float64Array(h), ci = new Float64Array(h);
  for (x = 0; x < w; x++) {
    for (y = 0; y < h; y++) { cr[y] = R[y * w + x]; ci[y] = I[y * w + x]; }
    t = fft1(cr, ci, sign);
    for (y = 0; y < h; y++) { R[y * w + x] = t[0][y]; I[y * w + x] = t[1][y]; }
  }
  return { w: w, h: h, re: R, im: I };
}

// np.fft.fft2(gray); the result of each image is kept, so sliders stay fast
var cache = new WeakMap();
FFT.fft2 = function (gray) {
  if (!cache.has(gray)) cache.set(gray, fft2d(gray.width, gray.height, Float64Array.from(gray.data), new Float64Array(gray.data.length), -1));
  return cache.get(gray);
};

// np.fft.ifft2(F).real, as decimals { width, height, data }
FFT.ifft2 = function (F) {
  var t = fft2d(F.w, F.h, F.re, F.im, 1), n = F.w * F.h, out = { width: F.w, height: F.h, data: new Float32Array(n) };
  for (var i = 0; i < n; i++) out.data[i] = t.re[i] / n;
  return out;
};

// F * mask (the mask is one number per frequency, same layout as F)
FFT.multiply = function (F, mask) {
  var n = F.w * F.h, re = new Float64Array(n), im = new Float64Array(n);
  for (var i = 0; i < n; i++) { re[i] = F.re[i] * mask[i]; im[i] = F.im[i] * mask[i]; }
  return { w: F.w, h: F.h, re: re, im: im };
};

// A mask from fn(dx, dy): dx, dy = position relative to the center of the shifted spectrum.
// It is stored unshifted (like F), so no fftshift is needed in JavaScript.
FFT.mask = function (w, h, fn) {
  var m = new Float64Array(w * h);
  for (var y = 0; y < h; y++) {
    var dy = y < h / 2 ? y : y - h;                // shifted row (y + h/2) % h  ->  distance y - h/2
    for (var x = 0; x < w; x++) m[y * w + x] = fn(x < w / 2 ? x : x - w, dy);
  }
  return m;
};

// The three lowpass shapes of the lecture; highpass = 1 - lowpass
FFT.lowpass = function (kind, D0, n) {
  return function (dx, dy) {
    var D = Math.sqrt(dx * dx + dy * dy);
    if (kind === 'ideal') return D <= D0 ? 1 : 0;
    if (kind === 'butterworth') return 1 / (1 + Math.pow(D / D0, 2 * (n || 2)));
    return Math.exp(-D * D / (2 * D0 * D0));       // Gaussian
  };
};
FFT.highpass = function (kind, D0, n) { var lp = FFT.lowpass(kind, D0, n); return function (dx, dy) { return 1 - lp(dx, dy); }; };
// A notch: 0 inside small circles at (dx, dy) and (-dx, -dy), 1 elsewhere (like cv2.circle(mask, ..., 0, -1))
FFT.notch = function (cx, cy, r) {
  return function (dx, dy) {
    return (dx - cx) * (dx - cx) + (dy - cy) * (dy - cy) <= r * r || (dx + cx) * (dx + cx) + (dy + cy) * (dy + cy) <= r * r ? 0 : 1;
  };
};

// The centered spectrum as a picture: log(1 + |F|), shifted so that the center is in the middle.
// scale: the log value drawn white (pass the one of the unfiltered spectrum to compare pictures)
FFT.logMax = function (F) {
  var max = 0;
  for (var i = 0; i < F.re.length; i++) max = Math.max(max, Math.log(1 + Math.hypot(F.re[i], F.im[i])));
  return max;
};
FFT.picture = function (F, scale) {
  var w = F.w, h = F.h, g = IP.makeGray(w, h);
  scale = scale || FFT.logMax(F);
  for (var py = 0; py < h; py++) {
    var y = (py + h / 2) % h;
    for (var px = 0; px < w; px++) {
      var i = y * w + (px + w / 2) % w;
      g.data[py * w + px] = Math.min(255, Math.round(255 * Math.log(1 + Math.hypot(F.re[i], F.im[i])) / scale));
    }
  }
  return g;
};
// A mask as a picture (white = 1 = keep, black = 0 = delete), centered like the spectrum
FFT.maskPicture = function (w, h, mask) {
  var g = IP.makeGray(w, h);
  for (var py = 0; py < h; py++) for (var px = 0; px < w; px++) g.data[py * w + px] = Math.round(255 * mask[((py + h / 2) % h) * w + (px + w / 2) % w]);
  return g;
};

// Average difference to a reference image, like np.abs(np.clip(out, 0, 255) - clean).mean()
FFT.score = function (out, clean) {
  var s = 0;
  for (var i = 0; i < out.data.length; i++) s += Math.abs(Math.min(255, Math.max(0, out.data[i])) - clean.data[i]);
  return s / out.data.length;
};

/* ---------- the images of this page: offered in the image bar ---------- */
FFT.images = {};          // name -> gray image
var fftWaiting = [];
(function () {
  var names = Object.keys(FREQUENCY_IMAGES), colors = {};
  Promise.all(names.map(function (name) {
    return IP.decode(FREQUENCY_IMAGES[name]).then(function (bmp) {
      colors[name] = IP.readPixels(bmp, bmp.width, bmp.height);
      FFT.images[name] = IP.toGray(colors[name]);
    });
  })).then(function () {
    names.forEach(function (name) { IP.addSource(name, name + '.png', colors[name]); });
    var waiting = fftWaiting; fftWaiting = null; waiting.forEach(function (fn) { fn(); });
  });
})();
// Run fn when the test image and the images of this page are ready
FFT.ready = function (fn) { IP.ready(function () { if (fftWaiting) fftWaiting.push(fn); else fn(); }); };
