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

/* ---------- Demo: Sobel ---------- */
(function () {
  var pick = Filter.picker('edges');
  document.getElementById('ke-controls').prepend(IP.el('label', {}, 'Image ', pick));
  var bit8 = document.getElementById('ke-8bit');
  function what() { return document.querySelector('input[name=ke-what]:checked').value; }
  function draw() {
    if (!Filter.loaded()) return;
    var gray = Filter.image(pick.value), f = Filter.fromGray(gray), w = what();
    var dx = Filter.sobelX(f), dy = Filter.sobelY(f);
    if (bit8.checked) { dx = Filter.saturate(dx); dy = Filter.saturate(dy); }   // CV_8U: negatives become 0
    var shown = w === 'dx' ? dx : w === 'dy' ? dy : Filter.make(f.width, f.height);
    if (w === 'mag') for (var i = 0; i < shown.data.length; i++) shown.data[i] = Math.hypot(dx.data[i], dy.data[i]);
    IP.draw(document.getElementById('ke-src'), gray);
    IP.draw(document.getElementById('ke-dst'), Filter.toGray(shown, 'abs'));
    var depth = bit8.checked ? 'cv2.CV_8U' : 'cv2.CV_32F';
    var code = w === 'dx' ? 'out = cv2.Sobel(gray, ' + depth + ', 1, 0)' : w === 'dy' ? 'out = cv2.Sobel(gray, ' + depth + ', 0, 1)'
      : 'gx = cv2.Sobel(gray, ' + depth + ', 1, 0)\ngy = cv2.Sobel(gray, ' + depth + ', 0, 1)\nout = cv2.magnitude(gx.astype(np.float32), gy.astype(np.float32))';
    document.getElementById('ke-code').innerHTML = IP.highlight(code);
    document.getElementById('ke-cap').textContent = (w === 'dx' ? 'dx: vertical edges' : w === 'dy' ? 'dy: horizontal edges' : 'magnitude: all edges') +
      (bit8.checked ? ' (8-bit: only dark → bright survives)' : ' (absolute value)');
  }
  var redraw = Filter.onFrame(draw);
  pick.addEventListener('input', redraw);
  bit8.addEventListener('input', redraw);
  document.querySelectorAll('input[name=ke-what]').forEach(function (r) { r.addEventListener('input', redraw); });
  Filter.ready(draw);
  IP.onChange(draw);
})();

/* ---------- Demo: Laplacian and sharpening ---------- */
(function () {
  var pick = Filter.picker('image');
  document.getElementById('kf-controls').prepend(IP.el('label', {}, 'Image ', pick));
  var kEl = document.getElementById('kf-k');
  function mode() { return document.querySelector('input[name=kf-mode]:checked').value; }
  function draw() {
    if (!Filter.loaded()) return;
    var m = mode(), gray = Filter.image(pick.value), f = Filter.fromGray(gray), k = Number(kEl.value), out, code, cap;
    document.getElementById('kf-k-label').hidden = m !== 'unsharp';
    document.getElementById('kf-k-val').textContent = k;
    if (m === 'lap') {
      out = Filter.toGray(Filter.laplacian(f), 'abs');
      code = 'lap = cv2.Laplacian(gray, cv2.CV_32F)\nout = np.clip(np.abs(lap), 0, 255).astype(np.uint8)';
      cap = 'Laplacian: only the edges, on black';
    } else if (m === 'sharp') {
      out = Filter.toGray(Filter.add(f, Filter.laplacian(f), -1));
      code = 'lap = cv2.Laplacian(gray, cv2.CV_32F)\nout = np.clip(gray - lap, 0, 255).astype(np.uint8)';
      cap = 'f − Laplacian: sharper';
    } else {
      var blur = Filter.saturate(Filter.gaussian(f, 5, 'reflect'));     // cv2.GaussianBlur gives uint8
      out = Filter.toGray(Filter.add(f, Filter.add(f, blur, -1), k));   // f + k * (f - blur)
      code = 'blur = cv2.GaussianBlur(gray, (0, 0), 5)\nmask = gray.astype(np.float32) - blur\nout = np.clip(gray + ' + k + ' * mask, 0, 255).astype(np.uint8)';
      cap = 'k = ' + k + (k > 1 ? ': highboost' : k === 1 ? ': unsharp masking' : '');
    }
    IP.draw(document.getElementById('kf-src'), gray);
    IP.draw(document.getElementById('kf-dst'), out);
    document.getElementById('kf-code').innerHTML = IP.highlight(code);
    document.getElementById('kf-cap').textContent = cap;
  }
  var redraw = Filter.onFrame(draw);
  [pick, kEl].forEach(function (el) { el.addEventListener('input', redraw); });
  document.querySelectorAll('input[name=kf-mode]').forEach(function (r) { r.addEventListener('input', redraw); });
  Filter.ready(draw);
  IP.onChange(draw);
})();

/* ---------- Code: fill in the blanks ---------- */
Games.fillBlanks(document.getElementById('game-fill-sobel'), {
  title: 'Sobel and magnitude',
  task: '',
  parts: [
    'gx = cv2.Sobel(gray, cv2.', { answer: ['CV_32F', 'CV_64F'], options: ['CV_8U', 'CV_32F', 'CV_64F'], hint: 'An 8-bit result cuts every negative value to 0: half of the edges would be lost.' },
    ', 1, 0)\ngy = cv2.Sobel(gray, cv2.CV_32F, ', { answer: '0, 1', options: ['1, 0', '0, 1', '1, 1'], hint: 'dx = 0, dy = 1: the derivative from top to bottom.' },
    ')\nmag = cv2.', { answer: 'magnitude', options: ['add', 'absdiff', 'magnitude'], hint: 'magnitude computes √(gx² + gy²) for every pixel.' },
    '(gx, gy)'
  ],
  explain: 'Float output keeps the negative values (CV_32F or CV_64F both work), (0, 1) is the vertical derivative, magnitude combines both directions.',
  onCorrect: function (out) {
    var f = Filter.fromGray(IP.gray()), gx = Filter.sobelX(f), gy = Filter.sobelY(f), mag = Filter.make(f.width, f.height);
    for (var i = 0; i < mag.data.length; i++) mag.data[i] = Math.hypot(gx.data[i], gy.data[i]);
    out.append(IP.el('div', { class: 'grid-3' },
      IP.figure(Filter.toGray(gx, 'abs'), '|gx|'), IP.figure(Filter.toGray(gy, 'abs'), '|gy|'), IP.figure(Filter.toGray(mag), 'mag')));
  }
});
Games.fillBlanks(document.getElementById('game-fill-sharpen'), {
  title: 'Sharpen and highboost',
  task: '',
  parts: [
    'lap = cv2.Laplacian(gray, cv2.CV_32F)\nsharp = np.clip(gray ', { answer: '-', options: ['+', '-'], hint: 'The kernel has −4 in the centre, so c = −1: subtract the Laplacian.' },
    ' lap, 0, 255).astype(np.uint8)\n\nblur = cv2.GaussianBlur(gray, (0, 0), 5)\nmask = gray.astype(np.float32) ', { answer: '-', options: ['+', '-', '*'], hint: 'The mask is the image minus its blur: only the details are left.' },
    ' blur\nhigh = np.clip(gray + ', { answer: '4.5', options: ['0', '1', '4.5'], hint: 'k = 1 is unsharp masking; highboost needs k > 1.' },
    ' * mask, 0, 255).astype(np.uint8)   # highboost'
  ],
  explain: 'Subtract the Laplacian (c = −1), the mask is image − blur, and k = 4.5 > 1 is highboost (the lecture example).',
  onCorrect: function (out) {
    var f = Filter.fromGray(IP.gray()), blur = Filter.saturate(Filter.gaussian(f, 5, 'reflect'));
    out.append(IP.el('div', { class: 'grid-3' }, IP.figure(IP.gray(), 'gray'),
      IP.figure(Filter.toGray(Filter.add(f, Filter.laplacian(f), -1)), 'sharp'),
      IP.figure(Filter.toGray(Filter.add(f, Filter.add(f, blur, -1), 4.5)), 'high')));
  }
});

/* ---------- Code: what does it print? ---------- */
var ROW = 'row = np.array([10, 10, 10, 200, 200, 200])\n';
var SOBEL = 'k = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])\n';
Games.predict(document.getElementById('game-print7'), {
  title: 'What does it print?',
  task: '',
  rounds: function () {
    return Games.shuffle([
      Games.pickRound({ code: ROW + 'print(np.diff(row))', explain: 'np.diff gives f(x+1) − f(x): 190 only where 10 meets 200.' },
        ['[  0   0 190   0   0]', '[  0 190   0]', '[ 10  10 200 200]']),
      Games.pickRound({ code: ROW + 'print(row[2:] + row[:-2] - 2 * row[1:-1])', explain: 'f(x+1) + f(x−1) − 2f(x): +190 just before the edge, −190 just after it.' },
        ['[   0  190 -190    0]', '[  0 190   0   0]', '[   0 -190  190    0]']),
      Games.pickRound({ code: SOBEL + 'print(k.sum())', explain: 'The coefficients cancel out, so a flat area gives 0.' }, ['0', '6', '-6', '1']),
      Games.pickRound({ code: SOBEL + 'window = np.array([[10, 10, 200]] * 3, np.float32)\nprint((window * k).sum())',
        explain: '(200 + 2·200 + 200) − (10 + 2·10 + 10) = 800 − 40 = 760.' }, ['760.0', '190.0', '255.0', '0.0']),
      Games.pickRound({ code: 'g = np.array([[200, 200, 10, 10]] * 3, np.uint8)\nprint(cv2.Sobel(g, cv2.CV_8U, 1, 0)[1])',
        explain: 'Bright to dark gives −760; 8-bit output cuts it to 0, so the edge disappears.' }, ['[0 0 0 0]', '[  0 255 255   0]', '[  0 760 760   0]']),
      Games.pickRound({ code: 'gx, gy = 30, 40\nprint(np.sqrt(gx ** 2 + gy ** 2))', explain: '√(900 + 1600) = √2500 = 50.' }, ['50.0', '70.0', '35.0'])
    ]);
  }
});

/* ---------- Code: which filter made this picture? ---------- */
Games.predict(document.getElementById('game-which-edge'), {
  title: 'Which filter?',
  task: '',
  rounds: function () {
    var f = Filter.fromGray(IP.gray()), gx = Filter.sobelX(f), gy = Filter.sobelY(f);
    var list = [
      ['|Sobel dx|', function () { return Filter.toGray(gx, 'abs'); }, 'Only vertical edges: fence posts, house walls, the sides of the sun.'],
      ['|Sobel dy|', function () { return Filter.toGray(gy, 'abs'); }, 'Only horizontal edges: the hill line, the roof, the top of the fence.'],
      ['magnitude √(dx² + dy²)', function () {
        var m = Filter.make(f.width, f.height);
        for (var i = 0; i < m.data.length; i++) m.data[i] = Math.hypot(gx.data[i], gy.data[i]);
        return Filter.toGray(m);
      }, 'Edges in every direction, thick and bright.'],
      ['f − Laplacian (sharpened)', function () { return Filter.toGray(Filter.add(f, Filter.laplacian(f), -1)); }, 'The whole picture is still there, only crisper: that is sharpening, not edge detection.']
    ];
    return Games.shuffle(list).map(function (item) {
      return Games.pickRound({
        question: 'Which filter made this picture?',
        figure: function () { return IP.el('div', { style: 'max-width:360px' }, IP.canvasOf(item[1]())); },
        explain: item[2]
      }, [item[0]].concat(list.filter(function (o) { return o !== item; }).map(function (o) { return o[0]; })));
    });
  }
});

/* ---------- Code: spot the bug ---------- */
Games.spotBug(document.getElementById('game-bug-8bit'), {
  title: 'Half the edges are missing',
  task: 'Only the dark-to-bright edges show up. Click the wrong line.',
  lines: [
    'gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)',
    'gx = cv2.Sobel(gray, cv2.CV_8U, 1, 0)',
    'edges = np.clip(np.abs(gx), 0, 255).astype(np.uint8)',
    'cv2.imwrite("edges.png", edges)'
  ],
  bug: 1,
  hints: { 0: 'Converting to gray first is fine.', 2: 'Taking the absolute value is the right idea, but it comes too late.', 3: 'Saving is fine.' },
  explain: 'CV_8U cuts the negative responses (bright to dark) to 0 before np.abs can see them. Use cv2.CV_32F.',
  show: function (out) {
    var gx = Filter.sobelX(Filter.fromGray(IP.gray()));
    out.append(IP.el('div', { class: 'grid-2' }, IP.figure(Filter.toGray(gx, 'clip'), 'bug: CV_8U'), IP.figure(Filter.toGray(gx, 'abs'), 'fixed: CV_32F, then abs')));
  }
});
Games.spotBug(document.getElementById('game-bug-sign'), {
  title: 'Blurrier, not sharper',
  task: 'The result looks softer than the original. Click the wrong line.',
  lines: [
    'gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)',
    'lap = cv2.Laplacian(gray, cv2.CV_32F)',
    'sharp = np.clip(gray + lap, 0, 255).astype(np.uint8)',
    'cv2.imwrite("sharp.png", sharp)'
  ],
  bug: 2,
  hints: { 0: 'Converting to gray first is fine.', 1: 'Float output keeps the negative values: fine.', 3: 'Saving is fine.' },
  explain: 'This kernel has −4 in the centre, so c = −1: sharp = gray − lap. Adding it smooths the edges instead.',
  show: function (out) {
    var f = Filter.fromGray(IP.gray()), lap = Filter.laplacian(f);
    out.append(IP.el('div', { class: 'grid-2' }, IP.figure(Filter.toGray(Filter.add(f, lap, 1)), 'bug: gray + lap'), IP.figure(Filter.toGray(Filter.add(f, lap, -1)), 'fixed: gray − lap')));
  }
});
