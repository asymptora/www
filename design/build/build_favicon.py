#!/usr/bin/env python3
"""
Generate the favicon set from symbol-p3.svg (an output of build_logo.py).

Input:   <svg-dir>/symbol-p3.svg
Output:  <out-dir>/favicon.svg            (1:1, rounded tile)
         <out-dir>/favicon.ico            (embedded PNGs: 16, 32, 48)
         <out-dir>/apple-touch-icon.png   (180x180, no rounded corners)

Why there is a tile: the braces use `ink` (#e7f1f2); on a light browser tab the
contrast is about 1.1:1 and they disappear. The tile uses `surface-page`
(#050c0e), contrast about 17:1.

Deterministic for a given cairo version: the same input gives the same bytes
(cairosvg writes no timestamp). Across cairo versions the PNG and ICO bytes may
differ, which is why CI checks their structure and not their hash.

Usage: build_favicon.py <svg-dir> <out-dir>
"""
import os, re, struct, sys
import cairosvg

if len(sys.argv) != 3:
    sys.exit(__doc__)
SVG_DIR, OUT_DIR = sys.argv[1], sys.argv[2]
TILE = "#050c0e"            # token surface-page (dark). Keep in sync with design/tokens.json

src = open(os.path.join(SVG_DIR, "symbol-p3.svg"), encoding="utf-8").read()
m = re.search(r'viewBox="0 (-?[\d.]+) ([\d.]+) ([\d.]+)"', src)
vb_y, sym_w, sym_h = float(m.group(1)), float(m.group(2)), float(m.group(3))
inner = re.search(r'<svg[^>]*>(.*)</svg>', src, re.S).group(1)   # defs + the symbol's paths
# Drop <metadata> (some environments inject manifests into .svg files): the
# output depends only on the geometry, never on external metadata (convergence).
inner = re.sub(r'<metadata>.*?</metadata>', '', inner, flags=re.S)

def r(v): return f"{v:.3f}".rstrip("0").rstrip(".")

def tile_svg(pad, rx):
    """Square SVG (viewBox 0 0 100 100) with the symbol centred and (1-2*pad) wide."""
    k = 100 * (1 - 2 * pad) / sym_w
    tx, ty = 100 * pad, 50 - (vb_y + sym_h / 2) * k    # centre on the Y axis
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
            f'<rect width="100" height="100" rx="{r(rx)}" fill="{TILE}"/>'
            f'<g transform="translate({r(tx)} {r(ty)}) scale({r(k)})">{inner}</g></svg>\n')

def png(svg, size):
    return cairosvg.svg2png(bytestring=svg.encode("utf-8"), output_width=size, output_height=size)

os.makedirs(OUT_DIR, exist_ok=True)

# 1) favicon.svg: rounded tile, small margin (the symbol is wide, 2.2:1)
fav = tile_svg(pad=0.06, rx=18)
with open(os.path.join(OUT_DIR, "favicon.svg"), "w", encoding="utf-8", newline="\n") as fh: fh.write(fav)

# 2) favicon.ico: ICO container with PNGs rendered at each native size
sizes = [16, 32, 48]
blobs = [png(fav, s) for s in sizes]
hdr = struct.pack("<HHH", 0, 1, len(sizes))
off = 6 + 16 * len(sizes); entries = b""
for s, b in zip(sizes, blobs):
    entries += struct.pack("<BBBBHHII", s, s, 0, 0, 1, 32, len(b), off); off += len(b)
with open(os.path.join(OUT_DIR, "favicon.ico"), "wb") as fh: fh.write(hdr + entries + b"".join(blobs))

# 3) apple-touch-icon.png: opaque, full square (iOS applies the rounding)
with open(os.path.join(OUT_DIR, "apple-touch-icon.png"), "wb") as fh: fh.write(png(tile_svg(pad=0.10, rx=0), 180))

for f in ("favicon.svg", "favicon.ico", "apple-touch-icon.png"):
    p = os.path.join(OUT_DIR, f); print(f"{f:22s} {os.path.getsize(p):6d} bytes")
