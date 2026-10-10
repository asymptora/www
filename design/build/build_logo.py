#!/usr/bin/env python3
"""
Generate the Asymptora logo SVGs from:
  - real outlines of JetBrains Mono (the official TTF files, SIL OFL 1.1);
  - the ORIGINAL lambda, byte for byte (the path from the Design System, never traced).

Deterministic and idempotent: the same input gives the same bytes. Nothing is
traced from a raster image; the proportions come from measurements of the
approved mockup (dark theme).

Usage: build_logo.py <ttf-dir> <out-dir>

  <ttf-dir>  directory with JetBrainsMono-{Medium,SemiBold,Bold,ExtraBold}.ttf
             (see design/build/README.md for the pinned source)
  <out-dir>  where lockup-p{1,2,3}.svg and symbol-p{1,2,3}.svg are written
"""
import sys, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

if len(sys.argv) != 3:
    sys.exit(__doc__)
FONT_DIR, OUT_DIR = sys.argv[1], sys.argv[2]

# ---- Original lambda (Design System "Asymptora", assets/Symbol/lambda-mark.svg) ----
LAMBDA_D = "M34,0 L47,29 L0,126 L33,126 L63,63 L97,126 L129,126 L70,0 Z"
LAMBDA_W, LAMBDA_H = 129, 126          # bounding box of the path
GRAD = ("#6EE7D0", "#0EA893")          # same as the original, diagonal 0%,0% -> 100%,100%

# ---- Tokens (dark). Keep in sync with design/tokens.json ----
INK = "#e7f1f2"
DIVIDER = "#8fa3a6"; DIVIDER_OPACITY = "0.28"

# ---- Proportions measured on the mockup (mockup px, lambda = 59 px tall) ----
BRACE_H   = 76.0     # height of a brace
LAMBDA_PX = 59.0     # height of the lambda
GAP       = 18.0     # brace -> lambda (symmetric)
LAMBDA_DY = -3.5     # lambda slightly above the centre of the braces
DIV_W     = 2.0
GAP_DIV_L = 32.0     # right brace -> divider
GAP_DIV_R = 26.0     # divider -> wordmark
XHEIGHT_PX = 27.0    # x-height of the wordmark

# weights: (braces, wordmark). Preset p3 is the one the site uses.
PRESETS = {"p1": ("Medium", "SemiBold"),
           "p2": ("SemiBold", "Bold"),
           "p3": ("Bold", "ExtraBold")}

def font(weight):
    return TTFont(os.path.join(FONT_DIR, f"JetBrainsMono-{weight}.ttf"))

def r(v): return f"{v:.2f}".rstrip("0").rstrip(".")

def glyph_path(f, ch, scale, x_origin, y_base):
    gs = f.getGlyphSet(); name = f.getBestCmap()[ord(ch)]
    pen = SVGPathPen(gs, ntos=r)
    # (sx, 0, 0, -sy, tx, ty): flips Y (font: y up; SVG: y down)
    gs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x_origin, y_base)))
    return pen.getCommands(), gs[name].width

def glyph_bounds(f, ch):
    gs = f.getGlyphSet(); bp = BoundsPen(gs); gs[f.getBestCmap()[ord(ch)]].draw(bp); return bp.bounds

def build(brace_w, word_w, with_word):
    # --- braces ---
    fb = font(brace_w); kb = BRACE_H / (glyph_bounds(fb, "{")[3] - glyph_bounds(fb, "{")[1])
    bxmin, bymin, bxmax, bymax = glyph_bounds(fb, "{")
    brace_w_px = (bxmax - bxmin) * kb
    y_base_b = -BRACE_H / 2 + bymax * kb            # top of the brace at -H/2
    d_left,_  = glyph_path(fb, "{", kb, 0 - bxmin * kb, y_base_b)
    # --- lambda ---
    kl = LAMBDA_PX / LAMBDA_H
    lam_x = brace_w_px + GAP; lam_y = -LAMBDA_PX / 2 + LAMBDA_DY
    lam_right = lam_x + LAMBDA_W * kl
    # --- right brace ---
    rxmin = glyph_bounds(fb, "}")[0]
    rx_left = lam_right + GAP
    d_right,_ = glyph_path(fb, "}", kb, rx_left - rxmin * kb, y_base_b)
    sym_w = rx_left + (glyph_bounds(fb, "}")[2] - rxmin) * kb

    parts = [f'<defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">'
             f'<stop offset="0%" stop-color="{GRAD[0]}"/><stop offset="100%" stop-color="{GRAD[1]}"/>'
             f'</linearGradient></defs>',
             f'<path d="{d_left}" fill="{INK}"/>',
             f'<path d="{LAMBDA_D}" transform="translate({r(lam_x)} {r(lam_y)}) scale({repr(round(kl, 6))})" fill="url(#lg)"/>',
             f'<path d="{d_right}" fill="{INK}"/>']
    total_w = sym_w
    if with_word:
        div_x = sym_w + GAP_DIV_L
        parts.append(f'<rect x="{r(div_x)}" y="{r(-BRACE_H/2)}" width="{r(DIV_W)}" height="{r(BRACE_H)}" '
                     f'fill="{DIVIDER}" fill-opacity="{DIVIDER_OPACITY}"/>')
        fw = font(word_w); upm = fw["head"].unitsPerEm
        xh = fw["OS/2"].sxHeight; kw = XHEIGHT_PX / xh
        word = "asymptora"
        x0 = div_x + DIV_W + GAP_DIV_R
        a_xmin = glyph_bounds(fw, "a")[0]
        x_origin = x0 - a_xmin * kw
        y_base_w = XHEIGHT_PX / 2                    # x-height centred on the braces' centre line
        d_word = ""; x = x_origin
        for ch in word:
            d, adv = glyph_path(fw, ch, kw, x, y_base_w); d_word += d; x += adv * kw
        last_xmax = glyph_bounds(fw, "a")[2]
        total_w = x - fw.getGlyphSet()[fw.getBestCmap()[ord('a')]].width * kw + last_xmax * kw
        parts.append(f'<path d="{d_word}" fill="{INK}"/>')
    body = "".join(parts)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {r(-BRACE_H/2)} {r(total_w)} {r(BRACE_H)}" '
            f'role="img" aria-label="asymptora">{body}</svg>\n'), total_w

os.makedirs(OUT_DIR, exist_ok=True)
for key, (bw, ww) in PRESETS.items():
    for kind, with_word in (("lockup", True), ("symbol", False)):
        svg, w = build(bw, ww, with_word)
        path = os.path.join(OUT_DIR, f"{kind}-{key}.svg")
        with open(path, "w", encoding="utf-8", newline="\n") as fh: fh.write(svg)
        print(f"{path}  width={w:.1f}  ratio={w/BRACE_H:.3f}  bytes={len(svg.encode())}")
