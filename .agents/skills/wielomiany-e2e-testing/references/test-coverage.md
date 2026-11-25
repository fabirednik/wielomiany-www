# E2E Test Coverage Reference

`tests/e2e.py` validates seven layers in sequence:

1. **Static & Architecture Hygiene**
   - Strictly isolates all served web assets inside `public/` (no `index.html`, `css/`, `js/`, `vendor/`, or `assets/` at repository root).
   - Lowercase file and folder paths across first-party files (`public/index.html`, `public/css/`, `public/js/`, `tests/`).
   - Valid ES6 module syntax (`node --input-type=module --check`) and verified relative import/export graphs.
   - Resolved `@import` paths in `public/css/main.css` and CSS class usage across `public/css/`.
   - Local vendor presence (`public/vendor/tailwind.css`, `public/vendor/mathjax/tex-chtml.js`, and `.woff` fonts in `public/vendor/mathjax/output/chtml/fonts/woff-v2/`).
   - Zero external CDN URLs and zero hardcoded Polish diacritic text outside `public/js/data/strings_pl.js`.
   - Every `STRINGS_PL` key referenced in JS exists in `public/js/data/strings_pl.js`.

2. **Network, Stylesheets, Fonts & DOM Integrity**
   - `200 OK` on `/`, `./vendor/tailwind.css`, `./vendor/mathjax/tex-chtml.js`, MathJax `.woff` fonts, and all CSS/JS modules.
   - Verified `document.styleSheets` and all CSS `@import` rules loaded non-empty rulesets.
   - `<html lang="pl">`, single `<h1>`, sequential heading levels, unique `id`s, `<video>` attributes, and contributors footer (`© 2026` + `fabirednik/wielomiany-www` repository link).

3. **Real MathJax Rendering Audit**
   - All 17 math containers across Hero, Theory Cards, and Pascal Generator (`(a + b)^n` and `(a - b)^n`) render non-zero `<mjx-container>` nodes.
   - Zero `<mjx-merror>` nodes and zero unrendered LaTeX delimiters (`\(`, `\)`, `\[`, `\]`, `$$`) outside `<code>`.

4. **Interactive Pascal's Triangle Generator (`n = 0..7`)**
   - Sweeps slider across `n = 0..7`, asserting exact LaTeX for both `(a + b)^n` and `(a - b)^n`, coefficient arrays, `--control-value`, `aria-pressed`, and exactly `1` `<mjx-container>` per output box.
   - Verifies keyboard `ArrowLeft`/`ArrowRight`, row clicks, and step button clicks.

5. **Clipboard Copy & Reset Lifecycle**
   - Clicks copy buttons on Generator and Theory Cards, checks `data-copied="true"`, `"Skopiowano"`, clipboard contents, `aria-live` status, and automatic reset after timeout.

6. **Accessibility & Hit Targets**
   - `Tab` focuses `.skip-link` visibly inside the viewport.
   - Every button, link, and input has an accessible name and satisfies minimum `24×24` CSS px hit targets.

7. **Responsive Mobile-to-Desktop Bounds & Anti-Clipping**
   - Selects `n = 7` and checks `320x568`, `375x667`, `390x844`, `414x896`, `768x1024`, and `1280x800` for zero horizontal page overflow, zero left-edge clipping inside math/pyramid scrollers, non-overlapping nav links, and valid `.geo-square` cell dimensions.
