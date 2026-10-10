#!/usr/bin/env node
// Applies the shared markup to every page under public/ (RFC 0002, D6, D10, D13).
//
//   node design/build/apply-shared-markup.mjs           write the pages
//   node design/build/apply-shared-markup.mjs --check   write nothing; exit 1 if a
//                                                       page differs from what the
//                                                       script would write, or if the
//                                                       footers differ across pages
//
// The canonical blocks live in design/shared/:
//   header.html      the <header>, identical on every page
//   head-links.html  the icon and stylesheet links at the end of <head>
//
// The script replaces each block in each page by the canonical one, so running it
// twice produces no diff. It is an editing tool, not a generator: the pages stay
// hand-written, complete files, and what is committed is what is served (ADR 0001
// and ADR 0006).
//
// Differences between pages are expressed only on <body>, never inside the header
// (RFC 0002, "Header, footer and head"). The one difference today: the Home gets a
// class, so a rule can hide the header logo when the hero lockup is on the page.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUBLIC = join(ROOT, 'public');
const SHARED = join(ROOT, 'design', 'shared');

const BODY_CLASS = { 'index.html': 'home' };

const header = readFileSync(join(SHARED, 'header.html'), 'utf8').trimEnd();
const headLinks = readFileSync(join(SHARED, 'head-links.html'), 'utf8').trimEnd();

const fail = (msg) => {
  console.error(`markup: ${msg}`);
  process.exit(1);
};

function apply(name, html) {
  const where = `public/${name}`;
  const once = (re, what) => {
    const n = [...html.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))].length;
    if (n !== 1) fail(`${where}: expected exactly one ${what}, found ${n}`);
  };
  once(/<\/head>/, '</head>');
  once(/<body[^>]*>/, '<body>');
  if (/<header>/.test(html)) once(/<header>/, '<header>');

  // 1. Head: drop every icon and stylesheet link, then put the canonical block
  //    back at the end of <head>.
  html = html.replace(/^[ \t]*<link rel="(?:icon|apple-touch-icon|stylesheet)"[^>]*>[ \t]*\n/gm, '');
  html = html.replace('</head>', `${headLinks}\n</head>`);

  // 2. Body tag: the only place where pages differ.
  const bodyTag = BODY_CLASS[name] ? `<body class="${BODY_CLASS[name]}">` : '<body>';
  html = html.replace(/<body[^>]*>/, bodyTag);

  // 3. Header: replace it, or insert it right after <body> when the page has none.
  if (/<header>/.test(html)) {
    html = html.replace(/[ \t]*<header>[\s\S]*?<\/header>/, () => header);
  } else {
    html = html.replace(`${bodyTag}\n`, () => `${bodyTag}\n${header}\n\n`);
  }
  return html;
}

const pages = readdirSync(PUBLIC).filter((f) => f.endsWith('.html')).sort();

if (process.argv.includes('--check')) {
  // Parity: every page must already be exactly what apply() would write (the
  // canonical header, head links and body tag), and the footers must match each
  // other (there is no canonical footer file; the pages are the reference).
  const problems = [];
  let markupDiffers = false;
  const footers = new Map(); // footer text -> pages that have it
  for (const name of pages) {
    const html = readFileSync(join(PUBLIC, name), 'utf8');
    if (apply(name, html) !== html) {
      markupDiffers = true;
      problems.push(`public/${name} differs from the canonical header, head links or body tag`);
    }
    const found = html.match(/<footer>[\s\S]*?<\/footer>/g) || [];
    if (found.length !== 1) problems.push(`public/${name}: expected exactly one <footer>, found ${found.length}`);
    else footers.set(found[0], [...(footers.get(found[0]) || []), name]);
  }
  if (footers.size > 1) {
    problems.push(`the footers differ across pages: ${[...footers.values()].map((p) => p.join(', ')).join(' | ')}`);
  }
  if (problems.length) {
    problems.forEach((p) => console.error(`markup: ${p}`));
    if (markupDiffers) console.error('markup: to fix them, edit design/shared/ if the change is intended, then run: node design/build/apply-shared-markup.mjs');
    process.exit(1);
  }
  console.log(`markup: ok (${pages.length} pages match the canonical header, head links and body tag; footers identical)`);
} else {
  let changed = 0;
  for (const name of pages) {
    const path = join(PUBLIC, name);
    const before = readFileSync(path, 'utf8');
    const after = apply(name, before);
    if (after !== before) {
      writeFileSync(path, after);
      changed++;
      console.log(`markup: updated ${relative(ROOT, path)}`);
    }
  }
  console.log(`markup: ${changed} file(s) changed`);
}
