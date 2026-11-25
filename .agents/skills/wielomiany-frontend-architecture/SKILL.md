---
name: wielomiany-frontend-architecture
description: >-
  Use this skill when creating or editing HTML, CSS, ES6 JavaScript components,
  or Polish i18n copy in wielomiany-www. Enforces public/ web-root isolation,
  modular file structure, lowercase filenames, zero CDNs, strict strings_pl.js
  separation, and mobile layout rules.
---

# Frontend Architecture & Conventions (`wielomiany-www`)

Follow these project standards whenever modifying components, styles, or localized text.

## 1. `public/` Isolation, Modular Files & Naming Rules

- **Serve Exclusively from `public/`**: All HTTP-served files live inside `public/` (`public/index.html`, `public/css/`, `public/js/`, `public/vendor/`, `public/assets/`). Repository tooling (`tests/`, `.agents/`, `README.md`, `AGENTS.md`) remains outside `public/`.
- **All first-party filenames must be lowercase** (`kebab-case`, with `public/js/data/strings_pl.js` preserved as `strings_pl.js`).
- **Strict Separation of Concerns**:
  - `public/index.html`: Minimal semantic shell referencing `./css/main.css`, `./js/config/mathjax-config.js`, `./vendor/mathjax/tex-chtml.js`, and `./js/main.js` (zero CSS frameworks).
  - `public/css/`: Entry stylesheet `public/css/main.css` imports `tokens.css`, `reset.css`, `accessibility.css`, `layout.css`, `controls.css`, `components/*.css`, and `preferences.css`. Every UI component has a matching CSS file in `public/css/components/`.
  - `public/js/`: Modular ES6 modules split across `config/`, `data/`, `utils/`, and `components/`.
- **English Codebase**: All identifiers, file names, CSS classes, and comments must be written in English.
- **No CDNs**: Never introduce remote `http://` or `https://` script/font/style imports.

## 2. Dynamic i18n (`public/js/data/strings_pl.js`)

- Store **all** Polish copy, labels, formulas, examples, and `aria-*` strings in `public/js/data/strings_pl.js`.
- Never place hardcoded Polish strings in `public/index.html`, `public/css/*.css`, or `public/js/components/*.js`.

## 3. Brutalist Design & Mobile Overflow Prevention Rules

- Preserve the flat Neo-Brutalist / Swiss editorial design (`border-radius: 0`, `box-shadow: none`, zero CSS gradients, zero `backdrop-filter`, `#E8E7E2` / `#F4F3EE` / `#111111` + `#FF5500` signal accent).
- Use `grid-template-columns: minmax(0, 1fr)` (never bare `1fr`) on single-column responsive grids.
- Apply `min-width: 0; max-width: 100%;` on grid/flex children (`.hero-copy`, `.hero-preview-card`, `.formula-card`, `.generator-controls`, `.pascal-panel`, `.generator-output`).
- Wrap headers on narrow screens (`flex-wrap: wrap`) and contain wide math/Pascal rows inside local horizontal scrollers (`overflow-x: auto`) rather than expanding the page width.
- Always run the [wielomiany-e2e-testing](../wielomiany-e2e-testing/SKILL.md) skill after every edit.
