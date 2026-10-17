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
    ['<code>print(np.count_nonzero(hist))</code>', String(used)]
  ];
});
