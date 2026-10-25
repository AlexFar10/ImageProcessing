// Section 5: binarization (lab: histograms and binarization).

// The valley between the two biggest peaks of a histogram, or null if there is no clear one.
// Returns { lo, hi, best }: any T from lo to hi counts as "in the valley".
function findValley(hist) {
  var sm = hist.map(function (v, i) {   // smooth with a window of 9 levels
    var s = 0, n = 0;
    for (var k = i - 4; k <= i + 4; k++) if (k >= 0 && k < 256) { s += hist[k]; n++; }
    return s / n;
  });
  var p1 = 0;
  for (var i = 1; i < 256; i++) if (sm[i] > sm[p1]) p1 = i;
  var p2 = -1;
  for (i = 0; i < 256; i++) if (Math.abs(i - p1) >= 40 && (p2 < 0 || sm[i] > sm[p2])) p2 = i;
  if (p2 < 0 || sm[p2] < 0.15 * sm[p1]) return null;
  var a = Math.min(p1, p2), b = Math.max(p1, p2), best = a;
  for (i = a; i <= b; i++) if (sm[i] < sm[best]) best = i;
  var limit = sm[best] + 0.35 * (Math.min(sm[p1], sm[p2]) - sm[best]);
  var lo = best, hi = best;
  while (lo > a && sm[lo - 1] <= limit) lo--;
  while (hi < b && sm[hi + 1] <= limit) hi++;
  return { lo: lo, hi: hi, best: best, peaks: [a, b] };
}

/* ---------- Demo: one threshold ---------- */
(function () {
  var t = document.getElementById('b-t'), inv = document.getElementById('b-inv');
  function update() {
    var T = Number(t.value), gray = IP.gray(), out = IP.threshold(gray, T, inv.checked);
    document.getElementById('b-t-val').textContent = T;
    IP.drawHistogram(document.getElementById('b-hist'), IP.histogram(gray),
      { band: inv.checked ? [0, T + 1] : [T + 1, 256], line: T, clipTallest: true });
    IP.draw(document.getElementById('b-image'), out);
    var white = 0;
    for (var i = 0; i < out.data.length; i++) if (out.data[i]) white++;
    document.getElementById('b-stats').textContent = 'shaded part → white · ' + Math.round(100 * white / out.data.length) + '% white';
  }
  t.addEventListener('input', update);
  inv.addEventListener('input', update);
  IP.ready(update);
  IP.onChange(update);
})();

/* ---------- Game: live cv2.threshold ---------- */
Games.liveCode(document.getElementById('game-live-threshold'), {
  title: 'cv2.threshold',
  task: '',
  parts: [
    'T, binary = cv2.threshold(gray, ', { id: 't', type: 'range', value: 128, min: 0, max: 255, label: 'T' }, ', 255, ',
    { id: 'type', type: 'select', value: 'bin', label: 'type', options: [{ value: 'bin', label: 'cv2.THRESH_BINARY' }, { value: 'inv', label: 'cv2.THRESH_BINARY_INV' }] }, ')\nprint(np.count_nonzero(binary))'
  ],
  render: function (v, out) {
    var img = IP.threshold(IP.gray(), v.t, v.type === 'inv'), white = 0;
    for (var i = 0; i < img.data.length; i++) if (img.data[i]) white++;
    out.append(IP.el('div', { style: 'max-width:420px' }, IP.figure(img, '')));
    return { kind: 'info', msg: 'Prints ' + white,
      why: v.type === 'inv' ? 'INV: pixels darker than or equal to T become white.' : 'Pixels brighter than T become white (255).' };
  }
});

/* ---------- Game: spot the bug (white and black swapped) ---------- */
Games.spotBug(document.getElementById('game-bug-where'), {
  title: 'Inside out',
  task: 'The sky should be white. Click the wrong line.',
  lines: [
    'gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)',
    'T = 128',
    'binary = np.where(gray > T, 0, 255).astype(np.uint8)',
    'cv2.imwrite("binary.png", binary)'
  ],
  bug: 2,
  hints: { 0: 'Converting to gray first is right.', 1: '128 is a fine threshold here.', 3: 'Saving is fine.' },
  explain: 'np.where(condition, if_true, if_false): bright pixels (gray > T) should get 255. This is THRESH_BINARY_INV by accident.',
  show: function (out) {
    var gray = IP.gray();
    out.append(IP.el('div', { class: 'grid-2' }, IP.figure(IP.threshold(gray, 128, true), 'bug'), IP.figure(IP.threshold(gray, 128), 'fixed: np.where(gray > T, 255, 0)')));
  }
});

/* ---------- Game: fill in adaptiveThreshold ---------- */
// Any odd whole number from 3 up is a valid blockSize
function oddBlock(v) { return /^\d+$/.test(v) && Number(v) >= 3 && Number(v) % 2 === 1; }
Games.fillBlanks(document.getElementById('game-fill-adaptive'), {
  title: 'Adaptive threshold',
  task: '<code>dark</code> is the image with its left side in shadow.',
  parts: [
    'binary = cv2.adaptiveThreshold(dark, ', { answer: '255', options: ['1', '128', '255'], hint: 'The value given to white pixels: 255.' },
    ',\n    cv2.', { id: 'method', answer: ['ADAPTIVE_THRESH_MEAN_C', 'ADAPTIVE_THRESH_GAUSSIAN_C'],
      options: ['ADAPTIVE_THRESH_MEAN_C', 'ADAPTIVE_THRESH_GAUSSIAN_C', 'THRESH_BINARY'],
      hint: 'First the adaptive method (MEAN_C or GAUSSIAN_C), then the threshold type.' },
    ', cv2.THRESH_BINARY,\n    ', { id: 'block', accept: oddBlock, size: 4, hint: 'blockSize must be an odd number (3, 5, 7, …), so the pixel sits in the middle of its window.' },
    ', 10)'
  ],
  explain: 'Both methods work: MEAN_C uses the plain mean of the window, GAUSSIAN_C gives the closer pixels more weight. ' +
    'Any odd blockSize from 3 up is valid: small windows follow small details, big ones follow the light. Then C = 10.',
  onCorrect: function (out, v) {
    var dark = IP.unevenLight(IP.gray()), block = Math.min(Number(v.block), 151);   // keep it quick to draw
    var method = v.method === 'ADAPTIVE_THRESH_MEAN_C' ? 'mean' : 'gaussian';
    out.append(IP.el('div', { class: 'grid-2' }, IP.figure(dark, 'dark'),
      IP.figure(IP.adaptive(dark, method, block, 10), (method === 'mean' ? 'MEAN_C' : 'GAUSSIAN_C') + ', blockSize ' + v.block)));
  }
});

/* ---------- Game (no code): click the valley ---------- */
// A picture made for this game: bright coins on a dark table, so the histogram
// has two clear peaks. Seeded noise, so it is the same picture every time.
function coinsImage() {
  var w = 320, h = 240, g = IP.makeGray(w, h), seed = 7;
  function rand() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function noise() { return (rand() + rand() + rand() - 1.5) * 24; }   // roughly -36…36
  var coins = [[70, 70, 38], [190, 60, 30], [260, 160, 42], [120, 170, 34], [215, 130, 18]];
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var on = coins.some(function (c) { return (x - c[0]) * (x - c[0]) + (y - c[1]) * (y - c[1]) < c[2] * c[2]; });
    var v = Math.round((on ? 180 : 70) + noise());
    g.data[y * w + x] = v < 0 ? 0 : v > 255 ? 255 : v;
  }
  return g;
}
(function () {
  var g = Games.shell(document.getElementById('game-click-valley'), 'On the histogram', 'Where would you put T?',
    'Coins on a table. Click the histogram where T should go.');
  var gray = coinsImage(), hist = IP.histogram(gray), valley = findValley(hist);
  function start() {
    g.clear();
    var canvas = IP.el('canvas', { style: 'width:100%;cursor:crosshair;background:var(--surface);border:1px solid var(--border);border-radius:8px' });
    var result = IP.el('div', { class: 'grid-2', style: 'margin-top:.8rem' }, IP.figure(gray, 'the picture'));
    IP.drawHistogram(canvas, hist, { clipTallest: true });
    canvas.onclick = function (e) {
      var r = canvas.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width * 512;       // canvas is 512 wide, plot from 8 to 504
      var T = Math.max(0, Math.min(255, Math.floor((x - 8) / 496 * 256)));
      IP.drawHistogram(canvas, hist, { clipTallest: true, line: T, band: [T + 1, 256] });
      result.innerHTML = '';
      result.append(IP.figure(gray, 'the picture'), IP.figure(IP.threshold(gray, T), 'T = ' + T));
      if (T >= valley.lo && T <= valley.hi) g.say('good', 'T = ' + T + ': in the valley.', 'Between the two peaks (' + valley.peaks[0] + ' and ' + valley.peaks[1] + '): the table turns black and the coins white.');
      else if (T < valley.lo) g.say('bad', 'T = ' + T + ': too far left.', T < valley.peaks[0] ? 'You are before the first peak: almost everything turns white.' : 'You are still on the dark peak (the table): part of it turns white. Move right, to the lowest point.');
      else g.say('bad', 'T = ' + T + ': too far right.', T > valley.peaks[1] ? 'You are past the last peak: almost everything turns black.' : 'You are on the bright peak (the coins): parts of them turn black. Move left, to the lowest point.');
    };
    g.body.innerHTML = '';
    g.body.append(canvas, result);
  }
  g.restart.onclick = start;
  start();
})();

/* ---------- Game (no code): which T made this? ---------- */
Games.predict(document.getElementById('game-which-t'), {
  title: 'Which T?',
  task: '',
  rounds: function () {
    var gray = IP.gray();
    return Games.shuffle([60, 128, 200]).map(function (T) {
      var why = T === 60 ? 'Low T: most pixels are brighter than 60, so most is white.'
        : T === 200 ? 'High T: only the brightest pixels pass 200.' : 'A middle T: about half of the image is white.';
      return Games.pickRound({
        question: 'Which T made this picture?',
        figure: function () { return IP.el('div', { style: 'max-width:360px' }, IP.canvasOf(IP.threshold(gray, T))); },
        explain: why
      }, ['T = ' + T].concat([60, 128, 200].filter(function (o) { return o !== T; }).map(function (o) { return 'T = ' + o; })));
    });
  }
});

/* ---------- Exercise: expected values ---------- */
IP.expected('expected-binarization', function (img) {
  var gray = IP.grayOf(img), dark = IP.unevenLight(gray);
  function white(g) { var n = 0; for (var i = 0; i < g.data.length; i++) if (g.data[i]) n++; return n; }
  return [
    ['<code>print(np.count_nonzero(binary), np.array_equal(binary, mine))</code>', white(IP.threshold(gray, 128)) + ' True'],
    ['<code>print(np.count_nonzero(one), np.count_nonzero(adapt))</code>', white(IP.threshold(dark, 128)) + ' ' + white(IP.adaptiveMean(dark, 31, 10))]
  ];
});
