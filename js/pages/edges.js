// Section 7: edges and sharpening.

/* ---------- Theory: illustrations ---------- */
(function () {
  var D = Diagram, s = 40, x0 = 210;
  var f = [10, 10, 10, 200, 200, 200];
  function row(y, values, from, style) {
    return values.map(function (v, i) { return D.cell(x0 + (from + i) * s, y, s, style(v)); }).join('');
  }
  function blue(v) { return { fill: D.pixel(v), text: String(v) }; }
  function green(v) { return D.green(String(v)); }

  // 1. first and second derivative of one row
  var d = '';
  for (var i = 0; i < 6; i++) d += D.text(x0 + i * s + s / 2, 18, 'x = ' + i, { size: 11 });
  d += D.text(x0 - 12, 50, 'f(x)', { anchor: 'end' }) + row(26, f, 0, blue);
  d += D.text(x0 - 12, 100, 'f(x+1) − f(x)', { anchor: 'end' }) + row(76, [0, 0, 190, 0, 0], 0, green);
  d += D.text(x0 - 12, 150, 'f(x+1) + f(x−1) − 2f(x)', { anchor: 'end' }) + row(126, [0, 190, -190, 0], 1, green);
  d += D.text(x0 + 3 * s, 196, 'the edge is between x = 2 and x = 3', { size: 11 });
  document.getElementById('d-deriv').innerHTML = D.svg(470, 208, d, 'A step from 10 to 200: first derivative 190 at the edge, second derivative 190 then -190');

  // 2. Sobel on a 3x3 window
  var win = [[10, 10, 200], [10, 10, 200], [10, 10, 200]];
  var sb = '';
  sb += D.text(20, 22, 'window', { anchor: 'start', bold: true }) + D.grid(20, 34, 36, win) + D.window(20, 34, 36, 0, 0, 3);
  sb += D.text(170, 22, 'dx kernel', { anchor: 'start', bold: true }) + D.grid(170, 34, 36, [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], function (v) { return D.purple(String(v)); });
  sb += D.text(320, 22, 'dy kernel', { anchor: 'start', bold: true }) + D.grid(320, 34, 36, [[-1, -2, -1], [0, 0, 0], [1, 2, 1]], function (v) { return D.purple(String(v)); });
  sb += D.text(480, 22, 'M on screen', { anchor: 'start', bold: true }) + D.cell(480, 70, 36, D.green('255'));
  sb += D.text(20, 174, 'dx = (200 + 2·200 + 200) − (10 + 2·10 + 10) = 800 − 40 = 760', { anchor: 'start' });
  sb += D.text(20, 196, 'dy = 0 (every column is the same from top to bottom)', { anchor: 'start' });
  sb += D.text(20, 218, 'M = √(760² + 0²) = 760, cut to 255 for display', { anchor: 'start' });
  document.getElementById('d-sobel').innerHTML = D.svg(580, 232, sb, 'Sobel on a vertical edge: dx = 760, dy = 0, magnitude 760');

  // 3. Laplacian sharpening on one row
  var l = '';
  for (i = 0; i < 6; i++) l += D.text(x0 + i * s + s / 2, 18, 'x = ' + i, { size: 11 });
  l += D.text(x0 - 12, 50, 'f', { anchor: 'end' }) + row(26, f, 0, blue);
  l += D.text(x0 - 12, 100, 'second derivative', { anchor: 'end' }) + row(76, [0, 190, -190, 0], 1, green);
  l += D.text(x0 - 12, 150, 'f − second derivative', { anchor: 'end' }) + row(126, [10, -180, 390, 200], 1, green);
  l += D.text(x0 - 12, 200, 'after clipping', { anchor: 'end' }) + row(176, [10, 0, 255, 200], 1, green);
  l += D.text(235, 240, 'dark side darker, bright side brighter: a crisper edge', { size: 11 });
  document.getElementById('d-lap').innerHTML = D.svg(470, 252, l, 'Sharpening a step: 10 10 10 200 200 200 becomes 10 0 255 200 around the edge');
})();

/* ---------- Demo D: derivatives of one row ---------- */
(function () {
  var pos = document.getElementById('kd-pos'), canvas = document.getElementById('kd-plot'), N = 24;
  function shape() { return document.querySelector('input[name=kd-shape]:checked').value; }
  function row() {
    var e = Number(pos.value), f = [];
    for (var x = 0; x < N; x++) {
      if (shape() === 'step') f.push(x < e ? 10 : 200);
      else f.push(x < e ? 10 : x >= e + 4 ? 200 : 10 + 38 * (x - e + 1));   // a ramp of 5 steps of 38
    }
    return f;
  }
  // One panel: bars from a zero line. signed: the zero line is in the middle
  function panel(ctx, top, height, values, start, title, signed, color) {
    var W = canvas.width, left = 190, cw = (W - left - 10) / N, zero = signed ? top + height / 2 : top + height;
    ctx.fillStyle = '#000';
    ctx.font = '17px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(title, left - 10, top + height / 2 + 4);
    ctx.strokeStyle = '#9ca3af';
    ctx.beginPath(); ctx.moveTo(left, zero + 0.5); ctx.lineTo(W - 10, zero + 0.5); ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = '13px system-ui, sans-serif';
    values.forEach(function (v, i) {
      var x = left + (start + i) * cw, scale = (signed ? height / 2 - 12 : height - 14) / 200;
      var hgt = v * scale;
      ctx.fillStyle = color;
      ctx.fillRect(x + 2, hgt >= 0 ? zero - hgt : zero, cw - 4, Math.abs(hgt));
      if (v !== 0) { ctx.fillStyle = '#000'; ctx.fillText(String(v), x + cw / 2, hgt >= 0 ? zero - hgt - 3 : zero - hgt + 11); }
    });
  }
  function draw() {
    var f = row(), d1 = [], d2 = [];
    for (var x = 0; x < N - 1; x++) d1.push(f[x + 1] - f[x]);
    for (x = 1; x < N - 1; x++) d2.push(f[x + 1] + f[x - 1] - 2 * f[x]);
    document.getElementById('kd-pos-val').textContent = pos.value;
    canvas.width = 760; canvas.height = 420;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    panel(ctx, 10, 120, f, 0, 'f(x)', false, Diagram.C.dark);
    panel(ctx, 140, 130, d1, 0, 'first derivative', true, Diagram.C.green);
    panel(ctx, 280, 130, d2, 1, 'second derivative', true, Diagram.C.green);
    document.getElementById('kd-note').textContent = shape() === 'step'
      ? 'Step: the first derivative is one spike; the second gives + then − (a zero crossing at the edge).'
      : 'Ramp: the first derivative is non-zero along the whole ramp; the second only at its start and end.';
  }
  pos.addEventListener('input', draw);
  document.querySelectorAll('input[name=kd-shape]').forEach(function (r) { r.addEventListener('input', draw); });
  draw();
})();

/* ---------- Demo E: Sobel ---------- */
(function () {
  var pick = Filter.picker('edges');
  document.getElementById('ke-controls').prepend(IP.el('label', {}, 'Image ', pick));
  var bit8 = document.getElementById('ke-8bit'), tEl = document.getElementById('ke-t');
  function what() { return document.querySelector('input[name=ke-what]:checked').value; }
  function draw() {
    if (!Filter.loaded()) return;
    var gray = Filter.image(pick.value), f = Filter.fromGray(gray), w = what(), T = Number(tEl.value);
    var dx = Filter.sobelX(f), dy = Filter.sobelY(f);
    if (bit8.checked) { dx = Filter.saturate(dx); dy = Filter.saturate(dy); }   // CV_8U: negatives are lost
    var shown;
    if (w === 'mag') {
      shown = Filter.make(gray.width, gray.height);
      for (var i = 0; i < shown.data.length; i++) shown.data[i] = Math.sqrt(dx.data[i] * dx.data[i] + dy.data[i] * dy.data[i]);
    } else shown = w === 'dx' ? dx : dy;
    var out = Filter.toGray(shown, 'abs');
    if (w === 'mag' && T > 0) out = IP.threshold(out, T);
    var nonzero = 0;
    for (i = 0; i < out.data.length; i++) if (out.data[i]) nonzero++;
    document.getElementById('ke-t-val').textContent = T > 0 ? T : 'off';
    tEl.closest('label').hidden = w !== 'mag';
    IP.draw(document.getElementById('ke-src'), gray);
    IP.draw(document.getElementById('ke-dst'), out);
    document.getElementById('ke-cap').textContent = (w === 'mag' ? 'magnitude' : w) + ' · ' + Math.round(100 * nonzero / out.data.length) + '% of pixels not black';
    var depth = bit8.checked ? 'cv2.CV_8U' : 'cv2.CV_32F';
    var code = 'gx = cv2.Sobel(gray, ' + depth + ', 1, 0)\ngy = cv2.Sobel(gray, ' + depth + ', 0, 1)';
    if (w === 'mag') code += '\nmag = cv2.magnitude(gx.astype(np.float32), gy.astype(np.float32))' + (T > 0 ? '\nT, edges = cv2.threshold(np.clip(mag, 0, 255).astype(np.uint8), ' + T + ', 255, cv2.THRESH_BINARY)' : '');
    else if (!bit8.checked) code += '\nshown = np.clip(np.abs(' + (w === 'dx' ? 'gx' : 'gy') + '), 0, 255).astype(np.uint8)';
    document.getElementById('ke-code').innerHTML = IP.highlight(code);
  }
  var redraw = Filter.onFrame(draw);
  [pick, bit8, tEl].forEach(function (el) { el.addEventListener('input', redraw); });
  document.querySelectorAll('input[name=ke-what]').forEach(function (r) { r.addEventListener('input', redraw); });
  Filter.ready(draw);
  IP.onChange(draw);
})();

/* ---------- Demo F: Laplacian and sharpening ---------- */
(function () {
  var pick = Filter.picker('image');
  document.getElementById('kf-controls').prepend(IP.el('label', {}, 'Image ', pick));
  var bit8 = document.getElementById('kf-8bit'), cEl = document.getElementById('kf-c'), sEl = document.getElementById('kf-sigma'), kEl = document.getElementById('kf-k');
  function mode() { return document.querySelector('input[name=kf-mode]:checked').value; }
  function draw() {
    if (!Filter.loaded()) return;
    var m = mode(), gray = Filter.image(pick.value), f = Filter.fromGray(gray);
    var c = Number(cEl.value), sigma = Number(sEl.value), k = Number(kEl.value), detail, result, code;
    document.getElementById('kf-c-val').textContent = c;
    document.getElementById('kf-sigma-val').textContent = sigma;
    document.getElementById('kf-k-val').textContent = k;
    document.querySelectorAll('#demo label[data-for]').forEach(function (l) { l.hidden = l.dataset.for !== m; });
    var depth = bit8.checked ? 'cv2.CV_8U' : 'cv2.CV_32F';
    if (m === 'unsharp') {
      var blur = Filter.saturate(Filter.gaussian(f, sigma, 'reflect'));          // cv2.GaussianBlur gives uint8
      detail = Filter.add(f, blur, -1);                                          // mask = f - blur
      if (bit8.checked) detail = Filter.saturate(detail);                        // cv2.subtract: negatives become 0
      result = Filter.add(f, detail, k);
      code = 'blur = cv2.GaussianBlur(gray, (0, 0), ' + sigma + ')\n' +
        (bit8.checked ? 'mask = cv2.subtract(gray, blur)          # 8-bit: negatives become 0' : 'mask = gray.astype(np.float32) - blur') +
        '\ng = np.clip(gray + ' + k + ' * mask, 0, 255).astype(np.uint8)';
    } else {
      detail = Filter.laplacian(f);
      if (bit8.checked) detail = Filter.saturate(detail);
      result = m === 'lap' ? detail : Filter.add(f, detail, c);
      code = 'lap = cv2.Laplacian(gray, ' + depth + ')' +
        (m === 'lap' ? (bit8.checked ? '' : '\nshown = np.clip(np.abs(lap), 0, 255).astype(np.uint8)')
          : '\ng = np.clip(gray + (' + c + ') * lap.astype(np.float32), 0, 255).astype(np.uint8)');
    }
    IP.draw(document.getElementById('kf-src'), gray);
    document.getElementById('kf-detail-fig').hidden = m === 'lap';
    IP.draw(document.getElementById('kf-detail'), Filter.toGray(detail, bit8.checked ? 'clip' : 'offset'));
    document.getElementById('kf-detail-cap').textContent = (m === 'unsharp' ? 'mask' : 'Laplacian') + (bit8.checked ? ' (8-bit)' : ' (+128, gray = 0)');
    IP.draw(document.getElementById('kf-dst'), Filter.toGray(result, m === 'lap' ? 'abs' : 'clip'));
    document.getElementById('kf-cap').textContent = m === 'lap' ? 'Laplacian' + (bit8.checked ? ' (8-bit)' : ' (absolute value)')
      : m === 'sharp' ? 'f + (' + c + ') · Laplacian' : 'f + ' + k + ' · mask' + (k > 1 ? ' (highboost)' : k === 1 ? ' (unsharp masking)' : '');
    document.getElementById('kf-code').innerHTML = IP.highlight(code);
  }
  var redraw = Filter.onFrame(draw);
  [pick, bit8, cEl, sEl, kEl].forEach(function (el) { el.addEventListener('input', redraw); });
  document.querySelectorAll('input[name=kf-mode]').forEach(function (r) { r.addEventListener('input', redraw); });
  Filter.ready(draw);
  IP.onChange(draw);
})();

/* ---------- Exercises: expected values ---------- */
// Python prints floats with a decimal point: 628.0, not 628
function pyFloat(text) { return text.indexOf('.') < 0 ? text + '.0' : text; }
IP.expected('expected-sobel', function (img) {
  var f = Filter.fromGray(IP.grayOf(img)), gx = Filter.sobelX(f), gy = Filter.sobelY(f);
  var pos = 0, neg = 0, max = 0;
  for (var i = 0; i < gx.data.length; i++) {
    if (gx.data[i] > 0) pos++;
    if (gx.data[i] < 0) neg++;
    max = Math.max(max, Math.fround(Math.sqrt(gx.data[i] * gx.data[i] + gy.data[i] * gy.data[i])));
  }
  return [
    ['<code>print(np.count_nonzero(gx8), np.count_nonzero(gx &gt; 0), np.count_nonzero(gx &lt; 0))</code>', pos + ' ' + pos + ' ' + neg],
    ['<code>print(round(float(mag.max()), 1))</code>', pyFloat(String(Math.round(max * 10) / 10))]
  ];
});
IP.expected('expected-laplacian', function (img) {
  var gray = IP.grayOf(img), lap = Filter.laplacian(Filter.fromGray(gray));
  var lo = Infinity, hi = -Infinity, sumMinus = 0, sumPlus = 0;
  for (var i = 0; i < lap.data.length; i++) {
    var v = lap.data[i];
    lo = Math.min(lo, v); hi = Math.max(hi, v);
    sumMinus += Filter.store(gray.data[i] - v, 'clip');
    sumPlus += Filter.store(gray.data[i] + v, 'clip');
  }
  var n = lap.data.length;
  return [
    ['<code>print(lap.min(), lap.max())</code>', lo.toFixed(1) + ' ' + hi.toFixed(1)],
    ['<code>print(round(minus.mean(), 2), round(plus.mean(), 2))</code>', pyFloat(IP.fmt.round2(sumMinus / n)) + ' ' + pyFloat(IP.fmt.round2(sumPlus / n))]
  ];
});
