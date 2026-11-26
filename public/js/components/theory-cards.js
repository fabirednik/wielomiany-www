import { bindCopyButton } from '../utils/clipboard.js';
import { createDecorativeSvg, createElement } from '../utils/dom.js';

/**
 * Builds an individual semantic <article> cell inside the asymmetrical brutalist formula matrix.
 *
 * @param {object} formula
 * @param {import('../data/strings_pl.js').STRINGS_PL} strings
 * @param {HTMLElement} liveRegion
 * @returns {HTMLElement}
 */
function createFormulaCard(formula, strings, liveRegion) {
  const copyIcon = createDecorativeSvg(
    [
      'M9 9h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z',
      'M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1',
    ],
    { className: 'copy-btn__icon' }
  );

  const copyButton = createElement(
    'button',
    {
      className: 'copy-btn',
      attrs: {
        type: 'button',
        'aria-label': `${strings.theory.copyLabel}: ${formula.title}`,
      },
    },
    copyIcon,
    createElement('span', {
      text: strings.theory.copyLabel,
      dataset: { copyLabel: 'true' },
    })
  );

  bindCopyButton(copyButton, () => formula.latex, {
    defaultLabel: strings.theory.copyLabel,
    copiedLabel: strings.theory.copiedLabel,
    liveRegion,
    announcementSuccess: strings.accessibility.copyAnnouncementSuccess,
    announcementError: strings.accessibility.copyAnnouncementError,
  });

  const header = createElement(
    'header',
    { className: 'formula-card__header' },
    createElement(
      'div',
      { className: 'formula-card__title-group' },
      createElement('h4', { className: 'formula-card__title', text: formula.title })
    ),
    copyButton
  );

  const mathBlock = createElement('div', {
    className: 'formula-card__math',
    text: `\\[${formula.latex}\\]`,
  });

  const description = createElement('p', {
    className: 'formula-card__desc',
    text: formula.description,
  });

  const example = createElement(
    'div',
    { className: 'formula-card__example' },
    createElement('span', {
      className: 'formula-card__example-label',
      text: strings.theory.exampleLabel,
    }),
    createElement('span', {
      className: 'formula-card__example-math',
      text: `\\(${formula.exampleLatex}\\)`,
    })
  );

  return createElement(
    'article',
    {
      className: 'formula-card',
      dataset: { formulaId: formula.id },
    },
    header,
    mathBlock,
    createElement('div', { className: 'formula-card__meta' }, description, example)
  );
}

/**
 * Renders the Theory section as a raw wireframe grid organized by polynomial degree.
 *
 * @param {import('../data/strings_pl.js').STRINGS_PL} strings
 * @returns {HTMLElement}
 */
export function createTheoryCards(strings) {
  const sectionHeader = createElement(
    'div',
    { className: 'section-header' },
    createElement('h2', {
      className: 'section-title',
      text: strings.theory.title,
      attrs: { id: 'theory-heading' },
    })
  );

  const liveRegion = createElement('div', {
    className: 'visually-hidden',
    attrs: { 'aria-live': 'polite', role: 'status' },
  });

  const groupElements = strings.theory.groups.map((group) => {
    const gridModifier =
      group.formulas.length === 3 ? 'cards-grid--asym-three' : 'cards-grid--asym-four';

    const grid = createElement(
      'div',
      { className: `cards-grid ${gridModifier}` },
      ...group.formulas.map((formula) => createFormulaCard(formula, strings, liveRegion))
    );

    return createElement(
      'div',
      { className: 'formula-group', dataset: { groupId: group.id } },
      createElement('h3', { className: 'formula-group__heading', text: group.heading }),
      grid
    );
  });

  return createElement(
    'section',
    {
      className: 'content-section',
      attrs: { id: 'theory-section', 'aria-labelledby': 'theory-heading' },
    },
    sectionHeader,
    liveRegion,
    ...groupElements
  );
}
