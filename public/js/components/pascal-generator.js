import { bindCopyButton } from '../utils/clipboard.js';
import { createDecorativeSvg, createElement } from '../utils/dom.js';
import { typesetMath } from '../utils/mathjax.js';
import {
  MAX_EXPONENT,
  MIN_EXPONENT,
  buildBinomialExpansionLatex,
  buildPascalTriangle,
  clampExponent,
  getCoefficientSum,
  getPascalRow,
} from '../utils/pascal-math.js';

const DEFAULT_EXPONENT = 3;

/**
 * Syncs CSS custom properties and progress bar fill width for the active range slider.
 *
 * @param {HTMLInputElement} slider
 * @param {HTMLElement} progressBar
 */
function syncSliderState(slider, progressBar) {
  const min = Number(slider.min || MIN_EXPONENT);
  const max = Number(slider.max || MAX_EXPONENT);
  const value = Number(slider.value);
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;

  slider.style.setProperty('--attr-min', String(min));
  slider.style.setProperty('--attr-max', String(max));
  slider.style.setProperty('--control-value', String(value));
  progressBar.style.width = `${percent}%`;
}

/**
 * Creates a reusable formula output panel with a header, MathJax container, and copy button.
 *
 * @param {object} config
 * @param {string} config.kind
 * @param {string} config.headingText
 * @param {() => string} config.getLatex
 * @param {HTMLElement} config.liveRegion
 * @param {import('../data/strings_pl.js').STRINGS_PL} config.strings
 * @returns {{ panel: HTMLElement, mathContainer: HTMLElement }}
 */
function createOutputPanel({ kind, headingText, getLatex, liveRegion, strings }) {
  const formulaDisplay = createElement('div', {
    className: 'generator-output__math',
    attrs: { 'aria-live': 'polite' },
    dataset: { formulaKind: kind },
  });

  const copyIcon = createDecorativeSvg(
    [
      'M9 9h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z',
      'M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1',
    ],
    { className: 'copy-btn__icon' }
  );

  const copyLatexButton = createElement(
    'button',
    {
      className: 'copy-btn',
      attrs: {
        type: 'button',
        'aria-label': `${strings.generator.copyLatexLabel}: ${headingText}`,
      },
    },
    copyIcon,
    createElement('span', {
      text: strings.generator.copyLatexLabel,
      dataset: { copyLabel: 'true' },
    })
  );

  bindCopyButton(copyLatexButton, getLatex, {
    defaultLabel: strings.generator.copyLatexLabel,
    copiedLabel: strings.generator.copiedLatexLabel,
    liveRegion,
    announcementSuccess: strings.accessibility.copyAnnouncementSuccess,
    announcementError: strings.accessibility.copyAnnouncementError,
  });

  const outputHeader = createElement(
    'div',
    { className: 'generator-output__header' },
    createElement('h3', {
      className: 'generator-output__title',
      text: headingText,
    }),
    copyLatexButton
  );

  const panel = createElement(
    'div',
    { className: 'generator-output', dataset: { outputKind: kind } },
    outputHeader,
    formulaDisplay
  );

  return { panel, mathContainer: formulaDisplay };
}

/**
 * Renders the interactive Pascal's Triangle and (a + b)^n / (a - b)^n LaTeX formula generator.
 *
 * @param {import('../data/strings_pl.js').STRINGS_PL} strings
 * @param {{ initialExponent?: number }} [options]
 * @returns {HTMLElement}
 */
export function createPascalGenerator(strings, options = {}) {
  let currentExponent = clampExponent(options.initialExponent ?? DEFAULT_EXPONENT);
  let currentSumLatex = buildBinomialExpansionLatex(currentExponent, '+');
  let currentDifferenceLatex = buildBinomialExpansionLatex(currentExponent, '-');

  const sectionHeader = createElement(
    'div',
    { className: 'section-header' },
    createElement('h2', {
      className: 'section-title',
      text: strings.generator.title,
      attrs: { id: 'generator-heading' },
    })
  );

  const sliderId = 'pascal-exponent-slider';
  const sliderHintId = 'pascal-exponent-hint';

  const exponentBadge = createElement('output', {
    className: 'exponent-badge',
    text: `${strings.generator.exponentBadgePrefix} ${currentExponent}`,
    attrs: { for: sliderId },
  });

  const sliderLabelRow = createElement(
    'div',
    { className: 'slider-header' },
    createElement('label', {
      className: 'slider-label',
      text: strings.generator.sliderLabel,
      attrs: { for: sliderId },
    }),
    exponentBadge
  );

  const sliderInput = createElement('input', {
    className: 'range-slider',
    attrs: {
      id: sliderId,
      type: 'range',
      min: MIN_EXPONENT,
      max: MAX_EXPONENT,
      step: 1,
      value: currentExponent,
      'aria-describedby': sliderHintId,
      'aria-valuetext': `${strings.generator.sliderAriaValuePrefix} ${currentExponent}`,
    },
  });

  const sliderFillBar = createElement('div', {
    className: 'slider-track__fill',
    attrs: { 'aria-hidden': 'true' },
  });

  const sliderTrackWrapper = createElement(
    'div',
    { className: 'slider-track-wrapper' },
    createElement(
      'div',
      { className: 'slider-track', attrs: { 'aria-hidden': 'true' } },
      sliderFillBar
    ),
    sliderInput
  );

  const sliderScaleHints = createElement(
    'div',
    { className: 'slider-scale-hints', attrs: { id: sliderHintId } },
    createElement('span', { text: strings.generator.minExponentHint }),
    createElement('span', { text: strings.generator.maxExponentHint })
  );

  const tickButtons = [];
  for (let n = MIN_EXPONENT; n <= MAX_EXPONENT; n += 1) {
    const tickButton = createElement('button', {
      className: 'exponent-step-btn',
      text: String(n),
      attrs: {
        type: 'button',
        'aria-label': `${strings.generator.rowAriaPrefix} ${n}`,
        'aria-pressed': String(n === currentExponent),
      },
      dataset: { exponent: String(n) },
      on: {
        click: () => setExponent(n, { shouldTypeset: true }),
      },
    });
    tickButtons.push(tickButton);
  }

  const tickBar = createElement('div', { className: 'exponent-steps' }, ...tickButtons);

  const termsCountValue = createElement('dd', { className: 'generator-stat__value' });
  const coeffSumValue = createElement('dd', { className: 'generator-stat__value' });
  const activeRowValue = createElement('dd', {
    className: 'generator-stat__value generator-stat__value--mono',
  });

  const statsList = createElement(
    'dl',
    { className: 'generator-stats' },
    createElement(
      'div',
      { className: 'generator-stat' },
      createElement('dt', {
        className: 'generator-stat__label',
        text: strings.generator.termsCountLabel,
      }),
      termsCountValue
    ),
    createElement(
      'div',
      { className: 'generator-stat' },
      createElement('dt', {
        className: 'generator-stat__label',
        text: strings.generator.coeffSumLabel,
      }),
      coeffSumValue
    ),
    createElement(
      'div',
      { className: 'generator-stat generator-stat--wide' },
      createElement('dt', {
        className: 'generator-stat__label',
        text: strings.generator.activeRowLabel,
      }),
      activeRowValue
    )
  );

  const controlsPanel = createElement(
    'div',
    { className: 'generator-controls' },
    sliderLabelRow,
    sliderTrackWrapper,
    sliderScaleHints,
    tickBar,
    statsList
  );

  // Build interactive Pascal's Triangle rows (0..7)
  const triangleRows = buildPascalTriangle(MAX_EXPONENT);
  const rowButtons = triangleRows.map((rowValues, rowIndex) =>
    createElement(
      'button',
      {
        className: 'pascal-row',
        attrs: {
          type: 'button',
          'aria-label': `${strings.generator.rowAriaPrefix} ${rowIndex}`,
          'aria-pressed': String(rowIndex === currentExponent),
        },
        dataset: { rowIndex: String(rowIndex) },
        on: {
          click: () => setExponent(rowIndex, { shouldTypeset: true }),
        },
      },
      createElement('span', {
        className: 'pascal-row__index',
        text: `n=${rowIndex}`,
      }),
      createElement(
        'span',
        { className: 'pascal-row__cells' },
        ...rowValues.map((coeff) =>
          createElement('span', { className: 'pascal-cell', text: String(coeff) })
        )
      )
    )
  );

  const trianglePanel = createElement(
    'div',
    { className: 'pascal-panel' },
    createElement(
      'div',
      { className: 'pascal-panel__header' },
      createElement('h3', {
        className: 'pascal-panel__title',
        text: strings.generator.triangleHeading,
      }),
      createElement('p', {
        className: 'pascal-panel__hint',
        text: strings.generator.triangleHint,
      })
    ),
    createElement('div', { className: 'pascal-pyramid' }, ...rowButtons)
  );

  const copyLiveRegion = createElement('span', {
    className: 'visually-hidden',
    attrs: { 'aria-live': 'polite', role: 'status' },
  });

  const sumOutput = createOutputPanel({
    kind: 'sum',
    headingText: strings.generator.formulaHeading,
    getLatex: () => currentSumLatex,
    liveRegion: copyLiveRegion,
    strings,
  });

  const differenceOutput = createOutputPanel({
    kind: 'difference',
    headingText: strings.generator.differenceFormulaHeading,
    getLatex: () => currentDifferenceLatex,
    liveRegion: copyLiveRegion,
    strings,
  });

  /**
   * Synchronizes all interactive controls, Pascal's Triangle highlights,
   * and generated LaTeX outputs for (a + b)^n and (a - b)^n.
   *
   * @param {number} nextExponent
   * @param {{ shouldTypeset?: boolean }} [updateOptions]
   */
  function setExponent(nextExponent, updateOptions = {}) {
    const { shouldTypeset = true } = updateOptions;
    const n = clampExponent(nextExponent);
    currentExponent = n;

    sliderInput.value = String(n);
    sliderInput.setAttribute(
      'aria-valuetext',
      `${strings.generator.sliderAriaValuePrefix} ${n}`
    );
    syncSliderState(sliderInput, sliderFillBar);

    exponentBadge.textContent = `${strings.generator.exponentBadgePrefix} ${n}`;

    const activeCoefficients = getPascalRow(n);
    termsCountValue.textContent = String(activeCoefficients.length);
    coeffSumValue.textContent = String(getCoefficientSum(n));
    activeRowValue.textContent = `[${activeCoefficients.join(', ')}]`;

    for (const button of tickButtons) {
      const isSelected = Number(button.dataset.exponent) === n;
      button.classList.toggle('is-active', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    }

    for (const rowButton of rowButtons) {
      const isSelected = Number(rowButton.dataset.rowIndex) === n;
      rowButton.classList.toggle('is-active', isSelected);
      rowButton.setAttribute('aria-pressed', String(isSelected));
    }

    currentSumLatex = buildBinomialExpansionLatex(n, '+');
    currentDifferenceLatex = buildBinomialExpansionLatex(n, '-');
    sumOutput.mathContainer.textContent = `\\[${currentSumLatex}\\]`;
    differenceOutput.mathContainer.textContent = `\\[${currentDifferenceLatex}\\]`;

    if (shouldTypeset) {
      typesetMath([sumOutput.mathContainer, differenceOutput.mathContainer]);
    }
  }

  sliderInput.addEventListener('input', (event) => {
    setExponent(event.target.value, { shouldTypeset: true });
  });

  setExponent(currentExponent, { shouldTypeset: false });

  const topWorkspace = createElement(
    'div',
    { className: 'generator-top' },
    controlsPanel,
    trianglePanel
  );

  const outputsRow = createElement(
    'div',
    { className: 'generator-outputs' },
    sumOutput.panel,
    differenceOutput.panel,
    copyLiveRegion
  );

  const studioCard = createElement(
    'div',
    { className: 'generator-studio' },
    topWorkspace,
    outputsRow
  );

  return createElement(
    'section',
    {
      className: 'content-section',
      attrs: { id: 'generator-section', 'aria-labelledby': 'generator-heading' },
    },
    sectionHeader,
    studioCard
  );
}
