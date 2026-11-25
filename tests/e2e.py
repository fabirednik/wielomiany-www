#!/usr/bin/env python3
"""
Comprehensive Headless Chrome (Playwright) & Static Integrity E2E Suite for wielomiany-www.
Runs against the local HTTP server (default: http://127.0.0.1:3005) and verifies:
  1. Static architecture hygiene (lowercase names, JS syntax/imports, CSS @imports, local vendor files, i18n keys, zero CDNs)
  2. Network & stylesheet loading (200 OK for all app, CSS, JS, MathJax & woff2/woff fonts)
  3. DOM structure, metadata, heading order, unique IDs, video placeholder & reduced author footer
  4. Real MathJax LaTeX rendering across all slots, zero <mjx-merror>, zero raw delimiters
  5. Interactive Pascal generator (slider n=0..7, keyboard arrows, row/step clicks, dynamic MathJax re-typeset)
  6. Clipboard copy state, clipboard contents, aria-live feedback & reset timer
  7. Accessibility (skip-link Tab focus, accessible names, WCAG target sizes) & mobile/desktop zero-overflow + anti-clipping
"""

from __future__ import annotations

import functools
import http.server
import os
import re
import socketserver
import subprocess
import sys
import threading
import urllib.error
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT_DIR / "public"
DEFAULT_PORT = int(os.environ.get("E2E_PORT", "3005"))
BASE_URL = os.environ.get("BASE_URL", f"http://127.0.0.1:{DEFAULT_PORT}").rstrip("/")
CHROME_PATH = os.environ.get("CHROME_PATH", "/usr/bin/google-chrome")

OPTIONAL_PLACEHOLDER_PATHS = (
    "/assets/manim_animation.mp4",
)

ALLOWED_EXTERNAL_URLS = {
    "http://www.w3.org/2000/svg",
    "https://github.com/fabirednik/wielomiany-www",
}

EXPECTED_LATEX_BY_EXPONENT = {
    0: "(a + b)^{0} = 1",
    1: "(a + b)^{1} = a + b",
    2: "(a + b)^{2} = a^{2} + 2ab + b^{2}",
    3: "(a + b)^{3} = a^{3} + 3a^{2}b + 3ab^{2} + b^{3}",
    4: "(a + b)^{4} = a^{4} + 4a^{3}b + 6a^{2}b^{2} + 4ab^{3} + b^{4}",
    5: "(a + b)^{5} = a^{5} + 5a^{4}b + 10a^{3}b^{2} + 10a^{2}b^{3} + 5ab^{4} + b^{5}",
    6: "(a + b)^{6} = a^{6} + 6a^{5}b + 15a^{4}b^{2} + 20a^{3}b^{3} + 15a^{2}b^{4} + 6ab^{5} + b^{6}",
    7: "(a + b)^{7} = a^{7} + 7a^{6}b + 21a^{5}b^{2} + 35a^{4}b^{3} + 35a^{3}b^{4} + 21a^{2}b^{5} + 7ab^{6} + b^{7}",
}

EXPECTED_DIFF_LATEX_BY_EXPONENT = {
    0: "(a - b)^{0} = 1",
    1: "(a - b)^{1} = a - b",
    2: "(a - b)^{2} = a^{2} - 2ab + b^{2}",
    3: "(a - b)^{3} = a^{3} - 3a^{2}b + 3ab^{2} - b^{3}",
    4: "(a - b)^{4} = a^{4} - 4a^{3}b + 6a^{2}b^{2} - 4ab^{3} + b^{4}",
    5: "(a - b)^{5} = a^{5} - 5a^{4}b + 10a^{3}b^{2} - 10a^{2}b^{3} + 5ab^{4} - b^{5}",
    6: "(a - b)^{6} = a^{6} - 6a^{5}b + 15a^{4}b^{2} - 20a^{3}b^{3} + 15a^{2}b^{4} - 6ab^{5} + b^{6}",
    7: "(a - b)^{7} = a^{7} - 7a^{6}b + 21a^{5}b^{2} - 35a^{4}b^{3} + 35a^{3}b^{4} - 21a^{2}b^{5} + 7ab^{6} - b^{7}",
}

EXPECTED_PASCAL_ROWS = {
    0: "[1]",
    1: "[1, 1]",
    2: "[1, 2, 1]",
    3: "[1, 3, 3, 1]",
    4: "[1, 4, 6, 4, 1]",
    5: "[1, 5, 10, 10, 5, 1]",
    6: "[1, 6, 15, 20, 15, 6, 1]",
    7: "[1, 7, 21, 35, 35, 21, 7, 1]",
}

VIEWPORTS = [
    ("mobile-xs", 320, 568),
    ("mobile-sm", 375, 667),
    ("mobile-md", 390, 844),
    ("mobile-lg", 414, 896),
    ("tablet", 768, 1024),
    ("desktop", 1280, 800),
    ("desktop-xl", 1600, 900),
]

POLISH_DIACRITICS_RE = re.compile(r"[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]")
URL_RE = re.compile(r"https?://[^\s'\"`<>]+")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        return


def is_server_reachable(url: str) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=1.5) as response:
            return response.status == 200
    except (urllib.error.URLError, TimeoutError):
        return False


class LocalServerManager:
    """Uses the running server at BASE_URL or spawns an ephemeral HTTP server if needed."""

    def __init__(self, base_url: str) -> None:
        self.base_url = base_url
        self.httpd: socketserver.TCPServer | None = None
        self.thread: threading.Thread | None = None

    def __enter__(self) -> str:
        if is_server_reachable(f"{self.base_url}/"):
            return self.base_url

        handler = functools.partial(QuietHandler, directory=str(PUBLIC_DIR))
        socketserver.TCPServer.allow_reuse_address = True
        self.httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
        port = self.httpd.server_address[1]
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        return f"http://127.0.0.1:{port}"

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        if self.httpd is not None:
            self.httpd.shutdown()
            self.httpd.server_close()


def launch_browser(playwright):
    kwargs = {
        "headless": True,
        "args": ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    }
    if os.path.exists(CHROME_PATH):
        kwargs["executable_path"] = CHROME_PATH
    return playwright.chromium.launch(**kwargs)


def run_static_checks(errors: list[str]) -> None:
    print("  [1/7] Static hygiene, public/ isolation, lowercase names, JS/CSS graph & i18n...")
    ignored_dirs = {".git", ".agents", "__pycache__", "vendor"}
    ignored_files = {"README.md", "AGENTS.md", ".gitkeep"}

    for forbidden_root_entry in ("index.html", "css", "js", "vendor", "assets"):
        if (ROOT_DIR / forbidden_root_entry).exists():
            errors.append(f"Served entry '{forbidden_root_entry}' must reside inside public/, not repository root")

    if not PUBLIC_DIR.is_dir():
        errors.append("Missing required public/ directory")
        return

    for path in ROOT_DIR.rglob("*"):
        if any(part in ignored_dirs for part in path.parts):
            continue
        if path.name in ignored_files:
            continue
        rel = path.relative_to(ROOT_DIR).as_posix()
        if rel != rel.lower():
            errors.append(f"Non-lowercase path detected: {rel}")

    js_files = sorted((PUBLIC_DIR / "js").rglob("*.js"))
    for js_file in js_files:
        proc = subprocess.run(
            ["node", "--input-type=module", "--check"],
            input=js_file.read_text(encoding="utf-8"),
            text=True,
            capture_output=True,
        )
        if proc.returncode != 0:
            errors.append(
                f"JS syntax error in {js_file.relative_to(ROOT_DIR)}: {proc.stderr.strip()}"
            )

    html_src = (PUBLIC_DIR / "index.html").read_text(encoding="utf-8")
    for match in re.findall(r"(?:src|href)=['\"](\.[^'\"]+)['\"]", html_src):
        asset_path = (PUBLIC_DIR / match.lstrip("./")).resolve()
        if not asset_path.exists():
            errors.append(f"Missing local asset referenced by public/index.html: {match}")

    fonts_dir = PUBLIC_DIR / "vendor" / "mathjax" / "output" / "chtml" / "fonts" / "woff-v2"
    if not fonts_dir.is_dir() or not list(fonts_dir.glob("*.woff")):
        errors.append("Missing MathJax local woff-v2 font files in public/vendor/mathjax/output/chtml/fonts/woff-v2")

    scan_targets = [PUBLIC_DIR / "index.html"]
    scan_targets.extend((PUBLIC_DIR / "css").rglob("*.css"))
    scan_targets.extend(js_files)

    for target in scan_targets:
        content = target.read_text(encoding="utf-8")
        rel = target.relative_to(PUBLIC_DIR).as_posix()

        for match in URL_RE.findall(content):
            if match in ALLOWED_EXTERNAL_URLS:
                continue
            errors.append(f"Disallowed external URL '{match}' found in public/{rel}")

        if rel != "js/data/strings_pl.js" and POLISH_DIACRITICS_RE.search(content):
            errors.append(
                f"Hardcoded Polish diacritic characters found outside public/js/data/strings_pl.js in public/{rel}"
            )

        if rel.startswith("css/"):
            for forbidden_css in ("linear-gradient", "radial-gradient", "backdrop-filter"):
                if forbidden_css in content:
                    errors.append(f"Forbidden CSS property/function '{forbidden_css}' found in public/{rel}")

    node_audit = """
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const mainCss = fs.readFileSync('css/main.css', 'utf8');
for (const m of mainCss.matchAll(/@import\\s+['"]([^'"]+)['"]\\s*;/g)) {
  const target = path.resolve('css', m[1]);
  assert.ok(fs.existsSync(target), 'Missing CSS @import: ' + target);
}

function walkJs(dir) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(walkJs(full));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const jsFiles = walkJs('js');
const exportMap = new Map();
for (const file of jsFiles) {
  const src = fs.readFileSync(file, 'utf8');
  const exports = new Set();
  for (const m of src.matchAll(/export\\s+(?:async\\s+)?(?:function|const|let|class)\\s+([A-Za-z0-9_]+)/g)) {
    exports.add(m[1]);
  }
  exportMap.set(path.resolve(file), exports);
}

for (const file of jsFiles) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/import\\s+\\{([^}]+)\\}\\s+from\\s+['"]([^'"]+)['"]/g)) {
    const names = m[1].split(',').map((s) => s.trim().split(/\\s+as\\s+/)[0]).filter(Boolean);
    const targetPath = path.resolve(path.dirname(file), m[2]);
    assert.ok(fs.existsSync(targetPath), 'Missing import target: ' + targetPath + ' in ' + file);
    const targetExports = exportMap.get(targetPath);
    for (const sym of names) {
      assert.ok(targetExports.has(sym), 'Missing export ' + sym + ' in ' + targetPath);
    }
  }
}

const stringsSrc = fs.readFileSync('js/data/strings_pl.js', 'utf8');
const { STRINGS_PL } = await import('data:text/javascript;base64,' + Buffer.from(stringsSrc).toString('base64'));
function hasPath(obj, keys) {
  let cur = obj;
  for (const k of keys) {
    if (cur == null || !(k in cur)) return false;
    cur = cur[k];
  }
  return true;
}

for (const file of jsFiles) {
  if (file === 'js/data/strings_pl.js') continue;
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/(?:strings|STRINGS_PL)\\.([A-Za-z0-9_.]+)/g)) {
    const keys = m[1].split('.');
    if (['map', 'length'].includes(keys[keys.length - 1])) keys.pop();
    assert.ok(hasPath(STRINGS_PL, keys), 'Missing string key ' + m[1] + ' in ' + file);
  }
}

const cssFiles = [];
function walkCss(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkCss(full);
    else if (entry.name.endsWith('.css')) cssFiles.push(full);
  }
}
walkCss('css');
const combinedCss = cssFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\\n');
for (const file of jsFiles) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/className:\\s*['"`]([^'"`]+)['"`]/g)) {
    for (const cls of m[1].split(/\\s+/)) {
      if (!cls || cls.includes('$')) continue;
      const escaped = cls.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
      const selectorRe = new RegExp('\\\\.' + escaped + '(?![A-Za-z0-9_-])');
      assert.ok(selectorRe.test(combinedCss), 'Missing CSS class .' + cls + ' used in ' + file);
    }
  }
}
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", node_audit],
        cwd=PUBLIC_DIR,
        text=True,
        capture_output=True,
    )
    if proc.returncode != 0:
        errors.append(f"Static JS/CSS/i18n graph check failed: {proc.stderr.strip()}")


def verify_stylesheets_loaded(page, errors: list[str]) -> None:
    css_issues = page.evaluate(
        """() => {
            const issues = [];
            if (document.styleSheets.length < 1) {
                issues.push('Expected at least 1 top-level stylesheet (main.css), got ' + document.styleSheets.length);
            }
            const mainSheet = [...document.styleSheets].find((s) => s.href && s.href.endsWith('/css/main.css'));
            if (!mainSheet) {
                issues.push('Missing loaded ./css/main.css stylesheet');
            } else {
                const importCount = [...mainSheet.cssRules].filter((r) => r.type === CSSRule.IMPORT_RULE).length;
                if (importCount < 10) {
                    issues.push('Expected modular CSS @imports inside main.css, found ' + importCount);
                }
            }
            for (const sheet of document.styleSheets) {
                if (!sheet.href) continue;
                try {
                    const rules = sheet.cssRules;
                    if (!rules || rules.length === 0) {
                        issues.push('Empty stylesheet: ' + sheet.href);
                    }
                    for (const rule of rules) {
                        if (rule.type === CSSRule.IMPORT_RULE) {
                            if (!rule.styleSheet || !rule.styleSheet.cssRules || rule.styleSheet.cssRules.length === 0) {
                                issues.push('Failed or empty @import: ' + rule.href);
                            }
                        }
                    }
                } catch (err) {
                    issues.push('Cannot inspect stylesheet ' + sheet.href + ': ' + err.message);
                }
            }
            return issues;
        }"""
    )
    errors.extend(css_issues)


def verify_dom_semantics(page, errors: list[str]) -> None:
    report = page.evaluate(
        """() => {
            const issues = [];
            const lang = document.documentElement.getAttribute('lang');
            if (lang !== 'pl') {
                issues.push('Expected <html lang="pl">, got ' + lang);
            }

            const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
            if (metaDesc.trim().length < 20) {
                issues.push('Missing or too short meta description');
            }

            const ids = new Map();
            for (const el of document.querySelectorAll('[id]')) {
                const id = el.id;
                ids.set(id, (ids.get(id) || 0) + 1);
            }
            for (const [id, count] of ids.entries()) {
                if (count > 1) {
                    issues.push('Duplicate DOM id="' + id + '" (' + count + ' occurrences)');
                }
            }

            const h1s = document.querySelectorAll('h1');
            if (h1s.length !== 1) {
                issues.push('Expected exactly 1 <h1> element, found ' + h1s.length);
            }

            let prevLevel = 0;
            for (const heading of document.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
                const level = Number(heading.tagName.slice(1));
                if (prevLevel > 0 && level > prevLevel + 1) {
                    issues.push('Skipped heading level: h' + prevLevel + ' -> h' + level + ' (' + heading.textContent.trim() + ')');
                }
                prevLevel = level;
            }

            const bodyText = document.body.innerText;
            for (const bad of ['undefined', 'NaN', '[object Object]', '${']) {
                if (bodyText.includes(bad)) {
                    issues.push('Forbidden literal rendered in body text: ' + bad);
                }
            }

            const video = document.querySelector('#video-section video');
            if (!video) {
                issues.push('Missing #video-section <video> element');
            } else {
                for (const attr of ['controls', 'width', 'height', 'preload']) {
                    if (!video.hasAttribute(attr)) {
                        issues.push('Missing attribute "' + attr + '" on <video>');
                    }
                }
            }

            return issues;
        }"""
    )
    errors.extend(report)


def verify_mathjax_rendering(page, errors: list[str]) -> None:
    page.locator("mjx-container").first.wait_for(timeout=5000)
    report = page.evaluate(
        """() => {
            const issues = [];
            const merrors = document.querySelectorAll('mjx-merror');
            if (merrors.length > 0) {
                issues.push('Found ' + merrors.length + ' MathJax <mjx-merror> parse error(s)');
            }

            const mathContainers = [
                ...document.querySelectorAll('.hero-preview-card__formula, .formula-card__math, .formula-card__example-math, .generator-output__math')
            ];
            if (mathContainers.length !== 17) {
                issues.push('Expected 17 math containers across Hero/Theory/Generator, found ' + mathContainers.length);
            }

            for (const container of mathContainers) {
                const mjx = container.querySelector('mjx-container');
                if (!mjx) {
                    issues.push('Missing <mjx-container> inside ' + container.className);
                    continue;
                }
                const rect = mjx.getBoundingClientRect();
                if (rect.width <= 0 || rect.height <= 0) {
                    issues.push('Zero-sized <mjx-container> inside ' + container.className);
                }
            }

            // Ensure no raw unrendered LaTeX delimiters leak into visible text outside <code>
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            const delimRe = /\\\\\\(|\\\\\\)|\\\\\\[|\\\\\\]|\\$\\$/;
            let node;
            while ((node = walker.nextNode())) {
                const parent = node.parentElement;
                if (!parent || parent.closest('code, script, style, mjx-container')) continue;
                const text = node.nodeValue || '';
                if (delimRe.test(text)) {
                    issues.push('Unrendered LaTeX delimiter visible in DOM: ' + text.trim().slice(0, 60));
                }
            }
            return issues;
        }"""
    )
    errors.extend(report)


def verify_accessibility_and_targets(page, errors: list[str], *, check_skip_link: bool = False) -> None:
    page.set_viewport_size({"width": 375, "height": 667})
    page.wait_for_timeout(60)

    if check_skip_link:
        # Test skip-link keyboard focus from fresh document start
        page.keyboard.press("Tab")
        skip_report = page.evaluate(
            """() => {
                const active = document.activeElement;
                if (!active || !active.classList.contains('skip-link')) {
                    return { ok: false, reason: 'First Tab stop was not .skip-link: ' + (active ? active.outerHTML.slice(0, 80) : 'none') };
                }
                const r = active.getBoundingClientRect();
                const visible = r.width > 20 && r.height > 20 && r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth;
                return { ok: visible, reason: visible ? '' : 'Skip-link not visible on focus: ' + JSON.stringify(r) };
            }"""
        )
        if not skip_report["ok"]:
            errors.append(skip_report["reason"])
        return

    a11y_issues = page.evaluate(
        """() => {
            const issues = [];
            for (const el of document.querySelectorAll('a[href], button, input')) {
                const ariaLabel = el.getAttribute('aria-label') || '';
                const text = el.innerText ? el.innerText.trim() : '';
                let labelText = '';
                if (el.id) {
                    const lbl = document.querySelector('label[for="' + el.id + '"]');
                    if (lbl) labelText = lbl.innerText.trim();
                }
                if (!ariaLabel && !text && !labelText) {
                    issues.push('Interactive element missing accessible name: ' + el.outerHTML.slice(0, 80));
                }

                if (!el.classList.contains('skip-link')) {
                    const rect = el.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        if (rect.width < 24 || rect.height < 24) {
                            issues.push('Target smaller than 24x24px (' + Math.round(rect.width) + 'x' + Math.round(rect.height) + '): ' + el.className);
                        }
                    }
                }
            }
            return issues;
        }"""
    )
    errors.extend(a11y_issues)


def check_viewport_overflow(page, label: str, width: int, height: int, errors: list[str]) -> None:
    page.set_viewport_size({"width": width, "height": height})
    page.wait_for_timeout(80)

    report = page.evaluate(
        """() => {
            const vw = window.innerWidth;
            const sw = document.documentElement.scrollWidth;
            const overflowed = [];
            const clipIssues = [];

            for (const el of document.querySelectorAll('*')) {
                const rect = el.getBoundingClientRect();
                if (rect.width <= 0 || rect.height <= 0) continue;
                const scroller = el.closest('.pascal-pyramid, .formula-card__math, .generator-output__math');
                if (scroller && scroller !== el) continue;
                const isVisuallyHidden = el.classList.contains('visually-hidden') && !el.matches(':focus-within, :active');
                if (isVisuallyHidden) continue;
                if (rect.right > vw + 0.5 || rect.left < -0.5) {
                    overflowed.push({
                        tag: el.tagName.toLowerCase(),
                        cls: typeof el.className === 'string' ? el.className : '',
                        left: Math.round(rect.left),
                        right: Math.round(rect.right),
                        vw
                    });
                }
            }

            // Ensure horizontal scroll containers do not clip the left side at scrollLeft === 0
            for (const scroller of document.querySelectorAll('.generator-output__math, .formula-card__math, .pascal-pyramid')) {
                scroller.scrollLeft = 0;
                const sr = scroller.getBoundingClientRect();
                const child = scroller.querySelector('mjx-container, .pascal-row');
                if (child) {
                    const cr = child.getBoundingClientRect();
                    if (cr.left < sr.left - 1.5) {
                        clipIssues.push('Left-edge clipping inside ' + scroller.className + ': child.left=' + Math.round(cr.left) + ' < box.left=' + Math.round(sr.left));
                    }
                }
            }

            // Verify navbar links do not overlap one another
            const navRects = [...document.querySelectorAll('.site-nav__link')].map((a) => ({
                text: a.textContent.trim(),
                rect: a.getBoundingClientRect(),
            }));
            for (let i = 0; i < navRects.length; i++) {
                for (let j = i + 1; j < navRects.length; j++) {
                    const a = navRects[i].rect;
                    const b = navRects[j].rect;
                    const overlaps = !(a.right <= b.left + 0.5 || b.right <= a.left + 0.5 || a.bottom <= b.top + 0.5 || b.bottom <= a.top + 0.5);
                    if (overlaps) {
                        clipIssues.push('Nav link overlap: ' + navRects[i].text + ' & ' + navRects[j].text);
                    }
                }
            }

            // Verify hero geometric square cells have positive dimensions inside the preview card
            const cardRect = document.querySelector('.hero-preview-card')?.getBoundingClientRect();
            const cells = document.querySelectorAll('.geo-square__cell');
            if (cells.length !== 4) {
                clipIssues.push('Expected 4 .geo-square__cell blocks, found ' + cells.length);
            } else if (cardRect) {
                for (const cell of cells) {
                    const cr = cell.getBoundingClientRect();
                    if (cr.width < 20 || cr.height < 20 || cr.right > cardRect.right + 1) {
                        clipIssues.push('Malformed .geo-square__cell bounds: ' + JSON.stringify(cr));
                    }
                }
            }

            return { vw, sw, overflow: sw - vw, overflowed: overflowed.slice(0, 10), clipIssues };
        }"""
    )

    if report["overflow"] > 0 or report["overflowed"]:
        errors.append(
            f"[{label} {width}x{height}] Horizontal overflow detected: "
            f"scrollWidth={report['sw']} > innerWidth={report['vw']}; culprits={report['overflowed']}"
        )
    for clip_issue in report["clipIssues"]:
        errors.append(f"[{label} {width}x{height}] {clip_issue}")


def run() -> int:
    print("\n============================================================")
    print("▶ Running wielomiany-www Headless Chrome E2E Test Suite")
    print("============================================================")
    errors: list[str] = []

    run_static_checks(errors)

    with LocalServerManager(BASE_URL) as target_url:
        print(f"  Target URL: {target_url}")

        with sync_playwright() as p:
            browser = launch_browser(p)
            context = browser.new_context(
                viewport={"width": 1280, "height": 800},
                permissions=["clipboard-read", "clipboard-write"],
            )
            page = context.new_page()

            page_errors: list[str] = []
            bad_responses: list[tuple[int, str]] = []
            failed_requests: list[tuple[str, str]] = []
            unexpected_console_errors: list[str] = []
            loaded_font_urls: list[str] = []

            page.on("pageerror", lambda err: page_errors.append(str(err)))
            page.on(
                "requestfailed",
                lambda req: failed_requests.append((req.url, str(req.failure))),
            )

            def on_response(resp):
                if resp.status >= 400:
                    bad_responses.append((resp.status, resp.url))
                elif "/vendor/mathjax/" in resp.url and resp.url.endswith(".woff"):
                    loaded_font_urls.append(resp.url)

            page.on("response", on_response)

            def on_console(msg):
                if msg.type != "error":
                    return
                location = msg.location.get("url", "") if isinstance(msg.location, dict) else ""
                if any(location.endswith(opt) for opt in OPTIONAL_PLACEHOLDER_PATHS):
                    return
                if not location and "Failed to load resource" in msg.text and any(
                    not (PUBLIC_DIR / opt.lstrip("/")).exists() for opt in OPTIONAL_PLACEHOLDER_PATHS
                ):
                    return
                unexpected_console_errors.append(f"{msg.text} ({location})" if location else msg.text)

            page.on("console", on_console)

            print("  [2/7] Loading page, stylesheets, local fonts & verifying DOM semantics...")
            response = page.goto(f"{target_url}/", wait_until="networkidle")
            if not response or response.status != 200:
                errors.append(
                    f"Initial page load failed with status {response.status if response else 'None'}"
                )
            else:
                verify_stylesheets_loaded(page, errors)
                verify_dom_semantics(page, errors)

                title = page.title()
                if title != "Wielomiany - Wzory skróconego mnożenia":
                    errors.append(f"Unexpected document title: {title!r}")

                brand_title = page.locator(".brand-mark__title").inner_text().strip()
                if brand_title != "Wielomiany":
                    errors.append(f"Unexpected rendered brand title: {brand_title!r}")

                for selector, min_count in (
                    ("header.site-header", 1),
                    ("#hero-section h1", 1),
                    ("#video-section video source[src='./assets/manim_animation.mp4']", 1),
                    ("#theory-section .formula-card", 7),
                    ("#generator-section #pascal-exponent-slider", 1),
                    ("#generator-section .pascal-row", 8),
                    ("footer.site-footer", 1),
                ):
                    count = page.locator(selector).count()
                    if count < min_count:
                        errors.append(
                            f"Expected at least {min_count} node(s) for '{selector}', found {count}"
                        )

                # Verify contributors & repository footer (copyright + repo link, no profile link)
                footer_link = page.locator("footer.site-footer a.site-footer__link")
                if footer_link.count() != 1:
                    errors.append(f"Expected 1 footer GitHub repo link, found {footer_link.count()}")
                else:
                    if footer_link.get_attribute("href") != "https://github.com/fabirednik/wielomiany-www":
                        errors.append(f"Unexpected footer link href: {footer_link.get_attribute('href')!r}")
                    if footer_link.get_attribute("target") != "_blank":
                        errors.append("Footer GitHub link missing target='_blank'")
                    if "noopener" not in (footer_link.get_attribute("rel") or ""):
                        errors.append("Footer GitHub link missing rel='noopener'")
                    if (footer_link.text_content() or "").strip() != "fabirednik/wielomiany-www":
                        errors.append(f"Unexpected footer link label: {footer_link.text_content()!r}")
                footer_text = (page.locator("footer.site-footer").text_content() or "").lower()
                if "©" not in footer_text or "współtwórców github" not in footer_text:
                    errors.append(f"Footer missing copyright or contributors note: {footer_text!r}")

                footer_centered = page.evaluate(
                    """() => {
                        const footer = document.querySelector('footer.site-footer');
                        const inner = document.querySelector('.site-footer__inner');
                        const copy = document.querySelector('.site-footer__copy');
                        if (!footer || !inner || !copy) return false;
                        const fr = footer.getBoundingClientRect();
                        const cr = copy.getBoundingClientRect();
                        const footerMid = (fr.left + fr.right) / 2;
                        const copyMid = (cr.left + cr.right) / 2;
                        return getComputedStyle(inner).justifyContent === 'center' && Math.abs(footerMid - copyMid) <= 2;
                    }"""
                )
                if not footer_centered:
                    errors.append("Footer content is not centered")

                # Verify removed elements are absent
                if page.locator(".generator-output__raw").count() != 0:
                    errors.append("Removed .generator-output__raw frame still present in DOM")
                if page.locator(".hero-metrics").count() != 0:
                    errors.append("Removed .hero-metrics table still present in DOM")
                if page.locator(".video-rail__spec").count() != 0:
                    errors.append("Removed .video-rail__spec element still present in DOM")
                if page.locator(".section-index, .formula-card__index").count() != 0:
                    errors.append("Removed section/formula index labels (00 // ...) still present in DOM")
                if page.locator(".section-header-grid, .section-header-grid__aside").count() != 0:
                    errors.append("Removed split section header aside containers still present in DOM")
                header_widths = page.evaluate(
                    """() => {
                        const shell = document.querySelector('#app');
                        const shellW = shell ? shell.clientWidth : window.innerWidth;
                        return [...document.querySelectorAll('#theory-section .section-header, #generator-section .section-header')].map(el => ({
                            w: Math.round(el.getBoundingClientRect().width),
                            shellW
                        }));
                    }"""
                )
                if len(header_widths) != 2 or any(abs(item["w"] - item["shellW"]) > 2 for item in header_widths):
                    errors.append(f"Expected 2 full-width .section-header containers matching #app width, got {header_widths}")

                # Verify desktop shell has balanced side margins on large viewports
                shell_bounds = page.evaluate(
                    """() => {
                        const r = document.querySelector('#app').getBoundingClientRect();
                        return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), vw: window.innerWidth };
                    }"""
                )
                if shell_bounds["left"] < 12 or shell_bounds["width"] >= shell_bounds["vw"]:
                    errors.append(f"Expected side margins on 1280px desktop, got {shell_bounds}")

                # Verify all 7 formula cards share the exact same background color
                card_bgs = page.evaluate(
                    """() => [...document.querySelectorAll('#theory-section .formula-card')].map(el => getComputedStyle(el).backgroundColor)"""
                )
                if len(set(card_bgs)) != 1:
                    errors.append(f"Expected identical background across all 7 formula cards, got {card_bgs}")

                # Verify generator copy buttons start with "Kopiuj LaTeX"
                for kind in ("sum", "difference"):
                    gen_copy_label = (
                        page.locator(f".generator-output[data-output-kind='{kind}'] .copy-btn").text_content() or ""
                    ).strip()
                    if gen_copy_label != "Kopiuj LaTeX":
                        errors.append(
                            f"Expected generator {kind} copy button label 'Kopiuj LaTeX', got {gen_copy_label!r}"
                        )

                # Verify ONLY Theory and Generator section headers sit on orange background (#FF5500)
                orange_title_issues = page.evaluate(
                    """() => {
                        const orange = 'rgb(255, 85, 0)';
                        const orangeTargets = [
                            document.querySelector('#theory-section .section-header'),
                            document.querySelector('#generator-section .section-header'),
                        ];
                        const nonOrangeTargets = [
                            document.querySelector('.hero-title'),
                            document.querySelector('#video-section .video-rail'),
                        ];
                        const issues = [];
                        for (const el of orangeTargets) {
                            if (!el) {
                                issues.push('Missing orange title container');
                                continue;
                            }
                            const bg = getComputedStyle(el).backgroundColor;
                            if (bg !== orange) {
                                issues.push('Expected orange background ' + orange + ' on ' + el.className + ', got ' + bg);
                            }
                        }
                        for (const el of nonOrangeTargets) {
                            if (!el) {
                                issues.push('Missing non-orange title container');
                                continue;
                            }
                            const bg = getComputedStyle(el).backgroundColor;
                            if (bg === orange) {
                                issues.push('Unexpected orange background on ' + el.className);
                            }
                        }
                        return issues;
                    }"""
                )
                errors.extend(orange_title_issues)

                # Verify brutalist invariants (0px border-radius, none box-shadow, no backdrop-filter)
                brutalist_issues = page.evaluate(
                    """() => {
                        const issues = [];
                        for (const el of document.querySelectorAll('header, nav, section, article, aside, footer, button, a, input, div, figure')) {
                            const style = getComputedStyle(el);
                            for (const prop of ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius']) {
                                if (style[prop] !== '0px') {
                                    issues.push('Non-zero ' + prop + ' (' + style[prop] + ') on ' + el.className);
                                    break;
                                }
                            }
                            if (style.boxShadow !== 'none') {
                                issues.push('Non-none box-shadow on ' + el.className);
                            }
                            if (style.backdropFilter && style.backdropFilter !== 'none') {
                                issues.push('Backdrop blur active on ' + el.className);
                            }
                            if (issues.length >= 10) break;
                        }
                        return issues;
                    }"""
                )
                errors.extend(brutalist_issues)

                # Video placeholder behavior matches file presence
                video_exists = (PUBLIC_DIR / "assets" / "manim_animation.mp4").exists()
                placeholder_visible = page.locator(".video-placeholder").is_visible()
                if not video_exists and not placeholder_visible:
                    errors.append(
                        "Expected .video-placeholder fallback to be visible while ./assets/manim_animation.mp4 is absent"
                    )
                if video_exists and placeholder_visible:
                    errors.append(
                        "Expected .video-placeholder to hide when ./assets/manim_animation.mp4 is present"
                    )

                print("  [3/7] Verifying real MathJax LaTeX rendering & font loading...")
                verify_mathjax_rendering(page, errors)
                desktop_scroll_issues = page.evaluate(
                    """() => {
                        const issues = [];
                        for (const el of document.querySelectorAll('.formula-card__math, .formula-card__example, .formula-card__example-math, .generator-output__math')) {
                            const cs = getComputedStyle(el);
                            if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') {
                                issues.push('Desktop horizontal scroll enabled on ' + el.className);
                            }
                            if (el.scrollWidth > el.clientWidth + 1) {
                                issues.push('Desktop formula overflow inside ' + el.className + ': ' + el.scrollWidth + ' > ' + el.clientWidth);
                            }
                        }
                        return issues;
                    }"""
                )
                errors.extend(desktop_scroll_issues)
                if len(loaded_font_urls) == 0:
                    errors.append("No MathJax .woff font files were loaded with HTTP 200")
                verify_accessibility_and_targets(page, errors, check_skip_link=True)
                page.set_viewport_size({"width": 1280, "height": 800})

                print("  [4/7] Verifying Pascal generator (n = 0..7), keyboard & MathJax updates...")
                slider = page.locator("#pascal-exponent-slider")
                badge = page.locator(".exponent-badge")
                sum_copy_btn = page.locator(".generator-output[data-output-kind='sum'] .copy-btn")
                diff_copy_btn = page.locator(".generator-output[data-output-kind='difference'] .copy-btn")
                active_row_stat = page.locator(".generator-stat__value--mono")
                sum_output_math = page.locator(".generator-output__math[data-formula-kind='sum']")
                diff_output_math = page.locator(".generator-output__math[data-formula-kind='difference']")

                if badge.inner_text().strip() != "n = 3":
                    errors.append(f"Expected initial badge 'n = 3', got {badge.inner_text()!r}")

                for n in range(8):
                    slider.fill(str(n))
                    slider.dispatch_event("input")
                    page.wait_for_timeout(40)

                    sum_copy_btn.click()
                    page.locator(".generator-output[data-output-kind='sum'] .copy-btn[data-copied='true']").wait_for(timeout=2000)
                    expected_sum = EXPECTED_LATEX_BY_EXPONENT[n]
                    actual_sum = page.evaluate("() => navigator.clipboard.readText()")
                    if actual_sum != expected_sum:
                        errors.append(
                            f"Slider n={n} sum: expected LaTeX {expected_sum!r}, got {actual_sum!r}"
                        )

                    diff_copy_btn.click()
                    page.locator(".generator-output[data-output-kind='difference'] .copy-btn[data-copied='true']").wait_for(timeout=2000)
                    expected_diff = EXPECTED_DIFF_LATEX_BY_EXPONENT[n]
                    actual_diff = page.evaluate("() => navigator.clipboard.readText()")
                    if actual_diff != expected_diff:
                        errors.append(
                            f"Slider n={n} diff: expected LaTeX {expected_diff!r}, got {actual_diff!r}"
                        )

                    actual_row = active_row_stat.inner_text().strip()
                    if actual_row != EXPECTED_PASCAL_ROWS[n]:
                        errors.append(
                            f"Slider n={n}: expected row {EXPECTED_PASCAL_ROWS[n]!r}, got {actual_row!r}"
                        )

                    fill_width = page.locator(".slider-track__fill").evaluate("el => el.style.width.trim()")
                    expected_pct = (n / 7) * 100
                    actual_pct = float(fill_width.rstrip("%")) if fill_width.endswith("%") else -1.0
                    if abs(actual_pct - expected_pct) > 0.05:
                        errors.append(
                            f"Slider n={n}: expected .slider-track__fill width ~{expected_pct:.2f}%, got {fill_width!r}"
                        )

                    pressed_row = page.locator(f".pascal-row[data-row-index='{n}']").get_attribute(
                        "aria-pressed"
                    )
                    pressed_step = page.locator(f".exponent-step-btn[data-exponent='{n}']").get_attribute(
                        "aria-pressed"
                    )
                    if pressed_row != "true" or pressed_step != "true":
                        errors.append(f"n={n}: aria-pressed mismatch row={pressed_row}, step={pressed_step}")

                    sum_mjx_count = sum_output_math.locator("mjx-container").count()
                    diff_mjx_count = diff_output_math.locator("mjx-container").count()
                    if sum_mjx_count != 1 or diff_mjx_count != 1:
                        errors.append(
                            f"Slider n={n}: expected 1 <mjx-container> per output, found sum={sum_mjx_count}, diff={diff_mjx_count}"
                        )

                # Keyboard interaction check on slider
                slider.focus()
                page.keyboard.press("ArrowLeft")
                if slider.input_value() != "6":
                    errors.append(f"ArrowLeft from n=7 expected 6, got {slider.input_value()!r}")
                page.keyboard.press("ArrowRight")
                if slider.input_value() != "7":
                    errors.append(f"ArrowRight from n=6 expected 7, got {slider.input_value()!r}")

                # Clicking Pascal triangle row and step button
                page.locator(".pascal-row[data-row-index='5']").click()
                if slider.input_value() != "5":
                    errors.append(f"Clicking Pascal row 5 failed to sync slider (value={slider.input_value()!r})")

                page.locator(".exponent-step-btn[data-exponent='2']").click()
                if slider.input_value() != "2":
                    errors.append(f"Clicking step button 2 failed to sync slider (value={slider.input_value()!r})")

                sum_output_math.locator("mjx-container").wait_for(timeout=3000)
                diff_output_math.locator("mjx-container").wait_for(timeout=3000)
                if page.locator("mjx-merror").count() > 0:
                    errors.append("MathJax parse errors (<mjx-merror>) detected after dynamic updates")

                print("  [5/7] Verifying clipboard copy, live announcement & reset timer...")
                sum_copy_btn.click()
                page.locator(".generator-output[data-output-kind='sum'] .copy-btn[data-copied='true']").wait_for(timeout=2000)
                copied_text = page.evaluate("() => navigator.clipboard.readText()")
                if copied_text != EXPECTED_LATEX_BY_EXPONENT[2]:
                    errors.append(
                        f"Clipboard text mismatch: expected {EXPECTED_LATEX_BY_EXPONENT[2]!r}, got {copied_text!r}"
                    )
                if (sum_copy_btn.text_content() or "").strip() != "Skopiowano":
                    errors.append(f"Expected copied label 'Skopiowano', got {sum_copy_btn.text_content()!r}")
                live_status = page.locator(".generator-outputs [role='status']").inner_text().strip()
                if not live_status:
                    errors.append("Expected non-empty aria-live status announcement after copy")

                diff_copy_btn.click()
                page.locator(".generator-output[data-output-kind='difference'] .copy-btn[data-copied='true']").wait_for(timeout=2000)
                diff_copied = page.evaluate("() => navigator.clipboard.readText()")
                if diff_copied != EXPECTED_DIFF_LATEX_BY_EXPONENT[2]:
                    errors.append(
                        f"Difference clipboard mismatch: expected {EXPECTED_DIFF_LATEX_BY_EXPONENT[2]!r}, got {diff_copied!r}"
                    )

                theory_copy_btn = page.locator("#theory-section .formula-card .copy-btn").first
                theory_copy_btn.click()
                page.locator("#theory-section .formula-card .copy-btn[data-copied='true']").first.wait_for(timeout=2000)
                theory_copied = page.evaluate("() => navigator.clipboard.readText()")
                if theory_copied != "(a + b)^2 = a^2 + 2ab + b^2":
                    errors.append(f"Unexpected theory formula copied to clipboard: {theory_copied!r}")

                # Verify copy buttons reset cleanly after ~1.8s
                page.wait_for_timeout(1950)
                if sum_copy_btn.get_attribute("data-copied") is not None or diff_copy_btn.get_attribute("data-copied") is not None:
                    errors.append("Copy button did not reset data-copied state after timeout")

                print("  [6/7] Verifying keyboard skip-link, accessible names & target sizes...")
                verify_accessibility_and_targets(page, errors)

                print("  [7/7] Checking mobile-to-desktop bounds, anti-clipping & zero overflow...")
                page.locator(".pascal-row[data-row-index='7']").click()
                page.wait_for_timeout(120)
                verify_mathjax_rendering(page, errors)
                page.set_viewport_size({"width": 1280, "height": 800})
                page.wait_for_timeout(60)
                n7_desktop_overflow = page.evaluate(
                    """() => [...document.querySelectorAll('.generator-output__math')]
                        .filter(el => el.scrollWidth > el.clientWidth + 1)
                        .map(el => el.dataset.formulaKind + ': ' + el.scrollWidth + ' > ' + el.clientWidth)"""
                )
                for item in n7_desktop_overflow:
                    errors.append(f"Desktop n=7 formula overflow on {item}")
                for vp_name, vp_w, vp_h in VIEWPORTS:
                    check_viewport_overflow(page, vp_name, vp_w, vp_h, errors)

            for err in page_errors:
                errors.append(f"Uncaught pageerror: {err}")

            require_video = os.environ.get("E2E_REQUIRE_VIDEO") == "1"
            for url, reason in failed_requests:
                if any(url.endswith(opt) for opt in OPTIONAL_PLACEHOLDER_PATHS) and not require_video:
                    continue
                errors.append(f"Failed network request: {url} ({reason})")

            for status, url in bad_responses:
                if any(url.endswith(opt) for opt in OPTIONAL_PLACEHOLDER_PATHS) and not require_video:
                    continue
                errors.append(f"HTTP {status} for {url}")

            for msg in unexpected_console_errors:
                errors.append(f"Console error: {msg}")

            browser.close()

    if errors:
        print("\nFAILED CHECKS:")
        for item in errors:
            print(f"  ✗ {item}")
        print(f"\nE2E SUITE FAILED ({len(errors)} issue(s)).")
        return 1

    print("\nALL E2E CHECKS PASSED CLEANLY (0 errors, 100% MathJax & zero overflow across 320px-1600px).")
    return 0


if __name__ == "__main__":
    sys.exit(run())
