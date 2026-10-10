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
