(function (Q) {
  'use strict';

  const { h } = Q.utils;
  const { countries } = Q.data;
  const { byCode, answerOption, regionOption, answerInput, countryPool, countryQuestion } = Q.countryQuiz;

  // Grupy łudząco podobnych flag — używane na poziomie trudnym jako odpowiedzi-pułapki.
  const LOOKALIKES = [
    ['td', 'ro', 'ad', 'md'],
    ['mc', 'id', 'pl', 'sg'],
    ['au', 'nz', 'fj', 'tv'],
    ['ie', 'ci', 'it', 'mx', 'in', 'ne'],
    ['nl', 'lu', 'ru', 'fr', 'hr', 'rs', 'si', 'sk', 'py'],
    ['no', 'is', 'fi', 'se', 'dk'],
    ['ve', 'co', 'ec'],
    ['sn', 'ml', 'gn', 'cm', 'bf'],
    ['ni', 'sv', 'hn', 'gt', 'ar'],
    ['ae', 'ps', 'jo', 'sd', 'kw'],
    ['eg', 'iq', 'sy', 'ye'],
    ['at', 'lv', 'lb', 'pe', 'ca'],
    ['be', 'de', 'ug'],
    ['qa', 'bh'],
    ['gh', 'bo', 'lt', 'et', 'gw'],
    ['us', 'lr', 'my'],
    ['cu', 'gr', 'uy'],
    ['tr', 'tn', 'dz', 'mr', 'pk'],
    ['bg', 'hu', 'ir', 'tj'],
    ['ee', 'bw', 'sl', 'ga'],
    ['cn', 'vn', 'kg', 'mk'],
    ['jp', 'bd', 'pw', 'kr'],
  ];

  const lookalikes = new Map();
  for (const group of LOOKALIKES) {
    for (const code of group) {
      if (!lookalikes.has(code)) lookalikes.set(code, new Set());
      for (const other of group) if (other !== code && byCode.has(other)) lookalikes.get(code).add(byCode.get(other));
    }
  }

  const flagUrl = (code, width) => `https://flagcdn.com/w${width}/${code}.png`;

  Q.registerModule({
    id: 'flags',
    name: 'Flagi świata',
    tagline: 'Rozpoznaj kraj po jego fladze',
    description: 'Zobaczysz flagę — wybierz właściwy kraj spośród czterech odpowiedzi albo ułóż jego nazwę z liter. Szybkie odpowiedzi i serie trafień dają więcej punktów.',
    icon: '🚩',
    accent: '#4f6bff',
    promptLabel: 'Do jakiego kraju należy ta flaga?',
    lettersPromptLabel: 'Ułóż z liter nazwę kraju, do którego należy ta flaga',
    itemNouns: ['flaga', 'flagi', 'flag'],
    emptyPoolText: 'Brak błędów do powtórki — świetna robota!',
    reviewHint: 'Błędne odpowiedzi trafiają do puli „Moje błędy” — powtórz je, wybierając ten region.',

    options: [
      answerOption(),
      regionOption('Flagi, przy których była pomyłka. Każde trafienie zdejmuje flagę z listy.'),
      {
        key: 'difficulty',
        label: 'Poziom trudności',
        default: 'easy',
        when: (settings) => settings.answer === 'choice',
        choices: [
          { value: 'easy', label: 'Łatwy', hint: 'Odpowiedzi to losowe kraje z całego świata.' },
          { value: 'hard', label: 'Trudny', hint: 'Odpowiedzi to kraje o podobnych flagach i sąsiedzi z regionu.' },
        ],
      },
    ],

    getPool: (settings) => countryPool(countries, settings, 'flags'),
    answerInput,

    makeQuestion(item, settings) {
      const traps = settings.difficulty === 'hard'
        ? [[...(lookalikes.get(item.code) || [])], countries.filter((c) => c.region === item.region)]
        : [];
      return countryQuestion(item, settings, traps);
    },

    renderPrompt(question) {
      return h('div', { class: 'flag-frame' },
        h('img', { class: 'flag-img', src: flagUrl(question.id, 640), alt: 'Flaga do rozpoznania', draggable: 'false' }));
    },

    renderThumb(id) {
      return h('img', { class: 'thumb-flag', src: flagUrl(id, 160), alt: '', loading: 'lazy' });
    },

    preload(item) {
      new Image().src = flagUrl(item.code, 640);
    },
  });
})(window.Quizorama = window.Quizorama || {});
