#!/usr/bin/env node
// Checks the invariants of RFC 0002 that a person could break by accident
// while editing a page or the stylesheet.
//
// Scope: the SOURCE files under public/, not the HTML Cloudflare delivers.
// Cloudflare injects its own scripts at the edge (JavaScript detections, Web
// Analytics beacon) and a honeypot link; none of that exists in these files, so
// this check neither sees nor forbids it.
//
//   node design/build/check-invariants.mjs
//
//   1. No JavaScript (ADR 0007): no <script>, no inline event handler
//      (onclick=, onload=, ...), no javascript: URL.
//   2. Nothing authored loads from outside the site (ADR 0009): every src=,
//      <link href>, srcset, @import and url() must be same-origin. External
//      addresses are allowed only as <a href>.
//   3. No inline styling: no <style> and no style= attribute. Visual rules
//      live in public/style.css, fed by tokens.css (ADR 0006).
//   4. Contrast (WCAG 2.x AA, 4.5:1) of the text colours that style.css puts on
//      surface-page, computed from the dark values in design/tokens.json.
//      Only dark is checked because the site is dark only (ADR 0007).
//
// No dependencies: Node built-ins only. Exits 1 and lists every problem found.

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUBLIC = join(ROOT, 'public');
const rel = (p) => relative(ROOT, p);

const problems = [];
const fail = (msg) => problems.push(msg);

// A reference is same-origin when it is a path, a fragment, a query or a
// mailto/tel link. Anything with a scheme or starting with // is not.
const isLocal = (url) => {
  const u = url.trim();
  if (u === '') return true;
  if (u.startsWith('//')) return false;
  return !/^[a-z][a-z0-9+.-]*:/i.test(u);
};

// ---- pages ----------------------------------------------------------------
const pages = readdirSync(PUBLIC).filter((f) => f.endsWith('.html')).sort();
for (const name of pages) {
  const path = join(PUBLIC, name);
  const html = readFileSync(path, 'utf8');
  // Comments may mention these tags; they do not run.
  const live = html.replace(/<!--[\s\S]*?-->/g, '');

  if (/<script[\s>]/i.test(live)) fail(`${rel(path)}: contains <script> (ADR 0007: no JavaScript)`);
  if (/\son[a-z]+\s*=/i.test(live)) fail(`${rel(path)}: contains an inline event handler`);
  if (/javascript:/i.test(live)) fail(`${rel(path)}: contains a javascript: URL`);
  if (/<style[\s>]/i.test(live)) fail(`${rel(path)}: contains <style> (put rules in public/style.css)`);
  if (/\sstyle\s*=/i.test(live)) fail(`${rel(path)}: contains a style= attribute (put rules in public/style.css)`);
  if (/<(iframe|object|embed|form)[\s>]/i.test(live)) fail(`${rel(path)}: contains iframe, object, embed or form`);

  for (const m of live.matchAll(/<(?!a[\s>])[a-z][a-z0-9-]*\b[^>]*>/gi)) {
    for (const a of m[0].matchAll(/\s(src|href|poster|data)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      const value = a[3] ?? a[4] ?? a[5];
      if (!isLocal(value)) fail(`${rel(path)}: ${a[1]}="${value}" loads from outside the site`);
    }
    for (const a of m[0].matchAll(/\ssrcset\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
      const value = a[2] ?? a[3];
      for (const part of value.split(',')) {
        const url = part.trim().split(/\s+/)[0];
        if (url && !isLocal(url)) fail(`${rel(path)}: srcset entry "${url}" loads from outside the site`);
      }
    }
  }
}

// ---- stylesheets ----------------------------------------------------------
for (const name of ['style.css', 'tokens.css']) {
  const path = join(PUBLIC, name);
  const css = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(/@import\s+(?:url\()?\s*["']?([^"')\s;]+)/gi)) {
    if (!isLocal(m[1])) fail(`${rel(path)}: @import "${m[1]}" loads from outside the site`);
  }
  for (const m of css.matchAll(/url\(\s*["']?([^"')]+?)["']?\s*\)/gi)) {
    if (!isLocal(m[1])) fail(`${rel(path)}: url(${m[1]}) loads from outside the site`);
  }
}

// ---- contrast -------------------------------------------------------------
const tokens = JSON.parse(readFileSync(join(ROOT, 'design', 'tokens.json'), 'utf8')).color.tokens;
const dark = (name) => {
  const t = tokens.find((x) => x.name === name);
  if (!t || typeof t.value !== 'object' || !/^#[0-9a-f]{6}$/i.test(t.value.dark)) {
    fail(`design/tokens.json: token "${name}" has no #rrggbb dark value`);
    return null;
  }
  return t.value.dark;
};

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Text colours that public/style.css sets on the page background.
const MIN = 4.5;
const bg = dark('surface-page');
const ratios = [];
for (const fg of ['ink', 'ink-muted', 'accent']) {
  const hex = dark(fg);
  if (!hex || !bg) continue;
  const ratio = contrast(hex, bg);
  ratios.push(`${fg} ${ratio.toFixed(1)}`);
  if (ratio < MIN) fail(`contrast: ${fg} (${hex}) on surface-page (${bg}) is ${ratio.toFixed(2)}:1, below ${MIN}:1`);
}

if (problems.length) {
  problems.forEach((p) => console.error(`invariants: ${p}`));
  process.exit(1);
}
console.log(`invariants: ok (${pages.length} pages: no script, no inline style, nothing external; contrast on surface-page: ${ratios.join(', ')})`);
