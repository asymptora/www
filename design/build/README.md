# Logo and favicon build scripts

Two Python scripts generate every logo asset from the official JetBrains Mono
outlines and the original lambda path (RFC 0002, D3 and D15). They run by hand
when the logo or the font changes. Their outputs are committed, so the site never
depends on running them (ADR 0001 stands: what is served is what is committed).
The token stylesheet is a different script, `tokens.mjs`, and it does run in CI.

| Script | Reads | Writes |
|---|---|---|
| `build_logo.py <ttf-dir> <out-dir>` | the official TTFs; the lambda path, a constant in the script | `lockup-p{1,2,3}.svg`, `symbol-p{1,2,3}.svg` |
| `build_favicon.py <svg-dir> <out-dir>` | `<svg-dir>/symbol-p3.svg` | `favicon.svg`, `favicon.ico` (16, 32, 48), `apple-touch-icon.png` (180) |

Preset `p3` (braces in Bold, wordmark in ExtraBold) is the one the site uses.
`p1` and `p2` are kept because they come from the same proportions and make the
weight choice reproducible.

## Why the lambda is a constant and the rest comes from the font

The lambda is the brand's own shape. Tracing it from a raster image produced a
wrong shape (a caret, or the plain symbol), so its path is copied byte for byte
from the Design System and never redrawn. The braces and the wordmark are glyph
outlines taken from the font, so they are exact and need no tracing.

## Committed files

The outputs the site uses are committed under `public/`, at the site root, so
their URLs are stable:

| File | Made by | Used for |
|---|---|---|
| `public/logo.svg` | `lockup-p3.svg` from `build_logo.py` | the header logo |
| `public/favicon.svg` | `build_favicon.py` | browser tab icon (vector) |
| `public/favicon.ico` | `build_favicon.py` | browser tab icon (16, 32 and 48 px; also what search engines read) |
| `public/apple-touch-icon.png` | `build_favicon.py` | the iOS "Add to Home Screen" icon (180 px) |

The `p1` and `p2` presets, the standalone symbols and the unprefixed lockup are
not committed: nothing serves them, and the scripts regenerate them on demand.

## Prerequisites

- Python 3.13 (the version the outputs were verified with).
- The cairo library on the system, version 1.18 (`libcairo2` on Debian and Ubuntu).
- The Python packages, pinned in `requirements.txt`:

```
python3 -m venv .venv
.venv/bin/pip install -r design/build/requirements.txt
```

`fonttools` reads the fonts and draws the outlines. `cairosvg` renders the PNGs
that go inside `favicon.ico` and the Apple icon.

## The font source

The scripts need the static TTFs, which the repository does not carry (it serves
the variable `woff2`). They come from the official repository, pinned to a commit
because the latest release tag (`v2.304`) is older than the 2.305 files the site
serves:

| | |
|---|---|
| Repository | https://github.com/JetBrains/JetBrainsMono |
| Commit | `19371302b95d218af43299bce79ddbddd0bc364d` |
| Files used | `fonts/ttf/JetBrainsMono-{Medium,SemiBold,Bold,ExtraBold}.ttf`, all "Version 2.305" |
| Same version as | `public/fonts/JetBrainsMono-VF.woff2`, which is byte-identical to `fonts/webfonts/JetBrainsMono[wght].woff2` at this commit |

```
git clone https://github.com/JetBrains/JetBrainsMono /tmp/jbm
git -C /tmp/jbm checkout 19371302b95d218af43299bce79ddbddd0bc364d
```

## Run

Write into a temporary directory first and compare, instead of writing over the
committed files:

```
.venv/bin/python -I design/build/build_logo.py /tmp/jbm/fonts/ttf /tmp/logo
.venv/bin/python -I design/build/build_favicon.py /tmp/logo /tmp/favicon
```

To update the committed files, copy the four outputs listed above, then run the
structural check:

```
cp /tmp/logo/lockup-p3.svg public/logo.svg
cp /tmp/favicon/favicon.svg /tmp/favicon/favicon.ico /tmp/favicon/apple-touch-icon.png public/
node design/build/check-assets.mjs
```

Generate into a directory outside the project and copy from there. Files produced
inside some authoring environments have been seen to gain a metadata block
between steps, and a copy of a generated file is never a substitute for running
the scripts.

## What CI checks

`node design/build/check-assets.mjs` runs in CI (`npm run assets:check` runs it
locally). CI does not run the Python scripts, so it checks structure only:

- `public/logo.svg` and `public/favicon.svg` contain the original lambda path.
  The check repeats the constant from `build_logo.py`; keep both in sync.
- `public/favicon.ico` has exactly the 16, 32 and 48 px entries, each one a PNG
  of the size it declares.
- `public/apple-touch-icon.png` is a 180 by 180 px PNG.
- No SVG, PNG or ICO under `public/` contains a `<metadata>` block or a C2PA
  marker, and every SVG starts with `<svg`.

## How to check a run

The SVG outputs are byte-identical on every run. Their SHA-256, with the sizes
(`lockup-p3.svg` is committed as `public/logo.svg`):

| File | Bytes | SHA-256 |
|---|---|---|
| `lockup-p3.svg` | 5,536 | `2562767448b88a2b05e1cebc41a02ade753385c05063a0a872c5edb18816d5b8` |
| `symbol-p3.svg` | 1,460 | `dc284cc14422f98b86abfdd0d6299bee3dce247365137583c11cbdc85845fdea` |
| `favicon.svg` | 1,526 | `7054f5917f841b6a4689b108605910594cbcdf2b9278efadb0d5eab8ac4324ce` |

The PNG and ICO files were produced with cairo 1.18 and have the sizes below. A
different cairo version may render the same picture with different bytes, which
is why CI checks their structure (ICO sizes, Apple icon size, no metadata block,
the lambda path) and not their hash. Do not commit a PNG or ICO only because its
hash differs; compare the picture.

| File | Bytes | SHA-256 (cairo 1.18) |
|---|---|---|
| `favicon.ico` | 3,216 | `71252490d0067f760caaba6fccfd628f2e0accfbf25d756147bf1bc272a0aacd` |
| `apple-touch-icon.png` | 4,198 | `8fa4f843b1e4e2d7ceb0a7043c212c8940be937f031ca1aebb4b2a790c052a20` |

## Rules

- Never edit a generated file by hand. Change the script or its constants, run it
  and commit the new output with the change.
- The lambda path and its gradient stay as they are in the script. A change there
  is a change of the logo and needs the Design System to change first.
- The colours in the scripts repeat `ink`, `surface-page` and the divider colour
  from `design/tokens.json`. The scripts cannot read the tokens file, so keep the
  values in sync by hand when a token changes.
- `build_favicon.py` drops any `<metadata>` block from its input. Some tools and
  environments add one to `.svg` files, and the output must depend only on the
  geometry.
