/**
 * Shared clipboard copy utility with non-HTTPS fallback and button feedback state.
 */

const COPY_FEEDBACK_DURATION_MS = 1800;

/**
 * Copies plain text to the system clipboard.
 *
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyTextToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy selection fallback when permissions disallow Clipboard API
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    document.body.removeChild(textarea);
  }

  return copied;
}

/**
 * Binds click-to-copy behavior with temporary visual and screen-reader feedback.
 *
 * @param {HTMLButtonElement} button
 * @param {() => string} getText
 * @param {object} labels
 * @param {string} labels.defaultLabel
 * @param {string} labels.copiedLabel
 * @param {HTMLElement | null} [labels.liveRegion]
 * @param {string} [labels.announcementSuccess]
 * @param {string} [labels.announcementError]
 */
export function bindCopyButton(button, getText, labels) {
  let resetTimerId = null;
  const labelNode = button.querySelector('[data-copy-label]') || button;

  button.addEventListener('click', async () => {
    const value = getText();
    const success = await copyTextToClipboard(value);

    if (resetTimerId !== null) {
      window.clearTimeout(resetTimerId);
    }

    if (success) {
      labelNode.textContent = labels.copiedLabel;
      button.dataset.copied = 'true';
      if (labels.liveRegion && labels.announcementSuccess) {
        labels.liveRegion.textContent = labels.announcementSuccess;
      }

      resetTimerId = window.setTimeout(() => {
        labelNode.textContent = labels.defaultLabel;
        delete button.dataset.copied;
        resetTimerId = null;
      }, COPY_FEEDBACK_DURATION_MS);
    } else if (labels.liveRegion && labels.announcementError) {
      labels.liveRegion.textContent = labels.announcementError;
    }
  });
}
