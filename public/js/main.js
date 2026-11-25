import { createFooter } from './components/footer.js';
import { createHero } from './components/hero.js';
import { createNavbar } from './components/navbar.js';
import { createPascalGenerator } from './components/pascal-generator.js';
import { createTheoryCards } from './components/theory-cards.js';
import { createVideoPlayer } from './components/video-player.js';
import { STRINGS_PL } from './data/strings_pl.js';
import { createElement } from './utils/dom.js';
import { typesetMath } from './utils/mathjax.js';

/**
 * Applies localized document metadata (<title> and <meta name="description">).
 *
 * @param {typeof STRINGS_PL} strings
 */
function applyDocumentMetadata(strings) {
  document.title = strings.meta.pageTitle;

  let descriptionMeta = document.querySelector('meta[name="description"]');
  if (!descriptionMeta) {
    descriptionMeta = document.createElement('meta');
    descriptionMeta.setAttribute('name', 'description');
    document.head.appendChild(descriptionMeta);
  }
  descriptionMeta.setAttribute('content', strings.meta.pageDescription);
}

/**
 * Mounts all application components into #app and triggers initial MathJax typesetting.
 */
async function bootstrapApplication() {
  applyDocumentMetadata(STRINGS_PL);

  const appRoot = document.getElementById('app');
  if (!appRoot) {
    return;
  }

  const navbar = createNavbar(STRINGS_PL);
  const mainContent = createElement(
    'main',
    {
      className: 'main-content',
      attrs: { id: 'main-content', tabindex: '-1' },
    },
    createHero(STRINGS_PL),
    createVideoPlayer(STRINGS_PL),
    createTheoryCards(STRINGS_PL),
    createPascalGenerator(STRINGS_PL, { initialExponent: 3 })
  );
  const footer = createFooter(STRINGS_PL);

  appRoot.replaceChildren(navbar, mainContent, footer);

  await typesetMath(appRoot);
}

bootstrapApplication();
