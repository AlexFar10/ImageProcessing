// Glossary page: built from js/glossary-data.js, sorted A to Z.

(function () {
  var list = document.getElementById('glossary');
  var letters = document.getElementById('letters');
  var sectionTitles = {};
  IP.SECTIONS.forEach(function (s) { sectionTitles[s.file] = s.title; });

  var ids = Object.keys(GLOSSARY).sort(function (a, b) {
    return GLOSSARY[a].term.localeCompare(GLOSSARY[b].term, 'en', { sensitivity: 'base' });
  });

  var lastLetter = '';
  ids.forEach(function (id) {
    var t = GLOSSARY[id];
    var letter = t.term[0].toUpperCase();
    if (letter !== lastLetter) {
      lastLetter = letter;
      list.appendChild(IP.el('div', { class: 'letter', id: 'letter-' + letter }, IP.el('h2', { text: letter, style: 'margin:0' })));
      letters.appendChild(IP.el('a', { href: '#letter-' + letter, text: letter }));
      letters.appendChild(document.createTextNode(' '));
    }
    var page = t.where.split('#')[0];
    list.appendChild(IP.el('dt', { id: 'term-' + id, text: t.term }));
    list.appendChild(IP.el('dd', {},
      t.short + ' ',
      IP.el('a', { href: t.where.split('#')[0] + '#theory', text: '→ ' + (sectionTitles[page] || 'section') })));
  });

  // If we arrived with #term-…, scroll to it after the list exists.
  if (location.hash) {
    var target = document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView();
  }
})();
