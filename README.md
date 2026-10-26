# Quizorama

Przeglądarkowa aplikacja z quizami o świecie, budowana z niezależnych modułów.
Pierwszy moduł: **Flagi świata** — rozpoznaj kraj po fladze, wybierając jedną z czterech odpowiedzi.

## Uruchomienie

Bez instalacji i bez kroku build — otwórz `index.html` w przeglądarce.
Obrazki flag są pobierane z [flagcdn.com](https://flagcdn.com), więc potrzebny jest internet.

## Funkcje

- 3 tryby gry (silnik wspólny dla wszystkich modułów):
  - **Klasyczny** — 10 / 20 / wszystkie pytania, 15 s na odpowiedź,
  - **Przetrwanie** — 3 życia, 10 s na odpowiedź,
  - **Na czas** — 60 s, błąd kosztuje 3 s.
- W trybach Klasyczny i Przetrwanie można wyłączyć **odliczanie czasu** (bez premii za szybkość, osobne rekordy).
- 2 sposoby odpowiedzi:
  - **4 odpowiedzi** — wybór z listy,
  - **Układanie z liter** — nazwę kraju układa się z rozsypanych liter (z kilkoma literami-pułapkami),
    klikając je lub pisząc na klawiaturze (`Backspace` cofa). Dwa razy więcej czasu.
    Za zdobyte punkty można odkrywać losowe litery (30 pkt za literę, ostatnią trzeba odgadnąć samodzielnie).
- Punktacja: 100 pkt (układanie z liter: 200 pkt) + do 50 pkt za szybkość, mnożnik za serię trafień (do ×1,9).
- Flagi: 197 państw, filtr regionu, poziom łatwy / trudny (trudny = podobne flagi i sąsiedzi).
- Pula **„Moje błędy”**: pomylone flagi wracają do powtórki, trafienia zdejmują je z listy.
- Rekordy dla każdej kombinacji ustawień i statystyki zapisywane w `localStorage`.
- Sterowanie klawiaturą: `1`–`4` wybór odpowiedzi, `Enter` dalej, `Esc` wyjście.
- Jasny i ciemny motyw (wg ustawień systemu), układ dostosowany do telefonu.

## Struktura

```
index.html
css/styles.css
js/core/utils.js      helpery (DOM, losowanie, odmiana)
js/core/storage.js    statystyki, rekordy, pula błędów
js/core/registry.js   rejestr modułów + opis interfejsu modułu
js/core/engine.js     silnik quizu: tryby, timer, punktacja, HUD
js/core/app.js        ekrany: menu, ustawienia, gra, wyniki
js/data/countries.js  wspólne dane krajów (kod, nazwa, stolica, region)
js/modules/flags.js   moduł „Flagi świata”
js/modules/upcoming.js zapowiedzi kolejnych modułów
```

## Dodawanie modułu

1. Utwórz `js/modules/<nazwa>.js` i wywołaj `Quizorama.registerModule({...})` —
   pełny opis interfejsu jest w `js/core/registry.js`, a wzorzec w `js/modules/flags.js`.
2. Dodaj `<script>` w `index.html` przed `js/core/app.js`.
3. Usuń zapowiedź z `js/modules/upcoming.js`.

Moduł dostarcza tylko pulę pytań, generowanie odpowiedzi i wygląd pytania —
tryby gry, punkty, rekordy i ekran wyników daje silnik.
