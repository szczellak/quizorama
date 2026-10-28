(function (Q) {
  'use strict';

  /*
   * Rejestr modułów quizu. Moduł to obiekt:
   *
   * {
   *   id, name, tagline, description, icon, accent,
   *   promptLabel,                 // pytanie nad promptem, np. "Do jakiego kraju należy ta flaga?"
   *   itemNouns: ['flaga', 'flagi', 'flag'],
   *   emptyPoolText,               // komunikat, gdy pula pytań jest pusta
   *   reviewHint,                  // podpowiedź pod listą błędów na ekranie wyników
   *   lettersPromptLabel?,         // pytanie przy układaniu odpowiedzi z liter
   *   options: [{ key, label, default, when?(settings), choices: [{ value, label, hint? }] }],
   *   answerInput?(settings)  -> 'choice' (domyślnie) | 'letters'
   *   getPool(settings)       -> elementy, z których losowane są pytania
   *   makeQuestion(item, settings) ->
   *     wybór:  { id, answer, detail?, fact?, options: [{ id, label }], correctId }
   *     litery: { id, answer, detail?, fact? }   // kafelki silnik tworzy z liter `answer`
   *     fact: { icon?, label, value, note? } — wyróżniona informacja po odpowiedzi i na liście błędów
   *           (np. { icon: '🏛️', label: 'Stolica', value: 'Warszawa', note: 'Europa' })
   *   renderPrompt(question)  -> węzeł DOM z treścią pytania
   *   renderThumb(id)         -> mały węzeł DOM do listy błędów
   *   preload?(item)          -> opcjonalne wczytanie zasobów następnego pytania
   * }
   *
   * Moduł z `comingSoon: true` jest tylko zapowiedzią na ekranie głównym.
   */
  const modules = [];

  Q.modules = modules;
  Q.registerModule = (def) => {
    if (modules.some((m) => m.id === def.id)) throw new Error(`Moduł "${def.id}" jest już zarejestrowany`);
    modules.push(def);
  };
})(window.Quizorama = window.Quizorama || {});
