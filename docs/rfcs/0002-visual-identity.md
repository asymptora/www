# RFC 0002: Visual identity for www.asymptora.com

Status: Accepted

Author: Janaína Cazuza

Reviewer: Higor Cazuza

Status of each decision below:

- **Decided**: stated explicitly by the author on 2026-10-04.
- **To confirm**: a detail still waiting for the author (D8, the spelling).

Implemented by issues #50 to #60 (Iteration 2). The decisions that needed an
ADR are recorded in ADRs 0006 to 0009, and the regeneration and verification
steps are in the runbook `docs/runbooks/regenerate-visual-assets.md`. The text
below is the proposal as it was accepted and is not rewritten to match the
result. Differences found while implementing:

- There is no preview environment, so item 10 was verified on production, after
  the merge, in Firefox and in a Chromium browser.
- The hero logo is 18.75rem wide (300 px). A first version used a percentage width
  and rendered at zero size in Firefox; the width is now explicit on the `<h1>`.
- `color-scheme: dark` is declared (see "Left to implementation").
- The Home meta description is "Java engineering, built with excellence, in the
  open." (D8).

## Summary

Defines the visual identity of `www.asymptora.com`: colour (dark theme only),
typography (JetBrains Mono, self-hosted), the logo assets, the favicon set, the
Home hero, and the shared header. It also defines how the design tokens reach
the stylesheet so that derived files cannot drift from their source, and it
evaluates the review trigger that ADR 0001 attaches to the "plain HTML, no build
step" decision.

## Motivation

`public/style.css` is a placeholder whose first line says the visual identity is
"defined in RFC 0001, phase 4". It is not: phase 4 of RFC 0001 is *Content*, and
that RFC has no section on visual identity. The identity therefore has no
written home, and the placeholder points at a decision that does not exist.

Applying a real identity also touches the `<head>` and `<header>` of every page,
which is exactly the kind of change ADR 0001 says should prompt a review of its
own decision. That review belongs in an RFC, not in a pull request.

## Current state

Verified on 2026-10-04 against `main` at `dfb4556`.

| Layer | Observed | Evidence |
|---|---|---|
| Stylesheet | `public/style.css` is 281 bytes: `system-ui`, `max-width: 40rem`, a flex header, no colours. Its comment points at RFC 0001 phase 4 | `wc -c`; RFC 0001, Plan, Phase 4 |
| Pages | 7 HTML files: home, about, higor, janaina, journey, products, 404. Elements in use: `h1`, `h2`, `p`, `a`, `em`, `header`, `nav`, `main`, `footer`. No lists, images, code, tables or inline styles | tag inventory over `public/*.html` |
| Shared markup | `<header>` and `<footer>` are byte-identical across the 6 pages (whitespace-normalised hashes). The 404 page has a footer and no header | hash comparison |
| ADR 0001 trigger | The shared header or footer changed across all pages in `2cb7732` (navigation and contact filled in) and in `26f9e87` (navigation reordered). The markup changes in this RFC would be the next | `git log -p` |
| Favicon | None: no `<link rel="icon">`, no `favicon.ico` in `public/` | `git ls-files`, `grep` |
| Tooling | Wrangler (dev, deploy) and linkinator (link check). Node 24. CI runs `wrangler deploy --dry-run` and linkinator | `package.json`, `ci.yml` |
| Response headers | Static assets are served with `Cache-Control: public, max-age=0, must-revalidate` and an `ETag`. Wrangler sets `Content-Type` from the file extension at upload | Cloudflare docs, Workers static assets, Headers |
| Meta descriptions | Present on 6 pages, absent on the 404. The five non-home descriptions were created in the skeleton commit `2cb7732` and were not touched by the content pull requests | `git log -S` |
| Design System | Artifact "Asymptora", private to the authors: colour tokens (10, two themes), typography, spacing, radius, plus a `tagline` text style and a `pattern` family (dot grid) added on 2026-10-04 | artifact `lastChange` |
| Direction document | `asymptora-direcao-visual-da-marca.md`, cited by the Design System README, does not exist. The README was corrected on 2026-10-04. There is no separate direction document: this RFC and that README are the record | confirmed by the author |
| Lockup mockups | The mockups appear to be rendered in a fallback monospace face (DejaVu Sans Mono Bold), not JetBrains Mono: shape overlap 0.75 against 0.68 for the best JetBrains Mono weight, and the preview page never loads the font. This is an inference from measurement, not confirmed | local analysis of the mockup raster |

Colour contrast of the dark tokens, computed from the hex values (WCAG 2.x
thresholds: 4.5:1 for body text, 3:1 for large text and UI):

| Pair | on `surface-page` | on `surface-raised` |
|---|---|---|
| `ink` | 17.14 | 15.44 |
| `ink-muted` | 7.47 | 6.73 |
| `accent` | 9.93 | 8.95 |
| `accent-teal` | 12.14 | 10.94 |

`accent-ink` on `accent` is 9.45 and on `accent-teal` is 11.55. `border` on
`surface-page` is 1.35; it is a decorative hairline, not a control outline.

## Goals

- One identity on every page: dark theme, JetBrains Mono, tokens from a single
  source.
- Logo and favicon assets that are reproducible from the font and from the
  original λ path, never traced from a raster.
- Derived files (CSS from tokens, assets from scripts) that cannot silently drift
  from their source, and that regenerate to identical bytes.
- A shared header that is identical on every page, including the 404.
- The Home hero from the approved mockup, with the approved dot grid.

## Non-goals

- A light theme. The light values stay in the Design System; the site does not
  ship them.
- JavaScript, including a theme toggle.
- A second, editorial typeface. Deferred until at least the blog (D11).
- A stacked lockup, a web manifest, or PWA icons (the site is not a PWA).
- The blog theme: `blog.asymptora.com` is a separate service owned by
  `asymptora/infra`.
- Copy changes, other than the Home meta description.
- A static site generator (see "Review of ADR 0001").

## Scope boundary

This repository owns the site: its styles, its assets, its markup and the scripts
that produce them. The Design System is the upstream of the tokens but is private
to the authors, while this repository is public. The repository must therefore
stay reproducible from what is committed in it, without access to the artifact.

## Decisions

### Decided

| # | Decision |
|---|---|
| D1 | JetBrains Mono is the typeface for everything, the logo included. No look-alike fallback in the logo. |
| D2 | Dark theme only. No JavaScript. |
| D3 | Logo: weight preset **P3** (braces 700, wordmark 800). The λ is the original path, untouched. Braces and wordmark are outlines extracted from the font by script. |
| D4 | Favicon: the `{λ}` symbol (P3) on every size, including 16 px. Accepted trade-off: at 16 px the λ is about 5 px wide. |
| D5 | Home hero **A**: centred lockup, tagline below it, on the dot grid. The tagline is a secondary signature and never replaces the lockup. |
| D6 | Shared header identical on all pages. On the Home the header logo is hidden by style, so the hero lockup is not duplicated. |
| D7 | The ADR 0001 trigger counts the identity change. |
| D8 | Home meta description: "Java engineering, built with excellence, in the open." (spelling corrected from the request; confirm the final text). |
| D9 | Design System additions: `tagline` text style (24px, line height 32px, weight 400) and the `pattern` family (dot grid: pitch 28px, dot 1px, edge 1.6px, colour `ink` at 14% alpha). |
| D10 | The 404 page gets the same header as every other page. It is the page where a visitor most needs navigation, and it removes the only exception to the header parity check. |
| D11 | Second (editorial) typeface deferred, at least until the blog. |
| D12 | Three directions carried over from the Design System README are confirmed: (1) `accent-teal` is the brand colour and `accent` (blue) is for interaction only, never for the symbol or the name; (2) the tagline "Learn. Build. Evolve." is discarded and only "Always in pursuit of excellence." is used; (3) avoid asymptote or progress metaphors, generic tech clichés (circuits, hexagons), 3D effects and decoration for its own sake. Two readings are recorded: the λ's own gradient is the identity, and the ban on "decorative gradients" applies to any other gradient; the approved dot grid counts as restrained, not as excess decoration. |
| D13 | Tokens: `design/tokens.json` is the single source. A deterministic script generates the token stylesheet and its output is committed; CI regenerates it and fails on any diff. Parity checks guard the shared markup. No site generator. |
| D14 | The generated token stylesheet is a separate file, `public/tokens.css`, loaded by a `<link>` on every page, placed before `style.css`. |
| D15 | The logo and favicon scripts live in `design/build/` and run by hand when the logo or the font changes. Their outputs are committed. CI checks structure only (see Design). |
| D16 | The dot grid appears only on the Home. |
| D17 | The provenance of the tokens is a note in `design/README.md` giving the Design System artifact name and the date of its last change, with no link. |
| D18 | Font caching: the default revalidation with `ETag`. Revisit after measuring. |
| D19 | The stale parts of the Design System README (the open item on λ legibility, the line about a font character instead of a vectorised shape) are updated at the end of the work, with the author's approval of the final text. |
| D20 | The other five meta descriptions are out of scope and are recorded so they are not lost.

## Design

### Tokens: source, derivation, drift

`tokens.json` is committed at `design/tokens.json`. It is the only place a colour,
size or spacing value is authored. The stylesheet receives its values from it and
no hex colour appears anywhere else (CI-enforced, see below).

Three ways to keep the stylesheet from drifting:

| | How it works | Fit with ADR 0001 |
|---|---|---|
| **A. Check only** | A read-only CI script compares the values in the CSS with `tokens.json` and the shared markup across pages. Nothing is generated | Fits: it does not transform content, like linkinator |
| **B. Deterministic generation** | A small script generates the token CSS from `tokens.json`. The output is committed. CI regenerates it and fails on any diff | What is served is still what is committed, byte for byte. The ADR's wording ("the only toolchain is Wrangler") needs a new ADR that scopes it |
| **C. Site generator** | Templates for header, footer and head | Rejected for now, see below |

**Decided (D13):** B for the tokens, plus A for the shared markup. B gives
convergence (one source) and idempotence (running it twice produces no diff). A
guards the parts that cannot be generated without a generator. The generated
file is `public/tokens.css`, linked before `style.css` on every page (D14).
Linking it separately keeps it a file that is verified by regenerating and
comparing, instead of a generated region inside a hand-written file.

A pattern value cannot reference a colour token, so `dot-grid-color` repeats the
RGB of `ink`. The tokens check must assert that the two agree.

### Typeface

JetBrains Mono is self-hosted from `public/fonts/`: the variable `woff2`
(113,672 bytes, weights 100 to 800) plus its `OFL.txt`. The three static files
for weights 400, 500 and 600 would total about 281 KB, so the variable file is
smaller for the same use. The font is under the SIL Open Font License 1.1; the
license text ships beside it.

Characters needed by the site (Portuguese accents, em dash, middle dot,
copyright sign, λ, braces) are all present in the font.

`font-display: swap`. While the font loads, the fallback stack from the tokens
shows. That fallback looks different from JetBrains Mono, as the mockups did.

Caching: the default (revalidation with `ETag`) is kept (D18). Long-lived
`immutable` caching would need a fingerprinted file name; revisit after
measuring.

### Logo and favicon assets

Two scripts under `design/build/` produce every logo asset:

- `build_logo.py` reads the official TTF files and writes the lockup and the
  symbol. The λ path is the original, written as a constant.
- `build_favicon.py` wraps the symbol in a `surface-page` tile and writes
  `favicon.svg`, `favicon.ico` (16, 32 and 48 px) and `apple-touch-icon.png`
  (180 px).

The tile exists because the braces use `ink` (#e7f1f2), which has a contrast of
about 1.14:1 against a light browser tab; without a tile they disappear.

Both scripts are deterministic: running them twice produces identical bytes, and
`build_favicon.py` ignores any `<metadata>` block in its input.

The scripts run by hand and their outputs are committed (D15). They use Python
(fontTools, cairosvg) while the repository is otherwise Node, so CI does not run
them. A raster is not guaranteed to be byte-identical across renderer versions.
CI checks structure only: the λ path in every logo file equals the original
constant, the ICO has the 16, 32 and 48 px entries, the Apple icon is 180 by
180 px, and no SVG or PNG contains a metadata block.

Files that are served from the site root, for a stable URL: `/favicon.ico`,
`/favicon.svg`, `/apple-touch-icon.png`. Head lines, added to every page:

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

The token stylesheet link (D14) is added to every page too, before the existing
`style.css` link:

```html
<link rel="stylesheet" href="/tokens.css">
```

Google Search Central requires a favicon to be square, in multiples of 48 px or a
1:1 SVG, at a stable URL, declared on the home page. The ICO therefore includes a
48 px entry. The recommended ICO plus SVG plus 180 px pattern comes from a
secondary source and is to be validated on the preview.

**Environment hazard.** SVG and PNG files produced in the authoring environment
were found to carry a C2PA provenance block (about 7.7 KB per SVG) that the
scripts do not write. It appeared between turns of the same session, and was
removed by regenerating outside the output folder. Files committed here must come from the
scripts, never from a downloaded copy. CI rejects any SVG or PNG under `public/`
that contains `<metadata>` or a `c2pa` marker.

### Header, footer and head

The `<header>` markup is byte-identical on every page. Differences between pages
are expressed on `<body>` (a class or attribute), never inside the header. On the
Home, a rule keyed on the body hides the header logo. The 404 page gets the
header (D10).

The header logo is the lockup as an image with `alt="asymptora"`. Its size is
chosen at implementation (the exploration used 208 px).

A one-off script performs the edit across the pages. It replaces each block by
the canonical one, so running it twice produces no diff.

### Home

The hero is the centred lockup, with the tagline below it, on the dot grid, as in
the approved mockup. The Home is the only page with the grid (D16). The tagline uses the `tagline` style in `ink-muted`.

### Accessibility

All text and background pairs in the dark tokens are at or above 6.73:1. Links use
`accent`; the focus ring is `accent`. With a single dark theme, the root sets its
own background and text colour explicitly. Whether to also declare
`color-scheme: dark` is an implementation detail to verify against the
specification.

### Review of ADR 0001

ADR 0001 sets two triggers: the shared header or footer changing across all pages
for the third time, or the page count outgrowing what one person tracks by hand.
The identity change is counted (D7). The count is two so far (`2cb7732`,
`26f9e87`), or one if the initial population in `2cb7732` is not counted; either
way this RFC's markup changes are the next. The trigger is treated as reached.
The ADR says reaching it makes a generator "a proposal for its own RFC".
This is that proposal.

Evidence on the cost of duplication: the navigation reorder `26f9e87` was seven
lines changed in seven files. The headers and footers have not diverged: the
hashes match on all six pages.

**Decided (D13):** do not adopt a generator. Keep plain HTML and add the two
mechanisms above (generated tokens, parity check). Duplication is real but its
risk is divergence, and the parity check removes that risk at a lower cost than a
template language and a build step. Revisit when the parity check has to be
bypassed, or when the header changes across all pages again after this RFC.

## Decisions to be recorded as ADRs

Recorded when each becomes real, following the repository convention.

1. Dark-only theme and no JavaScript (D1, D2).
2. Tokens: single source, deterministic generation, parity checks (D13). This ADR
   scopes ADR 0001: generating CSS from tokens is not generating pages.
3. Logo assets generated from the font and the original λ path, never traced (D3).
4. Self-hosted variable font and the cache policy (D18).

## Plan

Each item is one issue and one pull request, in this order. Content and identity
changes to the same file go in separate commits.

### Phase 1: Foundations

1. `design/tokens.json` and its provenance note (artifact name, date of its last
   change).
2. The tokens script, the generated `public/tokens.css`, and the CI check for
   tokens (regenerate and fail on diff) and for literal hex colours outside it.
3. `public/fonts/` with the variable font and `OFL.txt`.

### Phase 2: Assets

4. The two build scripts and their dependency notes.
5. The logo and favicon files, plus the CI structural checks (λ path, ICO
   sizes, Apple icon size, no metadata blocks).

### Phase 3: Markup

6. Head lines (the favicon links and the token stylesheet link) and the shared
   header on all seven pages, by the idempotent script.
7. The header parity check in CI.

### Phase 4: Styles and Home

8. `style.css` rewritten from the tokens.
9. Home hero A and the new meta description.

### Phase 5: Verification and documents

10. Verify on the preview: `Content-Type` of `.svg`, `.ico` and `.woff2`; the 16 px
    and 32 px favicon on a light and a dark browser tab; contrast.
11. The ADRs above, and a runbook for regenerating the assets.

## Completion criteria

- No hex colour appears in the site files outside the generated token CSS.
- Regenerating the token stylesheet in CI produces no diff, and regenerating the
  logo assets by hand produces identical SVGs.
- The CI structural checks on the assets pass.
- The `<header>` is byte-identical on all HTML pages.
- No SVG or PNG under `public/` contains a metadata block.
- The preview serves `.svg`, `.ico` and `.woff2` with the expected `Content-Type`.
- The favicon is recognisable at 16 px on both a light and a dark tab.

## Rollback

Revert the pull request with `git revert` on `main`; the pipeline redeploys
(RFC 0001, Rollback). The phases are independent, so a single phase can be
reverted alone.

## Points for the reviewer

The reviewer has not followed the discussion that led to these decisions. These
are the points where a second opinion matters most.

- **D13 and ADR 0001.** Generating the token stylesheet is a small transformation
  step, and the letter of ADR 0001 ("the only toolchain is Wrangler") does not
  allow it. This RFC treats it as different in kind from generating pages and
  proposes a new ADR that scopes the older one. Is that reading acceptable, or
  should the stylesheet also be hand-written and only checked (option A)?
- **D15.** The logo and favicon scripts need Python while the repository is
  otherwise Node. CI does not run them and checks structure only. Is that enough
  of a guarantee for the raster files?
- **D6 and D10.** The header becomes shared markup on all seven pages, so the
  parity check is the only protection against the copies diverging.
- **D17.** The tokens come from a private artifact while this repository is
  public. Is a provenance note without a link enough?
- **The inference about the mockups** (last row of the current-state table) cannot
  be reproduced from this repository. It is recorded for honesty and no decision
  depends on it.

## Left to implementation

These are details, not open decisions.

- The size of the header lockup (the exploration used 208 px).
- Whether to also declare `color-scheme: dark`, to verify against the
  specification.
- The `Content-Type` of `.svg`, `.ico` and `.woff2` on the preview (Phase 5).
- The final spelling of the Home meta description (D8).

## References

- [ADR 0001: Plain HTML and CSS, no build step](../architecture/adr/0001-plain-html-no-build-step.md)
- [RFC 0001: Publish www.asymptora.com from this repository](0001-publishing-www.md)
- Cloudflare Workers docs: static assets, Headers (default headers, `_headers`).
- Google Search Central: Define a favicon to show in search results.
- JetBrains Mono: official repository, `OFL.txt` and `fonts/webfonts/`.
- W3C CSS Color Adjustment Module Level 1 (`color-scheme`).
- WCAG 2.x, contrast thresholds.
