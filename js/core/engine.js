(function (Q) {
  'use strict';

  const { h, shuffle, fmt } = Q.utils;

  const timeText = (t) => (t ? `${t} s na odpowiedź` : 'Bez limitu czasu');

  const MODES = {
    classic: {
      id: 'classic', label: 'Klasyczny', icon: '🎯',
      desc: (t) => `Ustalona liczba pytań. ${timeText(t)}.`,
      questionTime: 15,
    },
    survival: {
      id: 'survival', label: 'Przetrwanie', icon: '💖',
      desc: (t) => `Grasz, dopóki masz 3 życia. ${timeText(t)}.`,
      questionTime: 10, lives: 3,
    },
    timeattack: {
      id: 'timeattack', label: 'Na czas', icon: '⚡',
      desc: () => '60 sekund na jak najwięcej trafień. Błąd kosztuje 3 s.',
      totalTime: 60, penalty: 3,
    },
  };

  // Sposób odpowiadania: wybór z listy albo układanie odpowiedzi z liter (więcej czasu i punktów).
  const INPUTS = {
    choice: { basePoints: 100, timeFactor: 1 },
    letters: { basePoints: 200, timeFactor: 2 },
  };

  const SPEED_BONUS = 50;
  const STREAK_STEP = 0.1;
  const MAX_STREAK_STEPS = 9; // mnożnik maks. x1,9
  const LETTER_COST = 30;

  // Litery-pułapki losowane z tego zbioru (częstsze litery występują kilka razy).
  const DECOY_LETTERS = 'AAAEEEIIIOOOUYRRNNSSTTKKLLMMPWZZCDGBJHŁŃŚŻĆ';
  const MIN_DECOYS = 4;
  const MAX_DECOYS = 8;
  const TARGET_TILES = 14;

  function pointsFor(streak, speedFraction, basePoints) {
    const multiplier = 1 + Math.min(streak - 1, MAX_STREAK_STEPS) * STREAK_STEP;
    return Math.round((basePoints + SPEED_BONUS * speedFraction) * multiplier);
  }

  // Tryb z limitem na pytanie można grać bez odliczania (settings.timer === 'off').
  const hasTimerOption = (mode) => !!mode.questionTime;
  const isTimed = (mode, settings) => !hasTimerOption(mode) || settings.timer !== 'off';
  const questionTime = (mode, input, timed = true) => (timed ? (mode.questionTime || 0) * INPUTS[input].timeFactor : 0);
  const modeDescription = (mode, input, timed) => mode.desc(questionTime(mode, input, timed));
  const answerInput = (module, settings) => (module.answerInput ? module.answerInput(settings) : 'choice');

  const isLetter = (ch) => /\p{L}/u.test(ch);
  // Litera bez ogonków, żeby z klawiatury „l” pasowało też do kafelka „Ł”.
  const baseLetter = (ch) => ch.toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '');

  function makeTiles(letters) {
    const decoys = Math.max(MIN_DECOYS, Math.min(MAX_DECOYS, TARGET_TILES - letters.length));
    const chars = [...letters];
    for (let i = 0; i < decoys; i++) chars.push(DECOY_LETTERS[Math.floor(Math.random() * DECOY_LETTERS.length)]);
    return shuffle(chars);
  }

  /*
   * Uruchamia grę w `root`. Zwraca { destroy } do przerwania z zewnątrz.
   * callbacks.onFinish(result) — koniec gry, callbacks.onExit() — gracz wyszedł.
   */
  function run(root, module, settings, callbacks) {
    const mode = MODES[settings.mode];
    const input = answerInput(module, settings);
    const timeLimit = questionTime(mode, input, isTimed(mode, settings));
    const pool = module.getPool(settings);
    const total = mode.id === 'classic' ? Math.min(settings.length || pool.length, pool.length) : Infinity;

    const st = {
      score: 0, streak: 0, bestStreak: 0, correct: 0, answered: 0, lettersBought: 0,
      lives: mode.lives || 0, mistakes: [], hits: [],
    };

    let queue = shuffle(pool);
    let queuePos = 0;
    let question = null;
    let puzzle = null; // stan układanki: { slots, tiles, slotsEl, hintBtn, checking }
    let locked = false;
    let ended = false;
    let waitingForPrompt = false;
    let rafId = 0;
    let advanceTimer = 0;
    let questionStart = 0;
    const startedAt = performance.now();
    let gameEndsAt = mode.totalTime ? startedAt + mode.totalTime * 1000 : 0;

    // --- DOM ---
    const progressEl = h('div', { class: 'hud-progress' });
    const clockEl = h('span', { class: 'clock' });
    const hitsEl = h('span', { class: 'progress-text' });
    const scoreEl = h('span', { class: 'hud-score-value' }, '0');
    const streakEl = h('span', { class: 'hud-streak', hidden: true });
    const timerEl = h('div', { class: 'timer' }, h('div', { class: 'timer-fill' }));
    const timerFill = timerEl.firstChild;
    const promptEl = h('div', { class: 'prompt' });
    const answerEl = h('div', { class: 'answer' });
    const feedbackEl = h('div', { class: 'feedback', 'aria-live': 'polite' });
    const label = input === 'letters' ? module.lettersPromptLabel || module.promptLabel : module.promptLabel;
    const questionEl = h('section', { class: 'question' },
      h('p', { class: 'question-label' }, typeof label === 'function' ? label(settings) : label),
      promptEl, answerEl, feedbackEl);

    root.replaceChildren(h('div', { class: 'screen game', style: { '--accent': module.accent } },
      h('header', { class: 'hud' },
        h('button', { class: 'icon-btn', title: 'Zakończ (Esc)', 'aria-label': 'Zakończ grę', onclick: exit }, '✕'),
        progressEl,
        h('div', { class: 'hud-score' }, streakEl, scoreEl, h('span', { class: 'hud-score-label' }, 'pkt'))),
      timerEl,
      questionEl));

    // Elementy postępu powstają raz na grę i są tylko aktualizowane — przebudowa co odpowiedź
    // odtwarzała od nowa animację utraconych serc (migotanie) i psuła płynne przesuwanie paska.
    const progressFill = h('div', { class: 'progress-fill' });
    const progressText = h('span', { class: 'progress-text' });
    const heartsEl = h('div', { class: 'hearts' });
    const hearts = Array.from({ length: mode.lives || 0 }, () => h('span', { class: 'heart' }, '♥'));
    heartsEl.append(...hearts);

    if (mode.id === 'classic') progressEl.replaceChildren(h('div', { class: 'progress-track' }, progressFill), progressText);
    else if (mode.id === 'survival') progressEl.replaceChildren(heartsEl, progressText);
    else progressEl.replaceChildren(clockEl, hitsEl);
    if (!mode.totalTime && !timeLimit) timerEl.hidden = true;

    function renderHud() {
      scoreEl.textContent = fmt(st.score);
      streakEl.hidden = st.streak < 2;
      streakEl.textContent = `🔥 ${st.streak}`;

      const number = st.answered + (locked ? 0 : 1);
      if (mode.id === 'classic') {
        progressFill.style.width = `${(st.answered / total) * 100}%`;
        progressText.textContent = `${Math.min(number, total)}/${total}`;
      } else if (mode.id === 'survival') {
        // toggle nie dodaje klasy ponownie, więc animacja utraty gra tylko raz — w chwili straty
        hearts.forEach((el, i) => el.classList.toggle('is-lost', i >= st.lives));
        heartsEl.setAttribute('aria-label', `Życia: ${st.lives}`);
        progressText.textContent = `Pytanie ${number}`;
      } else {
        hitsEl.textContent = `✓ ${st.correct}`;
      }
      if (puzzle) updateHintButton();
    }

    function popPoints(label, variant) {
      promptEl.appendChild(h('span', {
        class: `points-pop ${variant || ''}`,
        onanimationend: (e) => e.currentTarget.remove(),
      }, label));
    }

    function nextItem() {
      if (queuePos >= queue.length) {
        const last = queue[queue.length - 1];
        queue = shuffle(pool);
        if (queue.length > 1 && queue[0] === last) queue.push(queue.shift());
        queuePos = 0;
      }
      return queue[queuePos++];
    }

    // --- Pytanie ---

    function showQuestion() {
      question = module.makeQuestion(nextItem(), settings);
      locked = false;
      puzzle = null;

      promptEl.replaceChildren(module.renderPrompt(question));
      feedbackEl.className = 'feedback';
      feedbackEl.replaceChildren();
      if (input === 'letters') renderPuzzle();
      else renderChoices();

      // Licznik startuje dopiero, gdy obrazek się wczyta — wolne łącze nie zabiera czasu.
      questionStart = performance.now();
      const img = promptEl.querySelector('img');
      waitingForPrompt = !!img && !img.complete;
      if (waitingForPrompt) {
        const ready = () => { waitingForPrompt = false; questionStart = performance.now(); };
        img.addEventListener('load', ready, { once: true });
        img.addEventListener('error', ready, { once: true });
      }

      if (module.preload && queuePos < queue.length) module.preload(queue[queuePos]);

      questionEl.classList.remove('enter');
      void questionEl.offsetWidth; // restart animacji
      questionEl.classList.add('enter');
      renderHud();
    }

    function renderChoices() {
      answerEl.className = 'answer options';
      answerEl.replaceChildren(...question.options.map((opt, i) =>
        h('button', { class: 'option', 'data-id': opt.id, onclick: () => choose(opt.id) },
          h('kbd', {}, String(i + 1)),
          h('span', { class: 'option-label' }, opt.label))));
    }

    // --- Układanka z liter ---

    function renderPuzzle() {
      const slots = [];
      const slotsEl = h('div', { class: 'slots' },
        question.answer.split(' ').map((word) => h('span', { class: 'slot-word' },
          [...word].map((ch) => {
            if (!isLetter(ch)) return h('span', { class: 'slot-sep' }, ch);
            const slot = { ch: ch.toUpperCase(), tile: null, revealed: false };
            slot.el = h('button', { type: 'button', class: 'slot', 'aria-label': 'Pusta kratka', onclick: () => releaseSlot(slot) });
            slots.push(slot);
            return slot.el;
          }))));

      const tiles = makeTiles(slots.map((s) => s.ch)).map((ch) => {
        const tile = { ch, used: false };
        tile.el = h('button', { type: 'button', class: 'tile', onclick: () => placeTile(tile) }, ch);
        return tile;
      });

      const hintBtn = h('button', { type: 'button', class: 'btn btn-sm hint-btn', onclick: revealLetter });

      answerEl.className = 'answer letters-answer';
      answerEl.replaceChildren(
        slotsEl,
        h('div', { class: 'tiles' }, tiles.map((t) => t.el)),
        h('div', { class: 'answer-actions' },
          hintBtn,
          h('div', { class: 'answer-actions-end' },
            h('button', { type: 'button', class: 'btn btn-sm', title: 'Wyczyść (Backspace cofa jedną literę)', onclick: clearSlots }, '⌫ Wyczyść'),
            h('button', { type: 'button', class: 'btn btn-sm btn-ghost', onclick: () => resolve(false, { note: 'Pominięte' }) }, 'Nie wiem'))));

      puzzle = { slots, tiles, slotsEl, hintBtn, checking: false };
      renderPuzzleState();
    }

    function renderPuzzleState() {
      for (const slot of puzzle.slots) {
        slot.el.textContent = slot.tile ? slot.tile.ch : '';
        slot.el.classList.toggle('is-filled', !!slot.tile && !slot.revealed);
        slot.el.classList.toggle('is-revealed', slot.revealed);
        slot.el.disabled = locked || slot.revealed || !slot.tile;
        slot.el.setAttribute('aria-label', slot.tile ? `Litera ${slot.tile.ch} — kliknij, aby cofnąć` : 'Pusta kratka');
      }
      for (const tile of puzzle.tiles) {
        tile.el.classList.toggle('is-used', tile.used);
        tile.el.disabled = locked || tile.used;
      }
    }

    const canEdit = () => puzzle && !locked && !ended && !puzzle.checking;

    function placeTile(tile) {
      if (!canEdit() || tile.used) return;
      const slot = puzzle.slots.find((s) => !s.tile);
      if (!slot) return;
      slot.tile = tile;
      tile.used = true;
      clearFeedback();
      renderPuzzleState();
      checkIfComplete();
    }

    function releaseSlot(slot) {
      if (!canEdit() || slot.revealed || !slot.tile) return;
      slot.tile.used = false;
      slot.tile = null;
      renderPuzzleState();
    }

    function releaseLast() {
      const filled = puzzle.slots.filter((s) => s.tile && !s.revealed);
      if (filled.length) releaseSlot(filled[filled.length - 1]);
    }

    function clearSlots() {
      if (!canEdit()) return;
      for (const slot of puzzle.slots) {
        if (slot.revealed || !slot.tile) continue;
        slot.tile.used = false;
        slot.tile = null;
      }
      renderPuzzleState();
    }

    // Klawiatura: najpierw dokładnie ta litera, potem ta sama bez ogonków (l → Ł).
    function placeByKey(key) {
      const free = puzzle.tiles.filter((t) => !t.used);
      const tile = free.find((t) => t.ch === key.toUpperCase()) || free.find((t) => baseLetter(t.ch) === baseLetter(key));
      if (tile) placeTile(tile);
    }

    function updateHintButton() {
      const hidden = puzzle.slots.filter((s) => !s.revealed).length;
      const affordable = st.score >= LETTER_COST;
      puzzle.hintBtn.disabled = locked || hidden <= 1 || !affordable;
      puzzle.hintBtn.title = hidden <= 1
        ? 'Ostatnią literę trzeba odgadnąć samodzielnie'
        : affordable ? 'Odkryj losową literę' : `Potrzebujesz ${LETTER_COST} pkt — zdobywasz je za poprawne odpowiedzi`;
      puzzle.hintBtn.replaceChildren('💡 Odkryj literę ', h('span', { class: 'hint-cost' }, `${LETTER_COST} pkt`));
    }

    function revealLetter() {
      if (!canEdit()) return;
      const hidden = puzzle.slots.filter((s) => !s.revealed);
      if (hidden.length <= 1 || st.score < LETTER_COST) return;

      const slot = hidden[Math.floor(Math.random() * hidden.length)];
      if (slot.tile) {
        slot.tile.used = false;
        slot.tile = null;
      }
      // Właściwy kafelek jest zawsze dostępny: wolny albo wstawiony przez gracza w inną kratkę.
      let tile = puzzle.tiles.find((t) => !t.used && t.ch === slot.ch);
      if (!tile) {
        const holder = puzzle.slots.find((s) => !s.revealed && s.tile && s.tile.ch === slot.ch);
        tile = holder.tile;
        holder.tile = null;
      }
      tile.used = true;
      slot.tile = tile;
      slot.revealed = true;

      st.score -= LETTER_COST;
      st.lettersBought += 1;
      popPoints(`−${LETTER_COST}`, 'is-cost');
      renderPuzzleState();
      renderHud();
      checkIfComplete();
    }

    function checkIfComplete() {
      if (puzzle.slots.some((s) => !s.tile)) return;
      if (puzzle.slots.every((s) => s.tile.ch === s.ch)) return resolve(true, {});

      // Zła odpowiedź nie kończy pytania — litery wracają, można próbować do upływu czasu.
      puzzle.checking = true;
      puzzle.slotsEl.classList.add('is-wrong');
      feedbackEl.className = 'feedback is-bad';
      feedbackEl.replaceChildren(h('div', { class: 'feedback-text' },
        h('span', { class: 'feedback-title' }, 'To nie to'),
        h('span', { class: 'feedback-detail' }, 'Spróbuj jeszcze, odkryj literę albo pomiń.')));
      setTimeout(() => {
        if (!puzzle || locked || ended) return;
        puzzle.checking = false;
        puzzle.slotsEl.classList.remove('is-wrong');
        clearSlots();
      }, 700);
    }

    function clearFeedback() {
      if (locked) return;
      feedbackEl.className = 'feedback';
      feedbackEl.replaceChildren();
    }

    function choose(choiceId) {
      const chosen = question.options.find((o) => o.id === choiceId);
      resolve(choiceId === question.correctId, { choiceId, note: chosen ? `Twoja odpowiedź: ${chosen.label}` : 'Czas minął' });
    }

    // --- Rozstrzygnięcie pytania ---

    function resolve(ok, info) {
      if (locked || ended) return;
      locked = true;
      st.answered += 1;
      const elapsed = (performance.now() - questionStart) / 1000;

      if (puzzle) revealAnswer(ok);
      else markChoices(info.choiceId);

      let points = 0;
      if (ok) {
        st.correct += 1;
        st.streak += 1;
        st.bestStreak = Math.max(st.bestStreak, st.streak);
        const speed = timeLimit ? Math.max(0, 1 - elapsed / timeLimit) : 0;
        points = pointsFor(st.streak, speed, INPUTS[input].basePoints);
        st.score += points;
        st.hits.push(question.id);
      } else {
        st.streak = 0;
        st.mistakes.push({ id: question.id, answer: question.answer, note: info.note, fact: question.fact });
        if (mode.lives) st.lives -= 1;
        if (mode.penalty) gameEndsAt -= mode.penalty * 1000;
        if (navigator.vibrate) navigator.vibrate(120);
      }

      // Pauza przed kolejnym pytaniem = czas wyświetlania okienka ze stolicą.
      // W trybie „Na czas” zegar biegnie także w pauzie, więc tam zostaje krótsza.
      const fast = mode.id === 'timeattack';
      const delay = ok ? (fast ? 600 : 1600) : (fast ? 1400 : 3100);
      showFeedback(ok, points, info, delay);
      renderHud();
      advanceTimer = setTimeout(advance, delay);
    }

    function markChoices(choiceId) {
      for (const btn of answerEl.children) {
        btn.disabled = true;
        const id = btn.dataset.id;
        if (id === question.correctId) btn.classList.add('is-correct');
        else if (id === choiceId) btn.classList.add('is-wrong');
        else btn.classList.add('is-dim');
      }
    }

    function revealAnswer(ok) {
      puzzle.slotsEl.classList.remove('is-wrong');
      renderPuzzleState();
      for (const slot of puzzle.slots) {
        slot.el.textContent = slot.ch;
        slot.el.classList.add(ok ? 'is-good' : 'is-bad');
      }
      for (const btn of answerEl.querySelectorAll('button')) btn.disabled = true;
    }

    function showFeedback(ok, points, info, duration) {
      feedbackEl.className = `feedback ${ok ? 'is-good' : 'is-bad'}`;
      const title = ok ? 'Dobrze!' : info.timedOut ? 'Czas minął!' : 'Niestety…';
      const lines = [h('span', { class: 'feedback-title' }, title)];
      if (!ok) lines.push(h('span', { class: 'feedback-answer' }, 'Poprawnie: ', h('strong', {}, question.answer)));
      if (question.detail) lines.push(h('span', { class: 'feedback-detail' }, question.detail));
      feedbackEl.replaceChildren(h('div', { class: 'feedback-text' }, lines));
      if (question.fact) showFactPopup(ok, duration);
      if (!ok) {
        feedbackEl.appendChild(h('button', { class: 'btn btn-sm', onclick: advance }, 'Dalej ', h('kbd', {}, '↵')));
      }

      if (ok) popPoints(`+${points}`);
      else popPoints(mode.penalty ? `−${mode.penalty} s` : mode.lives ? '−1 ♥' : '✗', 'is-bad');
    }

    // Ciekawostka (np. stolica) wyskakuje na obrazku pytania — tam, gdzie gracz patrzy — i znika przed kolejnym.
    function showFactPopup(ok, duration) {
      const { fact } = question;
      promptEl.appendChild(h('div', { class: 'fact-layer', 'aria-hidden': 'true' },
        h('div', { class: `fact-card ${ok ? 'is-good' : 'is-bad'}`, style: { '--life': `${duration}ms` } },
          ok || fact.value === question.answer ? null : h('span', { class: 'fact-answer' }, question.answer),
          h('span', { class: 'fact-label' }, `${fact.icon || ''} ${fact.label}`.trim()),
          h('strong', { class: 'fact-value' }, fact.value),
          fact.note ? h('span', { class: 'fact-note' }, fact.note) : null)));
    }

    function advance() {
      clearTimeout(advanceTimer);
      if (ended || !locked) return;
      const outOfTime = mode.totalTime && performance.now() >= gameEndsAt;
      if ((mode.lives && st.lives <= 0) || st.answered >= total || outOfTime) return finish();
      showQuestion();
    }

    // --- Pętla czasu i klawiatura ---

    function tick(now) {
      if (ended) return;
      if (mode.totalTime) {
        const left = Math.max(0, gameEndsAt - now);
        timerFill.style.transform = `scaleX(${left / (mode.totalTime * 1000)})`;
        timerEl.classList.toggle('is-low', left < 10000);
        clockEl.textContent = `${Math.ceil(left / 1000)} s`;
        if (left <= 0) return finish();
      } else if (!locked && timeLimit) {
        const elapsed = waitingForPrompt ? 0 : now - questionStart;
        const frac = Math.max(0, 1 - elapsed / (timeLimit * 1000));
        timerFill.style.transform = `scaleX(${frac})`;
        timerEl.classList.toggle('is-low', frac < 0.3);
        if (frac <= 0) resolve(false, { timedOut: true, note: 'Czas minął' });
      }
      rafId = requestAnimationFrame(tick);
    }

    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') return exit();
      if (locked) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          advance();
        }
        return;
      }
      if (puzzle) {
        if (e.key === 'Backspace') {
          e.preventDefault();
          if (canEdit()) releaseLast();
        } else if (e.key.length === 1 && isLetter(e.key)) {
          e.preventDefault();
          placeByKey(e.key);
        }
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= question.options.length) choose(question.options[n - 1].id);
    }

    function cleanup() {
      ended = true;
      cancelAnimationFrame(rafId);
      clearTimeout(advanceTimer);
      document.removeEventListener('keydown', onKey);
    }

    function finish() {
      if (ended) return;
      cleanup();
      callbacks.onFinish({
        score: st.score,
        correct: st.correct,
        answered: st.answered,
        bestStreak: st.bestStreak,
        lettersBought: st.lettersBought,
        letterCost: LETTER_COST,
        mistakes: st.mistakes,
        hits: st.hits,
        durationMs: performance.now() - startedAt,
      });
    }

    function exit() {
      if (ended) return;
      cleanup();
      callbacks.onExit();
    }

    document.addEventListener('keydown', onKey);
    showQuestion();
    rafId = requestAnimationFrame(tick);

    return { destroy: () => { if (!ended) cleanup(); } };
  }

  Q.MODES = MODES;
  Q.engine = { run, modeDescription, answerInput, hasTimerOption, isTimed, LETTER_COST };
})(window.Quizorama = window.Quizorama || {});
