(function (Q) {
  'use strict';

  const KEY = 'quizorama.v1';
  let data = null;

  function load() {
    if (data) return data;
    try {
      data = JSON.parse(localStorage.getItem(KEY)) || {};
    } catch {
      data = {};
    }
    data.modules = data.modules || {};
    return data;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(load()));
    } catch {
      // Tryb prywatny / zablokowany storage — gra działa dalej, tylko bez zapisu.
    }
  }

  function moduleStats(moduleId) {
    const modules = load().modules;
    if (!modules[moduleId]) {
      modules[moduleId] = { played: 0, answered: 0, correct: 0, best: {}, misses: {}, lastSettings: null };
    }
    return modules[moduleId];
  }

  // Zapisuje wynik gry. Błędy trafiają do puli powtórek, trafienia ją zmniejszają.
  function recordGame(moduleId, bestKey, result) {
    const s = moduleStats(moduleId);
    s.played += 1;
    s.answered += result.answered;
    s.correct += result.correct;

    for (const m of result.mistakes) s.misses[m.id] = (s.misses[m.id] || 0) + 1;
    for (const id of result.hits) {
      if (!s.misses[id]) continue;
      s.misses[id] -= 1;
      if (s.misses[id] <= 0) delete s.misses[id];
    }

    const previous = s.best[bestKey] || 0;
    const isRecord = result.score > previous;
    if (isRecord) s.best[bestKey] = result.score;
    save();
    return { isRecord, previous };
  }

  function getBest(moduleId, bestKey) {
    return moduleStats(moduleId).best[bestKey] || 0;
  }

  function totals() {
    const t = { played: 0, answered: 0, correct: 0 };
    for (const s of Object.values(load().modules)) {
      t.played += s.played;
      t.answered += s.answered;
      t.correct += s.correct;
    }
    return t;
  }

  Q.storage = { moduleStats, recordGame, getBest, totals, save };
})(window.Quizorama = window.Quizorama || {});
