#!/usr/bin/env node
// Applies the shared markup to every page under public/ (RFC 0002, D6, D10, D13).
//
//   node design/build/apply-shared-markup.mjs
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

let changed = 0;
for (const name of readdirSync(PUBLIC).filter((f) => f.endsWith('.html')).sort()) {
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
