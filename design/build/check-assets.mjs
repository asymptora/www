#!/usr/bin/env node
// Structural checks for the committed logo and favicon files (RFC 0002, D15).
//
//   node design/build/check-assets.mjs
//
// CI does not run the Python scripts that generate these files (a raster is not
// guaranteed to be byte-identical across renderer versions), so it checks what
// must hold whoever generated them:
//   - public/logo.svg and public/favicon.svg carry the original lambda path;
//   - public/favicon.ico has exactly the 16, 32 and 48 px entries, each a PNG of
//     that size;
//   - public/apple-touch-icon.png is a 180 by 180 px PNG;
//   - no SVG, PNG or ICO under public/ carries a metadata block or a C2PA marker.
//
// No dependencies: Node built-ins only. Exits 1 and lists every problem found.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUBLIC = join(ROOT, 'public');

// The original lambda. Same constant as LAMBDA_D in build_logo.py: keep them in sync.
const LAMBDA_D = 'M34,0 L47,29 L0,126 L33,126 L63,63 L97,126 L129,126 L70,0 Z';

const problems = [];
const fail = (msg) => problems.push(msg);
const rel = (p) => relative(ROOT, p);

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Returns { width, height, chunks } for a PNG buffer, or null if it is not one.
function readPng(buf) {
  if (buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  if (buf.toString('latin1', 12, 16) !== 'IHDR') return null;
  const chunks = [];
  for (let off = 8; off + 8 <= buf.length; ) {
    const len = buf.readUInt32BE(off);
    chunks.push(buf.toString('latin1', off + 4, off + 8));
    off += 12 + len;
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), chunks };
}

function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else yield path;
  }
}

function read(path) {
  if (!existsSync(path)) {
    fail(`${rel(path)} is missing`);
    return null;
  }
  return readFileSync(path);
}

// ---- the lambda path ------------------------------------------------------
for (const name of ['logo.svg', 'favicon.svg']) {
  const path = join(PUBLIC, name);
  const buf = read(path);
  if (buf && !buf.toString('utf8').includes(`d="${LAMBDA_D}"`)) {
    fail(`${rel(path)} does not contain the original lambda path`);
  }
}

// ---- favicon.ico ----------------------------------------------------------
{
  const path = join(PUBLIC, 'favicon.ico');
  const buf = read(path);
  if (buf) {
    const reserved = buf.readUInt16LE(0), type = buf.readUInt16LE(2), count = buf.readUInt16LE(4);
    if (reserved !== 0 || type !== 1) {
      fail(`${rel(path)} is not an ICO file`);
    } else {
      const sizes = [];
      for (let i = 0; i < count; i++) {
        const entry = 6 + i * 16;
        const width = buf[entry] || 256, height = buf[entry + 1] || 256;
        const size = buf.readUInt32LE(entry + 8), offset = buf.readUInt32LE(entry + 12);
        sizes.push(width);
        const png = readPng(buf.subarray(offset, offset + size));
        if (!png) fail(`${rel(path)}: entry ${i} (${width} px) is not a PNG`);
        else if (png.width !== width || png.height !== height) {
          fail(`${rel(path)}: entry ${i} says ${width}x${height} but its PNG is ${png.width}x${png.height}`);
        } else if (png.chunks.includes('caBX')) {
          fail(`${rel(path)}: entry ${i} carries a C2PA chunk (caBX)`);
        }
      }
      if (sizes.slice().sort((a, b) => a - b).join(',') !== '16,32,48') {
        fail(`${rel(path)} has entries ${sizes.join(', ')} px, expected 16, 32 and 48`);
      }
    }
  }
}

// ---- apple-touch-icon.png --------------------------------------------------
{
  const path = join(PUBLIC, 'apple-touch-icon.png');
  const buf = read(path);
  if (buf) {
    const png = readPng(buf);
    if (!png) fail(`${rel(path)} is not a PNG`);
    else {
      if (png.width !== 180 || png.height !== 180) fail(`${rel(path)} is ${png.width}x${png.height}, expected 180x180`);
      if (png.chunks.includes('caBX')) fail(`${rel(path)} carries a C2PA chunk (caBX)`);
    }
  }
}

// ---- no metadata block, no C2PA marker, in any SVG, PNG or ICO -------------
for (const file of files(PUBLIC)) {
  const ext = extname(file).toLowerCase();
  if (!['.svg', '.png', '.ico'].includes(ext)) continue;
  const text = readFileSync(file).toString('latin1').toLowerCase();
  if (text.includes('<metadata')) fail(`${rel(file)} contains a <metadata> block`);
  if (text.includes('c2pa')) fail(`${rel(file)} contains a C2PA marker`);
  if (ext === '.svg' && !/^\s*(<\?xml[^>]*\?>\s*)?<svg[\s>]/.test(text)) fail(`${rel(file)} does not start with <svg`);
}

if (problems.length) {
  problems.forEach((p) => console.error(`assets: ${p}`));
  process.exit(1);
}
console.log('assets: ok (lambda path, ICO sizes, Apple icon size, no metadata or C2PA marker)');
