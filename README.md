# wielomiany-www

Interactive Polish educational web application about **Short Multiplication Formulas** (*Wzory skróconego mnożenia*) and binomial expansions $(a + b)^n$.

Built with **Vanilla ES6 JavaScript**, **HTML5**, and **modular CSS3** in a **Swiss Editorial / Neo-Brutalist** layout — with zero runtime build steps, zero external CDNs, and all HTTP-served files isolated inside [`public/`](public/).

---

## Features

- **Hero & Geometric Intuition (`public/js/components/hero.js`):** Asymmetrical 70/30 poster grid pairing an oversized typographic headline with a geometric decomposition diagram of $(a + b)^2 = a^2 + 2ab + b^2$.
- **Animation Player (`public/js/components/video-player.js`):** Responsive 16:9 HTML5 `<video>` wrapper pointing to `./assets/manim_animation.mp4` (`public/assets/manim_animation.mp4`), with an automatic placeholder overlay until the video file is supplied.
- **Short Multiplication Formula Matrix (`public/js/components/theory-cards.js`):** Asymmetrical 12-column wireframe matrix presenting all 7 degree-2 and degree-3 identities rendered via MathJax, with descriptions, worked examples, and one-click LaTeX clipboard copy.
- **Interactive Pascal's Triangle Generator (`public/js/components/pascal-generator.js`):** Pure JS binomial coefficient engine (`public/js/utils/pascal-math.js`) supporting exponents `n = 0..7` via native range slider, keyboard arrows, step buttons, or clickable Pascal's Triangle rows, dynamically re-typesetting LaTeX via queued MathJax updates (`public/js/utils/mathjax.js`).
- **Centralized Polish Localization (`public/js/data/strings_pl.js`):** All Polish UI copy, formulas, examples, and ARIA labels are isolated in a single dictionary module.
- **Local Offline Dependencies (`public/vendor/`):** Bundled local MathJax v3 (`tex-chtml.js` + `woff-v2` fonts), `Space Grotesk` (`latin` & `latin-ext` `.woff2` fonts), and compiled `tailwind.css` — zero CDN requests.

---

## Directory Structure

```text
wielomiany-www/
├── AGENTS.md                         # Project rules & skill routing for AI agents
├── README.md                         # Project documentation & startup guide
├── .agents/
│   └── skills/
│       ├── wielomiany-e2e-testing/   # Playwright Headless Chrome E2E runbook
│       └── wielomiany-frontend-architecture/ # Modular architecture & style rules
├── tests/
│   └── e2e.py                        # 7-stage Headless Chrome & static hygiene E2E suite
└── public/                           # Web server root (all HTTP-served files live here)
    ├── index.html                    # Minimal semantic HTML5 shell
    ├── assets/
    │   └── .gitkeep                  # Drop manim_animation.mp4 here
    ├── css/
    │   ├── main.css                  # Stylesheet entry point (@import cascade)
    │   ├── tokens.css                # @font-face & CSS custom properties
    │   ├── base.css                  # Reset, wireframe grid, accessibility & buttons
    │   ├── preferences.css           # Coarse-pointer & prefers-reduced-motion overrides
    │   └── components/               # 1:1 component stylesheets
    │       ├── footer.css
    │       ├── hero.css
    │       ├── navbar.css
    │       ├── pascal-generator.css
    │       ├── theory-cards.css
    │       └── video-player.css
    ├── js/
    │   ├── main.js                   # Application bootstrap & metadata hydration
    │   ├── config/
    │   │   └── mathjax-config.js     # Local MathJax v3 delimiters & fontURL config
    │   ├── data/
    │   │   └── strings_pl.js         # Single source of truth for Polish UI copy
    │   ├── utils/
    │   │   ├── clipboard.js          # Shared clipboard copy + ARIA live feedback
    │   │   ├── dom.js                # Declarative DOM & decorative SVG helpers
    │   │   ├── mathjax.js            # Promise-queued MathJax typesetClear/typesetPromise
    │   │   └── pascal-math.js        # Pure Pascal's Triangle & (a+b)^n LaTeX math
    │   └── components/               # Modular UI components
    │       ├── footer.js
    │       ├── hero.js
    │       ├── navbar.js
    │       ├── pascal-generator.js
    │       ├── theory-cards.js
    │       └── video-player.js
    └── vendor/                       # Locally hosted libraries & fonts (no CDNs)
        ├── tailwind.css
        ├── fonts/space-grotesk/
        └── mathjax/
```

---

## How to Start the Site Locally

ES6 modules (`<script type="module">`) and MathJax font loading require an HTTP server rather than opening `public/index.html` directly via `file://`.

### Option 1: Python built-in HTTP server (Recommended, port `3005`)

Run from the repository root (`wielomiany-www/`):

```bash
python3 -m http.server 3005 --directory public
```

Then open:

- `http://127.0.0.1:3005` (or `http://localhost:3005`)

### Option 2: Node (`serve`)

```bash
npx serve public -l 3005
```

### Option 3: VS Code Live Server

Open the project, point Live Server's root to `public/` (or open `public/index.html` with Live Server rooted at `public/`), and start **Go Live**.

---

## Optional Video Asset

Place your rendered animation at:

```text
public/assets/manim_animation.mp4
```

The video player component (`public/js/components/video-player.js`) automatically detects when the file is available and replaces the fallback notice with the playable `<video>` stream.

---

## Running End-to-End Tests

The repository includes a 7-stage Playwright Headless Chrome E2E suite in [`tests/e2e.py`](tests/e2e.py) covering:

1. `public/` isolation, lowercase filenames, ES6 module syntax/import graph, CSS `@import` resolution, `strings_pl.js` key coverage, and zero-CDN hygiene.
2. HTTP `200` verification for HTML, CSS, JS, local Tailwind, local MathJax, and `.woff` / `.woff2` fonts.
3. Real MathJax `<mjx-container>` rendering across all 16 formula containers with zero `<mjx-merror>` or leaked delimiters.
4. Interactive Pascal's Triangle generator checks across `n = 0..7` (slider input, keyboard arrows, row clicks, step buttons).
5. Clipboard copy behavior, `aria-live` announcements, and timer reset.
6. Keyboard accessibility (`Tab` skip-link visibility, accessible names, `>= 24×24px` hit targets) and brutalist visual invariants (`border-radius: 0`, `box-shadow: none`, zero CSS gradients/blur).
7. Zero horizontal overflow and zero left-edge scroll clipping across `320×568`, `375×667`, `390×844`, `414×896`, `768×1024`, and `1280×800` viewports with `n = 7` active.

### Run the suite

```bash
python3 tests/e2e.py
```

- If a server is already running on `http://127.0.0.1:3005`, `tests/e2e.py` tests against it directly.
- Otherwise, it automatically starts a temporary local HTTP server rooted at `public/` on an ephemeral port.
- To require `public/assets/manim_animation.mp4` to be present and return `200 OK`, run:

```bash
E2E_REQUIRE_VIDEO=1 python3 tests/e2e.py
```

---

## Repository & Contributors

Created by GitHub contributors: [`fabirednik/wielomiany-www`](https://github.com/fabirednik/wielomiany-www).
