// Section 5: point operations (lecture 4).

// src = (gray * 0.4 + 30).astype(np.uint8): a dull, low-contrast version of the image
function dull(gray) { return IP.mapGray(gray, function (x) { return Math.floor(x * 0.4 + 30); }); }

// Auto contrast with s% cut at each end (lecture: a_low = min{i | H(i) >= N*s}, a_high = max{i | H(i) <= N*(1-s)})
function autoRange(g, cutPercent) {
  var s = IP.stats(g.data);
  if (!cutPercent) return [s.min, s.max];
  var H = IP.cumulative(IP.histogram(g)), N = g.data.length, f = cutPercent / 100;
  var lo = 0, hi = 255;
  while (H[lo] < N * f) lo++;
  while (hi > 0 && H[hi] > N * (1 - f)) hi--;
  return hi > lo ? [lo, hi] : [s.min, s.max];
}

// The lookup table and the Python line for each function in the demo
function makeLut(name, src, p) {
  var ident = [];
  for (var v = 0; v < 256; v++) ident.push(v);
  var stretch = '\nout = np.clip(np.round((src.astype(np.float64) - lo) * 255 / (hi - lo)), 0, 255).astype(np.uint8)';
  switch (name) {
    case 'negative': return { lut: ident.map(function (v) { return 255 - v; }), code: 'out = 255 - src' };
    case 'log': return { lut: IP.logLut(), code: 'out = np.round(255 / np.log(256) * np.log(1 + src.astype(np.float64))).astype(np.uint8)' };
    case 'gamma': return { lut: IP.gammaLut(p.gamma), code: 'out = np.round(255 * (src / 255.0) ** ' + p.gamma + ').astype(np.uint8)' };
    case 'window': return { lut: IP.stretchLut(p.a, p.b), code: 'lo, hi = ' + p.a + ', ' + p.b + stretch };
    case 'auto':
      var r = autoRange(src, p.cut);
      var code = p.cut
        ? 'H = np.cumsum(np.bincount(src.ravel(), minlength=256)); N = src.size; s = ' + p.cut / 100 +
          '\nlo = np.searchsorted(H, N * s)                         # ' + r[0] +
          '\nhi = np.searchsorted(H, N * (1 - s), side="right") - 1  # ' + r[1]
        : 'lo, hi = int(src.min()), int(src.max())   # ' + r[0] + ', ' + r[1];
      return { lut: IP.stretchLut(r[0], r[1]), code: code + stretch };
    case 'equalize': return { lut: IP.cvEqualizeLut(src), code: 'out = cv2.equalizeHist(src)' };
    default: return { lut: ident, code: 'out = src' };
  }
}

/* ---------- Demo: pick a function ---------- */
(function () {
  var ids = ['func', 'gamma', 'a', 'b', 'cut', 'dull'];
  var el = {};
  ids.forEach(function (id) { el[id] = document.getElementById('p-' + id); });
  function update() {
    var p = { gamma: Number(el.gamma.value), a: Number(el.a.value), b: Number(el.b.value), cut: Number(el.cut.value) };
    if (p.b <= p.a) { p.b = p.a + 1; el.b.value = p.b; }
    ['gamma', 'a', 'b', 'cut'].forEach(function (k) { document.getElementById('p-' + k + '-val').textContent = p[k]; });
    var f = el.func.value;
    document.getElementById('p-gamma-box').hidden = f !== 'gamma';
    document.getElementById('p-a-box').hidden = f !== 'window';
    document.getElementById('p-b-box').hidden = f !== 'window';
    document.getElementById('p-cut-box').hidden = f !== 'auto';
    var src = el.dull.checked ? dull(IP.gray()) : IP.gray();
    var m = makeLut(f, src, p), out = IP.applyLut(src, m.lut);
    var first = el.dull.checked ? 'src = (gray * 0.4 + 30).astype(np.uint8)\n' : 'src = gray\n';
    document.getElementById('p-code').innerHTML = IP.highlight(first + m.code);
    IP.drawCurve(document.getElementById('p-curve'), m.lut);
    IP.draw(document.getElementById('p-image'), out);
    IP.drawHistogram(document.getElementById('p-hist'), IP.histogram(out), { clipTallest: true });
    document.getElementById('p-stats').textContent = IP.distinct(out.data).length + ' levels used';
  }
  ids.forEach(function (id) { el[id].addEventListener('input', update); });
  IP.ready(update);
  IP.onChange(update);
})();

/* ---------- Demo: the lecture's equalization table ---------- */
(function () {
  var counts = [10, 8, 9, 2, 14, 1, 5, 2], N = 51;
  var run = IP.cumulative(counts);
  var mapped = run.map(function (r) { return IP.roundHalfEven(r / N * 7); });
  var after = [0, 0, 0, 0, 0, 0, 0, 0];
  counts.forEach(function (c, i) { after[mapped[i]] += c; });
  var rows = [
    ['Gray level', counts.map(function (c, i) { return i; })],
    ['Pixels', counts],
    ['Running sum', run],
    ['÷ ' + N, run.map(function (r) { return r + '/' + N; })],
    ['× 7, rounded = new level', mapped],
    ['Pixels after', after]
  ];
  var notes = ['', '8 levels (3 bits), ' + N + ' pixels.', 'Step 1: add up the counts from the left.',
    'Step 2: divide by the number of pixels.', 'Step 3: multiply by the top level (7) and round. Old level i becomes this.',
    'Step 4: count the pixels again. The histogram is more spread out.'];
  var shown = 2;
  var table = document.getElementById('eq-table');
  function render() {
    table.innerHTML = '';
    rows.slice(0, shown).forEach(function (r) {
      var tr = IP.el('tr', {}, IP.el('th', { text: r[0] }));
      r[1].forEach(function (v) { tr.appendChild(IP.el('td', { text: String(v) })); });
      table.appendChild(tr);
    });
    document.getElementById('eq-note').textContent = notes[shown - 1];
    document.getElementById('eq-next').disabled = shown >= rows.length;
  }
  document.getElementById('eq-next').onclick = function () { shown++; render(); };
  document.getElementById('eq-reset').onclick = function () { shown = 2; render(); };
  render();
})();

/* ---------- Game: live gamma ---------- */
Games.liveCode(document.getElementById('game-live-gamma'), {
  title: 'Gamma',
  task: '',
  parts: ['out = np.round(255 * (gray / 255.0) ** ', { id: 'g', type: 'select', value: 0.5, options: [0.3, 0.5, 0.7, 1, 1.5, 2, 3], label: 'gamma' }, ').astype(np.uint8)'],
  render: function (v, out) {
    var lut = IP.gammaLut(v.g), img = IP.applyLut(IP.gray(), lut);
    out.append(IP.el('div', { class: 'grid-3' },
      IP.el('figure', { class: 'figure' }, IP.drawCurve(IP.el('canvas'), lut), IP.el('figcaption', { text: 'f(a)' })),
      IP.figure(img, ''), IP.el('figure', { class: 'figure' }, IP.histogramCanvas(img), IP.el('figcaption', { text: '' }))));
    var why = v.g < 1 ? 'γ < 1: dark values are lifted, the image gets brighter.' : v.g > 1 ? 'γ > 1: values are pushed down, the image gets darker.' : 'γ = 1 changes nothing.';
    return { kind: 'info', msg: 'mean ' + IP.fmt.round2(IP.stats(img.data).mean), why: why };
  }
});

/* ---------- Game: fill in equalization ---------- */
Games.fillBlanks(document.getElementById('game-fill-eq'), {
  title: 'Equalization by hand',
  task: '',
  parts: [
    'hist = np.bincount(gray.ravel(), minlength=256)\ncdf = np.', { answer: 'cumsum', options: ['cumsum', 'sum', 'sort'], hint: 'You need the running sum H(i), not one total.' },
    '(hist)\nlut = np.round(cdf / cdf[', { answer: '-1', options: ['0', '-1', '255'], hint: 'Divide by the last value of the running sum: the number of pixels.' },
    '] * ', { answer: '255', options: ['1', '255', '256'], hint: 'Multiply by the top level, 255.' },
    ').astype(np.uint8)\nout = ', { answer: 'lut[gray]', options: ['lut[gray]', 'gray[lut]', 'lut * gray'], hint: 'Every pixel value is looked up in the table: lut[gray].' }
  ],
  explain: 'Running sum, divide by the number of pixels, times 255, look up.',
  onCorrect: function (out) {
    var src = dull(IP.gray());
    out.append(IP.el('div', { class: 'grid-2' },
      IP.el('figure', { class: 'figure' }, IP.canvasOf(src), IP.histogramCanvas(src), IP.el('figcaption', { text: 'a dull image' })),
      IP.el('figure', { class: 'figure' }, IP.canvasOf(IP.applyLut(src, IP.equalizeLut(src))), IP.histogramCanvas(IP.applyLut(src, IP.equalizeLut(src))), IP.el('figcaption', { text: 'equalized' }))));
  }
});

/* ---------- Game: spot the bug in contrast stretching ---------- */
Games.spotBug(document.getElementById('game-bug-stretch'), {
  title: 'Stretch that does not stretch',
  task: '',
  lines: [
    'src = (gray * 0.4 + 30).astype(np.uint8)',
    'lo, hi = int(src.min()), int(src.max())',
    'out = (src.astype(np.float64) - lo) * 255 / hi',
    'out = np.clip(np.round(out), 0, 255).astype(np.uint8)'
  ],
  bug: 2,
  hints: { 0: 'This only makes the dull test input.', 1: 'min and max are the right ends of the range.', 3: 'Rounding and clipping is fine.' },
  explain: 'Divide by the width of the range, hi − lo, not by hi. Otherwise the brightest pixel does not reach 255.',
  show: function (out) {
    var src = dull(IP.gray()), r = autoRange(src, 0);
    var wrongLut = [];
    for (var v = 0; v < 256; v++) wrongLut.push(Math.max(0, Math.min(255, IP.roundHalfEven((v - r[0]) * 255 / r[1]))));
    var wrong = IP.applyLut(src, wrongLut), right = IP.applyLut(src, IP.stretchLut(r[0], r[1]));
    out.append(IP.el('div', { class: 'grid-2' },
      IP.el('figure', { class: 'figure' }, IP.canvasOf(wrong), IP.histogramCanvas(wrong), IP.el('figcaption', { text: 'bug: max ' + IP.stats(wrong.data).max })),
      IP.el('figure', { class: 'figure' }, IP.canvasOf(right), IP.histogramCanvas(right), IP.el('figcaption', { text: 'fixed: max ' + IP.stats(right.data).max }))));
  }
});

/* ---------- Game (no code): curve → picture ---------- */
Games.predict(document.getElementById('game-curve-picture'), {
  title: 'Curve → picture',
  task: 'Click the picture this curve makes.',
  rounds: function () {
    var gray = IP.gray();
    var funcs = [
      [IP.gammaLut(1).map(function (v) { return 255 - v; }), 'Falling line: dark becomes bright, the negative.'],
      [IP.gammaLut(0.4), 'Curve above the diagonal: every value gets brighter.'],
      [IP.gammaLut(2.5), 'Curve below the diagonal: every value gets darker.'],
      [IP.stretchLut(80, 170), 'Steep middle, flat ends: more contrast, clipped dark and bright.']
    ];
    return Games.shuffle(funcs).map(function (f) {
      var others = Games.shuffle(funcs.filter(function (o) { return o !== f; })).slice(0, 2);
      return Games.pickRound({
        figure: function () { return IP.el('div', { style: 'max-width:200px' }, IP.drawCurve(IP.el('canvas', { style: 'width:100%' }), f[0])); },
        explain: f[1]
      }, [f].concat(others).map(function (o) { return function () { return IP.canvasOf(IP.applyLut(gray, o[0])); }; }));
    });
  }
});

/* ---------- Game (no code): complete an equalization table ---------- */
(function () {
  var g = Games.shell(document.getElementById('game-eq-table'), 'Fill', 'Equalize 8 levels', 'New level = round(running sum / N × 7).');
  function start() {
    g.clear();
    var counts, run, N, mapped;
    do {   // random counts, avoiding exact halves so the rounding is clear
      counts = [0, 0, 0, 0, 0, 0, 0, 0].map(function () { return Math.floor(Math.random() * 12); });
      run = IP.cumulative(counts); N = run[7];
    } while (N < 20 || run.some(function (r) { return (r * 7 / N) % 1 === 0.5; }));
    mapped = run.map(function (r) { return IP.roundHalfEven(r / N * 7); });
    var inputs = [];
    var table = IP.el('table', { class: 'eq-table' },
      IP.el('tr', {}, IP.el('th', { text: 'Level' })), IP.el('tr', {}, IP.el('th', { text: 'Pixels' })),
      IP.el('tr', {}, IP.el('th', { text: 'Running sum' })), IP.el('tr', {}, IP.el('th', { text: 'New level' })));
    counts.forEach(function (c, i) {
      table.children[0].appendChild(IP.el('td', { text: String(i) }));
      table.children[1].appendChild(IP.el('td', { text: String(c) }));
      table.children[2].appendChild(IP.el('td', { text: String(run[i]) }));
      var input = IP.el('input', { type: 'number', min: 0, max: 7, 'aria-label': 'new level for ' + i, style: 'width:3em' });
      inputs.push(input);
      table.children[3].appendChild(IP.el('td', {}, input));
    });
    var check = IP.el('button', { class: 'btn', type: 'button', text: 'Check' });
    check.onclick = function () {
      var wrong = [];
      inputs.forEach(function (inp, i) {
        var ok = inp.value !== '' && Number(inp.value) === mapped[i];
        inp.classList.toggle('blank-bad', !ok);
        inp.classList.toggle('blank-ok', ok);
        if (!ok) wrong.push(i);
      });
      if (!wrong.length) g.say('good', 'Correct!', 'N = ' + N + '. Levels that share a new value are merged for good.');
      else {
        var i = wrong[0];
        g.say('bad', wrong.length + ' of 8 are not right yet.', 'Level ' + i + ': ' + run[i] + ' / ' + N + ' × 7 = ' + (run[i] / N * 7).toFixed(2) + ' → round it.');
      }
    };
    g.body.innerHTML = '';
    g.body.append(IP.el('div', { style: 'overflow-x:auto' }, table), check);
  }
  g.restart.onclick = start;
  start();
})();

/* ---------- Exercise: expected values ---------- */
IP.expected('expected-pointops', function (img) {
  var src = dull(IP.grayOf(img)), s = IP.stats(src.data);
  var stretched = IP.applyLut(src, IP.stretchLut(s.min, s.max));
  var mine = IP.applyLut(src, IP.equalizeLut(src)), cv = IP.applyLut(src, IP.cvEqualizeLut(src));
  var diff = 0, worst = 0;
  for (var i = 0; i < mine.data.length; i++) {
    var d = Math.abs(mine.data[i] - cv.data[i]);
    if (d) diff++;
    if (d > worst) worst = d;
  }
  var m = function (g) { return IP.fmt.round2(IP.stats(g.data).mean); };
  return [
    ['<code>print(lo, hi, …levels used)</code>', s.min + ' ' + s.max + ' ' + IP.distinct(stretched.data).length],
    ['<code>print(round(mine.mean(), 2), round(cv.mean(), 2))</code>', m(mine) + ' ' + m(cv)],
    ['<code>print(…pixels that differ, biggest difference)</code>', diff + ' ' + worst]
  ];
});
