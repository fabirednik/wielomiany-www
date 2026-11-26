/**
 * Serializes MathJax typesetting operations so rapid interactive updates
 * (such as dragging the Pascal triangle slider) never race with one another.
 */
let typesetQueue = Promise.resolve();
let hasWarnedMissingMathJax = false;

/**
 * Normalizes a single element or iterable of elements into an HTMLElement array.
 *
 * @param {HTMLElement | HTMLElement[] | null | undefined} targets
 * @returns {HTMLElement[]}
 */
function normalizeTargets(targets) {
  if (!targets) {
    return [];
  }
  const list = Array.isArray(targets) ? targets : [targets];
  return list.filter((node) => node instanceof HTMLElement);
}

/**
 * Waits briefly for the local MathJax script element if it has not finished executing yet.
 *
 * @returns {Promise<void>}
 */
function waitForMathJaxScript() {
  const scriptEl = document.getElementById('MathJax-script');
  if (!scriptEl || typeof window.MathJax?.typesetPromise === 'function' || window.MathJax?.startup?.promise) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    scriptEl.addEventListener('load', finish, { once: true });
    scriptEl.addEventListener('error', finish, { once: true });
    window.setTimeout(finish, 3000);
  });
}

/**
 * Waits for the MathJax startup promise if MathJax is available on window.
 *
 * @returns {Promise<boolean>} True if MathJax typesetting APIs are ready.
 */
async function ensureMathJaxReady() {
  await waitForMathJaxScript();

  const mathJax = window.MathJax;
  if (!mathJax) {
    return false;
  }

  if (mathJax.startup?.promise) {
    try {
      await mathJax.startup.promise;
    } catch (error) {
      console.error('MathJax startup failed:', error);
      return false;
    }
  }

  return typeof mathJax.typesetPromise === 'function';
}

/**
 * Clears previous MathJax tracking for the given container(s) and typesets new math.
 *
 * @param {HTMLElement | HTMLElement[]} targets
 * @returns {Promise<void>}
 */
export function typesetMath(targets) {
  const elements = normalizeTargets(targets);
  if (elements.length === 0) {
    return Promise.resolve();
  }

  typesetQueue = typesetQueue
    .then(async () => {
      const ready = await ensureMathJaxReady();
      if (!ready) {
        if (!hasWarnedMissingMathJax) {
          hasWarnedMissingMathJax = true;
          console.warn(
            'MathJax is not available at ./vendor/mathjax/tex-chtml.js. Displaying raw LaTeX fallback.'
          );
        }
        return;
      }

      if (typeof window.MathJax.typesetClear === 'function') {
        window.MathJax.typesetClear(elements);
      }
      await window.MathJax.typesetPromise(elements);
    })
    .catch((error) => {
      console.error('Failed to typeset MathJax formulas:', error);
    });

  return typesetQueue;
}
