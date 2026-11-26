import { createElement } from '../utils/dom.js';

/**
 * Renders the flat brutalist top navigation bar with an accessible skip link.
 *
 * @param {import('../data/strings_pl.js').STRINGS_PL} strings
 * @returns {HTMLElement}
 */
export function createNavbar(strings) {
  const skipLink = createElement('a', {
    className: 'skip-link visually-hidden',
    text: strings.accessibility.skipToContent,
    attrs: { href: '#main-content' },
  });

  const brand = createElement(
    'a',
    {
      className: 'brand-mark',
      attrs: { href: '#hero-section' },
    },
    createElement('span', { className: 'brand-mark__square', attrs: { 'aria-hidden': 'true' } }),
    createElement('span', { className: 'brand-mark__title', text: strings.nav.brandTitle })
  );

  const navLinks = [
    { href: '#video-section', label: strings.nav.links.video },
    { href: '#theory-section', label: strings.nav.links.theory },
    { href: '#generator-section', label: strings.nav.links.generator },
  ];

  const navList = createElement(
    'ul',
    { className: 'site-nav__list' },
    ...navLinks.map((item) =>
      createElement(
        'li',
        { className: 'site-nav__item' },
        createElement('a', {
          className: 'site-nav__link',
          text: item.label,
          attrs: { href: item.href },
        })
      )
    )
  );

  const nav = createElement(
    'nav',
    {
      className: 'site-nav',
      attrs: { 'aria-label': strings.accessibility.primaryNavLabel },
    },
    navList
  );

  const inner = createElement(
    'div',
    { className: 'site-header__inner' },
    brand,
    nav
  );

  return createElement('header', { className: 'site-header' }, skipLink, inner);
}
