#!/usr/bin/env node
// Checks the response headers that public/_headers makes the site send
// (RFC 0003, P5 and P6), against a running `wrangler dev`.
//
//   node design/build/check-headers.mjs http://localhost:8787
//
// The CI step starts wrangler dev and runs this before the link check. It is a
// check of the repository's own file, as Cloudflare's local runtime applies it.
// It is not a check of production, which sits behind Bot Fight Mode and is not
// requested from CI (see .github/workflows/edge-verify.yml).
//
// It fails when:
//   - a page, or the 404, does not carry exactly the headers declared in the
//     `/*` block of public/_headers;
//   - one of the required headers is missing from that block (a deleted header
//     would otherwise pass, because "declared" would be empty);
//   - the CSP is Report-Only, or contains a wildcard or an `unsafe-` keyword.
//
// No dependencies: Node built-ins and fetch.

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.argv[2];
if (!base) {
  console.error('usage: node design/build/check-headers.mjs <base-url>');
  process.exit(2);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUBLIC = join(ROOT, 'public');

const REQUIRED = ['content-security-policy', 'permissions-policy', 'x-content-type-options'];

const problems = [];
const fail = (msg) => problems.push(msg);

// ---- what _headers declares for every path --------------------------------
const declared = new Map();
{
  let inBlock = false;
  for (const raw of readFileSync(join(PUBLIC, '_headers'), 'utf8').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (line === '' || line.startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      inBlock = line === '/*';
      continue;
    }
    if (!inBlock) continue;
    const i = line.indexOf(':');
    const name = line.slice(0, i).trim().toLowerCase();
    const value = line.slice(i + 1).trim();
    if (declared.has(name)) fail(`public/_headers: ${name} is declared twice in the /* block (values are joined with a comma)`);
    declared.set(name, value);
  }
}
for (const name of REQUIRED) {
  if (!declared.has(name)) fail(`public/_headers: the /* block does not declare ${name}`);
}

// ---- the policy itself ------------------------------------------------------
if (declared.has('content-security-policy-report-only')) {
  fail('public/_headers: content-security-policy-report-only is declared; the policy is meant to be enforced (RFC 0003, P6)');
}
const csp = declared.get('content-security-policy') ?? '';
if (/\*|unsafe-/.test(csp)) {
  fail(`public/_headers: the CSP contains a wildcard or an unsafe- keyword: ${csp}`);
}

// ---- what is served ---------------------------------------------------------
const pages = readdirSync(PUBLIC)
  .filter((f) => f.endsWith('.html') && f !== '404.html')
  .map((f) => (f === 'index.html' ? '/' : `/${f.replace(/\.html$/, '')}`))
  .sort();
const paths = [...pages, '/this-page-does-not-exist'];

for (const path of paths) {
  let res;
  try {
    res = await fetch(base + path, { redirect: 'manual' });
  } catch (e) {
    fail(`${path}: request failed (${e.message})`);
    continue;
  }
  const expected = path === '/this-page-does-not-exist' ? 404 : 200;
  if (res.status !== expected) fail(`${path}: status ${res.status}, expected ${expected}`);
  for (const [name, value] of declared) {
    const got = res.headers.get(name);
    if (got === null) fail(`${path}: ${name} is missing`);
    else if (got !== value) fail(`${path}: ${name} is "${got}", _headers declares "${value}"`);
  }
}

if (problems.length) {
  problems.forEach((p) => console.error(`headers: ${p}`));
  process.exit(1);
}
console.log(`headers: ok (${paths.length} paths incl. the 404 carry ${[...declared.keys()].join(', ')})`);
