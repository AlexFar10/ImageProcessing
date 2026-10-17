// Section 3: quantization and dithering.

// Apply one of the demo methods with the given number of levels.
function applyMethod(gray, method, levels) {
  if (method === 'quantize') return IP.quantize(gray, levels);
  if (method === 'nearest') return IP.nearestLevel(gray, levels);
  if (method === 'random') return IP.randomDither(gray, levels, 7);
  return IP.floydSteinberg(gray, levels);
}
var GRADIENT = IP.gradient(256, 24);

/* ---------- Try it: the bits slider ---------- */
(function () {
  var bits = document.getElementById('q-bits'), method = document.getElementById('q-method');
  function update() {
    var k = Number(bits.value), levels = Math.pow(2, k);
    document.getElementById('q-bits-val').textContent = k;
    var out = applyMethod(IP.gray(), method.value, levels);
    IP.draw(document.getElementById('q-image'), out);
    IP.draw(document.getElementById('q-gradient-orig'), GRADIENT);
    IP.draw(document.getElementById('q-gradient'), applyMethod(GRADIENT, method.value, levels));
    var used = IP.distinct(out.data);
    var text = k + (k === 1 ? ' bit' : ' bits') + ' → 2^' + k + ' = ' + levels + ' levels. ';
    text += used.length <= 16 ? 'Values in the picture: ' + IP.fmt.array(used) : 'The picture uses ' + used.length + ' different values.';
    document.getElementById('q-readout').textContent = text;
  }
  bits.addEventListener('input', update);
  method.addEventListener('change', update);
  IP.ready(update);
  IP.onChange(update);
})();

/* ---------- Try it: Floyd–Steinberg step by step ---------- */
(function () {
  var ROWS = 6, COLS = 8;
  var f, k, last;
  var table = document.getElementById('fs-grid'), explain = document.getElementById('fs-explain');
  var shares = [[0, 1, 7], [1, -1, 3], [1, 0, 5], [1, 1, 1]]; // [down, right, sixteenths]

  function reset() {
    f = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) f.push(30 + 25 * c + 4 * r);
    k = 0; last = null;
    render();
  }

  function step() {
    if (k >= ROWS * COLS) return;
    var r = Math.floor(k / COLS), c = k % COLS;
    var old = f[k], nw = IP.roundHalfEven(old / 255) * 255, err = old - nw;
    f[k] = nw;
    last = { r: r, c: c, old: old, nw: nw, err: err, gets: [] };
    shares.forEach(function (s) {
      var rr = r + s[0], cc = c + s[1];
      if (rr < ROWS && cc >= 0 && cc < COLS) {
        f[rr * COLS + cc] += err * s[2] / 16;
        last.gets.push({ r: rr, c: cc, amount: err * s[2] / 16, w: s[2] });
      }
    });
    k++;
  }

  function n1(x) { return (Math.round(x * 10) / 10).toFixed(1); }

  function render() {
    table.innerHTML = '';
    for (var r = 0; r < ROWS; r++) {
      var tr = IP.el('tr');
      for (var c = 0; c < COLS; c++) {
        var i = r * COLS + c, v = f[i], done = i < k;
        var shade = Math.max(0, Math.min(255, Math.round(v)));
        var td = IP.el('td', { text: done ? String(v) : n1(v) });
        td.style.background = 'rgb(' + shade + ',' + shade + ',' + shade + ')';
        td.style.color = shade > 140 ? '#000' : '#fff';
        if (last && last.r === r && last.c === c) td.className = 'current';
        if (last) last.gets.forEach(function (g) {
          if (g.r === r && g.c === c) {
            td.className = 'target';
            td.appendChild(IP.el('small', { text: (g.amount >= 0 ? '+' : '') + n1(g.amount) }));
          }
        });
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    if (!last) {
      explain.innerHTML = '≥ 127.5 → 255, otherwise → 0.';
    } else {
      var parts = last.gets.map(function (g) { return g.w + '/16 × ' + n1(last.err) + ' = ' + n1(g.amount); });
      explain.innerHTML = '<b>Pixel (' + last.r + ', ' + last.c + ')</b>: value ' + n1(last.old) + ' → nearest level <b>' + last.nw + '</b>.<br>' +
        'Error = ' + n1(last.old) + ' − ' + last.nw + ' = <b>' + n1(last.err) + '</b>.<br>' +
        (parts.length ? 'Passed on: ' + parts.join(', ') + '.' : 'No neighbours left.') +
        (k >= ROWS * COLS ? '<br><b>Done.</b>' : '');
    }
  }

  document.getElementById('fs-step').onclick = function () { step(); render(); };
  document.getElementById('fs-row').onclick = function () { do { step(); } while (k % COLS !== 0); render(); };
  document.getElementById('fs-all').onclick = function () { while (k < ROWS * COLS) step(); render(); };
  document.getElementById('fs-reset').onclick = reset;
  reset();
})();

/* ---------- Game: live code quantize(gray, levels) ---------- */
Games.liveCode(document.getElementById('game-live-quantize'), {
  title: 'quantize(gray, levels)',
  task: '',
  parts: ['q = quantize(gray, ', { id: 'levels', type: 'select', value: 4, options: [2, 3, 4, 8, 16, 32, 64, 256] }, ')\nprint(np.unique(q))'],
  render: function (v, out) {
    var q = IP.quantize(IP.gray(), v.levels);
    out.append(IP.el('div', { class: 'grid-2' }, IP.figure(q, ''), IP.figure(IP.quantize(GRADIENT, v.levels), '')));
    var used = IP.distinct(q.data);
    var printed = used.length <= 16 ? IP.fmt.array(used) : 'an array of ' + used.length + ' values';
    var why = 'Δ = 256 / ' + v.levels + ' = ' + (256 / v.levels).toFixed(2).replace(/\.00$/, '') + ': every pixel moves to the middle of its box.';
    if (used.length < v.levels) why += ' Only ' + used.length + ' of the ' + v.levels + ' levels appear, because no pixel falls in the other boxes.';
    return { kind: 'info', msg: 'Prints ' + printed, why: why };
  }
});

/* ---------- Game: guess how many gray levels ---------- */
Games.predict(document.getElementById('game-guess-levels'), {
  title: 'Count the gray levels',
  task: '',
  rounds: function () {
    return Games.shuffle([2, 4, 8, 16]).map(function (L) {
      var options = ['2', '4', '8', '16'];
      return {
        question: 'How many gray levels?',
        figure: function () {
          return IP.el('div', { class: 'grid-2' }, IP.figure(IP.quantize(IP.gray(), L), ''),
            IP.figure(IP.quantize(GRADIENT, L), ''));
        },
        options: options,
        answer: options.indexOf(String(L)),
        explain: 'It has ' + L + ' levels: count the bands in the gradient strip. The histogram shows one spike per level.',
        reveal: function (out) {
          out.append(IP.el('figure', { class: 'figure' }, IP.histogramCanvas(IP.quantize(IP.gray(), L)), IP.el('figcaption', { text: 'histogram of the picture' })));
        }
      };
    });
  }
});

/* ---------- Game: put the Floyd–Steinberg loop in order ---------- */
var afterNew = 'Both lines need new, so they come right after the rounding line.';
var below = 'This line touches row y + 1, so it belongs inside "if y + 1 < h:".';
Games.orderLines(document.getElementById('game-order-fs'), {
  title: 'Order the Floyd–Steinberg loop',
  lines: [
    { text: 'for y in range(h):', hint: 'The outer loop goes over the rows (y), the inner one over the columns (x).' },
    { text: '    for x in range(w):', hint: 'The outer loop goes over the rows (y), the inner one over the columns (x).' },
    { text: '        old = f[y, x]', hint: 'Start each pixel by reading its current value: old = f[y, x].' },
    { text: '        new = np.round(old / step) * step', hint: 'Rounding needs old, so it comes right after reading old.' },
    { text: '        f[y, x] = new', group: 'after-new', hint: afterNew },
    { text: '        err = old - new', group: 'after-new', hint: afterNew },
    { text: '        if x + 1 < w: f[y, x + 1] += err * 7 / 16', hint: 'Spread the error after computing err: first the right neighbour, then the row below.' },
    { text: '        if y + 1 < h:', hint: 'The three lines for the row below come after this check.' },
    { text: '            if x > 0: f[y + 1, x - 1] += err * 3 / 16', group: 'below', hint: below },
    { text: '            f[y + 1, x] += err * 5 / 16', group: 'below', hint: below },
    { text: '            if x + 1 < w: f[y + 1, x + 1] += err * 1 / 16', group: 'below', hint: below }
  ],
  explain: 'Read old, round it, store new, compute the error, spread it: right first, then the row below. Lines with the same job may swap places.'
});

/* ---------- Game: fill in the four weights ---------- */
var sixteenths = ['1', '3', '5', '7'];
Games.fillBlanks(document.getElementById('game-fill-fs'), {
  title: 'Where does the error go?',
  task: '',
  parts: [
    'err = old - new\nif x + 1 < w: f[y, x + 1] += err * ',
    { answer: '7', options: sixteenths, hint: 'The pixel on the right is processed next, so it gets the biggest share.' },
    ' / 16\nif y + 1 < h:\n    if x > 0: f[y + 1, x - 1] += err * ',
    { answer: '3', options: sixteenths, hint: 'Below-left gets 3/16.' },
    ' / 16\n    f[y + 1, x] += err * ',
    { answer: '5', options: sixteenths, hint: 'Straight below is the second-closest neighbour: it gets 5/16.' },
    ' / 16\n    if x + 1 < w: f[y + 1, x + 1] += err * ',
    { answer: '1', options: sixteenths, hint: 'Below-right gets the smallest share, 1/16.' },
    ' / 16'
  ],
  explain: '7 + 3 + 5 + 1 = 16: the whole error is passed on, so the average brightness is kept.',
  onCorrect: function (out) {
    out.append(IP.el('div', { class: 'grid-2' }, IP.figure(IP.floydSteinberg(IP.gray(), 2), ''),
      IP.figure(IP.floydSteinberg(GRADIENT, 2), '')));
  }
});

/* ---------- Game: spot the bug (error sent to the wrong neighbour) ---------- */
Games.spotBug(document.getElementById('game-bug-fs'), {
  title: 'Wrong neighbour',
  task: '',
  lines: [
    'def floyd_steinberg(gray, levels=2):',
    '    f = gray.astype(np.float64)',
    '    step = 255 / (levels - 1)',
    '    h, w = f.shape',
    '    for y in range(h):',
    '        for x in range(w):',
    '            old = f[y, x]',
    '            new = np.round(old / step) * step',
    '            f[y, x] = new',
    '            err = old - new',
    '            if x + 1 < w: f[y, x + 1] += err * 7 / 16',
    '            if y + 1 < h:',
    '                if x > 0: f[y, x - 1] += err * 3 / 16',
    '                f[y + 1, x] += err * 5 / 16',
    '                if x + 1 < w: f[y + 1, x + 1] += err * 1 / 16',
    '    return np.clip(f, 0, 255).astype(np.uint8)'
  ],
  bug: 12,
  hints: {
    10: 'f[y, x + 1] is the next pixel on the right: correct.',
    13: 'f[y + 1, x] is straight below: correct.',
    14: 'f[y + 1, x + 1] is below-right: correct.',
    7: 'Rounding to the nearest level is right.',
    9: 'old - new is the right error.'
  },
  explain: 'f[y, x - 1] is the pixel on the left, which is already finished. Its 3/16 share arrives too late: it only ' +
    'nudges a finished pixel (so it is no longer pure black or white) and the row below never gets it. It should be f[y + 1, x - 1] (below-left).',
  show: function (out) {
    var gray = IP.gray(), wrong = IP.floydSteinberg(gray, 2, 'bug-left'), right = IP.floydSteinberg(gray, 2);
    var info = function (g) { return IP.distinct(g.data).length + ' different values'; };
    out.append(IP.el('div', { class: 'grid-2' },
      IP.el('div', {}, IP.figure(wrong, 'bug: ' + info(wrong)),
        IP.figure(IP.floydSteinberg(GRADIENT, 2, 'bug-left'), '')),
      IP.el('div', {}, IP.figure(right, 'correct: ' + info(right)),
        IP.figure(IP.floydSteinberg(GRADIENT, 2), ''))));
  }
});

/* ---------- Exercise: expected values ---------- */
IP.expected('expected-quant', function (img) {
  var gray = IP.grayOf(img);
  var q4 = IP.quantize(gray, 4), fs = IP.floydSteinberg(gray, 2);
  var m = function (g) { return IP.fmt.round2(IP.stats(g.data).mean); };
  var white = 0;
  for (var i = 0; i < fs.data.length; i++) if (fs.data[i] === 255) white++;
  return [
    ['<code>print(np.unique(q4), round(q4.mean(), 2))</code>', IP.fmt.array(IP.distinct(q4.data)) + ' ' + m(q4)],
    ['<code>print(np.unique(fs), round(fs.mean(), 2))</code>', IP.fmt.array(IP.distinct(fs.data)) + ' ' + m(fs)],
    ['<code>print(round(gray.mean(), 2), np.count_nonzero(fs == 255))</code>', m(gray) + ' ' + white]
  ];
});
