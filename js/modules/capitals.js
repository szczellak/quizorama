(function (Q) {
  'use strict';

  const { h, shuffle, pickDistractors } = Q.utils;
  const { countries, regions, shapes } = Q.data;
  const { byCode, answerOption, regionOption, answerInput, countryPool } = Q.countryQuiz;

  const neighborsOf = (code) => ((shapes && shapes.neighbors[code]) || []).map((n) => byCode.get(n)).filter(Boolean);
  const toCountry = (settings) => settings.direction === 'country';

  const flagUrl = (code, width) => `https://flagcdn.com/w${width}/${code}.png`;

  Q.registerModule({
    id: 'capitals',
    name: 'Stolice',
    tagline: 'Dopasuj stolicę do państwa',
    description: 'Zobaczysz kraj i jego flagę — wskaż stolicę. Możesz też grać odwrotnie: po nazwie stolicy rozpoznaj kraj. Odpowiadaj z czterech opcji albo układaj nazwę z liter.',
    icon: '🏛️',
    accent: '#8b5cf6',
    promptLabel: (settings) => (toCountry(settings) ? 'Którego kraju to stolica?' : 'Jaka jest stolica tego kraju?'),
    lettersPromptLabel: (settings) => (toCountry(settings) ? 'Ułóż z liter nazwę kraju z tą stolicą' : 'Ułóż z liter nazwę stolicy tego kraju'),
    itemNouns: ['stolica', 'stolice', 'stolic'],
    emptyPoolText: 'Brak błędów do powtórki — świetna robota!',
    reviewHint: 'Błędne odpowiedzi trafiają do puli „Moje błędy” — powtórz je, wybierając ten region.',

    options: [
      {
        key: 'direction',
        label: 'Kierunek',
        default: 'capital',
        choices: [
          { value: 'capital', label: 'Kraj → stolica', hint: 'Widzisz kraj i jego flagę, podajesz stolicę.' },
          { value: 'country', label: 'Stolica → kraj', hint: 'Widzisz nazwę stolicy, podajesz kraj.' },
        ],
      },
      answerOption({ pick: 'właściwą odpowiedź', word: 'nazwę stolicy lub kraju' }),
      regionOption('Stolice, przy których była pomyłka. Każde trafienie zdejmuje stolicę z listy.'),
      {
        key: 'difficulty',
        label: 'Poziom trudności',
        default: 'easy',
        when: (settings) => settings.answer === 'choice',
        choices: [
          { value: 'easy', label: 'Łatwy', hint: 'Odpowiedzi to losowe kraje z całego świata.' },
          { value: 'hard', label: 'Trudny', hint: 'Odpowiedzi to sąsiedzi i kraje z tego samego regionu.' },
        ],
      },
    ],

    getPool: (settings) => countryPool(countries, settings, 'capitals'),
    answerInput,

    makeQuestion(item, settings) {
      const reverse = toCountry(settings);
      const labelOf = (c) => (reverse ? c.name : c.capital);
      // Stolica o tej samej nazwie co kraj (Meksyk, Monako…) — warto to wprost utrwalić.
      const note = item.capital === item.name ? 'Ta sama nazwa co kraj!' : regions[item.region];
      const question = {
        id: item.code,
        answer: labelOf(item),
        reverse,
        fact: reverse
          ? { icon: '🏛️', label: 'Stolica', value: item.capital, note }
          : { icon: '🏛️', label: `Stolica · ${item.name}`, value: item.capital, note },
      };
      if (settings.answer === 'letters') return question;

      const traps = settings.difficulty === 'hard'
        ? [neighborsOf(item.code), countries.filter((c) => c.region === item.region)]
        : [];
      const options = shuffle([item, ...pickDistractors(item, countries, ...traps)]);
      return {
        ...question,
        options: options.map((c) => ({ id: c.code, label: labelOf(c) })),
        correctId: item.code,
      };
    },

    renderPrompt(question) {
      const country = byCode.get(question.id);
      if (question.reverse) {
        return h('div', { class: 'capital-frame' },
          h('span', { class: 'capital-icon', 'aria-hidden': 'true' }, '🏛️'),
          h('strong', { class: 'capital-name' }, country.capital));
      }
      return h('div', { class: 'capital-frame' },
        h('img', { class: 'capital-flag', src: flagUrl(question.id, 320), alt: '', draggable: 'false' }),
        h('strong', { class: 'capital-name' }, country.name));
    },

    renderThumb(id) {
      return h('img', { class: 'thumb-flag', src: flagUrl(id, 160), alt: '', loading: 'lazy' });
    },

    preload(item) {
      new Image().src = flagUrl(item.code, 320);
    },
  });
})(window.Quizorama = window.Quizorama || {});
