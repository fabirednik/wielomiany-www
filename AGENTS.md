# `wielomiany-www` — Project Agent Rules

Follow these rules whenever modifying any file in this repository:

1. **Mandatory E2E Verification After Every Change**:
   - After **every** edit to HTML, CSS, JS, or assets, activate and run the [wielomiany-e2e-testing](.agents/skills/wielomiany-e2e-testing/SKILL.md) skill (`python3 tests/e2e.py`).
   - Do not finish a task unless all E2E checks (including mobile `320px`–`414px` zero-overflow checks) pass with exit code `0`.
2. **`public/` Isolation, Modular Architecture & Lowercase Naming**:
   - Follow [wielomiany-frontend-architecture](.agents/skills/wielomiany-frontend-architecture/SKILL.md).
   - Keep all HTTP-served assets strictly inside `public/` (`public/index.html`, `public/css/`, `public/js/`, `public/vendor/`, `public/assets/`).
   - Keep all first-party file names lowercase, maintain matching modular `public/js/components/*.js` and `public/css/components/*.css` files, use English for all code/comments, avoid CDNs, and keep all Polish UI strings in `public/js/data/strings_pl.js`.
3. **Local Preview Server**:
   - Serve `public/` over HTTP (e.g., `python3 -m http.server 3005 --directory public` at `http://127.0.0.1:3005`) since ES6 modules require HTTP MIME types.

## Skill Routing

| Area | Skill | Path |
| :--- | :--- | :--- |
| **Headless Chrome E2E & Mobile Layout Testing** | `wielomiany-e2e-testing` | [.agents/skills/wielomiany-e2e-testing/SKILL.md](.agents/skills/wielomiany-e2e-testing/SKILL.md) |
| **Components, `public/` Isolation, Modular CSS & i18n Rules** | `wielomiany-frontend-architecture` | [.agents/skills/wielomiany-frontend-architecture/SKILL.md](.agents/skills/wielomiany-frontend-architecture/SKILL.md) |
