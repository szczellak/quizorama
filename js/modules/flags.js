(function (Q) {
  'use strict';

  const { h, shuffle } = Q.utils;
  const { countries, regions } = Q.data;
  const byCode = new Map(countries.map((c) => [c.code, c]));

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
      for (const other of group) if (other !== code) lookalikes.get(code).add(other);
    }
  }

  const flagUrl = (code, width) => `https://flagcdn.com/w${width}/${code}.png`;

  function pickDistractors(item, difficulty) {
    const others = countries.filter((c) => c.code !== item.code);
    const picked = [];
    const add = (list) => {
      for (const c of list) if (picked.length < 3 && !picked.includes(c)) picked.push(c);
    };
    if (difficulty === 'hard') {
      add(shuffle([...(lookalikes.get(item.code) || [])]).map((code) => byCode.get(code)).filter(Boolean));
      add(shuffle(others.filter((c) => c.region === item.region)));
    }
    add(shuffle(others));
    return picked;
  }

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
      {
        key: 'answer',
        label: 'Sposób odpowiedzi',
        default: 'choice',
        choices: [
          { value: 'choice', label: '4 odpowiedzi', hint: 'Wybierz właściwy kraj spośród czterech nazw.' },
          {
            value: 'letters',
            label: 'Układanie z liter',
            hint: `Klikaj rozsypane litery (lub pisz na klawiaturze), by ułożyć nazwę kraju — uwaga na litery-pułapki. Za zdobyte punkty odkryjesz losowe litery (${Q.engine.LETTER_COST} pkt za literę).`,
          },
        ],
      },
      {
        key: 'region',
        label: 'Region',
        default: 'world',
        choices: [
          { value: 'world', label: 'Cały świat' },
          ...Object.entries(regions).map(([value, label]) => ({ value, label })),
          { value: 'mistakes', label: 'Moje błędy', hint: 'Flagi, przy których była pomyłka. Każde trafienie zdejmuje flagę z listy.' },
        ],
      },
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

    getPool(settings) {
      if (settings.region === 'mistakes') {
        const misses = Q.storage.moduleStats('flags').misses;
        return countries.filter((c) => misses[c.code]);
      }
      if (settings.region === 'world') return countries;
      return countries.filter((c) => c.region === settings.region);
    },

    answerInput: (settings) => (settings.answer === 'letters' ? 'letters' : 'choice'),

    makeQuestion(item, settings) {
      const question = {
        id: item.code,
        answer: item.name,
        detail: `Stolica: ${item.capital} · ${regions[item.region]}`,
      };
      if (settings.answer === 'letters') return question;

      const options = shuffle([item, ...pickDistractors(item, settings.difficulty)]);
      return {
        ...question,
        options: options.map((c) => ({ id: c.code, label: c.name })),
        correctId: item.code,
      };
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
