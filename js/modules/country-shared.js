(function (Q) {
  'use strict';

  // Wspólne elementy modułów, w których odpowiedzią jest państwo (flagi, kontury…).
  const { shuffle, pickDistractors } = Q.utils;
  const { countries, regions } = Q.data;
  const byCode = new Map(countries.map((c) => [c.code, c]));

  const answerOption = () => ({
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
  });

  const regionOption = (mistakesHint) => ({
    key: 'region',
    label: 'Region',
    default: 'world',
    choices: [
      { value: 'world', label: 'Cały świat' },
      ...Object.entries(regions).map(([value, label]) => ({ value, label })),
      { value: 'mistakes', label: 'Moje błędy', hint: mistakesHint },
    ],
  });

  const answerInput = (settings) => (settings.answer === 'letters' ? 'letters' : 'choice');

  // `list` to kraje dostępne w module; region „Moje błędy” bierze te z pomyłkami w tym module.
  function countryPool(list, settings, moduleId) {
    if (settings.region === 'mistakes') {
      const misses = Q.storage.moduleStats(moduleId).misses;
      return list.filter((c) => misses[c.code]);
    }
    if (settings.region === 'world') return list;
    return list.filter((c) => c.region === settings.region);
  }

  // Pytanie o kraj; `priorityLists` to kraje preferowane jako odpowiedzi-pułapki.
  function countryQuestion(item, settings, priorityLists = []) {
    const question = {
      id: item.code,
      answer: item.name,
      fact: { icon: '🏛️', label: 'Stolica', value: item.capital, note: regions[item.region] },
    };
    if (settings.answer === 'letters') return question;

    const options = shuffle([item, ...pickDistractors(item, countries, ...priorityLists)]);
    return {
      ...question,
      options: options.map((c) => ({ id: c.code, label: c.name })),
      correctId: item.code,
    };
  }

  Q.countryQuiz = { byCode, answerOption, regionOption, answerInput, countryPool, countryQuestion };
})(window.Quizorama = window.Quizorama || {});
