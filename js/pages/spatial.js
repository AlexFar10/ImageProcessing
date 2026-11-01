// Section 6: spatial filtering. On top: the kernel idea and the step-by-step demo (every filter of the page).
// Then four topic tabs: borders, blur, edges, sharpening. Each tab: story, illustration, demo, exercise. The filtering itself is in filter.js.

var D = Diagram;
function blue(v) { return { fill: D.pixel(v), text: String(v) }; }
function green(v) { return D.green(String(v)); }
function purple(v) { return D.purple(String(v)); }
// One row of cells starting at (x, y); style(value, i) gives the look of each cell
function strip(x, y, s, values, style) {
  return values.map(function (v, i) { return D.cell(x + i * s, y, s, style(v, i)); }).join('');
}
function put(id, svg) { document.getElementById(id).innerHTML = svg; }

/* =====================================================================
   1. Kernel
   ===================================================================== */

// Recipes on the neighbours of one pixel: neighbours x kernel = new value (used by the Blur and Edges tabs)
function recipes(id, list, label) {
  var s = 40, out = '';
  out += D.text(170 + 1.5 * s, 18, 'neighbours', { size: 11 }) + D.text(330 + 1.5 * s, 18, 'kernel', { size: 11 }) + D.text(504, 18, 'new value', { size: 11 });
  list.forEach(function (r, i) {
    var y = 28 + i * 54;
    out += D.text(160, y + 25, r[0], { anchor: 'end' });
    out += strip(170, y, s, r[1], function (v) { return blue(v); }) + D.window(170, y, s, 0, 1, 1);
    out += D.text(305, y + 25, '×', { size: 16 });
    out += strip(330, y, s, r[2], purple);
    out += D.text(465, y + 25, '=', { size: 16 });
    out += D.cell(482, y, 44, green(r[3]));
  });
  out += D.text(280, 40 + list.length * 54, 'the black frame is you: the middle pixel', { size: 11 });
  put(id, D.svg(560, 52 + list.length * 54, out, label));
}

// The 5-step picture: a 3x3 window slides over a 5x5 image
(function () {
  var s = 26, rows = [];
  for (var r = 0; r < 5; r++) rows.push([10, 10, 10, 200, 200]);
  function image(x, y, center, changed) {
    return D.grid(x, y, s, rows, function (v, r, c) {
      if (changed && changed[r + ',' + c] !== undefined) return green(changed[r + ',' + c]);
      if (center && r === center[0] && c === center[1]) return green(v);
      return null;
    });
  }
  var w = [['w', 'w', 'w'], ['w', 'w', 'w'], ['w', 'w', 'w']], k = '';
  k += D.text(20, 22, '1 · window at row 2, col 2', { anchor: 'start', bold: true });
  k += image(20, 34, [2, 2]) + D.window(20, 34, s, 1, 1, 3);
  k += D.text(230, 22, '2 · kernel, w = 1/9', { anchor: 'start', bold: true });
  k += D.grid(230, 34, 34, w, purple);
  k += D.text(440, 22, '3 · multiply and add', { anchor: 'start', bold: true });
  k += D.text(440, 70, '(6·10 + 3·200) / 9', { anchor: 'start' });
  k += D.text(440, 90, '= 73.3 → 73', { anchor: 'start' });
  k += D.cell(440, 104, 34, green('73'));
  k += D.text(20, 212, '4 · slide one pixel right', { anchor: 'start', bold: true });
  k += image(20, 224, [2, 3]) + D.window(20, 224, s, 1, 2, 3);
  k += D.text(170, 270, '(3·10 + 6·200) / 9', { anchor: 'start' });
  k += D.text(170, 290, '= 136.7 → 137', { anchor: 'start' });
  k += D.cell(170, 304, 34, green('137'));
  k += D.text(400, 212, '5 · only these two pixels changed', { anchor: 'start', bold: true });
  k += image(400, 224, null, { '2,2': 73, '2,3': 137 });
  put('d-kernel', D.svg(640, 370, k, 'A 3 by 3 window slides over an image and computes 73, then 137'));
})();

// Correlation vs convolution on a single 1
(function () {
  var c = '', s = 34;
  c += D.text(150, 38, 'input', { anchor: 'end' }) + strip(160, 16, s, [0, 0, 0, 1, 0, 0, 0], function (v) { return { fill: v ? D.C.dark : D.C.light, text: String(v) }; });
  c += D.text(150, 82, 'kernel', { anchor: 'end' }) + strip(160 + 2 * s, 60, s, [1, 2, 3], purple);
  c += D.text(150, 136, 'correlation', { anchor: 'end' }) + strip(160, 114, s, [0, 0, 3, 2, 1, 0, 0], green);
  c += D.text(410, 136, '= kernel back to front', { anchor: 'start' });
  c += D.text(150, 180, 'convolution', { anchor: 'end' }) + strip(160, 158, s, [0, 0, 1, 2, 3, 0, 0], green);
  c += D.text(410, 180, '= the kernel itself', { anchor: 'start' });
  put('d-corr', D.svg(570, 206, c, 'A single 1 filtered by 1 2 3: correlation gives 3 2 1, convolution gives 1 2 3'));
})();

// Demo: the kernel slides over a small image, step by step
(function () {
  var IMG = [
    [10, 10, 10, 10, 10, 200, 200, 200, 200],
    [10, 200, 10, 10, 10, 200, 200, 200, 200],
    [10, 10, 10, 10, 10, 200, 200, 200, 200],
    [10, 10, 10, 10, 10, 200, 200, 200, 200],
    [200, 200, 200, 200, 200, 200, 200, 10, 200],
    [200, 200, 200, 200, 200, 200, 200, 200, 200]
  ];
  var H = IMG.length, W = IMG[0].length;
  var KERNELS = {
    box: { label: 'blur: box', effect: 'Box blur: every pixel becomes the average of its 9 neighbours. The single dots fade, the edges get softer.' },
    gaussian: { label: 'blur: Gaussian', effect: 'Gaussian blur: the middle counts 4/16, the sides 2/16, the corners 1/16. A softer blur that keeps more of each pixel.' },
    sobelX: { label: 'vertical edges (Sobel dx)', effect: 'Vertical edges: right column minus left column. Flat areas give 0, the vertical edge from dark to bright lights up; the horizontal edge gives 0. (Values below 0 are stored as 0, like cv2.filter2D does on uint8.)' },
    sobelY: { label: 'horizontal edges (Sobel dy)', effect: 'Horizontal edges: bottom row minus top row. The bottom edge (dark above, bright below) lights up; the vertical edge gives 0. (Values below 0 are stored as 0.)' },
    laplacian: { label: 'Laplacian', effect: 'Laplacian: 4 neighbours minus 4 × you. Flat areas give 0; the edges and the dots light up.' },
    sharpen: { label: 'sharpen (original − Laplacian)', effect: 'Sharpen: 5 × you minus your 4 neighbours. Flat areas stay the same, the edges and the dots get stronger.' },
    identity: { label: 'keep as is', effect: 'Keep as is: only the middle coefficient is 1, so every pixel keeps its own value.' }
  };
  var sel = document.getElementById('ks-kernel');
  Object.keys(KERNELS).forEach(function (key) { sel.appendChild(IP.el('option', { value: key, text: KERNELS[key].label })); });
  var inTable = document.getElementById('ks-in'), outTable = document.getElementById('ks-out');
  var inCells = [], outCells = [], done = 0, timer = null;

  // the kernel actually used: blurs are divided by the sum of their coefficients
  function kernel() {
    var p = Filter.PRESETS[sel.value], flat = [].concat.apply([], p.rows);
    return { rows: p.rows, div: p.divide ? flat.reduce(function (a, b) { return a + b; }, 0) : 1 };
  }
  // a pixel, with reflect-101 borders like cv2.filter2D
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
        var td = IP.el('td', { text: String(v), class: pad ? 'pad' : '', style: pad ? '' : 'background:' + D.pixel(v) });
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
    document.getElementById('ks-k-cap').textContent = 'the kernel' + (k.div !== 1 ? ', then divide by ' + k.div : '');
  }

  // Show the first n new pixels; the last one is the current one
  function show(n) {
    done = Math.max(0, Math.min(n, H * W));
    inCells.forEach(function (row) { row.forEach(function (td) { td.classList.remove('win', 'center'); }); });
    for (var i = 0; i < H * W; i++) {
      var r = Math.floor(i / W), c = i % W, td = outCells[r][c];
      td.classList.remove('current');
      if (i < done) {
        var v = compute(r, c).value;
        td.textContent = v; td.className = ''; td.style.background = D.pixel(v);
      } else { td.textContent = ''; td.className = 'empty'; td.style.background = ''; }
    }
    var calc = document.getElementById('ks-calc');
    calc.innerHTML = '';
    if (done) {
      var cur = done - 1, cr = Math.floor(cur / W), cc = cur % W, k = kernel(), res = compute(cr, cc), terms = [];
      outCells[cr][cc].classList.add('current');
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
        inCells[cr + dr + 1][cc + dc + 1].classList.add('win');
        var w = k.rows[dr + 1][dc + 1];
        if (w !== 0) terms.push(at(cr + dr, cc + dc) + '·' + w);
      }
      inCells[cr + 1][cc + 1].classList.add('center');
      var exact = res.sum / k.div;
      calc.append(IP.el('b', { text: 'row ' + cr + ', column ' + cc + ': ' }),
        terms.join(' + ').replace(/\+ -/g, '− ').replace(/·-/g, '·−') + ' = ' + res.sum +
        (k.div !== 1 ? ', divided by ' + k.div + ' = ' + Math.round(exact * 10) / 10 : '') +
        ' → new value ' + res.value + (exact < 0 || exact > 255 ? ' (cut to 0…255)' : ''));
    } else {
      calc.append('Press "Next pixel": the window (black frame) moves left to right, top to bottom.');
    }
    calc.append(IP.el('p', { class: 'caption-left', text: KERNELS[sel.value].effect }));
  }

  function stop() { clearInterval(timer); timer = null; document.getElementById('ks-play').textContent = 'Play'; }
  document.getElementById('ks-step').onclick = function () { stop(); show(done + 1); };
  document.getElementById('ks-play').onclick = function () {
    if (timer) { stop(); return; }
    if (done >= H * W) show(0);
    this.textContent = 'Pause';
    timer = setInterval(function () { if (done >= H * W) stop(); else show(done + 1); }, 400);
  };

  // The same kernel on the whole image of the image bar
  function drawImage() {
    var k = kernel(), gray = IP.gray();
    var rows = k.rows.map(function (row) { return row.map(function (v) { return v / k.div; }); });
    IP.draw(document.getElementById('ks-src'), gray);
    IP.draw(document.getElementById('ks-dst'), Filter.toGray(Filter.correlate(Filter.fromGray(gray), Filter.kernel(rows), 'reflect')));
    document.getElementById('ks-dst-cap').textContent = 'the same kernel on your image: ' + KERNELS[sel.value].label;
  }
  sel.addEventListener('input', function () { stop(); build(); show(0); drawImage(); });
  build(); show(0);
  IP.ready(drawImage);
  IP.onChange(drawImage);
})();

/* =====================================================================
   2. Borders
   ===================================================================== */

// Four ways to invent the two missing neighbours of 10 20 30 40 50
(function () {
  var s = 38, out = '';
  var ways = [['constant 0', [0, 0]], ['replicate', [10, 10]], ['reflect', [20, 10]], ['reflect-101', [30, 20]]];
  out += D.text(170 + s, 18, 'invented', { size: 11 }) + D.text(262 + 2.5 * s, 18, 'the real row', { size: 11 });
  ways.forEach(function (w, i) {
    var y = 28 + i * 50;
    out += D.text(160, y + 24, w[0], { anchor: 'end' });
    out += strip(170, y, s, w[1], function (v) { return { fill: D.C.pad, text: String(v) }; });
    out += '<line x1="' + (170 + 2 * s + 6) + '" y1="' + (y - 2) + '" x2="' + (170 + 2 * s + 6) + '" y2="' + (y + s + 2) + '" stroke="#000" stroke-width="2"/>';
    out += strip(262, y, s, [10, 20, 30, 40, 50], function (v) { return blue(v); });
  });
  put('d-ways', D.svg(470, 232, out, 'The row 10 20 30 40 50 padded on the left four ways: 0 0, 10 10, 20 10, 30 20'));
})();

// Zero padding: a 5x5 image of 100 inside a ring of zeros
(function () {
  var padded = [], out = [], r, c;
  for (r = 0; r < 7; r++) { padded.push([]); for (c = 0; c < 7; c++) padded[r].push(r === 0 || r === 6 || c === 0 || c === 6 ? 0 : 100); }
  for (r = 0; r < 5; r++) {
    out.push([]);
    for (c = 0; c < 5; c++) { var er = r === 0 || r === 4, ec = c === 0 || c === 4; out[r].push(er && ec ? 44 : er || ec ? 67 : 100); }
  }
  var b = '';
  b += D.text(20, 22, 'padded with zeros', { anchor: 'start', bold: true });
  b += D.grid(20, 34, 28, padded, function (v) { return v === 0 ? { fill: D.C.pad, text: '0' } : null; });
  b += D.window(20, 34, 28, 0, 0, 3);
  b += D.text(20, 252, 'corner window: 5 of the 9 values are 0', { anchor: 'start', size: 11 });
  b += D.arrow(240, 132, 330, 132, '3×3 average');
  b += D.text(350, 22, 'blurred', { anchor: 'start', bold: true });
  b += D.grid(350, 48, 28, out, function (v) { return v === 100 ? null : green(v); });
  b += D.text(350, 210, 'corners 400 / 9 = 44', { anchor: 'start', size: 11 });
  b += D.text(350, 228, 'edges 600 / 9 = 67', { anchor: 'start', size: 11 });
  put('d-border', D.svg(560, 264, b, 'Zero padding makes the corners 44 and the edges 67'));
})();

// Demo: the border mode on a small 8x8 image (bright left column) and on the image of the image bar
(function () {
  var N = 8, small = Filter.make(N, N);
  for (var i = 0; i < N * N; i++) small.data[i] = i % N === 0 ? 200 : 10;
  var LIVE = {
    zeros: 'Zeros: the invented column is 0, so the bright left column drops to 70 (and 47 in the corners). The photo gets a dark frame.',
    replicate: 'Replicate: the invented column copies the edge (200), so the left column stays bright: 137.',
    reflect: 'Reflect-101: the invented column mirrors the next one inside (10), so the left column becomes 73.'
  };
  function table(id, rows) {
    var t = document.getElementById(id);
    t.innerHTML = '';
    rows.forEach(function (row) {
      var tr = IP.el('tr');
      row.forEach(function (cell) { tr.appendChild(IP.el('td', { text: String(cell.v), class: cell.pad ? 'pad' : '', style: cell.pad ? '' : 'background:' + D.pixel(cell.v) })); });
      t.appendChild(tr);
    });
  }
  function draw() {
    var border = document.querySelector('input[name=kb-border]:checked').value, rows = [], r, c;
    // the image with a ring of invented pixels, as the chosen border mode makes them
    for (r = -1; r <= N; r++) {
      var row = [];
      for (c = -1; c <= N; c++) {
        var rr = Filter.borderIndex(r, N, border), cc = Filter.borderIndex(c, N, border);
        row.push({ v: rr < 0 || cc < 0 ? 0 : small.data[rr * N + cc], pad: r < 0 || r >= N || c < 0 || c >= N });
      }
      rows.push(row);
    }
    table('kb-in', rows);
    var blurred = Filter.toGray(Filter.box(small, 3, border));
    rows = [];
    for (r = 0; r < N; r++) { rows.push([]); for (c = 0; c < N; c++) rows[r].push({ v: blurred.data[r * N + c] }); }
    table('kb-grid', rows);
    IP.draw(document.getElementById('kb-photo'), Filter.toGray(Filter.box(Filter.fromGray(IP.gray()), 31, border)));
    document.getElementById('kb-caption').textContent = LIVE[border];
  }
  document.querySelectorAll('input[name=kb-border]').forEach(function (r) { r.addEventListener('input', draw); });
  IP.ready(draw);
  IP.onChange(draw);
})();

/* =====================================================================
   3. Blur
   ===================================================================== */

recipes('d-recipes-blur', [
  ['box', [10, 10, 200], ['1/3', '1/3', '1/3'], '73.3'],
  ['centre counts more', [10, 10, 200], ['1/4', '2/4', '1/4'], '57.5']
], 'A box kernel gives 73.3, a kernel where the centre counts more gives 57.5');

// Bars: how much you listen to each of 7 neighbours, box vs Gaussian
function bars(x, y, weights, title) {
  var out = D.text(x + 3.5 * 34, y - 12, title, { bold: true }), max = Math.max.apply(null, weights), h = 110;
  weights.forEach(function (w, i) {
    var bh = w / max * h, bx = x + i * 34;
    out += '<rect x="' + (bx + 4) + '" y="' + (y + h - bh) + '" width="26" height="' + bh + '" fill="' + D.C.kernel + '" stroke="' + D.C.kernelLine + '" stroke-width="1.5"/>';
    out += D.text(bx + 17, y + h - bh - 5, Math.round(w * 100) + '%', { size: 10 });
    out += D.text(bx + 17, y + h + 16, i === 3 ? 'you' : String(i - 3), { size: 10 });
  });
  return out + '<line x1="' + x + '" y1="' + (y + h + 0.5) + '" x2="' + (x + 7 * 34) + '" y2="' + (y + h + 0.5) + '" stroke="#000"/>';
}
put('d-bars', D.svg(560, 200, bars(20, 44, Filter.box1D(7), 'box: everyone the same') +
  bars(300, 44, Filter.gaussian1D(7, 1.5), 'Gaussian (σ = 1.5): closer counts more') +
  D.text(280, 194, 'how much I listen to each neighbour (–3 … +3 pixels away)', { size: 11 }), 'Box weights are all equal; Gaussian weights form a bell'));

// Demo: box or Gaussian on noisy.png, one "blur amount" slider
(function () {
  var amountEl = document.getElementById('kc-amount'), canvas = document.getElementById('kc-bars');
  function kind() { return document.querySelector('input[name=kc-kind]:checked').value; }
  // amount 1..10 -> box size 3..21, or sigma 0.6..6 (about the same amount of blur)
  function settings() {
    var a = Number(amountEl.value);
    return kind() === 'box' ? { size: 2 * a + 1, weights: Filter.box1D(2 * a + 1) }
      : { sigma: Math.round(a * 6) / 10, size: Filter.gaussianSize(Math.round(a * 6) / 10), weights: Filter.gaussian1D(Filter.gaussianSize(Math.round(a * 6) / 10), Math.round(a * 6) / 10) };
  }
  // the weights of the current kernel as bars, centred, 41 positions wide
  function drawBars(w) {
    var W = 760, H = 110, n = 41, cw = W / n, max = Math.max.apply(null, w), r = (w.length - 1) / 2;
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = D.C.kernel; ctx.strokeStyle = D.C.kernelLine;
    w.forEach(function (v, i) {
      var pos = 20 + i - r, bh = v / max * (H - 30);
      ctx.fillRect(pos * cw + 2, H - 20 - bh, cw - 4, bh);
      ctx.strokeRect(pos * cw + 2.5, H - 20 - bh + 0.5, cw - 5, bh);
    });
    ctx.fillStyle = '#000'; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('how much each neighbour counts (the middle bar is you)', W / 2, H - 4);
  }
  function draw() {
    if (!Filter.loaded()) return;
    var st = settings(), noisy = Filter.extra.noisy, f = Filter.fromGray(noisy), a = Number(amountEl.value), out;
    out = kind() === 'box' ? Filter.box(f, st.size, 'reflect') : Filter.gaussian(f, st.sigma, 'reflect');
    document.getElementById('kc-amount-val').textContent = kind() === 'box' ? 'box ' + st.size + ' × ' + st.size : 'σ = ' + st.sigma + ' (' + st.size + ' × ' + st.size + ')';
    drawBars(st.weights);
    IP.draw(document.getElementById('kc-src'), noisy);
    IP.draw(document.getElementById('kc-dst'), Filter.toGray(out));
    document.getElementById('kc-cap').textContent = kind() === 'box' ? 'cv2.blur(noisy, (' + st.size + ', ' + st.size + '))' : 'cv2.GaussianBlur(noisy, (0, 0), ' + st.sigma + ')';
    var what = a <= 1 ? 'Little blur: most of the noise is still there.'
      : a <= 3 ? 'The noise is mostly gone and the letters are still easy to read.'
      : a <= 6 ? 'The noise is gone, but the letters and the thin lines start to smear.'
      : 'Too much: the thin lines and the letters are lost in the blur.';
    document.getElementById('kc-live').textContent = what + (kind() === 'box'
      ? ' Box: every neighbour counts the same, so edges smear evenly.'
      : ' Gaussian: the close neighbours count most, so edges stay a little crisper.');
  }
  var redraw = Filter.onFrame(draw);
  amountEl.addEventListener('input', redraw);
  document.querySelectorAll('input[name=kc-kind]').forEach(function (r) { r.addEventListener('input', redraw); });
  Filter.ready(draw);
})();

/* =====================================================================
   4. Edges
   ===================================================================== */

recipes('d-recipes-edges', [
  ['difference', [10, 10, 200], ['-1', '0', '1'], '190'],
  ['difference, flat area', [10, 10, 10], ['-1', '0', '1'], '0']
], 'The difference kernel gives 190 on an edge and 0 on a flat area');

// Sobel on a 3x3 window
(function () {
  var win = [[10, 10, 200], [10, 10, 200], [10, 10, 200]], sb = '';
  sb += D.text(20, 22, 'window', { anchor: 'start', bold: true }) + D.grid(20, 34, 36, win) + D.window(20, 34, 36, 0, 0, 3);
  sb += D.text(170, 22, 'dx kernel', { anchor: 'start', bold: true }) + D.grid(170, 34, 36, [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], purple);
  sb += D.text(320, 22, 'dy kernel', { anchor: 'start', bold: true }) + D.grid(320, 34, 36, [[-1, -2, -1], [0, 0, 0], [1, 2, 1]], purple);
  sb += D.text(480, 22, 'on screen', { anchor: 'start', bold: true }) + D.cell(480, 70, 36, green('255'));
  sb += D.text(20, 174, 'dx = (200 + 2·200 + 200) − (10 + 2·10 + 10) = 760', { anchor: 'start' });
  sb += D.text(20, 196, 'dy = 0 (every column is the same from top to bottom)', { anchor: 'start' });
  sb += D.text(20, 218, 'strength = √(760² + 0²) = 760, cut to 255 on screen', { anchor: 'start' });
  put('d-sobel', D.svg(580, 232, sb, 'Sobel on a vertical edge: dx = 760, dy = 0, strength 760'));
})();

// Demo: which edges
(function () {
  var tEl = document.getElementById('ke-t');
  function what() { return document.querySelector('input[name=ke-what]:checked').value; }
  function draw() {
    var w = what(), gray = IP.gray(), f = Filter.fromGray(gray), T = Number(tEl.value), out, live;
    var gx = Filter.sobelX(f), gy = Filter.sobelY(f);
    document.getElementById('ke-t-label').hidden = w !== 'mag';
    document.getElementById('ke-t-val').textContent = T;
    if (w === 'dx') { out = Filter.toGray(gx, 'abs'); live = 'Vertical edges stay, horizontal edges disappear.'; }
    else if (w === 'dy') { out = Filter.toGray(gy, 'abs'); live = 'Horizontal edges stay, vertical edges disappear.'; }
    else {
      var m = Filter.make(f.width, f.height);
      for (var i = 0; i < m.data.length; i++) m.data[i] = Math.hypot(gx.data[i], gy.data[i]);
      out = Filter.toGray(m);
      live = 'All edges, whatever their direction; brighter means a stronger edge.';
      if (T > 0) {
        out = IP.threshold(out, T);
        var kept = 0;
        for (i = 0; i < out.data.length; i++) if (out.data[i]) kept++;
        live = 'Only edges stronger than ' + T + ' are kept (white): ' + (Math.round(1000 * kept / out.data.length) / 10) + '% of the pixels. The weak ones (noise, soft texture) turn black.';
      }
    }
    IP.draw(document.getElementById('ke-src'), gray);
    IP.draw(document.getElementById('ke-dst'), out);
    document.getElementById('ke-cap').textContent = w === 'dx' ? 'vertical edges (dx)' : w === 'dy' ? 'horizontal edges (dy)' : 'edge strength (magnitude)';
    document.getElementById('ke-live').textContent = live;
  }
  var redraw = Filter.onFrame(draw);
  tEl.addEventListener('input', redraw);
  document.querySelectorAll('input[name=ke-what]').forEach(function (r) { r.addEventListener('input', redraw); });
  IP.ready(draw);
  IP.onChange(draw);
})();

/* =====================================================================
   5. Sharpening
   ===================================================================== */

// Two strips: Laplacian sharpening and unsharp masking
(function () {
  var s = 40, x0 = 200, out = '';
  out += D.text(20, 20, 'a) with the Laplacian', { anchor: 'start', bold: true });
  out += D.text(x0 - 12, 54, 'image', { anchor: 'end' }) + strip(x0, 30, s, [10, 10, 200, 200], function (v) { return blue(v); });
  out += D.text(x0 - 12, 100, 'Laplacian', { anchor: 'end' }) + strip(x0 + s, 76, s, ['+190', '−190'], green);
  out += D.text(x0 - 12, 146, 'image − Laplacian', { anchor: 'end' }) + strip(x0, 122, s, [10, -180, 390, 200], green);
  out += D.text(x0 - 12, 192, 'cut to 0…255', { anchor: 'end' }) + strip(x0, 168, s, [10, 0, 255, 200], green);
  var y = 230;
  out += D.text(20, y, 'b) with unsharp masking (3-wide box blur)', { anchor: 'start', bold: true });
  var rows = [['image', [100, 100, 100, 140, 140, 140], blue], ['blurred', [100, 100, 113, 127, 140, 140], blue],
    ['mask = image − blurred', [0, 0, '−13', '+13', 0, 0], green], ['k = 1', [100, 100, 87, 153, 140, 140], green], ['k = 3', [100, 100, 60, 180, 140, 140], green]];
  rows.forEach(function (r, i) {
    out += D.text(x0 - 12, y + 34 + i * 46, r[0], { anchor: 'end' }) + strip(x0, y + 10 + i * 46, s, r[1], function (v) { return r[2](v); });
  });
  put('d-sharp', D.svg(460, 476, out, 'Sharpening a step with the Laplacian and with unsharp masking: the dark side gets darker, the bright side brighter'));
})();

// Demo: sharpen
(function () {
  var amountEl = document.getElementById('kf-amount');
  function mode() { return document.querySelector('input[name=kf-mode]:checked').value; }
  function draw() {
    var m = mode(), gray = IP.gray(), f = Filter.fromGray(gray), a = Number(amountEl.value), out, cap, live;
    document.getElementById('kf-amount-label').hidden = m === 'lap';
    document.getElementById('kf-amount-val').textContent = a;
    if (m === 'lap') {
      out = Filter.toGray(Filter.laplacian(f), 'abs');
      cap = 'Laplacian only (absolute value)';
      live = 'Laplacian alone: only the edges, on black. Flat areas give 0.';
    } else if (m === 'sharp') {
      out = Filter.toGray(Filter.add(f, Filter.laplacian(f), -a));
      cap = 'image − ' + a + ' × Laplacian';
      live = a === 0 ? 'Amount 0: the original image.'
        : a <= 1 ? 'Edges get a dark side and a bright side: the picture looks crisper.'
        : 'Strong: edges look drawn, and the grain in the grass gets loud too.';
    } else {
      var blur = Filter.saturate(Filter.gaussian(f, 5, 'reflect'));      // cv2.GaussianBlur(gray, (0, 0), 5) gives uint8
      out = Filter.toGray(Filter.add(f, Filter.add(f, blur, -1), a));    // image + k * (image - blur)
      cap = 'image + ' + a + ' × (image − blur), blur with σ = 5';
      live = a === 0 ? 'k = 0: the original image.'
        : a === 1 ? 'Unsharp masking (k = 1): a little crisper.'
        : a <= 3 ? 'Highboost (k = ' + a + '): edges and details stand out clearly.'
        : 'Highboost (k = ' + a + '): so strong it looks like drawn outlines (the lecture shows k = 4.5).';
    }
    IP.draw(document.getElementById('kf-src'), gray);
    IP.draw(document.getElementById('kf-dst'), out);
    document.getElementById('kf-cap').textContent = cap;
    document.getElementById('kf-live').textContent = live;
  }
  var redraw = Filter.onFrame(draw);
  amountEl.addEventListener('input', redraw);
  document.querySelectorAll('input[name=kf-mode]').forEach(function (r) { r.addEventListener('input', redraw); });
  IP.ready(draw);
  IP.onChange(draw);
})();

/* =====================================================================
   Exercises: code with dropdowns (one per tab)
   ===================================================================== */
var READ_GRAY = 'gray = cv2.cvtColor(cv2.imread("landscape.png"), cv2.COLOR_BGR2GRAY)\n';

Games.fillBlanks(document.getElementById('ex-borders'), {
  title: 'Exercise: the wrong corner',
  task: 'An image where every pixel is 100, blurred twice. Choose the border modes and what the program prints.',
  parts: [
    'flat = np.full((5, 5), 100, np.uint8)        # every pixel is 100\n' +
    'zero = cv2.blur(flat, (3, 3), borderType=cv2.', { answer: 'BORDER_CONSTANT', options: ['BORDER_CONSTANT', 'BORDER_REFLECT', 'BORDER_REPLICATE'], hint: 'Zeros around the image: a constant border (0 by default).' },
    ')   # zeros around\nrefl = cv2.blur(flat, (3, 3), borderType=cv2.', { answer: 'BORDER_REFLECT', options: ['BORDER_CONSTANT', 'BORDER_REFLECT', 'BORDER_REPLICATE'], hint: 'A mirror of the inside: reflect.' },
    ')    # mirrored\nprint(zero[0, 0], refl[0, 0])   # prints ', { answer: '44 100', options: ['100 100', '44 100', '0 100', '44 44'], hint: 'The zero corner averages 4 × 100 and 5 zeros; the mirrored corner averages only 100s.' }
  ],
  explain: 'The image is flat, so every blurred pixel should stay 100: the zero border is wrong (400 / 9 = 44). The one parameter that fixes it is borderType.',
  onCorrect: function (out) {
    var f = Filter.fromGray(IP.gray());
    out.append(IP.el('div', { class: 'grid-2' }, IP.figure(Filter.toGray(Filter.box(f, 31, 'zeros')), 'zeros: dark frame'), IP.figure(Filter.toGray(Filter.box(f, 31, 'reflect')), 'reflect: no frame')));
  }
});

Games.fillBlanks(document.getElementById('ex-blur'), {
  title: 'Exercise: clean the noisy text',
  task: 'Blur <code>noisy.png</code> with a box and with a Gaussian, then pick the one closer to the clean <code>edges.png</code>.',
  parts: [
    'noisy = cv2.imread("noisy.png", cv2.IMREAD_GRAYSCALE)\nclean = cv2.imread("edges.png", cv2.IMREAD_GRAYSCALE)\n' +
    'box = cv2.', { answer: 'blur', options: ['blur', 'GaussianBlur', 'Sobel'], hint: 'cv2.blur is the box filter: every neighbour counts the same.' },
    '(noisy, (5, 5))\ngauss = cv2.GaussianBlur(noisy, ', { answer: '(0, 0)', options: ['(0, 0)', '(4, 4)', '(1.5, 1.5)'], hint: '(0, 0) lets OpenCV choose the size from sigma. Sizes must be whole odd numbers.' },
    ', 1.5)\nprint(round(cv2.absdiff(box, clean).mean(), 2), round(cv2.absdiff(gauss, clean).mean(), 2))   # 11.6 10.9\n# closer to the clean image: ',
    { answer: 'gauss', options: ['box', 'gauss'], hint: 'A smaller difference means closer to the clean image.' }
  ],
  explain: 'box gives 11.6, the Gaussian 10.9: the Gaussian is closer, because its close neighbours count most, so the letters\' edges smear less.',
  onCorrect: function (out) {
    var f = Filter.fromGray(Filter.extra.noisy);
    out.append(IP.el('div', { class: 'grid-2' }, IP.figure(Filter.toGray(Filter.box(f, 5, 'reflect')), 'box 5 × 5'), IP.figure(Filter.toGray(Filter.gaussian(f, 1.5, 'reflect')), 'Gaussian σ = 1.5')));
  }
});

Games.fillBlanks(document.getElementById('ex-edges'), {
  title: 'Exercise: vertical, horizontal, both',
  task: 'Choose the Sobel directions and the function that combines them.',
  parts: [
    'gray = cv2.imread("edges.png", cv2.IMREAD_GRAYSCALE)\ngx = cv2.Sobel(gray, cv2.CV_32F, ', { answer: '1, 0', options: ['1, 0', '0, 1', '1, 1'], hint: 'Vertical edges: the change from left to right, so dx = 1, dy = 0.' },
    ')   # vertical edges\ngy = cv2.Sobel(gray, cv2.CV_32F, ', { answer: '0, 1', options: ['1, 0', '0, 1', '1, 1'], hint: 'Horizontal edges: the change from top to bottom, so dx = 0, dy = 1.' },
    ')   # horizontal edges\nboth = cv2.convertScaleAbs(cv2.', { answer: 'magnitude', options: ['add', 'magnitude', 'absdiff'], hint: 'Adding can cancel out (+ and −); the magnitude √(gx² + gy²) never does.' },
    '(gx, gy))\nprint(cv2.convertScaleAbs(gx)[60, 20])   # left side of the dark square: ', { answer: '255', options: ['0', '128', '255'], hint: 'The left side of the square is a strong vertical edge.' }
  ],
  explain: '(1, 0) finds vertical edges, (0, 1) horizontal ones, and the magnitude combines them. On the square\'s left side gx is huge, so it shows as 255.',
  onCorrect: function (out) {
    var f = Filter.fromGray(Filter.extra.edges), gx = Filter.sobelX(f), gy = Filter.sobelY(f), m = Filter.make(f.width, f.height);
    for (var i = 0; i < m.data.length; i++) m.data[i] = Math.hypot(gx.data[i], gy.data[i]);
    out.append(IP.el('div', { class: 'grid-3' }, IP.figure(Filter.toGray(gx, 'abs'), 'vertical'), IP.figure(Filter.toGray(gy, 'abs'), 'horizontal'), IP.figure(Filter.toGray(m), 'both')));
  }
});

Games.fillBlanks(document.getElementById('ex-sharpening'), {
  title: 'Exercise: sharpen two ways',
  task: 'Choose the signs and the amount so that both results are sharper than the original.',
  parts: [
    READ_GRAY + 'lap = cv2.Laplacian(gray, cv2.CV_32F)\nsharp = np.clip(gray ', { answer: '-', options: ['+', '-'], hint: 'The kernel has −4 in the middle, so subtract it: original − Laplacian.' },
    ' lap, 0, 255).astype(np.uint8)\n\nblur = cv2.GaussianBlur(gray, (0, 0), 5)\nmask = gray.astype(np.float32) ', { answer: '-', options: ['+', '-'], hint: 'The mask is what the blur took away: original − blur.' },
    ' blur\nhigh = np.clip(gray + ', { answer: '4.5', options: ['0', '1', '4.5'], hint: 'k > 1 is highboost; k = 1 is plain unsharp masking.' },
    ' * mask, 0, 255).astype(np.uint8)   # highboost'
  ],
  explain: 'Original − Laplacian sharpens; the mask is original − blur; k = 4.5 > 1 is highboost (the lecture example).',
  onCorrect: function (out) {
    var f = Filter.fromGray(IP.gray()), blur = Filter.saturate(Filter.gaussian(f, 5, 'reflect'));
    out.append(IP.el('div', { class: 'grid-2' }, IP.figure(Filter.toGray(Filter.add(f, Filter.laplacian(f), -1)), 'sharp'),
      IP.figure(Filter.toGray(Filter.add(f, Filter.add(f, blur, -1), 4.5)), 'high')));
  }
});
