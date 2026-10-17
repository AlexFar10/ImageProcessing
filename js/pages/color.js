// Section 2: color and grayscale.

var cvGray = IP.cvGray;  // the weighted gray of one pixel, exactly like cv2.cvtColor
function rgbCss(r, g, b) { return 'rgb(' + r + ',' + g + ',' + b + ')'; }

/* ---------- The idea: pure colors, average vs weighted ---------- */
(function () {
  var box = document.getElementById('pure-colors');
  [['red', 255, 0, 0], ['green', 0, 255, 0], ['blue', 0, 0, 255], ['yellow', 255, 255, 0]].forEach(function (c) {
    var avg = IP.roundHalfEven((c[1] + c[2] + c[3]) / 3), wgt = cvGray(c[1], c[2], c[3]);
    box.appendChild(IP.el('div', { class: 'card', style: 'margin:0' },
      IP.el('div', { class: 'swatch', style: 'height:44px;background:' + rgbCss(c[1], c[2], c[3]) }),
      IP.el('p', { class: 'caption', text: c[0] }),
      IP.el('div', { class: 'swatch', style: 'height:30px;background:' + rgbCss(avg, avg, avg) }),
      IP.el('p', { class: 'caption', text: 'average ' + avg }),
      IP.el('div', { class: 'swatch', style: 'height:30px;background:' + rgbCss(wgt, wgt, wgt) }),
      IP.el('p', { class: 'caption', text: 'weighted ' + wgt })));
  });
})();

/* ---------- Try it: RGB sliders ---------- */
(function () {
  var ids = ['r', 'g', 'b'];
  function update() {
    var v = ids.map(function (id) { return Number(document.getElementById('rgb-' + id).value); });
    ids.forEach(function (id, i) { document.getElementById('rgb-' + id + '-val').textContent = v[i]; });
    var avg = IP.roundHalfEven((v[0] + v[1] + v[2]) / 3), wgt = cvGray(v[0], v[1], v[2]);
    document.getElementById('swatch-color').style.background = rgbCss(v[0], v[1], v[2]);
    document.getElementById('swatch-avg').style.background = rgbCss(avg, avg, avg);
    document.getElementById('swatch-weighted').style.background = rgbCss(wgt, wgt, wgt);
    document.getElementById('rgb-readout').innerHTML =
      '(R, G, B) = (' + v.join(', ') + ')<br>in OpenCV: (B, G, R) = (' + v[2] + ', ' + v[1] + ', ' + v[0] + ')' +
      '<br>average gray = ' + avg + '<br>weighted gray = ' + wgt;
  }
  ids.forEach(function (id) { document.getElementById('rgb-' + id).addEventListener('input', update); });
  update();
})();

/* ---------- Try it: one pixel step by step + the three images ---------- */
(function () {
  var canvas = document.getElementById('step-canvas');
  var steps = document.getElementById('steps');
  var picked = null;

  function n3(x) { return String(Math.round(x * 1000) / 1000); }
  function step(title, html) { return IP.el('div', { class: 'step', html: '<b>' + title + '</b><br>' + html }); }

  function show() {
    var img = IP.color();
    IP.draw(canvas, img);
    if (!picked) picked = { row: Math.floor(img.height / 2), col: Math.floor(img.width / 2) };
    Games.markPixel(canvas.getContext('2d'), picked.row, picked.col, '#d64545');
    var bgr = IP.bgrAt(img, picked.row, picked.col), B = bgr[0], G = bgr[1], R = bgr[2];
    var wb = 0.114 * B, wg = 0.587 * G, wr = 0.299 * R, sum = wb + wg + wr;
    var chip = function (r, g, b) { return '<span class="legend-dot" style="background:' + rgbCss(r, g, b) + '"></span>'; };
    steps.innerHTML = '';
    steps.append(
      step('Pixel img[' + picked.row + ', ' + picked.col + ']', chip(R, G, B) + ' [B G R] = ' + IP.fmt.array(bgr)),
      step('1 · Split into channels', chip(0, 0, B) + 'B = ' + B + '   ' + chip(0, G, 0) + 'G = ' + G + '   ' + chip(R, 0, 0) + 'R = ' + R),
      step('2 · Weight each channel', '0.114 × ' + B + ' = ' + n3(wb) + '<br>0.587 × ' + G + ' = ' + n3(wg) + '<br>0.299 × ' + R + ' = ' + n3(wr)),
      step('3 · Add them up and round', n3(wb) + ' + ' + n3(wg) + ' + ' + n3(wr) + ' = ' + n3(sum) + ' → ' + chip(IP.roundHalfEven(sum), IP.roundHalfEven(sum), IP.roundHalfEven(sum)) + '<b>' + IP.roundHalfEven(sum) + '</b>'),
      step('Compare', 'plain average: (' + B + ' + ' + G + ' + ' + R + ') / 3 = ' + n3((B + G + R) / 3) + ' → ' + IP.roundHalfEven((B + G + R) / 3) +
        '<br>cv2.cvtColor gives: ' + cvGray(R, G, B)));

    var compare = document.getElementById('gray-compare');
    compare.innerHTML = '';
    compare.append(IP.figure(img, 'color'), IP.figure(IP.grayAverage(img), 'average'),
      IP.figure(IP.grayWeighted(img, 0.114, 0.587, 0.299), 'weighted'));
  }

  canvas.addEventListener('click', function (e) { picked = IP.pixelAt(canvas, e); show(); });
  IP.ready(show);
  IP.onChange(function () { picked = null; show(); });
})();

/* ---------- Game: match a target color ---------- */
(function () {
  var g = Games.shell(document.getElementById('game-target-color'), 'Color mixer', 'Match the target color', '');
  var names = ['red', 'green', 'blue'];

  function start() {
    g.clear();
    var target = [0, 0, 0].map(function () { return 15 * Math.floor(Math.random() * 18); });
    var sliders = names.map(function (name) {
      var input = IP.el('input', { type: 'range', min: 0, max: 255, value: 128, 'aria-label': name });
      input.addEventListener('input', paint);
      return input;
    });
    var mine = IP.el('div', { class: 'swatch' });
    var targetBox = IP.el('div', { class: 'swatch', style: 'background:' + rgbCss(target[0], target[1], target[2]) });
    var checkBtn = IP.el('button', { class: 'btn', type: 'button', text: 'Check' });
    function values() { return sliders.map(function (s) { return Number(s.value); }); }
    function paint() { var v = values(); mine.style.background = rgbCss(v[0], v[1], v[2]); }
    checkBtn.onclick = function () {
      var v = values();
      var diffs = v.map(function (x, i) { return x - target[i]; });
      var worst = 0;
      diffs.forEach(function (d, i) { if (Math.abs(d) > Math.abs(diffs[worst])) worst = i; });
      if (Math.abs(diffs[worst]) <= 20) {
        g.say('good', 'Great match! The target was (R, G, B) = (' + target.join(', ') + ').',
          'In OpenCV you would store it as (B, G, R) = (' + target[2] + ', ' + target[1] + ', ' + target[0] + ').');
      } else {
        var d = diffs[worst];
        g.say('bad', (d > 0 ? 'Too much ' : 'Not enough ') + names[worst] + ' (' + (d > 0 ? '+' : '') + d + ').',
          d > 0 ? 'Turn the ' + names[worst] + ' switch down. Remember: red + green light make yellow.'
                : 'Turn the ' + names[worst] + ' switch up. More light always means a brighter color.');
      }
    };
    g.body.innerHTML = '';
    g.body.append(IP.el('div', { class: 'grid-2' },
      IP.el('div', {}, IP.el('div', { class: 'controls', style: 'flex-direction:column;align-items:stretch' },
        IP.el('label', {}, 'R ', sliders[0]), IP.el('label', {}, 'G ', sliders[1]), IP.el('label', {}, 'B ', sliders[2])), checkBtn),
      IP.el('div', { class: 'row-3' },
        IP.el('div', {}, targetBox, IP.el('p', { class: 'caption', text: 'target' })),
        IP.el('div', {}, mine, IP.el('p', { class: 'caption', text: 'your color' })))));
    paint();
  }
  g.restart.onclick = start;
  start();
})();

/* ---------- Game: fill in the weights ---------- */
var weightOptions = ['0.114', '0.299', '0.333', '0.587'];
Games.fillBlanks(document.getElementById('game-fill-weights'), {
  title: 'Fill in the gray formula',
  task: '',
  parts: [
    'b, g, r = cv2.split(img.astype(np.float64))\ngray = ',
    { answer: '0.114', options: weightOptions, hint: 'Blue looks the darkest to our eyes, so b gets the smallest weight.' },
    ' * b + ',
    { answer: '0.587', options: weightOptions, hint: 'Green looks the brightest to us, so g gets the biggest weight.' },
    ' * g + ',
    { answer: '0.299', options: weightOptions, hint: 'Red is in between: brighter-looking than blue, darker than green.' },
    ' * r\ngray = np.clip(np.round(gray), 0, 255).astype(np.uint8)'
  ],
  explain: 'Green 0.587, red 0.299, blue 0.114. They add up to 1, so white stays white.',
  onCorrect: function (out) {
    var img = IP.color();
    out.append(IP.el('div', { class: 'grid-2' }, IP.figure(img, 'img'), IP.figure(IP.grayWeighted(img, 0.114, 0.587, 0.299), 'gray')));
  }
});

/* ---------- Game: spot the bug (B and R weights swapped) ---------- */
Games.spotBug(document.getElementById('game-bug-weights'), {
  title: 'Wrong gray',
  task: '',
  lines: function () {
    return [
      'img = cv2.imread("' + IP.fileName() + '")',
      'b, g, r = cv2.split(img.astype(np.float64))',
      'gray = 0.299 * b + 0.587 * g + 0.114 * r',
      'gray = np.clip(np.round(gray), 0, 255).astype(np.uint8)'
    ];
  },
  bug: 2,
  hints: {
    0: 'Reading the image is fine.',
    1: 'Splitting in float is right, and cv2.split gives b, g, r in this order.',
    3: 'Rounding, clipping and going back to uint8 is the right way to finish.'
  },
  explain: 'The red and blue weights are swapped: blue got 0.299 and red only 0.114. Blue things look too bright, red things too dark.',
  show: function (out) {
    var img = IP.color();
    var wrong = IP.grayWeighted(img, 0.299, 0.587, 0.114), right = IP.grayWeighted(img, 0.114, 0.587, 0.299);
    out.append(IP.el('div', { class: 'grid-2' },
      IP.figure(wrong, 'bug: mean ' + IP.fmt.round2(IP.stats(wrong.data).mean)),
      IP.figure(right, 'fixed: mean ' + IP.fmt.round2(IP.stats(right.data).mean))));
  }
});

/* ---------- Game: code to image ---------- */
Games.predict(document.getElementById('game-code-image'), {
  title: 'Code → picture',
  task: 'Click the picture the code makes.',
  rounds: function () {
    var img = IP.color();
    var pics = {
      red: function () { return IP.canvasOf(IP.channel(img, 2)); },
      green: function () { return IP.canvasOf(IP.channel(img, 1)); },
      noBlue: function () { return IP.canvasOf(IP.zeroChannel(img, 0)); },
      noRed: function () { return IP.canvasOf(IP.zeroChannel(img, 2)); }
    };
    return Games.shuffle([
      Games.pickRound({ code: 'out = img[:, :, 2]', explain: 'Channel 2 is red, shown as gray: bright where there is red, like the house.' },
        [pics.red, pics.green, pics.noRed]),
      Games.pickRound({ code: 'b, g, r = cv2.split(img)\nout = g', explain: 'g is the green channel: bright on the grass.' },
        [pics.green, pics.red, pics.noBlue]),
      Games.pickRound({ code: 'out = img.copy()\nout[:, :, 0] = 0', explain: 'Channel 0 is blue. Without blue the sky turns green-gray.' },
        [pics.noBlue, pics.noRed, pics.green]),
      Games.pickRound({ code: 'out = img.copy()\nout[:, :, 2] = 0', explain: 'Channel 2 is red. Without red the house turns dark.' },
        [pics.noRed, pics.noBlue, pics.red])
    ]);
  }
});

/* ---------- Game (no code): which channel is it? ---------- */
Games.predict(document.getElementById('game-which-channel'), {
  title: 'Which channel?',
  task: '',
  rounds: function () {
    var img = IP.color();
    var why = ['Bright sky = lots of blue.', 'Bright grass = lots of green.', 'Bright house and sun = lots of red.'];
    var names = ['blue', 'green', 'red'];
    return Games.shuffle([0, 1, 2]).map(function (k) {
      return {
        question: 'This gray picture is one channel. Which one?',
        figure: function () { return IP.el('div', { style: 'max-width:360px' }, IP.canvasOf(IP.channel(img, k))); },
        options: names, answer: k, explain: why[k]
      };
    });
  }
});

/* ---------- Exercise: expected values ---------- */
IP.expected('expected-color', function (img) {
  var avg = IP.grayAverage(img), wgt = IP.grayWeighted(img, 0.114, 0.587, 0.299), ref = IP.grayOf(img);
  var center = Math.floor(img.height / 2) * img.width + Math.floor(img.width / 2);
  var count = 0, worst = 0;
  for (var i = 0; i < ref.data.length; i++) {
    var d = Math.abs(wgt.data[i] - ref.data[i]);
    if (d > 0) count++;
    if (d > worst) worst = d;
  }
  var m = function (g) { return IP.fmt.round2(IP.stats(g.data).mean); };
  return [
    ['the three means: avg, weighted, ref', m(avg) + ' ' + m(wgt) + ' ' + m(ref)],
    ['the centre pixel: avg, weighted, ref', avg.data[center] + ' ' + wgt.data[center] + ' ' + ref.data[center]],
    ['pixels that differ, biggest difference', count + ' ' + worst]
  ];
});
