// Section 6: kernel and blur.

/* ---------- Theory: illustrations ---------- */
(function () {
  var D = Diagram, s = 26;
  var rows = [];
  for (var r = 0; r < 5; r++) rows.push([10, 10, 10, 200, 200]);

  // 1. the kernel, step by step
  function image(x, y, center, changed) {
    return D.grid(x, y, s, rows, function (v, r, c) {
      if (changed && changed[r + ',' + c] !== undefined) return D.green(String(changed[r + ',' + c]));
      if (center && r === center[0] && c === center[1]) return D.green(String(v));
      return null;
    });
  }
  var ninth = [['1/9', '1/9', '1/9'], ['1/9', '1/9', '1/9'], ['1/9', '1/9', '1/9']];
  var k = '';
  k += D.text(20, 22, '1 · window at row 2, col 2', { anchor: 'start', bold: true });
  k += image(20, 34, [2, 2]) + D.window(20, 34, s, 1, 1, 3);
  k += D.text(230, 22, '2 · kernel w', { anchor: 'start', bold: true });
  k += D.grid(230, 34, 34, ninth, function (v) { return D.purple(v); });
  k += D.text(400, 22, '3 · multiply and add', { anchor: 'start', bold: true });
  k += D.text(400, 70, '6 · 10 + 3 · 200 = 660', { anchor: 'start' });
  k += D.text(400, 90, '660 / 9 = 73.3', { anchor: 'start' });
  k += D.cell(400, 104, 34, D.green('73'));
  k += D.text(20, 212, '4 · slide one pixel right', { anchor: 'start', bold: true });
  k += image(20, 224, [2, 3]) + D.window(20, 224, s, 1, 2, 3);
  k += D.text(170, 270, '3 · 10 + 6 · 200 = 1230', { anchor: 'start' });
  k += D.text(170, 290, '1230 / 9 = 136.7', { anchor: 'start' });
  k += D.cell(170, 304, 34, D.green('137'));
  k += D.text(400, 212, '5 · output: two new pixels', { anchor: 'start', bold: true });
  k += image(400, 224, null, { '2,2': 73, '2,3': 137 });
  document.getElementById('d-kernel').innerHTML = D.svg(640, 370, k, 'A 3 by 3 box kernel slides over an image and computes 73, then 137');

  // 2. correlation vs convolution on an impulse
  function row1d(x, y, values, style) {
    return values.map(function (v, i) { return D.cell(x + i * 34, y, 34, style(v, i)); }).join('');
  }
  var input = function (v) { return { fill: v ? D.C.dark : D.C.light, text: String(v) }; };
  var c = '';
  c += D.text(150, 38, 'f (input)', { anchor: 'end' }) + row1d(160, 16, [0, 0, 0, 1, 0, 0, 0], input);
  c += D.text(150, 82, 'w (kernel)', { anchor: 'end' }) + row1d(160 + 2 * 34, 60, [1, 2, 3], function (v) { return D.purple(String(v)); });
  c += D.text(150, 136, 'correlation', { anchor: 'end' }) + row1d(160, 114, [0, 0, 3, 2, 1, 0, 0], function (v) { return D.green(String(v)); });
  c += D.text(410, 136, '= kernel reversed', { anchor: 'start' });
  c += D.text(150, 180, 'convolution', { anchor: 'end' }) + row1d(160, 158, [0, 0, 1, 2, 3, 0, 0], function (v) { return D.green(String(v)); });
  c += D.text(410, 180, '= the kernel itself', { anchor: 'start' });
  document.getElementById('d-corr').innerHTML = D.svg(560, 206, c, 'An impulse filtered by 1 2 3: correlation gives 3 2 1, convolution gives 1 2 3');

  // 3. zero padding: a 5x5 image of 100 inside a ring of zeros
  var padded = [];
  for (r = 0; r < 7; r++) {
    padded.push([]);
    for (var col = 0; col < 7; col++) padded[r].push(r === 0 || r === 6 || col === 0 || col === 6 ? 0 : 100);
  }
  var out = [];
  for (r = 0; r < 5; r++) {
    out.push([]);
    for (col = 0; col < 5; col++) {
      var edgeR = r === 0 || r === 4, edgeC = col === 0 || col === 4;
      out[r].push(edgeR && edgeC ? 44 : edgeR || edgeC ? 67 : 100);
    }
  }
  var b = '';
  b += D.text(20, 22, 'padded with zeros', { anchor: 'start', bold: true });
  b += D.grid(20, 34, 28, padded, function (v) { return v === 0 ? { fill: D.C.pad, text: '0' } : null; });
  b += D.window(20, 34, 28, 0, 0, 3);
  b += D.text(20, 252, 'corner window: 5 zeros + 4 × 100', { anchor: 'start', size: 11 });
  b += D.arrow(240, 132, 330, 132, '3×3 mean');
  b += D.text(350, 22, 'output', { anchor: 'start', bold: true });
  b += D.grid(350, 48, 28, out, function (v) { return v === 100 ? null : D.green(String(v)); });
  b += D.text(350, 210, 'corners 400 / 9 = 44', { anchor: 'start', size: 11 });
  b += D.text(350, 228, 'edges 600 / 9 = 67', { anchor: 'start', size: 11 });
  document.getElementById('d-border').innerHTML = D.svg(560, 264, b, 'Zero padding makes the corners 44 and the edges 67');

  // 4. box vs Gaussian 7x7 as shaded grids, with the central row printed below
  var g1 = Filter.gaussian1D(7, 1.5), gauss = Filter.outer(g1, g1), box = Filter.outer(Filter.box1D(7), Filter.box1D(7));
  var max = gauss[3][3];
  function heat(x, y, m) {
    return D.grid(x, y, 30, m, function (v) {
      var t = v / max;
      return { fill: 'rgb(' + Math.round(255 - t * (255 - 0x53)) + ',' + Math.round(255 - t * (255 - 0x4A)) + ',' + Math.round(255 - t * (255 - 0xB7)) + ')', text: '' };
    });
  }
  function centralRow(x, y, m) { return D.text(x, y, m[3].map(function (v) { return v.toFixed(3); }).join('  '), { size: 10 }); }
  var gs = '';
  gs += D.text(135, 22, 'box 7 × 7', { bold: true }) + heat(30, 34, box) + centralRow(135, 270, box);
  gs += D.text(445, 22, 'Gaussian 7 × 7, σ = 1.5', { bold: true }) + heat(340, 34, gauss) + centralRow(445, 270, gauss);
  gs += D.text(290, 294, 'central row of coefficients (darker = bigger)', { size: 11 });
  document.getElementById('d-gauss').innerHTML = D.svg(580, 306, gs, 'A box kernel has equal weights, a Gaussian is strongest in the centre');
})();

/* ---------- Demo A: kernel editor ---------- */
(function () {
  var table = document.getElementById('ka-kernel'), inputs = [];
  var pick = Filter.picker('image');
  document.getElementById('ka-controls').prepend(IP.el('label', {}, 'Image ', pick));
  var border = document.getElementById('ka-border'), outMode = document.getElementById('ka-out'), divide = document.getElementById('ka-divide');
  var clicked = null, result = null;

  for (var r = 0; r < 3; r++) {
    var tr = IP.el('tr');
    for (var c = 0; c < 3; c++) {
      var input = IP.el('input', { type: 'text', inputmode: 'decimal', 'aria-label': 'coefficient row ' + r + ' column ' + c });
      input.addEventListener('input', redraw);
      inputs.push(input);
      tr.appendChild(IP.el('td', {}, input));
    }
    table.appendChild(tr);
  }
  // Numbers like 2, -1, 0.5 or 1/9
  function parse(text) {
    var m = String(text).trim().match(/^(-?\d*\.?\d+)(?:\/(\d*\.?\d+))?$/);
    if (!m) return NaN;
    return m[2] ? Number(m[1]) / Number(m[2]) : Number(m[1]);
  }
  function coefficients() {
    var raw = inputs.map(function (i) { return parse(i.value); });
    var sum = raw.reduce(function (a, b) { return a + b; }, 0);
    var scale = divide.checked && sum !== 0 && !isNaN(sum) ? 1 / sum : 1;
    inputs.forEach(function (i, k) { i.classList.toggle('blank-bad', isNaN(raw[k])); });
    return { raw: raw, sum: sum, scale: scale, values: raw.map(function (v) { return v * scale; }) };
  }

  var presetBox = document.getElementById('ka-presets');
  Object.keys(Filter.PRESETS).forEach(function (key) {
    var p = Filter.PRESETS[key];
    presetBox.appendChild(IP.el('button', { class: 'btn secondary', type: 'button', text: p.name, onclick: function () { setPreset(p); } }));
  });
  function setPreset(p) {
    p.rows.forEach(function (row, r) { row.forEach(function (v, c) { inputs[r * 3 + c].value = v; }); });
    divide.checked = !!p.divide;
    redraw();
  }

  var BORDER_CV = { reflect: 'cv2.BORDER_REFLECT_101', replicate: 'cv2.BORDER_REPLICATE', zeros: 'cv2.BORDER_CONSTANT' };
  function draw() {
    if (!Filter.loaded()) return;
    var k = coefficients();
    if (k.values.some(isNaN)) return;
    var gray = Filter.image(pick.value);
    result = Filter.correlate(Filter.fromGray(gray), Filter.kernel([k.values.slice(0, 3), k.values.slice(3, 6), k.values.slice(6)]), border.value);
    IP.draw(document.getElementById('ka-src'), gray);
    IP.draw(document.getElementById('ka-dst'), Filter.toGray(result, outMode.value));
    var rowsText = [0, 3, 6].map(function (i) { return '[' + k.raw.slice(i, i + 3).join(', ') + ']'; }).join(',\n                   ');
    var code = 'kernel = np.array([' + rowsText + '], np.float32)';
    if (k.scale !== 1) code += ' / ' + k.sum;
    var mode = outMode.value === 'clip' ? '-1' : 'cv2.CV_32F';
    code += '\nout = cv2.filter2D(gray, ' + mode + ', kernel, borderType=' + BORDER_CV[border.value] + ')';
    if (outMode.value === 'abs') code += '\nout = np.clip(np.abs(out), 0, 255).astype(np.uint8)';
    if (outMode.value === 'offset') code += '\nout = np.clip(out + 128, 0, 255).astype(np.uint8)';
    document.getElementById('ka-code').innerHTML = IP.highlight(code);
    if (clicked) explain(clicked, k, gray);
  }
  var redraw = Filter.onFrame(draw);

  // The calculation for one pixel: window values, coefficients, products, sum, stored value
  function explain(p, k, gray) {
    var w = gray.width, h = gray.height, sum = 0, cells = [];
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        var rr = Filter.borderIndex(p.row + dr, h, border.value), cc = Filter.borderIndex(p.col + dc, w, border.value);
        var v = rr < 0 || cc < 0 ? 0 : gray.data[rr * w + cc];
        var coef = k.values[(dr + 1) * 3 + dc + 1];
        sum += v * coef;
        cells.push({ v: v, coef: coef, outside: rr < 0 || cc < 0 || rr !== p.row + dr || cc !== p.col + dc });
      }
    }
    var box = document.getElementById('ka-calc');
    box.innerHTML = '';
    var t = IP.el('table', { class: 'calc-grid' });
    for (var i = 0; i < 9; i += 3) {
      var tr = IP.el('tr');
      cells.slice(i, i + 3).forEach(function (cell) {
        tr.appendChild(IP.el('td', { class: cell.outside ? 'outside' : '' },
          IP.el('span', { text: String(cell.v) }), ' × ', IP.el('span', { class: 'coef', text: round3(cell.coef) }),
          IP.el('br'), '= ' + round3(cell.v * cell.coef)));
      });
      t.appendChild(tr);
    }
    var stored = Filter.store(result.data[p.row * w + p.col], outMode.value);
    box.append(IP.el('b', { text: 'row ' + p.row + ', column ' + p.col }), t,
      IP.el('div', { text: 'sum = ' + round3(sum) + '  →  stored ' + stored +
        (outMode.value === 'clip' ? '  (rounded, cut to 0…255)' : outMode.value === 'abs' ? '  (|sum|, rounded, cut)' : '  (sum + 128, rounded, cut)') }));
    [document.getElementById('ka-src'), document.getElementById('ka-dst')].forEach(function (cv) {
      var ctx = cv.getContext('2d');
      ctx.strokeStyle = '#d64545';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.col - 1.5, p.row - 1.5, 4, 4);
    });
  }
  function round3(x) { return String(Math.round(x * 1000) / 1000); }

  ['ka-src', 'ka-dst'].forEach(function (id) {
    var cv = document.getElementById(id);
    cv.addEventListener('click', function (e) { clicked = IP.pixelAt(cv, e); draw(); });
  });
  [border, outMode, divide, pick].forEach(function (el) { el.addEventListener('input', function () { if (el === pick) clicked = null; redraw(); }); });
  setPreset(Filter.PRESETS.box);
  Filter.ready(draw);
  IP.onChange(function () { clicked = null; draw(); });
})();

/* ---------- Demo B: borders ---------- */
(function () {
  var border = document.getElementById('kb-border'), size = document.getElementById('kb-size');
  function draw() {
    // 8 x 8 image of 100, 3 x 3 box: the numbers
    var flat = Filter.make(8, 8);
    flat.data.fill(100);
    var small = Filter.toGray(Filter.box(flat, 3, border.value));
    var grid = document.getElementById('kb-grid');
    grid.innerHTML = '';
    for (var r = 0; r < 8; r++) {
      var tr = IP.el('tr');
      for (var c = 0; c < 8; c++) {
        var v = small.data[r * 8 + c];
        tr.appendChild(IP.el('td', { text: String(v), style: 'background:' + Diagram.pixel(v) }));
      }
      grid.appendChild(tr);
    }
    // the test image with a big box
    var k = Number(size.value);
    document.getElementById('kb-size-val').textContent = k;
    IP.draw(document.getElementById('kb-photo'), Filter.toGray(Filter.box(Filter.fromGray(IP.gray()), k, border.value)));
    document.getElementById('kb-caption').textContent = 'cv2.blur(gray, (' + k + ', ' + k + ')), border ' + border.selectedOptions[0].text;
  }
  var redraw = Filter.onFrame(draw);
  border.addEventListener('input', redraw);
  size.addEventListener('input', redraw);
  IP.ready(draw);
  IP.onChange(draw);
})();

/* ---------- Demo C: box vs Gaussian ---------- */
(function () {
  var pick = Filter.picker('noisy');
  document.getElementById('kc-controls').prepend(IP.el('label', {}, 'Image ', pick));
  var boxEl = document.getElementById('kc-box'), sigmaEl = document.getElementById('kc-sigma');
  function draw() {
    if (!Filter.loaded()) return;
    var gray = Filter.image(pick.value), f = Filter.fromGray(gray);
    var k = Number(boxEl.value), sigma = Number(sigmaEl.value), gsize = Filter.gaussianSize(sigma);
    document.getElementById('kc-box-val').textContent = k;
    document.getElementById('kc-sigma-val').textContent = sigma + '  (size ' + gsize + ' × ' + gsize + ')';
    IP.draw(document.getElementById('kc-src'), gray);
    IP.draw(document.getElementById('kc-boximg'), Filter.toGray(Filter.box(f, k, 'reflect')));
    IP.draw(document.getElementById('kc-gaussimg'), Filter.toGray(Filter.gaussian(f, sigma, 'reflect')));
    document.getElementById('kc-box-cap').textContent = 'cv2.blur(img, (' + k + ', ' + k + '))';
    document.getElementById('kc-gauss-cap').textContent = 'cv2.GaussianBlur(img, (0, 0), ' + sigma + ')';
    var g1 = Filter.gaussian1D(gsize, sigma);
    var max = Math.max(1 / (k * k), g1[(gsize - 1) / 2] * g1[(gsize - 1) / 2]);   // same scale for both maps
    Filter.drawKernel(document.getElementById('kc-boxmap'), Filter.outer(Filter.box1D(k), Filter.box1D(k)), max);
    Filter.drawKernel(document.getElementById('kc-gaussmap'), Filter.outer(g1, g1), max);
    document.getElementById('kc-boxmap-cap').textContent = 'box kernel ' + k + ' × ' + k;
    document.getElementById('kc-gaussmap-cap').textContent = 'Gaussian kernel ' + gsize + ' × ' + gsize + ' (same color scale)';
  }
  var redraw = Filter.onFrame(draw);
  [boxEl, sigmaEl, pick].forEach(function (el) { el.addEventListener('input', redraw); });
  Filter.ready(draw);
  IP.onChange(draw);
})();

/* ---------- Exercises: expected values ---------- */
// Python prints floats with a decimal point: 122.0, not 122
function pyFloat(text) { return text.indexOf('.') < 0 ? text + '.0' : text; }
IP.expected('expected-by-hand', function (img) {
  var gray = IP.grayOf(img), w = gray.width;
  if (gray.height < 160 || w < 180) return [['<code>print(round(float(out[30, 40]), 2))</code>', 'image too small'], ['…', '']];
  var sum = 0;   // out[30, 40] is the mean around crop[30, 40] = gray[130, 140]
  for (var r = 129; r <= 131; r++) for (var c = 139; c <= 141; c++) sum += gray.data[r * w + c];
  return [
    ['<code>print(round(float(out[30, 40]), 2))</code>', pyFloat(IP.fmt.round2(sum / 9))],
    ['<code>print(np.abs(out - ref)[1:-1, 1:-1].max() &lt; 1e-3)</code>', 'True'],
    ['<code>print(f"loops … filter2D …")</code>', 'depends on your computer']
  ];
});
IP.expected('expected-guess', function () {
  return [['<code>print(np.array_equal(out["shift"][:, :-1], gray[:, 1:]))</code>', 'True']];
});
