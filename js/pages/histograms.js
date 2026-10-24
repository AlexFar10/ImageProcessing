// Section 4: histograms.

// out = np.clip((gray - 128.0) * alpha + 128 + beta, 0, 255).astype(np.uint8)
function contrast(gray, alpha, beta) {
  return IP.mapGray(gray, function (x) { var v = (x - 128) * alpha + 128 + beta; return Math.floor(v < 0 ? 0 : v > 255 ? 255 : v); });
}
// cv2.flip(gray, 1): mirror left-right
function flipLR(gray) {
  var out = IP.makeGray(gray.width, gray.height), w = gray.width;
  for (var i = 0; i < gray.data.length; i++) {
    var r = Math.floor(i / w), c = i % w;
    out.data[i] = gray.data[r * w + (w - 1 - c)];
  }
  return out;
}
// An image next to its histogram, as one small block
function pair(img, caption) {
  return IP.el('figure', { class: 'figure' }, IP.canvasOf(img), IP.histogramCanvas(img), IP.el('figcaption', { text: caption }));
}

/* ---------- The idea: three examples ---------- */
(function () {
  function show() {
    var gray = IP.gray(), box = document.getElementById('reading-examples');
    box.innerHTML = '';
    box.append(pair(IP.cvAdd(gray, -90), 'darker: pixels pile up on the left'),
      pair(contrast(gray, 0.35, 0), 'low contrast: a narrow hill'),
      pair(gray, 'the image itself'));
  }
  IP.ready(show);
  IP.onChange(show);
})();

/* ---------- Try it: brightness, contrast, negative ---------- */
(function () {
  var beta = document.getElementById('h-beta'), alpha = document.getElementById('h-alpha'), neg = document.getElementById('h-neg');
  function update() {
    var a = Number(alpha.value), b = Number(beta.value);
    document.getElementById('h-beta-val').textContent = b;
    document.getElementById('h-alpha-val').textContent = a.toFixed(1);
    var out = contrast(IP.gray(), a, b);
    if (neg.checked) out = IP.negative(out);
    IP.draw(document.getElementById('h-image'), out);
    IP.drawHistogram(document.getElementById('h-hist'), IP.histogram(out));
    var s = IP.stats(out.data);
    document.getElementById('h-stats').textContent = 'mean ' + s.mean.toFixed(1) + ' (brightness) · spread ' + s.std.toFixed(1) + ' (contrast) · min ' + s.min + ' · max ' + s.max;
    var code = 'out = np.clip((gray - 128.0) * ' + a.toFixed(1) + ' + 128 + ' + b + ', 0, 255).astype(np.uint8)';
    if (neg.checked) code += '\nout = 255 - out';
    document.getElementById('h-code').innerHTML = IP.highlight(code);
  }
  [beta, alpha, neg].forEach(function (el) { el.addEventListener('input', update); });
  // Per-channel histograms and the cumulative one (they follow the image, not the sliders)
  function channels() {
    var img = IP.color(), box = document.getElementById('h-channels');
    box.innerHTML = '';
    ['B', 'G', 'R'].forEach(function (name, k) {
      box.append(IP.el('figure', { class: 'figure', style: 'margin-bottom:.6rem' },
        IP.histogramCanvas(IP.channel(img, k)), IP.el('figcaption', { text: name + ' channel' })));
    });
    IP.drawHistogram(document.getElementById('h-cumulative'), IP.cumulative(IP.histogram(IP.gray())));
  }
  IP.ready(channels);
  IP.onChange(channels);
  document.getElementById('h-reset').onclick = function () { beta.value = 0; alpha.value = 1; neg.checked = false; update(); };
  IP.ready(update);
  IP.onChange(update);
})();

/* ---------- Game: match 6 images to 6 histograms ---------- */
Games.predict(document.getElementById('game-match-hist'), {
  title: 'Image → histogram',
  task: 'Click the histogram of this image.',
  rounds: function () {
    var gray = IP.gray();
    var versions = [
      [IP.cvAdd(gray, -90), 'Darker: everything moves left, pixels pile up at 0.'],
      [IP.cvAdd(gray, 90), 'Brighter: everything moves right, pixels pile up at 255.'],
      [contrast(gray, 0.35, 0), 'Low contrast: a narrow hill in the middle.'],
      [IP.quantize(gray, 4), 'Only 4 levels: only 4 spikes.']
    ];
    return Games.shuffle(versions).map(function (v) {
      var others = Games.shuffle(versions.filter(function (o) { return o !== v; })).slice(0, 2);
      return Games.pickRound({
        figure: function () { return IP.el('div', { style: 'max-width:360px' }, IP.canvasOf(v[0])); },
        explain: v[1]
      }, [v].concat(others).map(function (o) { return function () { return IP.histogramCanvas(o[0]); }; }));
    });
  }
});

/* ---------- Game (no code): different images, same histogram ---------- */
// Three 120 x 120 images, each exactly half gray (170) and half white (255)
function twoTone(kind) {
  var n = 120, g = IP.makeGray(n, n);
  for (var y = 0; y < n; y++) {
    for (var x = 0; x < n; x++) {
      var gray = kind === 'halves' ? x < n / 2 : kind === 'stripes' ? Math.floor(x / 15) % 2 === 0 : (Math.floor(x / 15) + Math.floor(y / 15)) % 2 === 0;
      g.data[y * n + x] = gray ? 170 : 255;
    }
  }
  return g;
}
Games.predict(document.getElementById('game-same-hist'), {
  title: 'Three pictures',
  task: '',
  rounds: function () {
    var pics = ['halves', 'stripes', 'checker'].map(twoTone);
    return [Games.pickRound({
      question: 'How do their histograms compare?',
      figure: function () {
        var framed = function (p) { var c = IP.canvasOf(p); c.style.border = '1px solid var(--border)'; return c; };
        return IP.el('div', { class: 'row-3', style: 'max-width:420px' }, framed(pics[0]), framed(pics[1]), framed(pics[2]));
      },
      explain: 'Each picture is half gray, half white: the same counts, so the same histogram.',
      reveal: function (out) { out.append(IP.el('div', { style: 'max-width:360px' }, IP.histogramCanvas(pics[0]))); }
    }, ['all three are the same', 'all three are different', 'only two are the same'])];
  }
});

/* ---------- Game: what happens if…? ---------- */
function beforeAfter(after, label) {
  return function (out) {
    out.append(IP.el('div', { class: 'grid-2' },
      IP.el('figure', { class: 'figure' }, IP.histogramCanvas(IP.gray()), IP.el('figcaption', { text: 'before: histogram of gray' })),
      IP.el('figure', { class: 'figure' }, IP.histogramCanvas(after()), IP.el('figcaption', { text: 'after: ' + label }))));
  };
}
function whatIf(code, correct, wrongs, explain, after, label) {
  var options = Games.shuffle([correct].concat(wrongs));
  return { code: code, question: 'What happens to the histogram?', options: options, answer: options.indexOf(correct),
    explain: explain, reveal: beforeAfter(after, label) };
}
Games.predict(document.getElementById('game-what-if'), {
  title: 'What happens if…?',
  task: '',
  rounds: function () {
    return Games.shuffle([
      whatIf('out = cv2.add(gray, 60)', 'It moves to the right',
        ['It moves to the left', 'It gets wider', 'It is mirrored'],
        'Every pixel gets 60 brighter, so every bar moves 60 places right. Bars that would pass 255 pile up at 255.',
        function () { return IP.cvAdd(IP.gray(), 60); }, 'cv2.add(gray, 60)'),
      whatIf('out = 255 - gray', 'It is mirrored left to right',
        ['It moves to the right', 'It does not change', 'It gets narrower'],
        'Dark becomes bright and bright becomes dark: the bar at value v moves to 255 − v.',
        function () { return IP.negative(IP.gray()); }, '255 - gray'),
      whatIf('out = gray // 2', 'It is squeezed into the left half',
        ['It moves to the right', 'It does not change', 'It gets wider'],
        'Every value is halved, so everything lands between 0 and 127: darker and narrower.',
        function () { return IP.mapGray(IP.gray(), function (x) { return Math.floor(x / 2); }); }, 'gray // 2'),
      whatIf('out = cv2.flip(gray, 1)   # mirror the picture left-right', 'It does not change at all',
        ['It is mirrored left to right', 'It moves to the right', 'It gets narrower'],
        'Flipping moves pixels to other places but keeps their values. A histogram ignores where pixels are.',
        function () { return flipLR(IP.gray()); }, 'cv2.flip(gray, 1)'),
      whatIf('out = quantize(gray, 4)', 'Only 4 spikes are left',
        ['It moves to the right', 'It gets wider', 'It does not change'],
        'Every pixel moves to one of 4 values (32, 96, 160, 224), so all the counts gather in 4 bars.',
        function () { return IP.quantize(IP.gray(), 4); }, 'quantize(gray, 4)')
    ]);
  }
});

/* ---------- Game: live code cv2.add and 255 - gray ---------- */
Games.liveCode(document.getElementById('game-live-hist'), {
  title: 'cv2.add and negative',
  task: '',
  parts: [
    'out = cv2.add(gray, ', { id: 'v', type: 'range', value: 50, min: -150, max: 150, label: 'value' }, ')\n',
    { id: 'neg', type: 'select', value: 'off', label: 'negative line', options: [{ value: 'off', label: '# out = 255 - out   (switched off)' }, { value: 'on', label: 'out = 255 - out' }] },
    '\nhist = cv2.calcHist([out], [0], None, [256], [0, 256])'
  ],
  render: function (v, out) {
    var img = IP.cvAdd(IP.gray(), v.v);
    if (v.neg === 'on') img = IP.negative(img);
    out.append(IP.el('div', { class: 'grid-2' }, IP.figure(img, ''),
      IP.el('figure', { class: 'figure' }, IP.histogramCanvas(img), IP.el('figcaption', { text: 'hist' }))));
    var h = IP.histogram(img);
    var why = 'cv2.add saturates: values that would go past 0 or 255 stop there, which makes the tall bar at the edge.';
    if (v.neg === 'on') why += ' The negative then mirrors everything, so that pile changes sides.';
    return { kind: 'info', msg: 'Pixels at 0: ' + h[0] + ' · pixels at 255: ' + h[255], why: why };
  }
});

/* ---------- Game: fill in the per-channel loop ---------- */
Games.fillBlanks(document.getElementById('game-fill-channels'), {
  title: 'One histogram per channel',
  task: '',
  parts: [
    'for i in range(', { answer: '3', options: ['1', '3', '256'], hint: 'A color image has 3 channels: B, G, R.' },
    '):\n    h = cv2.calcHist([img], [', { answer: 'i', options: ['0', 'i', '3'], hint: 'The channel number changes in every turn of the loop.' },
    '], None, [', { answer: '256', options: ['3', '255', '256'], hint: 'One bin for every value 0…255: that is 256 bins.' },
    '], [0, 256])'
  ],
  explain: 'Channel i, no mask, 256 bins, values from 0 up to 256.',
  onCorrect: function (out) {
    var img = IP.color(), grid = IP.el('div', { class: 'grid-3' });
    ['B', 'G', 'R'].forEach(function (n, k) {
      grid.append(IP.el('figure', { class: 'figure' }, IP.histogramCanvas(IP.channel(img, k)), IP.el('figcaption', { text: 'i = ' + k + ' (' + n + ')' })));
    });
    out.append(grid);
  }
});

/* ---------- Game: put the plotting program in order ---------- */
var drawHint = 'Drawing and labels can come in any order, but all before plt.show().';
Games.orderLines(document.getElementById('game-order-hist'), {
  title: 'Plot a histogram',
  lines: [
    { text: 'import cv2', group: 'imports', hint: 'Imports always come first.' },
    { text: 'import matplotlib.pyplot as plt', group: 'imports', hint: 'Imports always come first.' },
    { text: 'img = cv2.imread("landscape.png")', hint: 'You need to read the image before you can convert it.' },
    { text: 'gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)', hint: 'Convert to gray after reading, before counting.' },
    { text: 'hist = cv2.calcHist([gray], [0], None, [256], [0, 256])', hint: 'The counts need the gray image, and the plot needs the counts.' },
    { text: 'plt.plot(hist)', group: 'draw', hint: drawHint },
    { text: 'plt.xlabel("gray level")', group: 'draw', hint: drawHint },
    { text: 'plt.ylabel("number of pixels")', group: 'draw', hint: drawHint },
    { text: 'plt.show()', hint: 'plt.show() opens the window, so it comes last.' }
  ],
  explain: 'Import, read, convert to gray, count, draw, show.'
});

/* ---------- Exercise: expected values ---------- */
IP.expected('expected-hist', function (img) {
  var gray = IP.grayOf(img), hist = IP.histogram(gray);
  var n = gray.data.length, best = 0, used = 0;
  for (var v = 0; v < 256; v++) {
    if (hist[v] > hist[best]) best = v;
    if (hist[v] > 0) used++;
  }
  return [
    ['<code>print(len(hist), hist.sum(), gray.size)</code>', '256 ' + n + ' ' + n],
    ['<code>print(hist.argmax(), hist.max())</code>', best + ' ' + hist[best]],
    ['<code>print(np.count_nonzero(hist))</code>', String(used)],
    ['<code>print(H[127], H[-1])</code>', IP.cumulative(hist)[127] + ' ' + n]
  ];
});
