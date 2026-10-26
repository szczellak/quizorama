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

  // Minimalny helper do budowania DOM: h('div', { class: 'x', onclick: fn }, 'tekst', childNode)
  function h(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value == null || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'style' && typeof value === 'object') {
        for (const [prop, v] of Object.entries(value)) node.style.setProperty(prop, v);
      } else if (key.startsWith('on') && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else node.setAttribute(key, value === true ? '' : value);
    }
    append(node, children);
    return node;
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

  Q.utils = { shuffle, h, fmt, plural };
})(window.Quizorama = window.Quizorama || {});
