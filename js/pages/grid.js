// Section 1: the image as a grid of numbers.

/* ---------- Try it: the pixel inspector ---------- */
(function () {
  var canvas = document.getElementById('inspect-canvas');
  var readout = document.getElementById('inspect-readout');
  var zoom = document.getElementById('inspect-zoom');
  var frozen = false, current = null;

  function mode() { return document.querySelector('input[name=inspect-mode]:checked').value; }

  function draw() {
    IP.draw(canvas, mode() === 'gray' ? IP.gray() : IP.color());
    if (current) {
      var ctx = canvas.getContext('2d');
      ctx.strokeStyle = frozen ? '#d64545' : '#2f6fde';
      ctx.lineWidth = 1;
      ctx.strokeRect(current.col - 3.5, current.row - 3.5, 8, 8);
    }
  }

  function show(p) {
    current = p;
    var color = IP.color(), gray = IP.gray();
    var bgr = IP.bgrAt(color, p.row, p.col);
    var g = gray.data[p.row * gray.width + p.col];
    readout.innerHTML = 'row ' + p.row + ', column ' + p.col + '<br>img[' + p.row + ', ' + p.col + '] = ' +
      IP.fmt.array(bgr) + '  (B, G, R)<br>gray[' + p.row + ', ' + p.col + '] = ' + g + (frozen ? '<br><i>frozen: click again to move</i>' : '');

    // 7 x 7 neighbourhood with row and column numbers
    zoom.innerHTML = '';
    var head = IP.el('tr', {}, IP.el('th'));
    for (var dc = -3; dc <= 3; dc++) head.appendChild(IP.el('th', { text: String(p.col + dc) }));
    zoom.appendChild(head);
    for (var dr = -3; dr <= 3; dr++) {
      var r = p.row + dr;
      var tr = IP.el('tr', {}, IP.el('th', { text: String(r) }));
      for (dc = -3; dc <= 3; dc++) {
        var c = p.col + dc;
        var td = IP.el('td');
        if (r >= 0 && c >= 0 && r < color.height && c < color.width) {
          var v = IP.bgrAt(color, r, c), gv = gray.data[r * gray.width + c];
          if (mode() === 'gray') {
            td.style.background = 'rgb(' + gv + ',' + gv + ',' + gv + ')';
            td.textContent = gv;
          } else {
            td.style.background = 'rgb(' + v[2] + ',' + v[1] + ',' + v[0] + ')';
            td.innerHTML = v.join('<br>');
            td.style.lineHeight = '1.05';
            td.style.fontSize = '.6rem';
          }
          td.style.color = gv > 140 ? '#000' : '#fff';
        }
        if (dr === 0 && dc === 0) td.className = 'center';
        tr.appendChild(td);
      }
      zoom.appendChild(tr);
    }
    draw();
  }

  canvas.addEventListener('pointermove', function (e) { if (!frozen) show(IP.pixelAt(canvas, e)); });
  canvas.addEventListener('click', function (e) { frozen = !frozen; show(IP.pixelAt(canvas, e)); });
  document.querySelectorAll('input[name=inspect-mode]').forEach(function (r) {
    r.onchange = function () { if (current) show(current); else draw(); };
  });
  function reset() {
    var c = IP.color();
    frozen = false;
    show({ row: Math.floor(c.height / 2), col: Math.floor(c.width / 2) });
  }
  IP.ready(reset);
  IP.onChange(reset);
})();

/* ---------- Game: click the pixel img[r, c] ---------- */
function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo)); }

Games.onImage(document.getElementById('game-click-pixel'), {
  title: 'Click the pixel',
  task: '',
  guides: true,
  image: function () { return IP.color(); },
  rounds: function (img) {
    var list = [];
    while (list.length < 3) {
      var r = 10 * randInt(1, Math.floor(img.height / 10) - 1), c = 10 * randInt(1, Math.floor(img.width / 10) - 1);
      if (Math.abs(r - c) < 25) continue; // keep row and column clearly different
      list.push(makeRound(r, c, img));
    }
    return list;
  }
});

function makeRound(r, c, img) {
  var tol = Math.max(4, Math.round(img.width / 80));
  return {
    mode: 'point',
    task: 'Click <code>img[' + r + ', ' + c + ']</code>.',
    check: function (a) {
      var dr = a.row - r, dc = a.col - c;
      if (Math.abs(dr) <= tol && Math.abs(dc) <= tol) {
        return { ok: true, msg: 'Yes, that is img[' + r + ', ' + c + ']!',
          why: 'Row ' + r + ' is ' + r + ' pixels down from the top; column ' + c + ' is ' + c + ' pixels from the left.' };
      }
      if (Math.abs(a.row - c) <= tol && Math.abs(a.col - r) <= tol) {
        return { ok: false, msg: 'You swapped row and column.',
          why: 'In img[' + r + ', ' + c + '] the first number is the row (going down), the second is the column (going across).' };
      }
      var parts = [];
      if (Math.abs(dr) > tol) parts.push(dr < 0 ? 'too high (row ' + a.row + ' is above row ' + r + ')' : 'too low (row ' + a.row + ' is below row ' + r + ')');
      if (Math.abs(dc) > tol) parts.push(dc < 0 ? 'too far left (column ' + a.col + ')' : 'too far right (column ' + a.col + ')');
      return { ok: false, msg: 'Not there yet.', why: 'Your click is ' + parts.join(' and ') + '. Rows grow downwards, columns grow to the right.' };
    },
    reveal: function (ctx) { Games.markPixel(ctx, r, c); }
  };
}

/* ---------- Game: select the area of a slice ---------- */
Games.onImage(document.getElementById('game-slice-box'), {
  title: 'Draw the slice',
  task: '',
  guides: true,
  snap: 10,
  image: function () { return IP.color(); },
  rounds: function (img) {
    var list = [];
    for (var k = 0; k < 2; k++) {
      var a = 10 * randInt(0, Math.floor((img.height - 50) / 10));
      var b = Math.min(img.height, a + 10 * randInt(4, 10));
      var c = 10 * randInt(0, Math.floor((img.width - 60) / 10));
      var d = Math.min(img.width, c + 10 * randInt(5, 14));
      list.push(sliceRound(a, b, c, d, img));
    }
    return list;
  }
});

function sliceRound(a, b, c, d, img) {
  var tol = Math.max(5, Math.round(img.width / 60));
  function near(x, y) { return Math.abs(x - y) <= tol; }
  return {
    mode: 'rect',
    task: 'Drag a box for <code>img[' + a + ':' + b + ', ' + c + ':' + d + ']</code>.',
    check: function (s) {
      if (near(s.r1, a) && near(s.r2, b) && near(s.c1, c) && near(s.c2, d)) {
        return { ok: true, msg: 'Well done!', why: 'Rows ' + a + ' to ' + (b - 1) + ' and columns ' + c + ' to ' + (d - 1) + ': the end of a slice is not included.' };
      }
      if (near(s.r1, c) && near(s.r2, d) && near(s.c1, a) && near(s.c2, b)) {
        return { ok: false, msg: 'Your box is turned on its side.', why: 'The first range picks rows (up and down), the second picks columns (left and right).' };
      }
      var why;
      if (!near(s.r1, a)) why = 'The top edge should be at row ' + a + '; yours is at row ' + s.r1 + '.';
      else if (!near(s.r2, b)) why = 'The bottom edge: rows stop just before ' + b + '; yours stop before ' + s.r2 + '.';
      else if (!near(s.c1, c)) why = 'The left edge should be at column ' + c + '; yours is at column ' + s.c1 + '.';
      else why = 'The right edge: columns stop just before ' + d + '; yours stop before ' + s.c2 + '.';
      return { ok: false, msg: 'Close, but one edge is off.', why: why };
    },
    reveal: function (ctx) { Games.markBox(ctx, { r1: a, r2: b, c1: c, c2: d }); }
  };
}

/* ---------- Game: predict the output ---------- */
// Builds a round with shuffled options; `correct` is the right text.
function textRound(code, correct, wrongs, explain) {
  var options = Games.shuffle([correct].concat(wrongs));
  return { code: code, options: options, answer: options.indexOf(correct), explain: explain };
}

// A round whose options are small pictures: boxes[0] is the right answer.
function imageRound(code, boxes, explain) {
  var order = Games.shuffle([0, 1, 2, 3]);
  return {
    code: code,
    question: 'Which picture shows <code>img</code> after this line?',
    options: order.map(function (k) {
      return function () {
        var img = IP.copyColor(IP.color()), b = boxes[k];
        for (var r = b.r1; r < b.r2; r++) for (var c = b.c1; c < b.c2; c++) img.data.fill(255, (r * img.width + c) * 4, (r * img.width + c) * 4 + 3);
        return IP.canvasOf(img);
      };
    }),
    answer: order.indexOf(0),
    explain: explain
  };
}

Games.predict(document.getElementById('game-predict'), {
  title: 'What does it print?',
  rounds: function () {
    var img = IP.color(), h = img.height, w = img.width, name = IP.fileName();
    var original = IP.fmt.array(IP.bgrAt(img, 10, 10));
    var half = Math.floor(h / 2), halfW = Math.floor(w / 2);
    return [
      imageRound('img[0:' + half + ', :] = 255', [
        { r1: 0, r2: half, c1: 0, c2: w }, { r1: 0, r2: h, c1: 0, c2: halfW },
        { r1: half, r2: h, c1: 0, c2: w }, { r1: 0, r2: h, c1: halfW, c2: w }],
        'The first range picks rows 0 to ' + (half - 1) + ' (the top half), the colon picks all columns. 255 is white.'),
      textRound('img = cv2.imread("' + name + '")\nprint(img.shape)',
        '(' + h + ', ' + w + ', 3)', ['(' + w + ', ' + h + ', 3)', '(3, ' + h + ', ' + w + ')', '(' + h + ', ' + w + ')'],
        'The shape is (rows, columns, channels): height ' + h + ' first, then width ' + w + ', then 3 color channels.'),
      textRound('import numpy as np\nprint(np.uint8(250) + 10)', '4', ['260', '255', 'An error'],
        'uint8 can only hold 0…255, so NumPy wraps around: 260 − 256 = 4. (It may also print an overflow warning.)'),
      textRound('x = np.array([250], dtype=np.uint8)\nprint(cv2.add(x, 10))', '[[255]]', ['[[4]]', '[[260]]', '[250]'],
        'cv2.add saturates: everything above 255 becomes 255. OpenCV returns it as a column, hence the double brackets.'),
      textRound('img = cv2.imread("' + name + '")\nroi = img[0:50, 0:50]\nroi[:] = 0\nprint(img[10, 10])', '[0 0 0]', [original, 'An error', '[255 255 255]'],
        'roi is a view of img, so blacking out roi also blacks out that corner of img.'),
      textRound('img = cv2.imread("' + name + '")\nroi = img[0:50, 0:50].copy()\nroi[:] = 0\nprint(img[10, 10])', original, ['[0 0 0]', 'An error', '[255 255 255]'],
        'With .copy() roi has its own memory, so img keeps its original value ' + original + '.')
    ];
  }
});

/* ---------- Game: spot the bug (swapped coordinates in cv2.circle) ---------- */
function markPoint() {
  var img = IP.color();
  if (IP.source === 'test' || !IP.photoColor) return { row: 48, col: 258, what: 'centre of the sun' };
  return { row: Math.round(img.height * 0.25), col: Math.round(img.width * 0.75), what: 'the point we want to mark' };
}
function ringImage(x, y) {
  var canvas = IP.canvasOf(IP.color());
  var ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'rgb(255, 0, 0)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x + 0.5, y + 0.5, 30, 0, 2 * Math.PI);
  ctx.stroke();
  return canvas;
}
Games.spotBug(document.getElementById('game-bug-circle'), {
  title: 'Ring in the wrong place',
  task: '',
  lines: function () {
    var p = markPoint();
    return [
      'img = cv2.imread("' + IP.fileName() + '")',
      'row, col = ' + p.row + ', ' + p.col + '                 # ' + p.what,
      'cv2.circle(img, (row, col), 30, (0, 0, 255), 3)   # red ring, radius 30',
      'cv2.imwrite("marked.png", img)'
    ];
  },
  bug: 2,
  hints: {
    0: 'Reading the file is fine.',
    1: 'These numbers are right: they are the row and the column of the point.',
    3: 'Saving the result is fine; the ring is already in the wrong place before this line.'
  },
  explain: 'cv2.circle wants the centre as (x, y) = (column, row). The fix: cv2.circle(img, (col, row), 30, (0, 0, 255), 3).',
  show: function (out) {
    var p = markPoint();
    out.append(IP.el('div', { class: 'grid-2' },
      IP.el('figure', { class: 'figure' }, ringImage(p.row, p.col), IP.el('figcaption', { text: 'With the bug: x = ' + p.row + ', y = ' + p.col + ' (maybe outside the image!)' })),
      IP.el('figure', { class: 'figure' }, ringImage(p.col, p.row), IP.el('figcaption', { text: 'Fixed: (col, row) = (' + p.col + ', ' + p.row + ')' }))));
  }
});

/* ---------- Game: live code img[r1:r2, c1:c2] = value ---------- */
Games.liveCode(document.getElementById('game-live-slice'), {
  title: 'Paint with a slice',
  task: '',
  parts: [
    'img[', { id: 'r1', value: 40, min: 0, max: 5000 }, ':', { id: 'r2', value: 120, min: 0, max: 5000 }, ', ',
    { id: 'c1', value: 60, min: 0, max: 5000 }, ':', { id: 'c2', value: 200, min: 0, max: 5000 }, '] = ',
    { id: 'val', type: 'select', value: '0', options: [{ value: '0', label: '0' }, { value: '255', label: '255' }, { value: 'red', label: '(0, 0, 255)' }] },
    '\nprint(img[r1:r2, c1:c2].shape)'
  ],
  render: function (v, out) {
    var img = IP.copyColor(IP.color()), h = img.height, w = img.width;
    // NumPy stops quietly at the edge of the image
    var r1 = Math.min(v.r1, h), r2 = Math.min(v.r2, h), c1 = Math.min(v.c1, w), c2 = Math.min(v.c2, w);
    var rows = Math.max(0, r2 - r1), cols = Math.max(0, c2 - c1);
    var rgb = v.val === 'red' ? [255, 0, 0] : v.val === '255' ? [255, 255, 255] : [0, 0, 0];
    for (var r = r1; r < r2; r++) {
      for (var c = c1; c < c2; c++) {
        var i = (r * w + c) * 4;
        img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2];
      }
    }
    out.append(IP.figure(img, ''));
    var shape = '(' + rows + ', ' + cols + ', 3)';
    if (rows === 0 || cols === 0) {
      return { kind: 'bad', msg: 'Prints ' + shape + ': the slice is empty, so nothing changes.',
        why: 'In start:end the start must be smaller than the end (and inside the image, which has ' + h + ' rows and ' + w + ' columns).' };
    }
    var why = rows * cols + ' pixels changed.';
    if (v.r2 > h || v.c2 > w) why += ' Your end is past the edge: NumPy simply stops at the last row/column, no error.';
    return { kind: 'info', msg: 'Prints ' + shape, why: why };
  }
});

/* ---------- Exercise: expected values ---------- */
IP.expected('expected-grid', function (img) {
  var values = IP.bgrValues(img);
  var s = IP.stats(values);
  var h = img.height, w = img.width;
  // img[0:50, 0:50] = 0, then the mean again
  var after = s.sum;
  for (var r = 0; r < Math.min(50, h); r++) {
    for (var c = 0; c < Math.min(50, w); c++) after -= IP.bgrAt(img, r, c).reduce(function (a, b) { return a + b; }, 0);
  }
  return [
    ['<code>print(img.shape)</code>', IP.fmt.shape([h, w, 3])],
    ['<code>print(img.dtype)</code>', 'uint8'],
    ['<code>print(img.min(), img.max(), round(img.mean(), 2))</code>', s.min + ' ' + s.max + ' ' + IP.fmt.round2(s.mean)],
    ['<code>print(img[h // 2, w // 2])</code>', IP.fmt.array(IP.bgrAt(img, Math.floor(h / 2), Math.floor(w / 2)))],
    ['mean after <code>img[0:50, 0:50] = 0</code>', IP.fmt.round2(after / values.length)]
  ];
});
