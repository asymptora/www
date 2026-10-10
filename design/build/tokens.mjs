#!/usr/bin/env node
// Generates public/tokens.css from design/tokens.json (RFC 0002, D13/D14).
//
//   node design/build/tokens.mjs           write public/tokens.css
//   node design/build/tokens.mjs --check   write nothing; exit 1 if
//                                          - public/tokens.css differs from what the
//                                            tokens would generate (drift),
//                                          - a literal colour appears in public/ outside
//                                            tokens.css (HTML and CSS files),
//                                          - dot-grid-color does not match the RGB of ink.
//
// No dependencies: Node built-ins only. Deterministic: same input, same bytes.
// The site is dark-only (RFC 0002, D1), so only the "dark" theme is emitted.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TOKENS = join(ROOT, 'design', 'tokens.json');
const OUTPUT = join(ROOT, 'public', 'tokens.css');
const PUBLIC = join(ROOT, 'public');
const THEME = 'dark';

const fail = (msg) => {
  console.error(`tokens: ${msg}`);
  process.exit(1);
};

const tokens = JSON.parse(readFileSync(TOKENS, 'utf8'));

// ---- colours -------------------------------------------------------------

const colours = tokens.color.tokens;
const colourNames = new Set(colours.map((t) => t.name));
const ALIAS = /^\{([a-z0-9-]+)\}$/;
const HEX = /^#[0-9a-f]{6}$/;

function colourValue(token) {
  const raw = typeof token.value === 'string' ? token.value : token.value[THEME];
  if (raw === undefined) fail(`colour "${token.name}" has no "${THEME}" value`);
  const alias = ALIAS.exec(raw);
  if (alias) {
    if (!colourNames.has(alias[1])) fail(`colour "${token.name}" aliases unknown token "${alias[1]}"`);
    return `var(--${alias[1]})`;
  }
  if (!HEX.test(raw)) fail(`colour "${token.name}": "${raw}" is not a lowercase #rrggbb value`);
  return raw;
}

// ---- generation ----------------------------------------------------------

const decl = (name, value) => `  --${name}: ${value};`;

function generate() {
  const out = [];
  const section = (title, lines) => {
    out.push('', `  /* ${title} */`, ...lines);
  };

  section(`Colour (${THEME})`, colours.map((t) => decl(t.name, colourValue(t))));

  section(
    'Font families',
    Object.entries(tokens.type.families).map(([key, value]) => decl(`font-${key}`, value)),
  );

  const typeLines = [];
  for (const group of tokens.type.groups) {
    for (const s of group.styles) {
      typeLines.push(decl(`${s.name}-size`, s.fontSize));
      typeLines.push(decl(`${s.name}-line`, s.lineHeight));
      typeLines.push(decl(`${s.name}-weight`, s.fontWeight));
      if (s.letterSpacing !== undefined) typeLines.push(decl(`${s.name}-tracking`, s.letterSpacing));
    }
  }
  section('Type styles', typeLines);

  section('Spacing', tokens.spacing.tokens.map((t) => decl(t.name, t.value)));
  section('Radius', tokens.radius.tokens.map((t) => decl(t.name, t.value)));
  section('Pattern', tokens.pattern.tokens.map((t) => decl(t.name, t.value)));

  return [
    '/* GENERATED from design/tokens.json by design/build/tokens.mjs. Do not edit by hand. */',
    '/* Regenerate with: node design/build/tokens.mjs (CI fails if this file drifts). */',
    ':root {',
    ...out.slice(1),
    '}',
    '',
  ].join('\n');
}

// ---- checks --------------------------------------------------------------

function checkDotGridColour() {
  const ink = colours.find((t) => t.name === 'ink');
  const dot = tokens.pattern.tokens.find((t) => t.name === 'dot-grid-color');
  if (!ink || !dot) fail('tokens "ink" and "dot-grid-color" are both required');
  const inkHex = colourValue(ink);
  const m = /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)$/.exec(dot.value);
  if (!m) fail(`dot-grid-color "${dot.value}" is not rgba(r, g, b, a)`);
  const fromRgb = '#' + m.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, '0')).join('');
  if (fromRgb !== inkHex) {
    fail(`dot-grid-color RGB (${fromRgb}) does not match ink (${inkHex}); a pattern value cannot reference a token, so keep them in sync`);
  }
}

function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else yield path;
  }
}

// Literal colours: #rgb/#rrggbb/#rrggbbaa and rgb()/rgba()/hsl()/hsla() functions.
const LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/g;

function checkLiteralColours() {
  const problems = [];
  for (const file of files(PUBLIC)) {
    if (file === OUTPUT || !/\.(html|css)$/.test(file)) continue;
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      for (const m of line.matchAll(LITERAL)) {
        problems.push(`${relative(ROOT, file)}:${i + 1}: literal colour "${m[0]}" (use a token from tokens.css)`);
      }
    });
  }
  return problems;
}

// ---- main ----------------------------------------------------------------

checkDotGridColour();
const css = generate();

if (process.argv.includes('--check')) {
  let current = null;
  try {
    current = readFileSync(OUTPUT, 'utf8');
  } catch {
    /* handled below */
  }
  const problems = [];
  if (current !== css) {
    problems.push('public/tokens.css is missing or differs from design/tokens.json; run: node design/build/tokens.mjs');
  }
  problems.push(...checkLiteralColours());
  if (problems.length) {
    problems.forEach((p) => console.error(`tokens: ${p}`));
    process.exit(1);
  }
  console.log('tokens: ok (tokens.css matches tokens.json, no literal colours outside it, dot-grid matches ink)');
} else {
  writeFileSync(OUTPUT, css);
  console.log(`tokens: wrote ${relative(ROOT, OUTPUT)}`);
}
