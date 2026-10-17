// games.js - the reusable code games. Each section page calls these with its own content.
//
//   Games.liveCode     editable values inside a code line, result shown right away
//   Games.fillBlanks   gaps in a snippet to type or pick
//   Games.orderLines   shuffled lines to drag into order
//   Games.spotBug      click the wrong line, then see what it does
//   Games.predict      choose the output (text or small images), several rounds
//   Games.onImage      tasks done by clicking or dragging on the picture
//
// Every game has a Restart button, gives feedback and explains mistakes.
// Games restart by themselves when the student switches image.

var Games = {};

// The frame shared by all games: title, task, play area, feedback, Restart.
function gameShell(el, type, title, task) {
  el.classList.add('game');
  el.innerHTML = '';
  var restart = IP.el('button', { class: 'btn secondary restart', type: 'button', text: 'Reset' });
  var body = IP.el('div', { class: 'game-body' });
  var feedback = IP.el('div', { class: 'feedback', 'aria-live': 'polite' });
  el.append(
    IP.el('div', { class: 'game-head', 'data-type': type }, IP.el('h3', { text: title }), restart),
    body, feedback);
  if (task) body.before(IP.el('p', { class: 'task', html: task }));
  return {
    body: body,
    restart: restart,
    // kind: 'good' | 'bad' | 'info'; why: a one-sentence explanation
    say: function (kind, msg, why) {
      feedback.className = 'feedback show ' + kind;
      feedback.innerHTML = '';
      feedback.append(IP.el('strong', { text: msg }));
      if (why) feedback.append(IP.el('span', { class: 'why', html: why }));
    },
    clear: function () { feedback.className = 'feedback'; feedback.innerHTML = ''; }
  };
}

Games.shell = gameShell; // pages use it for one-off games (e.g. the color matcher)

function shuffle(list) {
  var a = list.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
Games.shuffle = shuffle;

// Puts code parts (strings and form controls) into a <pre>. Strings get highlighted.
function buildCodeLine(pre, parts, makeControl) {
  parts.forEach(function (part) {
    if (typeof part === 'string') {
      var span = IP.el('span');
      span.innerHTML = IP.highlight(part);
      pre.appendChild(span);
    } else {
      pre.appendChild(makeControl(part));
    }
  });
}

/* ---------------------------------------------------------------------
   Live code: opts = { title, task, parts, render(values, out) }
   parts mixes strings and controls:
     { id, type: 'number' | 'range' | 'select', value, min, max, step, options }
   render() draws the result into `out` and may return { kind, msg, why }.
   --------------------------------------------------------------------- */
Games.liveCode = function (el, opts) {
  var g = gameShell(el, 'Live code', opts.title, opts.task);
  var controls = {};
  var out = IP.el('div', { class: 'live-out' });

  function start() {
    g.body.innerHTML = '';
    controls = {};
    var pre = IP.el('pre');
    buildCodeLine(pre, opts.parts, function (part) {
      var input;
      if (part.type === 'select') {
        input = IP.el('select', { 'aria-label': part.label || part.id });
        part.options.forEach(function (o) {
          var value = typeof o === 'object' ? o.value : o;
          var label = typeof o === 'object' ? o.label : String(o);
          input.appendChild(IP.el('option', { value: value, text: label }));
        });
        input.value = part.value;
      } else {
        input = IP.el('input', { type: part.type || 'number', value: part.value, min: part.min, max: part.max, step: part.step || 1, 'aria-label': part.label || part.id });
      }
      input.addEventListener('input', update);
      controls[part.id] = { input: input, part: part };
      if (part.type === 'range') {
        // show the slider value right after the slider, like a number in the code
        var shown = IP.el('span', { class: 'tok-num', text: ' ' + part.value });
        input.addEventListener('input', function () { shown.textContent = ' ' + input.value; });
        return IP.el('span', {}, input, shown);
      }
      return input;
    });
    g.body.append(IP.el('div', { class: 'code live-code' }, pre), out);
    update();
  }

  function update() {
    var values = {};
    for (var id in controls) {
      var c = controls[id];
      var v = c.part.type === 'select' && typeof c.part.value === 'string' ? c.input.value : Number(c.input.value);
      if (typeof v === 'number' && (isNaN(v) || (c.part.min != null && v < c.part.min) || (c.part.max != null && v > c.part.max))) {
        c.input.classList.add('blank-bad');
        g.say('bad', 'That value is out of range.', 'Use a number from ' + c.part.min + ' to ' + c.part.max + ' for ' + (c.part.label || c.part.id) + '.');
        return;
      }
      c.input.classList.remove('blank-bad');
      values[id] = v;
    }
    out.innerHTML = '';
    var result = opts.render(values, out);
    if (result && result.msg) g.say(result.kind || 'info', result.msg, result.why);
    else g.clear();
  }

  g.restart.onclick = start;
  IP.ready(start);
  IP.onChange(update);
};

/* ---------------------------------------------------------------------
   Fill in the blanks: opts = { title, task, parts, onCorrect(out) }
   blanks in parts: { id, answer: 'text' or ['a', 'b'], options: [...] (makes a menu), hint }
   --------------------------------------------------------------------- */
Games.fillBlanks = function (el, opts) {
  var g = gameShell(el, 'Fill in the blanks', opts.title, opts.task);
  var blanks = [];
  var out = IP.el('div', { class: 'live-out' });

  function norm(s) { return String(s).replace(/\s+/g, '').replace(/"/g, "'").toLowerCase(); }

  function start() {
    g.clear();
    g.body.innerHTML = '';
    out.innerHTML = '';
    blanks = [];
    var pre = IP.el('pre');
    buildCodeLine(pre, opts.parts, function (part) {
      var input;
      if (part.options) {
        input = IP.el('select', { 'aria-label': 'blank ' + (blanks.length + 1) });
        input.appendChild(IP.el('option', { value: '', text: '  ?  ' }));
        part.options.forEach(function (o) { input.appendChild(IP.el('option', { value: o, text: o })); });
      } else {
        input = IP.el('input', { type: 'text', size: part.size || 8, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'blank ' + (blanks.length + 1) });
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
      }
      input.addEventListener('input', function () { input.classList.remove('blank-ok', 'blank-bad'); });
      blanks.push({ input: input, part: part });
      return input;
    });
    var checkBtn = IP.el('button', { class: 'btn', type: 'button', text: 'Check' });
    checkBtn.onclick = check;
    g.body.append(IP.el('div', { class: 'code live-code' }, pre), checkBtn, out);
  }

  function check() {
    var wrong = [];
    blanks.forEach(function (b) {
      var answers = [].concat(b.part.answer).map(norm);
      var ok = answers.indexOf(norm(b.input.value)) >= 0;
      b.input.classList.toggle('blank-ok', ok);
      b.input.classList.toggle('blank-bad', !ok);
      if (!ok) wrong.push(b);
    });
    out.innerHTML = '';
    if (wrong.length === 0) {
      g.say('good', 'Correct!', opts.explain);
      if (opts.onCorrect) opts.onCorrect(out);
    } else {
      var empty = wrong.filter(function (b) { return !b.input.value; }).length;
      var first = wrong.find(function (b) { return b.input.value; }) || wrong[0];
      g.say('bad', wrong.length + ' of ' + blanks.length + ' blanks are not right yet' + (empty ? ' (' + empty + ' empty).' : '.'),
        first.part.hint || 'Look at the red boxes again.');
    }
  }

  g.restart.onclick = start;
  IP.ready(start);
  IP.onChange(function () { out.innerHTML = ''; g.clear(); });
};

/* ---------------------------------------------------------------------
   Put the lines in order: opts = { title, task, lines, explain }
   lines are given in the right order: { text, group, hint }
   Lines with the same `group` may swap places with each other.
   --------------------------------------------------------------------- */
Games.orderLines = function (el, opts) {
  var g = gameShell(el, 'Put the lines in order', opts.title, opts.task ||
    'Drag (☰) or use the arrows.');
  var list = IP.el('ol', { class: 'lines' });
  var groupAt = opts.lines.map(function (l, i) { return l.group || 'line' + i; });

  function start() {
    g.clear();
    var order = shuffle(opts.lines.map(function (l, i) { return i; }));
    var tries = 0;
    while (isCorrect(order) && tries++ < 20) order = shuffle(order);
    list.innerHTML = '';
    order.forEach(function (i) { list.appendChild(makeItem(i)); });
    var checkBtn = IP.el('button', { class: 'btn', type: 'button', text: 'Check' });
    checkBtn.onclick = check;
    g.body.innerHTML = '';
    g.body.append(list, checkBtn);
  }

  function isCorrect(order) {
    return order.every(function (lineIndex, pos) { return groupAt[lineIndex] === groupAt[pos]; });
  }

  function makeItem(i) {
    var li = IP.el('li', { 'data-i': i });
    var handle = IP.el('span', { class: 'handle', 'aria-hidden': 'true', text: '☰' });
    var up = IP.el('button', { class: 'mv', type: 'button', 'aria-label': 'Move up', text: '↑' });
    var down = IP.el('button', { class: 'mv', type: 'button', 'aria-label': 'Move down', text: '↓' });
    up.onclick = function () { if (li.previousElementSibling) list.insertBefore(li, li.previousElementSibling); clearMarks(); };
    down.onclick = function () { if (li.nextElementSibling) list.insertBefore(li.nextElementSibling, li); clearMarks(); };
    li.append(handle, IP.el('pre', { text: opts.lines[i].text }), up, down);

    // Dragging with mouse or finger (pointer events work for both)
    handle.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      li.classList.add('dragging');
    });
    handle.addEventListener('pointermove', function (e) {
      if (!li.classList.contains('dragging')) return;
      var under = document.elementFromPoint(e.clientX, e.clientY);
      var over = under && under.closest('li');
      if (!over || over === li || over.parentNode !== list) return;
      var r = over.getBoundingClientRect();
      list.insertBefore(li, e.clientY < r.top + r.height / 2 ? over : over.nextSibling);
      clearMarks();
    });
    function stop() { li.classList.remove('dragging'); }
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
    return li;
  }

  function clearMarks() {
    list.querySelectorAll('li').forEach(function (li) { li.classList.remove('ok', 'wrong'); });
  }

  function check() {
    var items = Array.prototype.slice.call(list.children);
    var wrong = [];
    items.forEach(function (li, pos) {
      var i = Number(li.dataset.i);
      var ok = groupAt[i] === groupAt[pos];
      li.classList.toggle('ok', ok);
      li.classList.toggle('wrong', !ok);
      if (!ok) wrong.push(i);
    });
    if (wrong.length === 0) {
      g.say('good', 'All lines are in the right order!', opts.explain);
    } else {
      var hint = opts.lines[wrong[0]].hint || 'Ask yourself: which variable does each line need, and where is it created?';
      g.say('bad', wrong.length + (wrong.length === 1 ? ' line is' : ' lines are') + ' in the wrong place (shown in red).', hint);
    }
  }

  g.restart.onclick = start;
  start();
};

/* ---------------------------------------------------------------------
   Spot the bug: opts = { title, task, lines, bug, hints, explain, show(out) }
   lines can be a list of strings or a function that returns one.
   hints: { lineIndex: 'why this line is fine' }
   show(out) draws the buggy result next to the correct one.
   --------------------------------------------------------------------- */
Games.spotBug = function (el, opts) {
  var g = gameShell(el, 'Spot the bug', opts.title, opts.task || 'Click the wrong line.');
  var out = IP.el('div', { class: 'live-out' });
  var found = false;

  function start() {
    g.clear();
    found = false;
    out.innerHTML = '';
    var list = IP.el('ol', { class: 'bug-lines' });
    var lines = typeof opts.lines === 'function' ? opts.lines() : opts.lines;
    lines.forEach(function (text, i) {
      var li = IP.el('li', { tabindex: '0', role: 'button' });
      li.innerHTML = IP.highlight(text);
      li.onclick = function () { choose(li, i); };
      li.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(li, i); } };
      list.appendChild(li);
    });
    g.body.innerHTML = '';
    g.body.append(list, out);
  }

  function choose(li, i) {
    if (found) return;
    if (i === opts.bug) {
      found = true;
      li.classList.add('ok');
      g.say('good', 'Found it!', opts.explain);
      opts.show(out);
    } else {
      li.classList.add('wrong');
      g.say('bad', 'This line is fine.', (opts.hints && opts.hints[i]) || 'Read each line and ask: does it do what the comment says?');
    }
  }

  g.restart.onclick = start;
  IP.ready(start);
  IP.onChange(start);
};

/* ---------------------------------------------------------------------
   Predict the output: opts = { title, task, rounds() }
   rounds() returns [{ code, question, figure(), options, answer, explain, reveal(out) }]
   figure() may return a node (e.g. an image) shown before the options.
   An option is a string, or a function that returns a node (e.g. a small image).
   --------------------------------------------------------------------- */
Games.predict = function (el, opts) {
  var g = gameShell(el, 'Predict the output', opts.title, opts.task);
  var rounds, index, score;

  function start() { rounds = opts.rounds(); index = 0; score = 0; showRound(); }

  function showRound() {
    g.clear();
    g.body.innerHTML = '';
    var round = rounds[index];
    var answered = false;
    var progress = IP.el('p', { class: 'score', text: 'Question ' + (index + 1) + ' of ' + rounds.length });
    var options = IP.el('div', { class: 'options' });
    var out = IP.el('div', { class: 'live-out' });
    var next = IP.el('button', { class: 'btn', type: 'button', hidden: '' });
    next.textContent = index + 1 < rounds.length ? 'Next question' : 'See my score';
    next.onclick = function () {
      index++;
      if (index < rounds.length) showRound();
      else { g.body.innerHTML = ''; g.say('info', 'You got ' + score + ' of ' + rounds.length + ' right.', 'Press Reset to play again.'); }
    };
    round.options.forEach(function (option, i) {
      var btn = IP.el('button', { class: 'option', type: 'button' });
      if (typeof option === 'function') btn.appendChild(option());
      else btn.textContent = option;
      btn.onclick = function () {
        if (answered) return;
        answered = true;
        options.querySelectorAll('button').forEach(function (b, k) {
          b.disabled = true;
          if (k === round.answer) b.classList.add('ok');
        });
        if (i === round.answer) { score++; g.say('good', 'Right!', round.explain); }
        else { btn.classList.add('wrong'); g.say('bad', 'Not quite.', round.explain); }
        if (round.reveal) round.reveal(out);
        next.hidden = false;
      };
      options.appendChild(btn);
    });
    g.body.append(progress);
    if (round.code) g.body.append(IP.codeBox(round.code));
    if (round.question) g.body.append(IP.el('p', { html: round.question }));
    if (round.figure) g.body.append(round.figure());
    g.body.append(options, out, next);
  }

  g.restart.onclick = start;
  IP.ready(start);
  IP.onChange(start);
};

// One round of "pick the right one": options[0] is correct, they get shuffled.
// An option is a string or a function returning a node (e.g. a small image).
Games.pickRound = function (round, options) {
  var order = shuffle(options.map(function (o, i) { return i; }));
  round.options = order.map(function (i) { return options[i]; });
  round.answer = order.indexOf(0);
  return round;
};

// Helpers for reveal(): mark the right pixel or box in blue.
Games.markPixel = function (ctx, r, c, color) {
  ctx.strokeStyle = color || '#2f6fde';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c + 0.5, r + 0.5, 7, 0, 2 * Math.PI);
  ctx.stroke();
};
Games.markBox = function (ctx, a, color) {
  ctx.strokeStyle = color || '#2f6fde';
  ctx.lineWidth = 2;
  ctx.strokeRect(a.c1, a.r1, a.c2 - a.c1, a.r2 - a.r1);
};

/* ---------------------------------------------------------------------
   On the image: opts = { title, task, image(), rounds(), guides, snap }
   guides: true draws row / column rulers on the picture.
   snap: a box snaps to multiples of this number (e.g. 10).
   image() returns the gray or color image to show.
   rounds() returns [{ task, mode: 'point' | 'rect', check(answer), reveal(ctx) }]
     point answer: { row, col }
     rect answer:  { r1, r2, c1, c2 }  (like a slice: r2 and c2 are not included)
     check() returns { ok, msg, why }
   --------------------------------------------------------------------- */
Games.onImage = function (el, opts) {
  var g = gameShell(el, 'On the image', opts.title, opts.task);
  var rounds, index, score, img, canvas, ctx, round, answer, done, tries;

  function start() { img = opts.image(); rounds = opts.rounds(img); index = 0; score = 0; showRound(); }

  function redraw() {
    IP.draw(canvas, img);
    if (opts.guides) drawGuides();
    ctx.lineWidth = Math.max(1.5, img.width / 200);
    if (answer && round.mode === 'point') drawCross(answer.row, answer.col, '#d64545');
    if (answer && round.mode === 'rect') drawRect(answer, '#d64545', true);
    if (done && round.reveal) round.reveal(ctx, img);
  }
  function drawCross(r, c, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(c + 0.5, r + 0.5, Math.max(4, img.width / 60), 0, 2 * Math.PI);
    ctx.moveTo(c + 0.5, r - 10); ctx.lineTo(c + 0.5, r + 11);
    ctx.moveTo(c - 10, r + 0.5); ctx.lineTo(c + 11, r + 0.5);
    ctx.stroke();
  }
  // Light grid lines with their row / column numbers, so nobody has to count pixels.
  function drawGuides() {
    var step = img.width > 400 ? 40 : 20;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = Math.round(step / 2.6) + 'px system-ui, sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 2;
    for (var c = step; c < img.width; c += step) {
      ctx.beginPath(); ctx.moveTo(c, 0); ctx.lineTo(c, img.height); ctx.stroke();
      if (c % (2 * step) === 0) ctx.fillText(String(c), c + 1, step / 2.2);
    }
    for (var r = step; r < img.height; r += step) {
      ctx.beginPath(); ctx.moveTo(0, r); ctx.lineTo(img.width, r); ctx.stroke();
      if (r % (2 * step) === 0) ctx.fillText(String(r), 2, r - 2);
    }
    ctx.restore();
  }
  function snapped(v) { return opts.snap ? Math.round(v / opts.snap) * opts.snap : v; }
  function drawRect(a, color, dashed) {
    ctx.strokeStyle = color;
    ctx.setLineDash(dashed ? [5, 3] : []);
    ctx.strokeRect(a.c1, a.r1, a.c2 - a.c1, a.r2 - a.r1);
    ctx.setLineDash([]);
  }

  function showRound() {
    g.clear();
    round = rounds[index];
    answer = null; done = false; tries = 0;
    canvas = IP.el('canvas', { class: 'pixelated' });
    ctx = canvas.getContext('2d');
    var stage = IP.el('div', { class: 'click-stage' }, canvas);
    stage.style.touchAction = round.mode === 'rect' ? 'none' : 'manipulation'; // dragging a box must not scroll the page
    var next = IP.el('button', { class: 'btn', type: 'button', hidden: '' });
    next.textContent = index + 1 < rounds.length ? 'Next task' : 'See my score';
    next.onclick = function () {
      index++;
      if (index < rounds.length) showRound();
      else { g.body.innerHTML = ''; g.say('info', 'You solved ' + score + ' of ' + rounds.length + ' on the first try.', 'Press Reset to play again.'); }
    };
    var checkBtn = IP.el('button', { class: 'btn', type: 'button', text: 'Check my box', hidden: '' });
    var readout = IP.el('div', { class: 'readout', text: round.mode === 'rect' ? 'Drag a box.' : 'Click the image.' });
    // Show where the mouse is, in rows and columns
    canvas.addEventListener('pointermove', function (e) {
      if (done || (round.mode === 'rect' && startPt)) return;
      var p = IP.pixelAt(canvas, e);
      readout.textContent = 'row ' + snapped(p.row) + ', column ' + snapped(p.col);
    });
    var startPt = null;

    function finish(result) {
      tries++;
      if (result.ok) {
        done = true;
        if (tries === 1) score++;
        g.say('good', result.msg, result.why);
        next.hidden = false; checkBtn.hidden = true;
      } else if (tries >= 3) {
        done = true;
        g.say('bad', result.msg, (result.why || '') + ' The right answer is now shown in blue.');
        next.hidden = false; checkBtn.hidden = true;
      } else {
        g.say('bad', result.msg, result.why);
      }
      redraw();
    }

    if (round.mode === 'point') {
      canvas.addEventListener('click', function (e) {
        if (done) return;
        answer = IP.pixelAt(canvas, e);
        readout.textContent = 'You clicked row ' + answer.row + ', column ' + answer.col;
        finish(round.check(answer));
      });
    } else {
      canvas.addEventListener('pointerdown', function (e) {
        if (done) return;
        canvas.setPointerCapture(e.pointerId);
        startPt = IP.pixelAt(canvas, e);
      });
      canvas.addEventListener('pointermove', function (e) {
        if (!startPt || done) return;
        var p = IP.pixelAt(canvas, e);
        var extra = opts.snap ? 0 : 1;   // without snapping, the pixel under the mouse is included
        answer = {
          r1: snapped(Math.min(startPt.row, p.row)), r2: snapped(Math.max(startPt.row, p.row)) + extra,
          c1: snapped(Math.min(startPt.col, p.col)), c2: snapped(Math.max(startPt.col, p.col)) + extra
        };
        readout.textContent = 'Your box: img[' + answer.r1 + ':' + answer.r2 + ', ' + answer.c1 + ':' + answer.c2 + ']';
        checkBtn.hidden = false;
        redraw();
      });
      canvas.addEventListener('pointerup', function () { startPt = null; });
      checkBtn.onclick = function () { if (answer) finish(round.check(answer)); };
    }

    g.body.innerHTML = '';
    g.body.append(IP.el('p', { class: 'score', text: 'Task ' + (index + 1) + ' of ' + rounds.length }),
      IP.el('p', { html: round.task }), stage, readout, checkBtn, next);
    redraw();
  }

  g.restart.onclick = start;
  IP.ready(start);
  IP.onChange(start);
};
