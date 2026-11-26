/**
 * Lightweight DOM construction helpers to keep component modules declarative and XSS-safe.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Creates an HTML element with classes, attributes, datasets, event listeners, and children.
 *
 * @param {string} tagName
 * @param {object} [options]
 * @param {string} [options.className]
 * @param {string} [options.text]
 * @param {Record<string, string | number | boolean | null | undefined>} [options.attrs]
 * @param {Record<string, string>} [options.dataset]
 * @param {Record<string, EventListener>} [options.on]
 * @param {...(Node | string | null | undefined | false)} children
 * @returns {HTMLElement}
 */
export function createElement(tagName, options = {}, ...children) {
  const element = document.createElement(tagName);
  const { className, text, attrs, dataset, on } = options;

  if (className) {
    element.className = className;
  }

  if (text !== undefined && text !== null) {
    element.textContent = String(text);
  }

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) {
        continue;
      }
      element.setAttribute(key, value === true ? '' : String(value));
    }
  }

  if (dataset) {
    for (const [key, value] of Object.entries(dataset)) {
      if (value !== undefined && value !== null) {
        element.dataset[key] = String(value);
      }
    }
  }

  if (on) {
    for (const [eventName, handler] of Object.entries(on)) {
      if (typeof handler === 'function') {
        element.addEventListener(eventName, handler);
      }
    }
  }

  for (const child of children) {
    if (child === null || child === undefined || child === false) {
      continue;
    }
    if (child instanceof Node) {
      element.appendChild(child);
    } else {
      element.appendChild(document.createTextNode(String(child)));
    }
  }

  return element;
}

/**
 * Creates a decorative inline SVG element hidden from assistive technologies.
 *
 * @param {string[]} pathDefinitions
 * @param {{ viewBox?: string, className?: string }} [options]
 * @returns {SVGSVGElement}
 */
export function createDecorativeSvg(pathDefinitions, options = {}) {
  const { viewBox = '0 0 24 24', className = '' } = options;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  if (className) {
    svg.setAttribute('class', className);
  }

  for (const d of pathDefinitions) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }

  return svg;
}
