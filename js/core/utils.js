(function (Q) {
  'use strict';

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function append(node, children) {
    for (const child of children.flat(Infinity)) {
      if (child == null || child === false) continue;
      node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
    }
  }

  function build(node, attrs, children) {
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value == null || value === false) continue;
      if (key === 'style' && typeof value === 'object') {
        for (const [prop, v] of Object.entries(value)) node.style.setProperty(prop, v);
      } else if (key.startsWith('on') && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else node.setAttribute(key, value === true ? '' : value);
    }
    append(node, children);
    return node;
  }

  // Minimalny helper do budowania DOM: h('div', { class: 'x', onclick: fn }, 'tekst', childNode)
  const h = (tag, attrs, ...children) => build(document.createElement(tag), attrs, children);

  // To samo dla elementów SVG: svg('svg', { viewBox }, svg('path', { d }))
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs, ...children) => build(document.createElementNS(SVG_NS, tag), attrs, children);

  // 3 losowe odpowiedzi-pułapki: najpierw z kolejnych list priorytetowych, resztę z `all`.
  function pickDistractors(item, all, ...priorityLists) {
    const picked = [];
    for (const list of [...priorityLists, all]) {
      for (const c of shuffle(list)) {
        if (picked.length === 3) return picked;
        if (c !== item && !picked.includes(c)) picked.push(c);
      }
    }
    return picked;
  }

  const numberFormat = new Intl.NumberFormat('pl-PL');
  const fmt = (n) => numberFormat.format(n);

  // Polska odmiana: plural(5, ['flaga', 'flagi', 'flag']) -> 'flag'
  function plural(n, [one, few, many]) {
    if (n === 1) return one;
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }

  Q.utils = { shuffle, h, svg, fmt, plural, pickDistractors };
})(window.Quizorama = window.Quizorama || {});
