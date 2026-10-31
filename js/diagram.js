// diagram.js - small helpers that write the SVG illustrations of sections 6 and 7.
// Every function returns SVG markup (a string). Colors:
//   image pixels blue (dark #378ADD for 10, light #E6F1FB for 200), padding gray,
//   kernel purple, computed / new pixels green, the 3x3 window a black outline.

var Diagram = {};

Diagram.C = {
  dark: '#378ADD', light: '#E6F1FB', pad: '#D3D1C7',
  kernel: '#AFA9EC', kernelLine: '#534AB7',
  green: '#97C459', greenLine: '#3B6D11', text: '#000'
};

// Blue shade for a pixel value: 10 -> dark blue, 200 -> light blue, in between mixed
Diagram.pixel = function (v) {
  var t = Math.max(0, Math.min(1, (v - 10) / 190));
  function mix(a, b) { return Math.round(a + (b - a) * t); }
  return 'rgb(' + mix(0x37, 0xE6) + ',' + mix(0x8A, 0xF1) + ',' + mix(0xDD, 0xFB) + ')';
};

// The <svg> with its own white background; it scales with the page width
Diagram.svg = function (w, h, body, label) {
  return '<svg class="diagram-svg" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + (label || '') +
    '" font-family="system-ui, -apple-system, Segoe UI, sans-serif"><rect width="' + w + '" height="' + h + '" fill="#fff"/>' + body + '</svg>';
};

Diagram.text = function (x, y, str, opts) {
  opts = opts || {};
  return '<text x="' + x + '" y="' + y + '" font-size="' + (opts.size || 12) + '" text-anchor="' + (opts.anchor || 'middle') +
    '" font-weight="' + (opts.bold ? 700 : 400) + '" fill="' + Diagram.C.text + '">' + str + '</text>';
};

// One cell. style: { fill, stroke, text }
Diagram.cell = function (x, y, s, style) {
  var stroke = style.stroke || '#fff', sw = style.stroke ? 1.5 : 1.5;
  var out = '<rect x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" fill="' + style.fill +
    '" stroke="' + stroke + '" stroke-width="' + sw + '"/>';
  if (style.text !== undefined && style.text !== '') out += Diagram.text(x + s / 2, y + s / 2 + 4, style.text, { size: style.size || Math.min(12, s * 0.42) });
  return out;
};

// A grid of numbers. styleOf(value, row, col) returns { fill, stroke, text }; by default blue pixels.
Diagram.grid = function (x, y, s, rows, styleOf) {
  var out = '';
  rows.forEach(function (row, r) {
    row.forEach(function (v, c) {
      var st = styleOf ? styleOf(v, r, c) : null;
      out += Diagram.cell(x + c * s, y + r * s, s, st || { fill: Diagram.pixel(v), text: String(v) });
    });
  });
  return out;
};

// The black outline of a window of n x n cells, with its top-left cell at (row, col)
Diagram.window = function (x, y, s, row, col, n) {
  return '<rect x="' + (x + col * s) + '" y="' + (y + row * s) + '" width="' + (n * s) + '" height="' + (n * s) +
    '" fill="none" stroke="#000" stroke-width="2.5"/>';
};

Diagram.arrow = function (x1, y1, x2, y2, label) {
  var a = Math.atan2(y2 - y1, x2 - x1), h = 7;
  var p1 = (x2 - h * Math.cos(a - 0.45)) + ',' + (y2 - h * Math.sin(a - 0.45));
  var p2 = (x2 - h * Math.cos(a + 0.45)) + ',' + (y2 - h * Math.sin(a + 0.45));
  var out = '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#000" stroke-width="1.5"/>' +
    '<polygon points="' + x2 + ',' + y2 + ' ' + p1 + ' ' + p2 + '" fill="#000"/>';
  if (label) out += Diagram.text((x1 + x2) / 2, Math.min(y1, y2) - 7, label, { size: 11 });
  return out;
};

// Styles used again and again
Diagram.green = function (text) { return { fill: Diagram.C.green, stroke: Diagram.C.greenLine, text: text }; };
Diagram.purple = function (text) { return { fill: Diagram.C.kernel, stroke: Diagram.C.kernelLine, text: text }; };
