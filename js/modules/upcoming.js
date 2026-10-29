(function (Q) {
  'use strict';

  // Zapowiedzi kolejnych modułów. Zamień wpis na pełny moduł (patrz js/modules/flags.js), gdy będzie gotowy.
  const upcoming = [
    { id: 'currencies', name: 'Waluty', tagline: 'Jaka waluta obowiązuje w danym kraju?', icon: '💰' },
  ];

  for (const m of upcoming) Q.registerModule({ ...m, comingSoon: true });
})(window.Quizorama = window.Quizorama || {});
