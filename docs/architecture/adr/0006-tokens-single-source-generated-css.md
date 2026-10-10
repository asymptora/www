# 0006. Design tokens: single source, generated CSS

Date: 2026-10-10

## Status

Accepted

## Context

[RFC 0002](../../rfcs/0002-visual-identity.md) gives the site a real visual
identity. Its colours, type styles, spacing, radii and dot-grid values are
authored in a Design System and copied into the repository as
`design/tokens.json`.

A stylesheet that repeats those values by hand can drift from them without
anyone noticing: a hex colour edited in one file, a spacing step changed in
another. The repository needs one place where a value is authored and a way to
prove the stylesheet agrees with it.

[ADR 0001](0001-plain-html-no-build-step.md) states that the only toolchain in
the repository is Wrangler, "used to run and deploy the Worker, not to transform
content", and that what is in `public/` is what is served, byte for byte. RFC
0002 reviewed that decision, because the identity change touches every page, and
considered three ways to keep the stylesheet from drifting:

- **Check only**: a read-only CI script compares the CSS with `tokens.json`.
  Nothing is generated.
- **Deterministic generation**: a small script generates the token CSS from
  `tokens.json`; the output is committed; CI regenerates it and fails on any
  difference.
- **Site generator**: templates for header, footer and head.

## Decision

`design/tokens.json` is the only place a colour, size or spacing value is
authored. `design/build/tokens.mjs`, a script with no dependencies, generates
`public/tokens.css` from it. The output is committed, and every page links it
before `style.css`.

CI runs `node design/build/tokens.mjs --check`, which fails when:

- `public/tokens.css` differs from what the tokens generate;
- a literal colour (hex, `rgb()`, `rgba()`, `hsl()`, `hsla()`) appears in an HTML
  or CSS file under `public/` outside `tokens.css`;
- `dot-grid-color` does not carry the same RGB as `ink`. A pattern value cannot
  reference a colour token, so the two are repeated and compared.

The site is dark-only (RFC 0002, D1), so only the `dark` values are emitted. The
`light` values stay in `tokens.json` and are not served.

A site generator is not adopted. Its review trigger in ADR 0001 (the shared
header changed across all pages for the third time) was reached, and RFC 0002
decided to answer it with parity checks on the shared markup instead, in
separate issues.

## Consequences

ADR 0001 stays accepted. This ADR scopes it: generating a stylesheet from a data
file is not generating pages, and what is served is still what is committed,
byte for byte. The repository now has a small build-time script, so "the only
toolchain is Wrangler" is no longer literally true; the script uses only the
Node version already pinned in `.node-version` and adds no package.

Convergence: one source, so a value cannot disagree with itself. Idempotence:
running the script twice produces the same bytes, which is what makes
"regenerate and compare" a valid check.

Accepted cost: after changing `tokens.json` someone must run the script and
commit its output, and CI blocks the change if they forget. The error message
names the command.

The script is a second piece of code to maintain. It is about 150 lines, reads
one JSON file and writes one CSS file, and its failure modes are covered by
`--check`.

## References

- [RFC 0002: Visual identity for www.asymptora.com](../../rfcs/0002-visual-identity.md), D13 and D14
- [ADR 0001: Plain HTML and CSS, no build step](0001-plain-html-no-build-step.md)
