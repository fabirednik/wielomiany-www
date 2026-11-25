import { createDecorativeSvg, createElement } from '../utils/dom.js';

/**
 * Renders the geometric square diagram illustrating (a + b)^2
 * inside the dense right-hand utility column.
 *
 * @param {import('../data/strings_pl.js').STRINGS_PL} strings
 * @returns {HTMLElement}
 */
function createGeometricPreviewCard(strings) {
  const diagram = createElement(
    'div',
    { className: 'geo-square', attrs: { 'aria-hidden': 'true' } },
    createElement(
      'div',
      { className: 'geo-square__cell geo-square__cell--a2' },
      createElement('span', { text: 'a²' })
    ),
    createElement(
      'div',
      { className: 'geo-square__cell geo-square__cell--ab' },
      createElement('span', { text: 'ab' })
    ),
    createElement(
      'div',
      { className: 'geo-square__cell geo-square__cell--ba' },
      createElement('span', { text: 'ab' })
    ),
    createElement(
      'div',
      { className: 'geo-square__cell geo-square__cell--b2' },
      createElement('span', { text: 'b²' })
    )
  );

  return createElement(
    'div',
    { className: 'hero-preview-card' },
    createElement(
      'div',
      { className: 'hero-preview-card__top' },
      createElement('span', {
        className: 'hero-preview-card__label',
        text: strings.hero.previewLabel,
      }),
      createElement('span', {
        className: 'hero-preview-card__formula',
        text: '\\((a + b)^2 = a^2 + 2ab + b^2\\)',
      })
    ),
    diagram,
    createElement('p', {
      className: 'hero-preview-card__caption',
      text: strings.hero.previewCaption,
    })
  );
}

/**
 * Renders the asymmetrical 70/30 Hero poster grid with oversized headline,
 * flat primary/secondary actions, and dense right utility column.
 *
 * @param {import('../data/strings_pl.js').STRINGS_PL} strings
 * @returns {HTMLElement}
 */
export function createHero(strings) {
  const arrowIcon = createDecorativeSvg(['M5 12h14', 'm13 6 6 6-6 6'], {
    className: 'btn__icon',
  });

  const heading = createElement(
    'h1',
    { className: 'hero-title', attrs: { id: 'hero-heading' } },
    strings.hero.titlePrefix,
    createElement('span', {
      className: 'hero-title__accent',
      text: strings.hero.titleHighlight,
    })
  );

  const actions = createElement(
    'div',
    { className: 'hero-actions' },
    createElement(
      'a',
      {
        className: 'btn btn--primary',
        attrs: { href: '#generator-section' },
      },
      strings.hero.primaryCta,
      arrowIcon
    ),
    createElement('a', {
      className: 'btn btn--secondary',
      text: strings.hero.secondaryCta,
      attrs: { href: '#theory-section' },
    })
  );

  const copyColumn = createElement(
    'div',
    { className: 'hero-copy' },
    createElement('p', { className: 'section-index', text: `00 // ${strings.hero.eyebrow}` }),
    heading,
    createElement('div', { className: 'hero-lead-row' },
      createElement('p', { className: 'hero-subtitle', text: strings.hero.subtitle }),
      actions
    )
  );

  const utilityColumn = createElement(
    'aside',
    { className: 'hero-utility' },
    createGeometricPreviewCard(strings)
  );

  const layout = createElement(
    'div',
    { className: 'hero-grid' },
    copyColumn,
    utilityColumn
  );

  return createElement(
    'section',
    {
      className: 'hero-section',
      attrs: { id: 'hero-section', 'aria-labelledby': 'hero-heading' },
    },
    layout
  );
}
