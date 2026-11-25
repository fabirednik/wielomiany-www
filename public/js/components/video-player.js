import { createDecorativeSvg, createElement } from '../utils/dom.js';

/**
 * Renders the video player section in an asymmetrical Swiss editorial layout.
 *
 * NOTE: The user will provide the local video file at ./assets/manim_animation.mp4 later.
 * Until that file exists, the component displays a clean placeholder overlay on load error
 * without blocking or breaking the surrounding layout.
 *
 * @param {import('../data/strings_pl.js').STRINGS_PL} strings
 * @returns {HTMLElement}
 */
export function createVideoPlayer(strings) {
  const sectionHeader = createElement(
    'div',
    { className: 'video-rail' },
    createElement('p', { className: 'section-index', text: `01 // ${strings.video.eyebrow}` }),
    createElement('h2', {
      className: 'section-title',
      text: strings.video.title,
      attrs: { id: 'video-heading' },
    }),
    createElement('p', { className: 'section-description', text: strings.video.description })
  );

  // User will supply ./assets/manim_animation.mp4 later
  const sourceElement = createElement('source', {
    attrs: {
      src: './assets/manim_animation.mp4',
      type: 'video/mp4',
    },
  });

  const videoElement = createElement(
    'video',
    {
      className: 'video-frame__media',
      attrs: {
        controls: true,
        loading: 'lazy',
        preload: 'metadata',
        width: 1280,
        height: 720,
        playsinline: true,
      },
    },
    sourceElement,
    strings.video.unsupportedVideo
  );

  const playIcon = createDecorativeSvg(
    ['M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18a1 1 0 0 0 0-1.68L9.54 5.98A1 1 0 0 0 8 6.82Z'],
    { className: 'video-placeholder__icon' }
  );

  const fallbackOverlay = createElement(
    'div',
    {
      className: 'video-placeholder',
      attrs: { hidden: true, 'aria-live': 'polite' },
    },
    createElement('div', { className: 'video-placeholder__icon-box' }, playIcon),
    createElement('p', {
      className: 'video-placeholder__title',
      text: strings.video.fallbackTitle,
    }),
    createElement('p', {
      className: 'video-placeholder__body',
      text: strings.video.fallbackBody,
    })
  );

  const showFallback = () => {
    fallbackOverlay.hidden = false;
  };

  const hideFallback = () => {
    fallbackOverlay.hidden = true;
  };

  sourceElement.addEventListener('error', showFallback);
  videoElement.addEventListener('error', showFallback);
  videoElement.addEventListener('loadedmetadata', hideFallback);
  videoElement.addEventListener('canplay', hideFallback);

  const stage = createElement(
    'div',
    { className: 'video-frame' },
    videoElement,
    fallbackOverlay
  );

  const figure = createElement(
    'figure',
    { className: 'video-card' },
    stage,
    createElement('figcaption', {
      className: 'video-card__caption',
      text: strings.video.caption,
    })
  );

  const splitGrid = createElement('div', { className: 'video-grid' }, sectionHeader, figure);

  return createElement(
    'section',
    {
      className: 'content-section',
      attrs: { id: 'video-section', 'aria-labelledby': 'video-heading' },
    },
    splitGrid
  );
}
