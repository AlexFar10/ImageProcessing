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

/* ---------- Demo A: the kernel slides over a small image ---------- */
(function () {
  // A small image with an edge, a bright dot and a dark dot
  var IMG = [
    [10, 10, 10, 10, 10, 200, 200, 200, 200],
    [10, 200, 10, 10, 10, 200, 200, 200, 200],
    [10, 10, 10, 10, 10, 200, 200, 200, 200],
    [10, 10, 10, 10, 10, 200, 200, 200, 200],
    [10, 10, 10, 10, 10, 200, 200, 10, 200],
    [10, 10, 10, 10, 10, 200, 200, 200, 200]
  ];
  var H = IMG.length, W = IMG[0].length;
  var KERNELS = ['box', 'gaussian', 'sharpen', 'laplacian', 'sobelX', 'identity'];
  var EFFECT = {
    box: 'Blur: each pixel becomes the mean of its window. The dots fade, the edge gets softer.',
    gaussian: 'Softer blur: the centre counts most (4/16), the corners least (1/16).',
    sharpen: 'Sharpen: the centre ×5 minus its 4 neighbours. Flat areas stay, the edge and the dots get stronger.',
    laplacian: 'Laplacian: 4 neighbours − 4 × centre. Flat areas give 0; only edges and dots light up.',
    sobelX: 'Sobel dx: right column − left column. Only the dark-to-bright edge (left to right) survives; negatives are cut to 0.',
    identity: 'Identity: only the centre counts, so nothing changes.'
  };
  var sel = document.getElementById('ks-kernel');
  KERNELS.forEach(function (key) { sel.appendChild(IP.el('option', { value: key, text: Filter.PRESETS[key].name })); });
  var inTable = document.getElementById('ks-in'), outTable = document.getElementById('ks-out');
  var inCells = [], outCells = [], done = 0, timer = null;

  // the kernel actually used: coefficients divided by their sum for blurs
  function kernel() {
    var p = Filter.PRESETS[sel.value], flat = [].concat.apply([], p.rows);
    var sum = flat.reduce(function (a, b) { return a + b; }, 0);
    return { rows: p.rows, div: p.divide ? sum : 1 };
  }
  // pixel value with reflect-101 borders, like cv2.filter2D
  function at(r, c) { return IMG[Filter.borderIndex(r, H, 'reflect')][Filter.borderIndex(c, W, 'reflect')]; }
  function compute(r, c) {
    var k = kernel(), sum = 0;
    for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) sum += at(r + dr, c + dc) * k.rows[dr + 1][dc + 1];
    return { sum: sum, value: Filter.store(sum / k.div, 'clip') };
  }

  function build() {
    inTable.innerHTML = ''; outTable.innerHTML = ''; inCells = []; outCells = [];
    for (var r = -1; r <= H; r++) {
      var tr = IP.el('tr'), row = [];
      for (var c = -1; c <= W; c++) {
        var v = at(r, c), pad = r < 0 || r >= H || c < 0 || c >= W;
        var td = IP.el('td', { text: String(v), class: pad ? 'pad' : '', style: pad ? '' : 'background:' + Diagram.pixel(v) });
        tr.appendChild(td); row.push(td);
      }
      inTable.appendChild(tr); inCells.push(row);
    }
    for (r = 0; r < H; r++) {
      tr = IP.el('tr'); row = [];
      for (c = 0; c < W; c++) {
        td = IP.el('td', { class: 'empty' });
        td.dataset.i = r * W + c;
        td.onclick = function () { stop(); show(Number(this.dataset.i) + 1); };
        tr.appendChild(td); row.push(td);
      }
      outTable.appendChild(tr); outCells.push(row);
    }
    var k = kernel(), kt = document.getElementById('ks-k');
    kt.innerHTML = '';
    k.rows.forEach(function (row) {
      var tr = IP.el('tr');
      row.forEach(function (v) { tr.appendChild(IP.el('td', { text: String(v) })); });
      kt.appendChild(tr);
    });
    document.getElementById('ks-k-cap').textContent = 'kernel' + (k.div !== 1 ? ', then ÷ ' + k.div : '');
  }

  // Show the first n output pixels; the last one is the current one
  function show(n) {
    done = Math.max(0, Math.min(n, H * W));
    inCells.forEach(function (row) { row.forEach(function (td) { td.classList.remove('win', 'center'); }); });
    for (var i = 0; i < H * W; i++) {
      var r = Math.floor(i / W), c = i % W, td = outCells[r][c];
      td.classList.remove('current');
      if (i < done) {
        var v = compute(r, c).value;
        td.textContent = v; td.className = ''; td.style.background = Diagram.pixel(v);
      } else { td.textContent = ''; td.className = 'empty'; td.style.background = ''; }
    }
    var calc = document.getElementById('ks-calc');
    if (!done) { calc.textContent = 'Press "Next pixel": the window (black frame) moves left to right, top to bottom.'; return; }
    var cur = done - 1, cr = Math.floor(cur / W), cc = cur % W, k = kernel(), res = compute(cr, cc);
    outCells[cr][cc].classList.add('current');
    for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) inCells[cr + dr + 1][cc + dc + 1].classList.add('win');
    inCells[cr + 1][cc + 1].classList.add('center');
    var terms = [];
    for (dr = -1; dr <= 1; dr++) for (dc = -1; dc <= 1; dc++) {
      var w = k.rows[dr + 1][dc + 1];
      if (w !== 0) terms.push(at(cr + dr, cc + dc) + '·' + w);
    }
    calc.innerHTML = '';
    calc.append(IP.el('b', { text: 'row ' + cr + ', column ' + cc + ': ' }),
      terms.join(' + ').replace(/\+ -/g, '− ').replace(/·-/g, '·−') + ' = ' + res.sum +
      (k.div !== 1 ? ' → ÷ ' + k.div + ' = ' + Math.round(res.sum / k.div * 10) / 10 : '') +
      ' → stored ' + res.value + (res.sum / k.div < 0 || res.sum / k.div > 255 ? ' (cut to 0…255)' : ''),
      IP.el('p', { class: 'caption', style: 'text-align:left;margin-bottom:0', text: EFFECT[sel.value] }));
  }

  function stop() { clearInterval(timer); timer = null; document.getElementById('ks-play').textContent = 'Play'; }
  document.getElementById('ks-step').onclick = function () { stop(); show(done + 1); };
  document.getElementById('ks-play').onclick = function () {
    if (timer) { stop(); return; }
    if (done >= H * W) show(0);
    this.textContent = 'Pause';
    timer = setInterval(function () { if (done >= H * W) stop(); else show(done + 1); }, 400);
  };

  // The same kernel on a whole image
  function drawImage() {
    if (!Filter.loaded()) return;
    var k = kernel(), gray = IP.gray();
    var rows = k.rows.map(function (row) { return row.map(function (v) { return v / k.div; }); });
    IP.draw(document.getElementById('ks-src'), gray);
    IP.draw(document.getElementById('ks-dst'), Filter.toGray(Filter.correlate(Filter.fromGray(gray), Filter.kernel(rows), 'reflect')));
    document.getElementById('ks-dst-cap').textContent = 'cv2.filter2D(gray, -1, kernel): ' + Filter.PRESETS[sel.value].name;
  }
  sel.addEventListener('input', function () { stop(); build(); show(0); drawImage(); });
  build(); show(0);
  Filter.ready(drawImage);
  IP.onChange(drawImage);
})();

/* ---------- Demo B: borders ---------- */
(function () {
  function draw() {
    var border = document.querySelector('input[name=kb-border]:checked').value;
    // 8 x 8 image of 100, 3 x 3 box: the numbers
    var flat = Filter.make(8, 8);
    flat.data.fill(100);
    var small = Filter.toGray(Filter.box(flat, 3, border));
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
    // the test image with a big 31 x 31 box
    IP.draw(document.getElementById('kb-photo'), Filter.toGray(Filter.box(Filter.fromGray(IP.gray()), 31, border)));
    document.getElementById('kb-caption').textContent = 'cv2.blur(gray, (31, 31)), border: ' + border;
  }
  document.querySelectorAll('input[name=kb-border]').forEach(function (r) { r.addEventListener('input', draw); });
  IP.ready(draw);
  IP.onChange(draw);
})();

/* ---------- Demo C: box vs Gaussian ---------- */
// The middle row of both kernels on one axis: the box is a flat step, the Gaussian a bell.
// Each is scaled to its own peak, so moving one slider never changes the other curve.
function drawProfile(k, sigma, gsize) {
  var canvas = document.getElementById('kc-profile'), W = 760, H = 230, R = 31;
  canvas.width = W; canvas.height = H;
  var ctx = canvas.getContext('2d'), left = 30, right = W - 30, base = H - 40, top = 50;
  function X(d) { return left + (d + R) / (2 * R) * (right - left); }
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  // axis with ticks every 10 pixels
  ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(left, base + 0.5); ctx.lineTo(right, base + 0.5); ctx.stroke();
  ctx.fillStyle = '#6b7280'; ctx.font = '14px system-ui, sans-serif'; ctx.textAlign = 'center';
  for (var d = -30; d <= 30; d += 10) { ctx.fillRect(X(d), base, 1, 5); ctx.fillText(String(d), X(d), base + 22); }
  ctx.fillText('pixels from the centre', W / 2, H - 2);
  // box: a flat step as wide as the kernel
  var r = (k - 1) / 2;
  ctx.fillStyle = 'rgba(83, 74, 183, 0.15)'; ctx.strokeStyle = '#534AB7'; ctx.lineWidth = 2.5;
  ctx.fillRect(X(-r - 0.5), top, X(r + 0.5) - X(-r - 0.5), base - top);
  ctx.beginPath(); ctx.moveTo(X(-R), base); ctx.lineTo(X(-r - 0.5), base); ctx.lineTo(X(-r - 0.5), top);
  ctx.lineTo(X(r + 0.5), top); ctx.lineTo(X(r + 0.5), base); ctx.lineTo(X(R), base); ctx.stroke();
  // Gaussian: a smooth bell, cut at 3 sigma (the kernel size)
  var rg = (gsize - 1) / 2;
  ctx.strokeStyle = '#3B6D11'; ctx.lineWidth = 3;
  ctx.beginPath();
  for (var x = -R; x <= R; x += 0.25) {
    var v = Math.abs(x) <= rg + 0.5 ? Math.exp(-x * x / (2 * sigma * sigma)) : 0;
    var y = base - v * (base - top);
    if (x === -R) ctx.moveTo(X(x), y); else ctx.lineTo(X(x), y);
  }
  ctx.stroke();
  // legend
  ctx.textAlign = 'left'; ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = '#534AB7'; ctx.fillRect(left, 14, 18, 12);
  ctx.fillStyle = '#000'; ctx.fillText('box ' + k + ' × ' + k + ' (every weight equal)', left + 26, 25);
  ctx.fillStyle = '#3B6D11'; ctx.fillRect(W / 2 + 10, 19, 18, 3);
  ctx.fillStyle = '#000'; ctx.fillText('Gaussian σ = ' + sigma + ', ' + gsize + ' × ' + gsize, W / 2 + 36, 25);
}
(function () {
  var boxEl = document.getElementById('kc-box'), sigmaEl = document.getElementById('kc-sigma');
  function draw() {
    if (!Filter.loaded()) return;
    var gray = Filter.extra.noisy, f = Filter.fromGray(gray);
    var k = Number(boxEl.value), sigma = Number(sigmaEl.value), gsize = Filter.gaussianSize(sigma);
    document.getElementById('kc-box-val').textContent = k;
    document.getElementById('kc-sigma-val').textContent = sigma + '  (size ' + gsize + ' × ' + gsize + ')';
    IP.draw(document.getElementById('kc-src'), gray);
    IP.draw(document.getElementById('kc-boximg'), Filter.toGray(Filter.box(f, k, 'reflect')));
    IP.draw(document.getElementById('kc-gaussimg'), Filter.toGray(Filter.gaussian(f, sigma, 'reflect')));
    document.getElementById('kc-box-cap').textContent = 'cv2.blur(img, (' + k + ', ' + k + '))';
    document.getElementById('kc-gauss-cap').textContent = 'cv2.GaussianBlur(img, (0, 0), ' + sigma + ')';
    drawProfile(k, sigma, gsize);
  }
  var redraw = Filter.onFrame(draw);
  [boxEl, sigmaEl].forEach(function (el) { el.addEventListener('input', redraw); });
  Filter.ready(draw);
  IP.onChange(draw);
})();

/* ---------- Code: fill in the blanks ---------- */
Games.fillBlanks(document.getElementById('game-fill-blur'), {
  title: 'Blur with OpenCV',
  task: '',
  parts: [
    'kernel = np.ones((3, 3), np.float32) / ', { answer: '9', options: ['1', '3', '9'], hint: '9 coefficients that must add up to 1: each one is 1/9.' },
    '\nbox = cv2.', { answer: 'filter2D', options: ['cvtColor', 'filter2D', 'threshold'], hint: 'filter2D slides any kernel over the image.' },
    '(gray, -1, kernel)\n\n# zeros around the image\nzero = cv2.blur(gray, (3, 3), borderType=cv2.',
    { answer: 'BORDER_CONSTANT', options: ['BORDER_CONSTANT', 'BORDER_REFLECT_101', 'BORDER_REPLICATE'], hint: 'CONSTANT fills the border with a constant value, 0 by default.' },
    ')\n\n# Gaussian with sigma = 3, OpenCV picks the size\ngauss = cv2.GaussianBlur(gray, ', { answer: '(0, 0)', options: ['(0, 0)', '(3, 3)', '(4, 4)'], hint: '(0, 0) means: compute the size from sigma. (4, 4) is not allowed: sizes must be odd.' },
    ', 3)'
  ],
  explain: 'Divide by 9 so the coefficients add up to 1, filter2D applies the kernel, BORDER_CONSTANT pads with zeros, (0, 0) lets OpenCV pick the size (here 19 × 19).',
  onCorrect: function (out) {
    var f = Filter.fromGray(IP.gray());
    out.append(IP.el('div', { class: 'grid-3' },
      IP.figure(Filter.toGray(Filter.box(f, 3, 'reflect')), 'box'),
      IP.figure(Filter.toGray(Filter.box(f, 3, 'zeros')), 'zero (look at the border)'),
      IP.figure(Filter.toGray(Filter.gaussian(f, 3, 'reflect')), 'gauss')));
  }
});

/* ---------- Code: what does it print? ---------- */
var FLAT = 'flat = np.full((5, 5), 100, np.uint8)\n';
Games.predict(document.getElementById('game-print'), {
  title: 'What does it print?',
  task: '',
  rounds: function () {
    return Games.shuffle([
      Games.pickRound({ code: FLAT + 'out = cv2.blur(flat, (3, 3), borderType=cv2.BORDER_CONSTANT)\nprint(out[0, 0])',
        explain: 'The corner window holds 4 pixels of 100 and 5 zeros: 400 / 9 = 44.4 → 44.' }, ['44', '67', '100', '0']),
      Games.pickRound({ code: FLAT + 'out = cv2.blur(flat, (3, 3), borderType=cv2.BORDER_CONSTANT)\nprint(out[0, 2])',
        explain: 'An edge pixel (not a corner): 6 pixels of 100 and 3 zeros: 600 / 9 = 66.7 → 67.' }, ['67', '44', '100', '33']),
      Games.pickRound({ code: FLAT + 'out = cv2.blur(flat, (3, 3), borderType=cv2.BORDER_REFLECT)\nprint(out[0, 0])',
        explain: 'Reflecting copies pixels of 100 outside the image, so every window is all 100.' }, ['100', '44', '67', '0']),
      Games.pickRound({ code: 'import math\nsigma = 2\nprint(2 * math.ceil(3 * sigma) + 1)',
        explain: '3σ = 6 on each side, plus the centre: 6 + 6 + 1 = 13.' }, ['13', '7', '6', '12']),
      Games.pickRound({ code: 'k = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])\nprint(k.sum())',
        explain: '5 − 4 = 1: the sharpen kernel keeps the brightness of flat areas.' }, ['1', '5', '0', '9']),
      Games.pickRound({ code: 'row = np.array([[0, 0, 0, 1, 0, 0, 0]], np.float32)\nw = np.array([[1, 2, 3]], np.float32)\nprint(cv2.filter2D(row, -1, w, borderType=cv2.BORDER_CONSTANT))',
        explain: 'filter2D is correlation: on a single 1 it writes the kernel backwards.' },
        ['[[0. 0. 3. 2. 1. 0. 0.]]', '[[0. 0. 1. 2. 3. 0. 0.]]', '[[0. 0. 0. 1. 0. 0. 0.]]'])
    ]);
  }
});

/* ---------- Code: which kernel made this picture? ---------- */
Games.predict(document.getElementById('game-which-kernel'), {
  title: 'Which kernel?',
  task: '',
  rounds: function () {
    var f = Filter.fromGray(IP.gray());
    function apply(key, size) {
      if (size) return Filter.toGray(Filter.box(f, size, 'reflect'));
      return Filter.toGray(Filter.correlate(f, Filter.kernel(Filter.PRESETS[key].rows), 'reflect'));
    }
    var list = [
      ['box 7 × 7 (blur)', function () { return apply('box', 7); }, 'Everything is soft, no sharp borders: a blur.'],
      ['sharpen [0 −1 0; −1 5 −1; 0 −1 0]', function () { return apply('sharpen'); }, 'Same picture, but the edges and the grass texture are crisper.'],
      ['Laplacian [0 1 0; 1 −4 1; 0 1 0]', function () { return apply('laplacian'); }, 'Almost black, with thin lines on edges in every direction: the kernel sums to 0.'],
      ['Sobel dx [−1 0 1; −2 0 2; −1 0 1]', function () { return apply('sobelX'); }, 'Only vertical edges (fence posts, house walls) light up, and only one side of each.']
    ];
    return Games.shuffle(list).map(function (item) {
      return Games.pickRound({
        question: 'Which kernel made this picture?',
        figure: function () { return IP.el('div', { style: 'max-width:360px' }, IP.canvasOf(item[1]())); },
        explain: item[2]
      }, [item[0]].concat(list.filter(function (o) { return o !== item; }).map(function (o) { return o[0]; })));
    });
  }
});

/* ---------- Code: spot the bug ---------- */
Games.spotBug(document.getElementById('game-bug-bright'), {
  title: 'Too bright',
  task: 'This blur makes the image much brighter. Click the wrong line.',
  lines: [
    'gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)',
    'kernel = np.ones((5, 5), np.float32) / 9',
    'blur = cv2.filter2D(gray, -1, kernel)',
    'cv2.imwrite("blur.png", blur)'
  ],
  bug: 1,
  hints: { 0: 'Converting to gray first is fine.', 2: 'filter2D with -1 keeps uint8: fine.', 3: 'Saving is fine.' },
  explain: 'A 5 × 5 kernel has 25 coefficients. Divided by 9 they add up to 25/9 ≈ 2.8, so the image gets almost 3× brighter. Use / 25.',
  show: function (out) {
    var f = Filter.fromGray(IP.gray()), ones = Filter.box1D(5).map(function () { return 1 / 9 * 5; });
    out.append(IP.el('div', { class: 'grid-2' },
      IP.figure(Filter.toGray(Filter.separable(f, ones, Filter.box1D(5), 'reflect')), 'bug: / 9'),
      IP.figure(Filter.toGray(Filter.box(f, 5, 'reflect')), 'fixed: / 25')));
  }
});
Games.spotBug(document.getElementById('game-bug-even'), {
  title: 'An error message',
  task: 'Python stops with an error. Click the wrong line.',
  lines: [
    'gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)',
    'sigma = 2',
    'blur = cv2.GaussianBlur(gray, (6, 6), sigma)',
    'cv2.imwrite("blur.png", blur)'
  ],
  bug: 2,
  hints: { 0: 'Converting to gray first is fine.', 1: 'Any positive sigma is fine.', 3: 'Saving is fine.' },
  explain: 'Kernel sizes must be odd (3, 5, 7, …) so the kernel has a centre pixel. Use (13, 13) for sigma = 2, or (0, 0) to let OpenCV choose.',
  show: function (out) { out.append(IP.el('p', { class: 'caption', style: 'text-align:left', text: 'cv2.error: … ksize.width > 0 && ksize.width % 2 == 1 …' })); }
});
