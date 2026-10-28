(function (Q) {
  'use strict';

  const { h, svg } = Q.utils;
  const { countries, shapes } = Q.data;
  const { byCode, answerOption, regionOption, answerInput, countryPool, countryQuestion } = Q.countryQuiz;

  // Tylko kraje z rozpoznawalnym konturem — mikropaństwa pomija tools/build-shapes.mjs.
  const playable = countries.filter((c) => shapes.countries[c.code] && shapes.countries[c.code].d);
  const neighborsOf = (code) => (shapes.neighbors[code] || []).map((n) => byCode.get(n)).filter(Boolean);

  function shapeSvg(code, className) {
    const s = shapes.countries[code];
    return svg('svg', { class: className, viewBox: s.viewBox, 'aria-hidden': 'true' },
      svg('path', { class: 'shape-path', d: s.d }));
  }

  // Mała mapa świata z zaznaczonym położeniem kraju (poziom łatwy).
  function locator(code) {
    const [x, y] = shapes.countries[code].loc;
    return svg('svg', { class: 'locator', viewBox: shapes.world.viewBox, 'aria-hidden': 'true' },
      svg('path', { class: 'locator-land', d: shapes.world.d }),
      svg('circle', { class: 'locator-ring', cx: x, cy: y, r: 12 }),
      svg('circle', { class: 'locator-dot', cx: x, cy: y, r: 5 }));
  }

  Q.registerModule({
    id: 'shapes',
    name: 'Kontury państw',
    tagline: 'Poznaj kraj po kształcie granic',
    description: 'Zobaczysz kontur państwa — wybierz właściwy kraj spośród czterech odpowiedzi albo ułóż jego nazwę z liter. Na poziomie łatwym podpowie Ci mini-mapa świata.',
    icon: '🗺️',
    accent: '#14b8a6',
    promptLabel: 'Do jakiego kraju należy ten kontur?',
    lettersPromptLabel: 'Ułóż z liter nazwę kraju o tym konturze',
    itemNouns: ['kontur', 'kontury', 'konturów'],
    emptyPoolText: 'Brak błędów do powtórki — świetna robota!',
    reviewHint: 'Błędne odpowiedzi trafiają do puli „Moje błędy” — powtórz je, wybierając ten region.',

    options: [
      answerOption(),
      regionOption('Kontury, przy których była pomyłka. Każde trafienie zdejmuje kontur z listy.'),
      {
        key: 'difficulty',
        label: 'Poziom trudności',
        default: 'easy',
        choices: [
          { value: 'easy', label: 'Łatwy', hint: 'Kontur z mini-mapą położenia, odpowiedzi to losowe kraje.' },
          { value: 'hard', label: 'Trudny', hint: 'Sam kontur, a odpowiedzi to sąsiedzi i kraje z tego samego regionu.' },
        ],
      },
    ],

    getPool: (settings) => countryPool(playable, settings, 'shapes'),
    answerInput,

    makeQuestion(item, settings) {
      const hard = settings.difficulty === 'hard';
      const traps = hard ? [neighborsOf(item.code), playable.filter((c) => c.region === item.region)] : [];
      return { ...countryQuestion(item, settings, traps), showLocator: !hard };
    },

    renderPrompt(question) {
      return h('div', { class: 'shape-frame' },
        shapeSvg(question.id, 'shape-svg'),
        question.showLocator ? locator(question.id) : null);
    },

    renderThumb(id) {
      return shapeSvg(id, 'thumb-shape');
    },
  });
})(window.Quizorama = window.Quizorama || {});
