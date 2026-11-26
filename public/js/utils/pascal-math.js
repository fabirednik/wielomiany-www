/**
 * Pure mathematical utilities for Pascal's Triangle and binomial expansion of (a + b)^n.
 */

export const MIN_EXPONENT = 0;
export const MAX_EXPONENT = 7;

/**
 * Clamps and normalizes an exponent input to an integer within [MIN_EXPONENT, MAX_EXPONENT].
 *
 * @param {number | string} value
 * @returns {number}
 */
export function clampExponent(value) {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) {
    return MIN_EXPONENT;
  }
  return Math.min(MAX_EXPONENT, Math.max(MIN_EXPONENT, parsed));
}

/**
 * Generates Pascal's Triangle rows from row 0 up to maxRow (inclusive)
 * using Pascal's additive recurrence to avoid floating-point arithmetic.
 *
 * @param {number} [maxRow=MAX_EXPONENT]
 * @returns {number[][]}
 */
export function buildPascalTriangle(maxRow = MAX_EXPONENT) {
  const limit = clampExponent(maxRow);
  const triangle = [];

  for (let rowIndex = 0; rowIndex <= limit; rowIndex += 1) {
    const row = new Array(rowIndex + 1);
    row[0] = 1;
    row[rowIndex] = 1;

    for (let colIndex = 1; colIndex < rowIndex; colIndex += 1) {
      const previousRow = triangle[rowIndex - 1];
      row[colIndex] = previousRow[colIndex - 1] + previousRow[colIndex];
    }

    triangle.push(row);
  }

  return triangle;
}

/**
 * Returns the array of binomial coefficients for a given exponent n.
 *
 * @param {number} exponent
 * @returns {number[]}
 */
export function getPascalRow(exponent) {
  const n = clampExponent(exponent);
  const row = [1];

  for (let k = 0; k < n; k += 1) {
    // Exact integer progression: C(n, k+1) = C(n, k) * (n - k) / (k + 1)
    const nextCoefficient = (row[k] * (n - k)) / (k + 1);
    row.push(nextCoefficient);
  }

  return row;
}

/**
 * Formats a single variable power in LaTeX (e.g. '', 'a', 'a^{3}').
 *
 * @param {string} symbol
 * @param {number} power
 * @returns {string}
 */
function formatVariableFactor(symbol, power) {
  if (power <= 0) {
    return '';
  }
  if (power === 1) {
    return symbol;
  }
  return `${symbol}^{${power}}`;
}

/**
 * Formats an individual term c * a^p * b^q in LaTeX.
 *
 * @param {number} coefficient
 * @param {number} powerA
 * @param {number} powerB
 * @returns {string}
 */
export function formatBinomialTerm(coefficient, powerA, powerB) {
  if (powerA === 0 && powerB === 0) {
    return String(coefficient);
  }

  const coeffPrefix = coefficient === 1 ? '' : String(coefficient);
  const factorA = formatVariableFactor('a', powerA);
  const factorB = formatVariableFactor('b', powerB);

  return `${coeffPrefix}${factorA}${factorB}`;
}

/**
 * Builds the full LaTeX expansion equation for (a + b)^n or (a - b)^n
 * (obtained via the substitution (a + (-b))^n, alternating signs on odd powers of b).
 *
 * @param {number} exponent
 * @param {'+' | '-'} [sign='+']
 * @returns {string}
 */
export function buildBinomialExpansionLatex(exponent, sign = '+') {
  const n = clampExponent(exponent);
  const isDifference = sign === '-';
  const coefficients = getPascalRow(n);

  const terms = coefficients.map((coefficient, index) => {
    const powerA = n - index;
    const powerB = index;
    return formatBinomialTerm(coefficient, powerA, powerB);
  });

  const rhs = terms.reduce((expression, term, index) => {
    if (index === 0) {
      return term;
    }
    const operator = isDifference && index % 2 === 1 ? ' - ' : ' + ';
    return `${expression}${operator}${term}`;
  }, '');

  const lhsSign = isDifference ? '-' : '+';
  return `(a ${lhsSign} b)^{${n}} = ${rhs}`;
}

/**
 * Computes the sum of binomial coefficients for row n (2^n).
 *
 * @param {number} exponent
 * @returns {number}
 */
export function getCoefficientSum(exponent) {
  return 2 ** clampExponent(exponent);
}
