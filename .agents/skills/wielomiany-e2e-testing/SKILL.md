---
name: wielomiany-e2e-testing
description: >-
  Use this skill to verify the wielomiany-www educational web app end-to-end with
  Playwright Headless Chrome after ANY change to HTML, CSS, JavaScript, i18n strings,
  or local assets. Covers functional tests, MathJax/Pascal logic, console hygiene,
  and mobile/desktop zero-overflow layout checks.
---

# Headless Chrome E2E Testing (`wielomiany-www`)

Run this test suite after **every** code, style, markup, or copy change to confirm the site behaves and renders cleanly across desktop and mobile viewports.

For detailed breakdown of each suite and assertion, read [references/test-coverage.md](./references/test-coverage.md).

## 1. Execution

Run the E2E suite from the repository root:

```bash
python3 tests/e2e.py
```

- By default, `tests/e2e.py` targets `http://127.0.0.1:3005` (serving `public/`). If port `3005` is not active, it automatically starts a temporary local HTTP server rooted at `public/` on an ephemeral port for the test run.
- Override target URL or require the optional Manim video file (`public/assets/manim_animation.mp4`) if needed:
  ```bash
  BASE_URL=http://127.0.0.1:3005 E2E_REQUIRE_VIDEO=1 python3 tests/e2e.py
  ```

## 2. Mandatory Quality Gates

1. **Zero Failures Allowed**: `python3 tests/e2e.py` MUST exit with status `0` and print `ALL E2E CHECKS PASSED CLEANLY`.
2. **Real MathJax & Local Vendor Integrity**: Every formula container must render a non-zero `<mjx-container>` with local `.woff` fonts loaded (`200 OK`), zero `<mjx-merror>` elements, and zero leaked LaTeX delimiters.
3. **Zero Horizontal Overflow & Zero Clipping**: Every viewport (`320px`, `375px`, `390px`, `414px`, `768px`, `1280px`) must maintain `document.documentElement.scrollWidth <= window.innerWidth` and unclipped left edges inside horizontal scroll containers even when `n = 7` is selected.
4. **Interactive & Accessibility Verification**: Every UI change must keep the slider (`n = 0..7`), keyboard arrows, Pascal row clicks, step buttons, copy-to-clipboard actions, skip-link focus, and `>= 24x24px` target sizes passing with zero uncaught `pageerror` exceptions.
5. **Update Tests with New Features**: Whenever a new UI section, interactive control, or CSS breakpoint is added, extend `tests/e2e.py` with matching Playwright assertions in the same change.
