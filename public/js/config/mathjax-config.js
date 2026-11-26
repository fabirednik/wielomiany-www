/**
 * MathJax v3 local configuration.
 * Loaded before ./vendor/mathjax/tex-chtml.js to configure delimiters,
 * local woff-v2 font path, and explicit component-driven typesetting.
 */
window.MathJax = {
  tex: {
    inlineMath: [['\\(', '\\)']],
    displayMath: [['\\[', '\\]'], ['$$', '$$']],
    processEscapes: true,
  },
  chtml: {
    scale: 1.04,
    mtextInheritFont: true,
    fontURL: './vendor/mathjax/output/chtml/fonts/woff-v2',
  },
  options: {
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
  },
  startup: {
    typeset: false,
  },
};
