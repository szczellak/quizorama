(function (Q) {
  'use strict';

  const { h, fmt, plural } = Q.utils;
  const LENGTHS = [10, 20, 0]; // 0 = wszystkie elementy z puli
  const TIMER_CHOICES = [
    { value: 'on', label: '⏱️ Włączone', hint: 'Szybka odpowiedź daje premię punktową.' },
    { value: 'off', label: '🧘 Wyłączone', hint: 'Graj w swoim tempie — bez premii za szybkość, mnożnik za serię zostaje.' },
  ];

  let activeGame = null;

  function show(screen) {
    if (activeGame) {
      activeGame.destroy();
      activeGame = null;
    }
    document.getElementById('app').replaceChildren(screen);
    window.scrollTo(0, 0);
  }

  // --- Ustawienia ---

  function defaultSettings(module) {
    const settings = { mode: 'classic', length: 10, timer: 'on' };
    for (const opt of module.options) settings[opt.key] = opt.default;

    const last = Q.storage.moduleStats(module.id).lastSettings || {};
    if (Q.MODES[last.mode]) settings.mode = last.mode;
    if (LENGTHS.includes(last.length)) settings.length = last.length;
    if (TIMER_CHOICES.some((c) => c.value === last.timer)) settings.timer = last.timer;
    for (const opt of module.options) {
      if (opt.choices.some((c) => c.value === last[opt.key])) settings[opt.key] = last[opt.key];
    }
    return settings;
  }

  // Opcja z `when` jest widoczna (i ma znaczenie) tylko przy pasujących ustawieniach.
  const visibleOptions = (module, settings) => module.options.filter((opt) => !opt.when || opt.when(settings));

  function bestKey(module, settings) {
    const parts = [settings.mode];
    if (settings.mode === 'classic') parts.push(settings.length);
    if (!Q.engine.isTimed(Q.MODES[settings.mode], settings)) parts.push('notimer');
    for (const opt of visibleOptions(module, settings)) parts.push(settings[opt.key]);
    return parts.join('|');
  }

  // --- Wspólne komponenty ---

  function stat(label, value) {
    return h('div', { class: 'stat' },
      h('div', { class: 'stat-value' }, value),
      h('div', { class: 'stat-label' }, label));
  }

  function group(label, content, hint) {
    return h('div', { class: 'group' },
      h('div', { class: 'group-label' }, label),
      content,
      hint ? h('p', { class: 'group-hint' }, hint) : null);
  }

  function chips(choices, selected, onSelect) {
    return h('div', { class: 'chips', role: 'group' },
      choices.map((c) => h('button', {
        class: 'chip',
        'aria-pressed': String(c.value === selected),
        onclick: () => onSelect(c.value),
      }, c.label)));
  }

  // --- Ekran główny ---

  function renderHome() {
    const t = Q.storage.totals();
    const accuracy = t.answered ? `${Math.round((t.correct / t.answered) * 100)}%` : '—';

    show(h('div', { class: 'screen home' },
      h('header', { class: 'brand' },
        h('div', { class: 'brand-logo', 'aria-hidden': 'true' }, 'Q'),
        h('div', {},
          h('h1', {}, 'Quizorama'),
          h('p', { class: 'muted' }, 'Sprawdź swoją wiedzę o świecie — quiz po quizie.'))),
      h('div', { class: 'stats-row' },
        stat('Rozegrane gry', fmt(t.played)),
        stat('Poprawne odpowiedzi', fmt(t.correct)),
        stat('Skuteczność', accuracy)),
      h('h2', { class: 'section-title' }, 'Wybierz quiz'),
      h('div', { class: 'module-grid' }, Q.modules.map(moduleCard))));
  }

  function moduleCard(m) {
    const body = [h('h3', {}, m.name), h('p', {}, m.tagline)];

    if (m.comingSoon) {
      return h('div', { class: 'module-card is-soon', 'aria-disabled': 'true' },
        h('span', { class: 'module-icon' }, m.icon),
        h('div', { class: 'module-body' }, body),
        h('span', { class: 'badge' }, 'Wkrótce'));
    }

    const s = Q.storage.moduleStats(m.id);
    if (s.played) {
      const best = Math.max(0, ...Object.values(s.best));
      body.push(h('p', { class: 'module-meta' }, `Gry: ${fmt(s.played)} · Najlepszy wynik: ${fmt(best)} pkt`));
    }
    return h('button', { class: 'module-card', style: { '--accent': m.accent }, onclick: () => renderSetup(m) },
      h('span', { class: 'module-icon' }, m.icon),
      h('div', { class: 'module-body' }, body),
      h('span', { class: 'module-arrow', 'aria-hidden': 'true' }, '→'));
  }

  // --- Ustawienia gry ---

  function renderSetup(m, preset) {
    const settings = preset ? { ...preset } : defaultSettings(m);
    const body = h('div', { class: 'setup-body' });

    function update(key, value) {
      settings[key] = value;
      draw();
    }

    function draw() {
      const pool = m.getPool(settings);
      const best = Q.storage.getBest(m.id, bestKey(m, settings));
      const mode = Q.MODES[settings.mode];
      const input = Q.engine.answerInput(m, settings);

      // h() spłaszcza tablice i pomija null — samo replaceChildren zamieniłoby je na tekst.
      body.replaceChildren(h('div', {},
        group('Tryb gry', h('div', { class: 'mode-grid' },
          Object.values(Q.MODES).map((md) => h('button', {
            class: 'mode-card',
            'aria-pressed': String(md.id === settings.mode),
            onclick: () => update('mode', md.id),
          },
          h('span', { class: 'mode-icon' }, md.icon),
          h('strong', {}, md.label),
          h('span', { class: 'mode-desc' }, Q.engine.modeDescription(md, input, Q.engine.isTimed(md, settings))))))),

        mode.id === 'classic'
          ? group('Liczba pytań', chips(
            LENGTHS.map((v) => ({ value: v, label: v ? String(v) : `Wszystkie (${pool.length})` })),
            settings.length, (v) => update('length', v)))
          : null,

        Q.engine.hasTimerOption(mode)
          ? group('Odliczanie czasu', chips(TIMER_CHOICES, settings.timer, (v) => update('timer', v)),
            TIMER_CHOICES.find((c) => c.value === settings.timer).hint)
          : null,

        visibleOptions(m, settings).map((opt) => {
          const selected = opt.choices.find((c) => c.value === settings[opt.key]);
          return group(opt.label, chips(opt.choices, settings[opt.key], (v) => update(opt.key, v)), selected && selected.hint);
        }),

        h('div', { class: 'start-panel' },
          h('div', { class: 'start-info' },
            h('span', {}, pool.length ? `${pool.length} ${plural(pool.length, m.itemNouns)} w puli` : m.emptyPoolText),
            best ? h('span', { class: 'best' }, `🏆 Rekord: ${fmt(best)} pkt`) : h('span', { class: 'muted small' }, 'Brak rekordu dla tych ustawień')),
          h('button', {
            class: 'btn btn-primary btn-lg',
            disabled: !pool.length,
            onclick: () => startGame(m, settings),
          }, 'Rozpocznij ▶'))));
    }

    draw();
    show(h('div', { class: 'screen setup', style: { '--accent': m.accent } },
      h('header', { class: 'topbar' },
        h('button', { class: 'icon-btn', 'aria-label': 'Wróć do menu', onclick: renderHome }, '←'),
        h('span', { class: 'module-icon sm' }, m.icon),
        h('h1', {}, m.name)),
      h('p', { class: 'muted lead' }, m.description),
      body));
  }

  // --- Gra ---

  function startGame(m, settings) {
    const s = Q.storage.moduleStats(m.id);
    s.lastSettings = { ...settings };
    Q.storage.save();

    const holder = h('div');
    show(holder);
    activeGame = Q.engine.run(holder, m, { ...settings }, {
      onFinish(result) {
        activeGame = null;
        const record = Q.storage.recordGame(m.id, bestKey(m, settings), result);
        renderResults(m, settings, result, record);
      },
      onExit() {
        activeGame = null;
        renderSetup(m, settings);
      },
    });
  }

  // --- Wyniki ---

  function verdict(accuracy) {
    if (accuracy >= 90) return ['🏆', 'Mistrzostwo!'];
    if (accuracy >= 70) return ['🌟', 'Świetny wynik!'];
    if (accuracy >= 50) return ['👍', 'Całkiem nieźle!'];
    return ['💪', 'Trening czyni mistrza'];
  }

  function renderResults(m, settings, r, record) {
    const accuracy = r.answered ? Math.round((r.correct / r.answered) * 100) : 0;
    const [emoji, title] = verdict(accuracy);
    const restart = h('button', { class: 'btn btn-primary btn-lg', onclick: () => startGame(m, settings) }, 'Zagraj ponownie');

    let recordInfo = null;
    if (record.isRecord && r.score > 0) recordInfo = h('div', { class: 'record-badge' }, '🎉 Nowy rekord!');
    else if (record.previous) recordInfo = h('p', { class: 'muted' }, `Twój rekord: ${fmt(record.previous)} pkt`);

    let review = null;
    if (r.mistakes.length) {
      review = h('section', { class: 'review' },
        h('h2', { class: 'section-title' }, `Do powtórki (${r.mistakes.length})`),
        h('ul', { class: 'review-list' },
          r.mistakes.map((x) => h('li', { class: 'review-item' },
            m.renderThumb(x.id),
            h('div', {},
              h('strong', {}, x.answer),
              h('span', { class: 'muted small' }, x.note))))),
        h('p', { class: 'muted small' }, m.reviewHint));
    } else if (r.answered) {
      review = h('p', { class: 'perfect' }, 'Bezbłędnie! 👏');
    }

    show(h('div', { class: 'screen results', style: { '--accent': m.accent } },
      h('div', { class: 'results-hero' },
        h('div', { class: 'results-emoji', 'aria-hidden': 'true' }, emoji),
        h('h1', {}, title),
        h('p', { class: 'muted' }, [
          m.name,
          `tryb ${Q.MODES[settings.mode].label.toLowerCase()}`,
          Q.engine.answerInput(m, settings) === 'letters' ? 'układanie z liter' : null,
          Q.engine.isTimed(Q.MODES[settings.mode], settings) ? null : 'bez czasu',
        ].filter(Boolean).join(' · ')),
        h('div', { class: 'results-score' }, fmt(r.score), h('span', {}, ' pkt')),
        r.lettersBought
          ? h('p', { class: 'muted small' }, `💡 Odkryte litery: ${r.lettersBought} (−${fmt(r.lettersBought * r.letterCost)} pkt)`)
          : null,
        recordInfo),
      h('div', { class: 'stats-row' },
        stat('Poprawne', `${r.correct}/${r.answered}`),
        stat('Skuteczność', `${accuracy}%`),
        stat('Najdłuższa seria', r.bestStreak)),
      h('div', { class: 'results-actions' },
        restart,
        h('button', { class: 'btn', onclick: () => renderSetup(m, settings) }, 'Zmień ustawienia'),
        h('button', { class: 'btn btn-ghost', onclick: renderHome }, 'Menu główne')),
      review));
  }

  renderHome();
})(window.Quizorama = window.Quizorama || {});
