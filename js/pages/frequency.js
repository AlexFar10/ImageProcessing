// Section 7: frequency filtering. On top: layers, the spectrum and the mask idea, with a spectrum demo.
// Then four topic tabs: lowpass, highpass, stripes (notch), fix the scan. The transform itself is in fft.js.

var D = Diagram;
var NEG = '#8B83DF';   // a negative piece of a layer (a darker purple)
function blue(v) { return { fill: D.pixel(v), text: String(v) }; }
function green(v) { return D.green(String(v)); }
function layer(v) { return { fill: v < 0 ? NEG : D.C.kernel, text: (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) }; }
function strip(x, y, s, values, style) {
  return values.map(function (v, i) { return D.cell(x + i * s, y, s, style(v, i)); }).join('');
}
function put(id, svg) { document.getElementById(id).innerHTML = svg; }
function signed(v) { return v < 0 ? '−' + Math.abs(v) : String(v); }

/* =====================================================================
   Layers and the spectrum (always visible, above the tabs)
   ===================================================================== */

// A row is a sum of layers: flat + slow + fast = the row
(function () {
  var s = 46, x0 = 200, out = '';
  var rows = [
    ['flat layer', [100, 100, 100, 100], function (v) { return blue(v); }, ''],
    ['slow layer: once per row', [50, 0, -50, 0], layer, '+'],
    ['fast layer: twice per row', [20, -20, 20, -20], layer, '+'],
    ['the row', [170, 80, 70, 80], function (v) { return blue(v); }, '=']
  ];
  rows.forEach(function (r, i) {
    var y = 14 + i * 54;
    out += D.text(x0 - 40, y + 28, r[0], { anchor: 'end' });
    if (r[3]) out += D.text(x0 - 18, y + 30, r[3], { size: 20, bold: true });
    out += strip(x0, y, s, r[1], r[2]);
  });
  put('d-row-layers', D.svg(400, 232, out, 'The row 170 80 70 80 is 100 flat plus a slow layer 50 0 -50 0 plus a fast layer 20 -20 20 -20'));
})();

// An image is a sum of layers: flat + left-right + top-bottom = the image
(function () {
  var s = 32, out = '', g = 44, size = 4 * s;
  var flat = [], lr = [], tb = [], img = [];
  for (var r = 0; r < 4; r++) {
    flat.push([]); lr.push([]); tb.push([]); img.push([]);
    for (var c = 0; c < 4; c++) {
      var a = c % 2 ? -30 : 30, b = r % 2 ? -20 : 20;
      flat[r].push(100); lr[r].push(a); tb[r].push(b); img[r].push(100 + a + b);
    }
  }
  var grids = [['flat layer', flat, null], ['left-right layer', lr, layer], ['top-bottom layer', tb, layer], ['the image', img, null]];
  grids.forEach(function (gr, i) {
    var x = 10 + i * (size + g);
    out += D.grid(x, 10, s, gr[1], gr[2] ? function (v) { return gr[2](v); } : null) + D.window(x, 10, s, 0, 0, 1);
    out += D.text(x + size / 2, size + 32, gr[0], { bold: true, size: 12 });
    if (i < 3) out += D.text(x + size + g / 2, 10 + size / 2 + 8, i < 2 ? '+' : '=', { size: 22, bold: true });
  });
  out += D.text(345, size + 56, 'top-left pixel (black frame): 100 + 30 + 20 = 150', { size: 11 });
  put('d-image-layers', D.svg(690, size + 66, out, 'A 4 by 4 image is a flat layer plus a left-right layer plus a top-bottom layer'));
})();

// The spectrum of that image: one number per layer
(function () {
  var s = 54, x0 = 150, y0 = 52, out = '';
  var F = [[1600, 0, 480, 0], [0, 0, 0, 0], [320, 0, 0, 0], [0, 0, 0, 0]];
  out += D.text(x0 + 2 * s, 18, 'repetitions across →', { size: 12 });
  out += D.text(x0 - 40, 18, 'down ↓', { size: 12 });
  for (var i = 0; i < 4; i++) {
    out += D.text(x0 + i * s + s / 2, y0 - 8, String(i), { size: 11 });
    out += D.text(x0 - 14, y0 + i * s + s / 2 + 4, String(i), { size: 11 });
  }
  out += D.grid(x0, y0, s, F, function (v) { return v ? green(v) : { fill: '#f3f4f6', text: '0' }; });
  out += D.text(x0 + 4 * s + 20, y0 + 30, '1600: the flat layer (100 × 16 pixels)', { anchor: 'start', size: 12 });
  out += D.text(x0 + 4 * s + 20, y0 + 52, '480: left-right, 2 per row (30 × 16)', { anchor: 'start', size: 12 });
  out += D.text(x0 + 4 * s + 20, y0 + 74, '320: top-bottom, 2 per column (20 × 16)', { anchor: 'start', size: 12 });
  out += D.text(x0 + 4 * s + 20, y0 + 96, '0: every layer that is not in the image', { anchor: 'start', size: 12 });
  put('d-spectrum', D.svg(640, y0 + 4 * s + 14, out, 'The spectrum of the 4 by 4 image: 1600 for the flat layer, 480 and 320 for the two others, 0 elsewhere'));
})();

// The five steps of every frequency filter
(function () {
  var steps = ['image', 'Fourier transform', 'spectrum × mask', 'inverse transform', 'result'], bw = 112, gap = 26, out = '';
  steps.forEach(function (t, i) {
    var x = 6 + i * (bw + gap), mask = i === 2;
    out += '<rect x="' + x + '" y="20" width="' + bw + '" height="46" rx="8" fill="' + (mask ? D.C.kernel : i % 4 ? '#fff' : D.C.light) +
      '" stroke="' + (mask ? D.C.kernelLine : '#000') + '" stroke-width="1.5"/>';
    out += D.text(x + bw / 2, 48, t, { size: 12, bold: mask });
    if (i < 4) out += D.arrow(x + bw + 3, 43, x + bw + gap - 3, 43);
  });
  out += D.text(345, 92, 'only the mask changes from one filter to the next', { size: 11 });
  put('d-pipeline', D.svg(690, 102, out, 'image, Fourier transform, spectrum times mask, inverse transform, result'));
})();

// Demo: your image and its spectrum
(function () {
  var SAY = {
    sign: 'The clean sign: bright lines through the middle. Long straight edges (the panel, the letters) are fast changes in one direction.',
    sign_noisy: 'Noise: the spectrum is gray everywhere, even far from the middle. Noise is a little of every fast layer.',
    sign_stripes: 'Stripes: two bright dots left and right of the middle, 40 cells away. That is the stripe layer.',
    scan_damaged: 'Both problems: gray everywhere (noise) and the two dots (stripes).'
  };
  function draw() {
    var gray = IP.gray(), F = FFT.fft2(gray);
    IP.draw(document.getElementById('sp-src'), gray);
    IP.draw(document.getElementById('sp-spec'), FFT.picture(F));
    document.getElementById('sp-live').textContent = SAY[IP.source] ||
      'A photo: most of the brightness sits near the middle (slow changes); the lines through the middle come from straight edges.';
  }
  FFT.ready(draw);
  IP.onChange(draw);
})();

/* =====================================================================
   1. Lowpass
   ===================================================================== */

// The three mask shapes, D0 = 30: how much of each layer is kept, by distance to the middle
(function () {
  var W = 520, H = 220, x0 = 50, y0 = 20, pw = 440, ph = 150, out = '', D0 = 30;
  function X(d) { return x0 + d / 100 * pw; }
  function Y(v) { return y0 + (1 - v) * ph; }
  function curve(fn, color, dash) {
    var pts = [];
    for (var d = 0; d <= 100; d += 0.5) pts.push(X(d).toFixed(1) + ',' + Y(fn(d, 0)).toFixed(1));
    return '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="2.5"' + (dash ? ' stroke-dasharray="6 4"' : '') + '/>';
  }
  out += '<line x1="' + x0 + '" y1="' + Y(0) + '" x2="' + (x0 + pw) + '" y2="' + Y(0) + '" stroke="#000"/>';
  out += '<line x1="' + x0 + '" y1="' + Y(0) + '" x2="' + x0 + '" y2="' + y0 + '" stroke="#000"/>';
  out += '<line x1="' + X(D0) + '" y1="' + Y(0) + '" x2="' + X(D0) + '" y2="' + y0 + '" stroke="#9ca3af" stroke-dasharray="3 3"/>';
  out += D.text(X(D0), Y(0) + 16, 'D0', { size: 11 }) + D.text(x0 - 8, Y(1) + 4, '1', { anchor: 'end', size: 11 }) + D.text(x0 - 8, Y(0) + 4, '0', { anchor: 'end', size: 11 });
  out += D.text(x0 + pw / 2, H - 6, 'distance from the middle of the spectrum', { size: 11 });
  out += curve(FFT.lowpass('ideal', D0), '#000', true) + curve(FFT.lowpass('butterworth', D0, 2), D.C.kernelLine) + curve(FFT.lowpass('gaussian', D0), D.C.greenLine);
  out += D.text(X(42), Y(0.92), 'ideal: a sharp cut', { anchor: 'start', size: 12 });
  out += D.text(X(42), Y(0.75), 'Butterworth (n = 2)', { anchor: 'start', size: 12 });
  out += D.text(X(42), Y(0.58), 'Gaussian: a soft bell', { anchor: 'start', size: 12 });
  out += '<line x1="' + X(36) + '" y1="' + (Y(0.75) - 4) + '" x2="' + X(40.5) + '" y2="' + (Y(0.75) - 4) + '" stroke="' + D.C.kernelLine + '" stroke-width="2.5"/>';
  out += '<line x1="' + X(36) + '" y1="' + (Y(0.58) - 4) + '" x2="' + X(40.5) + '" y2="' + (Y(0.58) - 4) + '" stroke="' + D.C.greenLine + '" stroke-width="2.5"/>';
  out += '<line x1="' + X(36) + '" y1="' + (Y(0.92) - 4) + '" x2="' + X(40.5) + '" y2="' + (Y(0.92) - 4) + '" stroke="#000" stroke-width="2.5" stroke-dasharray="6 4"/>';
  put('d-masks', D.svg(W, H, out, 'Ideal, Butterworth and Gaussian lowpass masks: how much of each layer is kept by distance to the middle'));
})();

// Shared drawing for the filter demos: original, spectrum x mask, result
function filterDemo(ids, gray, mask, show) {
  var F = FFT.fft2(gray), scale = FFT.logMax(F), G = FFT.multiply(F, mask), out = FFT.ifft2(G);
  IP.draw(document.getElementById(ids[0]), gray);
  IP.draw(document.getElementById(ids[1]), FFT.picture(G, scale));
  IP.draw(document.getElementById(ids[2]), show ? show(out) : Filter.toGray(out));
  return out;
}
// Score against the clean sign, when the image is one of the signs
function scoreText(gray, out) {
  if (!/^sign_|^scan/.test(IP.source) && gray !== FFT.images.sign_stripes && gray !== FFT.images.scan_damaged) return '';
  var before = FFT.score(Filter.fromGray(gray), FFT.images.sign), after = FFT.score(out, FFT.images.sign);
  return ' Score against the clean sign (lower is better): ' + before.toFixed(1) + ' → ' + after.toFixed(1) + '.';
}

(function () {
  var d0El = document.getElementById('lp-d0');
  function kind() { return document.querySelector('input[name=lp-kind]:checked').value; }
  function draw() {
    var gray = IP.gray(), D0 = Number(d0El.value), k = kind();
    document.getElementById('lp-d0-val').textContent = D0;
    var out = filterDemo(['lp-src', 'lp-spec', 'lp-dst'], gray, FFT.mask(gray.width, gray.height, FFT.lowpass(k, D0, 2)));
    var say = D0 <= 15 ? 'Only the slowest layers are left: very blurry, the letters are hard to read.'
      : D0 <= 45 ? 'A good middle: the noise is mostly gone and the letters are still readable.'
      : 'Most layers are kept: still sharp, but much of the noise is still there.';
    if (k === 'ideal') say += ' The sharp cut of the ideal mask leaves ripples (rings) next to the edges.';
    document.getElementById('lp-live').textContent = say + scoreText(gray, out);
  }
  var redraw = Filter.onFrame(draw);
  d0El.addEventListener('input', redraw);
  document.querySelectorAll('input[name=lp-kind]').forEach(function (r) { r.addEventListener('input', redraw); });
  FFT.ready(draw);
  IP.onChange(draw);
})();

/* =====================================================================
   2. Highpass
   ===================================================================== */

(function () {
  var s = 46, x0 = 170, out = '';
  var rows = [['the row', [170, 80, 70, 80], function (v) { return blue(v); }],
    ['lowpass (blurred)', [150, 100, 50, 100], function (v) { return blue(v); }],
    ['highpass = row − lowpass', [20, -20, 20, -20], function (v) { return green(signed(v)); }]];
  rows.forEach(function (r, i) {
    var y = 12 + i * 54;
    out += D.text(x0 - 14, y + 28, r[0], { anchor: 'end' }) + strip(x0, y, s, r[1], r[2]);
  });
  out += D.text(x0 + 2 * s, 182, 'the highpass is exactly the fast layer the blur removed', { size: 11 });
  put('d-highpass', D.svg(400, 194, out, 'Highpass is the row minus its lowpass: 20 -20 20 -20'));
})();

(function () {
  var d0El = document.getElementById('hp-d0');
  function mode() { return document.querySelector('input[name=hp-show]:checked').value; }
  function draw() {
    var gray = IP.gray(), D0 = Number(d0El.value), m = mode();
    document.getElementById('hp-d0-val').textContent = D0;
    filterDemo(['hp-src', 'hp-spec', 'hp-dst'], gray, FFT.mask(gray.width, gray.height, FFT.highpass('gaussian', D0)), function (hp) {
      return m === 'edges' ? Filter.toGray(hp, 'abs') : Filter.toGray(Filter.add(Filter.fromGray(gray), hp, 1));
    });
    document.getElementById('hp-cap').textContent = m === 'edges' ? '|result|: the edges' : 'image + result: sharper';
    document.getElementById('hp-live').textContent = (m === 'edges'
      ? 'Flat areas give 0 (black); only the fast changes stay. '
      : 'Every edge gets stronger: the highpass is added on top of the image. ') +
      (D0 <= 15 ? 'Small D0: almost everything except the flat level is kept, so the edges are thick.'
        : D0 <= 50 ? 'Middle D0: clear outlines.'
        : 'Big D0: only the finest details and the noise are left.');
  }
  var redraw = Filter.onFrame(draw);
  d0El.addEventListener('input', redraw);
  document.querySelectorAll('input[name=hp-show]').forEach(function (r) { r.addEventListener('input', redraw); });
  FFT.ready(draw);
  IP.onChange(draw);
})();

/* =====================================================================
   3. Stripes (notch)
   ===================================================================== */

(function () {
  var s = 20, out = '', vals = [];
  for (var x = 0; x < 24; x++) vals.push(Math.round(110 + 40 * Math.cos(2 * Math.PI * x / 8)));
  out += D.text(10, 18, 'stripes: the same pattern every 8 pixels', { anchor: 'start', bold: true, size: 12 });
  out += vals.map(function (v, i) { return '<rect x="' + (10 + i * s) + '" y="26" width="' + s + '" height="34" fill="' + D.pixel(v) + '" stroke="#fff"/>'; }).join('');
  out += '<line x1="10" y1="26" x2="10" y2="66" stroke="#000"/><line x1="' + (10 + 8 * s) + '" y1="26" x2="' + (10 + 8 * s) + '" y2="66" stroke="#000"/>';
  out += D.text(10 + 4 * s, 80, '8 pixels', { size: 11 });
  var cx = 250, y = 140, k = 2.4;
  out += D.text(10, 110, 'the middle row of the spectrum', { anchor: 'start', bold: true, size: 12 });
  out += '<line x1="20" y1="' + y + '" x2="480" y2="' + y + '" stroke="#000"/>';
  [[-40, '−40'], [0, 'middle'], [40, '+40']].forEach(function (d) {
    out += '<circle cx="' + (cx + d[0] * k) + '" cy="' + y + '" r="' + (d[0] ? 8 : 10) + '" fill="' + (d[0] ? D.C.green : D.C.light) + '" stroke="' + (d[0] ? D.C.greenLine : D.C.dark) + '" stroke-width="2"/>';
    out += D.text(cx + d[0] * k, y + 28, d[1], { size: 11 });
  });
  out += D.text(cx, y + 48, '320 / 8 = 40 repetitions across: the two dots sit 40 cells from the middle', { size: 11 });
  put('d-stripes', D.svg(500, 200, out, 'Stripes that repeat every 8 pixels give two dots 40 cells left and right of the middle of the spectrum'));
})();

(function () {
  function draw() {
    var gray = FFT.images.sign_stripes, d = document.querySelector('input[name=st-do]:checked').value, w = gray.width, h = gray.height;
    var mask = FFT.mask(w, h, d === 'blur' ? FFT.lowpass('gaussian', 30) : d === 'notch' ? FFT.notch(40, 0, 3) : function () { return 1; });
    var out = filterDemo(['st-src', 'st-spec', 'st-dst'], gray, mask);
    var say = d === 'none' ? 'Nothing deleted: the result is the striped sign itself (the inverse transform loses nothing).'
      : d === 'blur' ? 'The blur deletes the dots, but also every other fast layer: the stripes fade and the letters get soft.'
      : 'Only the two dots are deleted: the stripes are gone and the letters stay sharp.';
    var before = FFT.score(Filter.fromGray(gray), FFT.images.sign), after = FFT.score(out, FFT.images.sign);
    document.getElementById('st-live').textContent = say + ' Score against the clean sign: ' + before.toFixed(1) + ' → ' + after.toFixed(1) + '.';
  }
  document.querySelectorAll('input[name=st-do]').forEach(function (r) { r.addEventListener('input', draw); });
  FFT.ready(draw);
})();

/* =====================================================================
   4. Fix the scan
   ===================================================================== */

(function () {
  var notchEl = document.getElementById('sc-notch'), lowEl = document.getElementById('sc-low'), d0El = document.getElementById('sc-d0');
  function draw() {
    var gray = FFT.images.scan_damaged, w = gray.width, h = gray.height, D0 = Number(d0El.value);
    var notch = FFT.notch(40, 0, 3), low = FFT.lowpass('gaussian', D0);
    document.getElementById('sc-d0-label').hidden = !lowEl.checked;
    document.getElementById('sc-d0-val').textContent = D0;
    var mask = FFT.mask(w, h, function (dx, dy) { return (notchEl.checked ? notch(dx, dy) : 1) * (lowEl.checked ? low(dx, dy) : 1); });
    var out = filterDemo(['sc-src', 'sc-spec', 'sc-dst'], gray, mask);
    var say = !notchEl.checked && !lowEl.checked ? 'Nothing deleted yet.'
      : notchEl.checked && !lowEl.checked ? 'The stripes are gone; the noise is still there.'
      : !notchEl.checked ? 'The noise is softer, but the stripes are still visible.'
      : 'Both fixes: the stripes and most of the noise are gone.';
    var before = FFT.score(Filter.fromGray(gray), FFT.images.sign), after = FFT.score(out, FFT.images.sign);
    document.getElementById('sc-live').textContent = say + ' Score against the clean sign: ' + before.toFixed(1) + ' → ' + after.toFixed(1) + '.';
  }
  var redraw = Filter.onFrame(draw);
  [notchEl, lowEl, d0El].forEach(function (el) { el.addEventListener('input', redraw); });
  FFT.ready(draw);
})();

/* =====================================================================
   Exercises: code with dropdowns (one per tab)
   ===================================================================== */
var LOAD = function (name) { return name + ' = cv2.imread("' + (name === 'clean' ? 'sign' : name) + '.png", cv2.IMREAD_GRAYSCALE).astype(np.float32)\n'; };
var DIST = 'h, w = img.shape\ny, x = np.ogrid[:h, :w]\nD = np.sqrt((x - w // 2) ** 2 + (y - h // 2) ** 2)   # distance to the middle\n';

Games.fillBlanks(document.getElementById('ex-lowpass'), {
  title: 'Exercise: lowpass in five steps',
  task: 'Blur <code>sign_noisy.png</code> with a Gaussian lowpass mask (D0 = 30) and score it against the clean sign.',
  parts: [
    'img = cv2.imread("sign_noisy.png", cv2.IMREAD_GRAYSCALE).astype(np.float32)\n' + LOAD('clean') + DIST +
    'mask = np.exp(-D ** 2 / (2 * 30 ** 2))             # Gaussian lowpass, D0 = 30\nF = np.fft.fftshift(np.fft.',
    { answer: 'fft2', options: ['fft2', 'ifft2', 'fftshift'], hint: 'First the Fourier transform of the image: np.fft.fft2.' },
    '(img))              # transform, then put the middle in the middle\nout = np.fft.ifft2(np.fft.',
    { answer: ['ifftshift', 'fftshift'], options: ['ifftshift', 'fft2', 'fftshift'], hint: 'Undo the shift before the inverse transform: np.fft.ifftshift.' },
    '(F ', { answer: '*', options: ['+', '*', '-'], hint: 'A mask is multiplied: 1 keeps a layer, 0 deletes it.' },
    ' mask)).', { answer: 'real', options: ['real', 'imag'], hint: 'The image is the real part; the imaginary part is (almost) 0.' },
    '\nprint(round(float(np.abs(np.clip(out, 0, 255) - clean).mean()), 1))   # prints ',
    { answer: '9.3', options: ['31.2', '9.3', '0.0'], hint: '31.2 is the noisy image itself; the blur gets much closer to the clean sign.' }
  ],
  explain: 'fft2, shift, multiply by the mask, shift back, ifft2, keep the real part. The score drops from 31.2 to 9.3. ' +
    '(For even sizes fftshift and ifftshift do the same, so both are accepted.)',
  onCorrect: function (out) {
    var g = FFT.images.sign_noisy, r = FFT.ifft2(FFT.multiply(FFT.fft2(g), FFT.mask(g.width, g.height, FFT.lowpass('gaussian', 30))));
    out.append(IP.el('div', { class: 'grid-2' }, IP.figure(g, 'sign_noisy.png'), IP.figure(Filter.toGray(r), 'out')));
  }
});

Games.fillBlanks(document.getElementById('ex-highpass'), {
  title: 'Exercise: edges and sharpening with a highpass',
  task: 'Build the highpass mask from the lowpass one, then make an edge image and a sharpened image of <code>sign.png</code>.',
  parts: [
    'img = cv2.imread("sign.png", cv2.IMREAD_GRAYSCALE).astype(np.float32)\n' + DIST + 'low = np.exp(-D ** 2 / (2 * 30 ** 2))\nhigh = ',
    { answer: '1 - low', options: ['1 - low', 'low - 1', '2 * low'], hint: 'Keep where the lowpass deletes: 1 minus the lowpass.' },
    '\nF = np.fft.fftshift(np.fft.fft2(img))\nhp = np.fft.ifft2(np.fft.ifftshift(F * high)).real\nedges = np.clip(np.',
    { answer: 'abs', options: ['round', 'abs', 'sqrt'], hint: 'The highpass is negative on one side of an edge: keep its size with the absolute value.' },
    '(hp), 0, 255).astype(np.uint8)   # the size of the change\nsharp = np.clip(img ',
    { answer: '+', options: ['+', '-'], hint: 'Sharpening adds the details back on top of the image.' },
    ' hp, 0, 255).astype(np.uint8)   # sharpening\nprint(round(float(hp[200, 260])))   # a flat part of the sign: ',
    { answer: '0', options: ['0', '70', '190'], hint: 'A flat area has no fast change, so the highpass is 0 there.' }
  ],
  explain: 'high = 1 − low; |hp| shows the edges, image + hp sharpens, and a flat area gives 0.',
  onCorrect: function (out) {
    var g = FFT.images.sign, hp = FFT.ifft2(FFT.multiply(FFT.fft2(g), FFT.mask(g.width, g.height, FFT.highpass('gaussian', 30))));
    out.append(IP.el('div', { class: 'grid-2' }, IP.figure(Filter.toGray(hp, 'abs'), 'edges'), IP.figure(Filter.toGray(Filter.add(Filter.fromGray(g), hp, 1)), 'sharp')));
  }
});

Games.fillBlanks(document.getElementById('ex-notch'), {
  title: 'Exercise: delete the two dots',
  task: 'Make a mask that is 0 only on the two stripe dots of <code>sign_stripes.png</code>, then score the result.',
  parts: [
    'img = cv2.imread("sign_stripes.png", cv2.IMREAD_GRAYSCALE).astype(np.float32)\n' + LOAD('clean') +
    'h, w = img.shape\nmask = np.ones((h, w), np.float32)\ncv2.circle(mask, ',
    { answer: '(w // 2 - 40, h // 2)', options: ['(w // 2 - 40, h // 2)', '(h // 2, w // 2 - 40)', '(w // 2 - 8, h // 2)'],
      hint: 'OpenCV points are (x, y) = (column, row), and the dot is 40 cells from the middle (320 / 8), not 8.' },
    ', 3, 0, -1)   # the left dot\ncv2.circle(mask, (w // 2 + 40, h // 2), 3, 0, -1)   # the right dot\n' +
    'F = np.fft.fftshift(np.fft.fft2(img))\nout = np.fft.ifft2(np.fft.ifftshift(F * mask)).real\n' +
    'print(round(float(np.abs(img - clean).mean()), 1), round(float(np.abs(np.clip(out, 0, 255) - clean).mean()), 1))   # prints ',
    { answer: '24.0 2.1', options: ['2.1 24.0', '24.0 2.1', '24.0 24.0'], hint: 'First the striped image, then the fixed one: the score drops.' }
  ],
  explain: 'The dots sit at (w // 2 ± 40, h // 2); deleting them takes the score from 24.0 to 2.1 without touching the letters.',
  onCorrect: function (out) {
    var g = FFT.images.sign_stripes, r = FFT.ifft2(FFT.multiply(FFT.fft2(g), FFT.mask(g.width, g.height, FFT.notch(40, 0, 3))));
    out.append(IP.el('div', { class: 'grid-2' }, IP.figure(g, 'sign_stripes.png'), IP.figure(Filter.toGray(r), 'out')));
  }
});

Games.fillBlanks(document.getElementById('ex-scan'), {
  title: 'Exercise: fix the damaged scan',
  task: 'One mask for both problems: zeros on the two dots, times a Gaussian lowpass.',
  parts: [
    'img = cv2.imread("scan_damaged.png", cv2.IMREAD_GRAYSCALE).astype(np.float32)\n' + LOAD('clean') + DIST +
    'mask = np.ones((h, w), np.float32)\ncv2.circle(mask, (w // 2 - 40, h // 2), 3, 0, -1)\ncv2.circle(mask, (w // 2 + 40, h // 2), 3, 0, -1)   # 1. the stripes\nmask = mask ',
    { answer: '*', options: ['+', '*'], hint: 'Both masks must apply: multiply them (a 0 in either one deletes the layer).' },
    ' np.exp(-D ** 2 / (2 * ', { answer: '30', options: ['3', '30', '300'], hint: 'D0 = 3 keeps almost nothing (31.7), D0 = 300 keeps almost everything (21.7).' },
    ' ** 2))   # 2. the noise\nF = np.fft.fftshift(np.fft.fft2(img))\nout = np.fft.ifft2(np.fft.ifftshift(F * mask)).real\n' +
    'print(round(float(np.abs(img - clean).mean()), 1), round(float(np.abs(np.clip(out, 0, 255) - clean).mean()), 1))   # prints ',
    { answer: '33.0 8.3', options: ['33.0 8.3', '33.0 23.3', '8.3 33.0'], hint: 'With only the dots deleted it would be 23.3; the lowpass removes most of the noise too.' }
  ],
  explain: 'Multiplying the two masks applies both fixes at once: 33.0 → 8.3 (only the notch: 23.3).',
  onCorrect: function (out) {
    var g = FFT.images.scan_damaged, notch = FFT.notch(40, 0, 3), low = FFT.lowpass('gaussian', 30);
    var r = FFT.ifft2(FFT.multiply(FFT.fft2(g), FFT.mask(g.width, g.height, function (dx, dy) { return notch(dx, dy) * low(dx, dy); })));
    out.append(IP.el('div', { class: 'grid-2' }, IP.figure(g, 'scan_damaged.png'), IP.figure(Filter.toGray(r), 'out')));
  }
});
