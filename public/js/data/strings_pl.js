/**
 * Polish localization dictionary (i18n).
 * All Polish user-facing strings, mathematical descriptions, and formula data
 * are centralized here to keep HTML and component modules language-agnostic.
 */
export const STRINGS_PL = Object.freeze({
  meta: {
    pageTitle: 'wielomiany — Wzory skróconego mnożenia',
    pageDescription:
      'Nowoczesna aplikacja edukacyjna prezentująca wzory skróconego mnożenia, wizualizację geometryczną oraz interaktywny generator rozwinięć z użyciem trójkąta Pascala.',
  },
  accessibility: {
    skipToContent: 'Przejdź do głównej treści',
    primaryNavLabel: 'Nawigacja po sekcjach',
    copyAnnouncementSuccess: 'Skopiowano kod LaTeX do schowka.',
    copyAnnouncementError: 'Nie udało się skopiować kodu do schowka.',
  },
  nav: {
    brandTitle: 'wielomiany',
    links: {
      video: 'Wizualizacja',
      theory: 'Wzory',
      generator: 'Trójkąt Pascala',
    },
  },
  hero: {
    eyebrow: 'Kompendium algebry i wielomianów',
    titlePrefix: 'Odkryj piękno ',
    titleHighlight: 'wzorów skróconego mnożenia',
    subtitle:
      'Zrozum algebraiczne tożsamości zamiast uczyć się ich na pamięć. Zobacz animację geometryczną, przejrzyj kompletny zestaw wzorów i eksperymentuj z wyższymi potęgami dwumianu.',
    primaryCta: 'Uruchom generator (a + b)ⁿ',
    secondaryCta: 'Przeglądaj wzory',
    previewLabel: 'Tożsamość bazowa',
    previewCaption: 'Pole kwadratu o boku (a + b) dzieli się na cztery obszary.',
  },
  video: {
    eyebrow: 'Animacja matematyczna',
    title: 'Geometryczny dowód i intuicja',
    description:
      'Zamiast mechanicznego przekształcania nawiasów zobacz, jak składniki wielomianu odpowiadają konkretnym polom figur i objętościom brył.',
    caption:
      'Wizualizacja rozkładu potęg dwumianu na pola prostokątów oraz sześciany składowe.',
    fallbackTitle: 'Miejsce na animację wideo',
    fallbackBody:
      'Plik public/assets/manim_animation.mp4 nie został jeszcze dodany. Po umieszczeniu nagrania w folderze public/assets odtwarzacz uruchomi się automatycznie.',
    unsupportedVideo:
      'Twoja przeglądarka nie obsługuje osadzonego odtwarzacza wideo HTML5.',
  },
  theory: {
    eyebrow: 'Baza wiedzy',
    title: 'Najważniejsze wzory skróconego mnożenia',
    description:
      'Zestawienie siedmiu fundamentalnych tożsamości drugiego i trzeciego stopnia wraz z krótkim wyjaśnieniem oraz przykładem zastosowania.',
    copyLabel: 'Kopiuj LaTeX',
    copiedLabel: 'Skopiowano',
    exampleLabel: 'Przykład:',
    groups: [
      {
        id: 'degree-2',
        heading: 'Wzory drugiego stopnia (kwadratowe)',
        formulas: [
          {
            id: 'square-sum',
            badge: 'Stopień 2',
            title: 'Kwadrat sumy',
            latex: '(a + b)^2 = a^2 + 2ab + b^2',
            description:
              'Kwadrat sumy dwóch wyrażeń jest równy sumie kwadratów obu wyrazów powiększonej o ich podwojony iloczyn.',
            exampleLatex: '(x + 3)^2 = x^2 + 6x + 9',
          },
          {
            id: 'square-diff',
            badge: 'Stopień 2',
            title: 'Kwadrat różnicy',
            latex: '(a - b)^2 = a^2 - 2ab + b^2',
            description:
              'Kwadrat różnicy dwóch wyrażeń daje sumę ich kwadratów pomniejszoną o podwojony iloczyn obu składników.',
            exampleLatex: '(2x - 1)^2 = 4x^2 - 4x + 1',
          },
          {
            id: 'diff-squares',
            badge: 'Stopień 2',
            title: 'Różnica kwadratów',
            latex: 'a^2 - b^2 = (a - b)(a + b)',
            description:
              'Różnicę kwadratów dwóch wyrażeń można zapisać jako iloczyn ich różnicy i sumy — kluczowy wzór przy rozkładzie na czynniki.',
            exampleLatex: 'x^2 - 25 = (x - 5)(x + 5)',
          },
        ],
      },
      {
        id: 'degree-3',
        heading: 'Wzory trzeciego stopnia (sześcienne)',
        formulas: [
          {
            id: 'cube-sum',
            badge: 'Stopień 3',
            title: 'Sześcian sumy',
            latex: '(a + b)^3 = a^3 + 3a^2b + 3ab^2 + b^3',
            description:
              'Rozwinięcie trzeciej potęgi sumy dwumianu ma współczynniki 1, 3, 3, 1 pochodzące z trzeciego wiersza trójkąta Pascala.',
            exampleLatex: '(x + 2)^3 = x^3 + 6x^2 + 12x + 8',
          },
          {
            id: 'cube-diff',
            badge: 'Stopień 3',
            title: 'Sześcian różnicy',
            latex: '(a - b)^3 = a^3 - 3a^2b + 3ab^2 - b^3',
            description:
              'Znaki kolejnych wyrazów występują naprzemiennie: plus dla parzystych potęg wyrazu b oraz minus dla nieparzystych.',
            exampleLatex: '(x - 1)^3 = x^3 - 3x^2 + 3x - 1',
          },
          {
            id: 'sum-cubes',
            badge: 'Stopień 3',
            title: 'Suma sześcianów',
            latex: 'a^3 + b^3 = (a + b)(a^2 - ab + b^2)',
            description:
              'Sumę trzecich potęg rozkładamy na sumę podstaw oraz niepełny kwadrat różnicy (bez dwójki przy iloczynie ab).',
            exampleLatex: 'x^3 + 8 = (x + 2)(x^2 - 2x + 4)',
          },
          {
            id: 'diff-cubes',
            badge: 'Stopień 3',
            title: 'Różnica sześcianów',
            latex: 'a^3 - b^3 = (a - b)(a^2 + ab + b^2)',
            description:
              'Różnica sześcianów rozkłada się na iloczyn różnicy podstaw i trójmianu o samych dodatnich znakach.',
            exampleLatex: 'x^3 - 27 = (x - 3)(x^2 + 3x + 9)',
          },
        ],
      },
    ],
  },
  generator: {
    eyebrow: 'Laboratorium dwumianu Newtona',
    title: 'Interaktywny generator z trójkąta Pascala',
    description:
      'Przesuwaj suwak lub kliknij dowolny wiersz trójkąta Pascala, aby obliczyć współczynniki i wygenerować pełny wzór rozwinięcia (a + b)ⁿ.',
    sliderLabel: 'Wykładnik potęgi n',
    sliderAriaValuePrefix: 'Wykładnik potęgi n wynosi',
    exponentBadgePrefix: 'n =',
    termsCountLabel: 'Liczba wyrazów',
    coeffSumLabel: 'Suma współczynników',
    activeRowLabel: 'Aktywne współczynniki',
    minExponentHint: '0 (stała)',
    maxExponentHint: '7 (maks.)',
    triangleHeading: 'Trójkąt Pascala (wiersze 0–7)',
    triangleHint: 'Kliknij wiersz, aby wybrać odpowiedni wykładnik potęgi.',
    rowAriaPrefix: 'Wybierz wiersz trójkąta Pascala dla n =',
    formulaHeading: 'Wygenerowany wzór rozwinięty',
    copyLatexLabel: 'Kopiuj wynik',
    copiedLatexLabel: 'Skopiowano',
  },
  footer: {
    copyrightText: '© 2026 · Stworzone przez współtwórców GitHub',
    repoLinkLabel: 'fabirednik/wielomiany-www',
    repoUrl: 'https://github.com/fabirednik/wielomiany-www',
    repoAriaLabel: 'Repozytorium projektu na GitHubie (otwiera się w nowej karcie)',
  },
});
