# Design

This directory holds the visual identity inputs for the site (RFC 0002).

## `tokens.json`

Design tokens (colors, type styles, spacing, radius, dot-grid pattern).
It is a verbatim copy of `project/tokens.json` from the Asymptora Design
System artifact, which is where the tokens are authored.

Provenance:

- Source: Design System artifact "Asymptora" (not linked: it is private to the owner's account).
- Last change in the source: 2026-10-04 17:06 UTC (adds the `pattern` family and fixes the README).
- Copied into this repository: 2026-10-09.

This file is the single source in the repository: `public/tokens.css` will be
generated from it (RFC 0002, D13). Do not edit it by hand to change a value;
change the Design System and copy it again, updating the provenance above.

## `public/tokens.css`

Generated from `tokens.json` by `design/build/tokens.mjs` (ADR 0006). Only the
`dark` values are emitted, because the site is dark-only.

```
node design/build/tokens.mjs           # write public/tokens.css
node design/build/tokens.mjs --check   # what CI runs; writes nothing
```

After changing `tokens.json`, run the first command and commit both files.

## `public/fonts/`

Self-hosted JetBrains Mono (RFC 0002, "Typeface"), copied unmodified from the
official repository, JetBrains/JetBrainsMono:

| File | Source | Notes |
|---|---|---|
| `JetBrainsMono-VF.woff2` | `fonts/webfonts/JetBrainsMono[wght].woff2` | Version 2.305, variable on `wght` (100 to 800), 113,672 bytes, SHA-256 `31ec365b93e4bad6f202ce23352a56d01ca4462b2afc782ed2cf6fa42ca9ac0e` |
| `OFL.txt` | `OFL.txt` | SIL Open Font License 1.1, SHA-256 `a76abf002c49097d146e86740a3105a5d00450b1592e820a1109a8c5680cd697` |

The license text ships beside the font because the OFL requires it. The file is
served at `/fonts/JetBrainsMono-VF.woff2`; the `@font-face` rule that uses it is
added to `public/style.css` in a later step.

## `shared/`

The canonical shared markup: `header.html` (the `<header>`, identical on every
page) and `head-links.html` (the icon and stylesheet links at the end of `<head>`).
`build/apply-shared-markup.mjs` puts them into every page under `public/`, and it
is idempotent: a second run changes nothing. To change the header, edit
`shared/header.html`, run the script and commit the pages with it:

```
node design/build/apply-shared-markup.mjs
```

Pages differ only on `<body>` (today, `class="home"` on the Home), never inside
the header (RFC 0002).

CI enforces this with `node design/build/apply-shared-markup.mjs --check`
(`npm run markup:check`), which writes nothing and fails when:

- a page differs from what the script would write (header, head links or body
  tag edited by hand, or `shared/` changed without re-running the script);
- a page has no `<header>` or more than one (the 404 included), or not exactly
  one `<footer>`;
- the footers are not identical across pages. There is no canonical footer
  file: the pages are the reference, so a footer change has to be made on every
  page in the same pull request.

It does not check `<main>`, which is each page's own content.

## `build/`

The scripts that generate the logo and favicon files, with their dependencies and
the pinned font source: see [build/README.md](build/README.md).
