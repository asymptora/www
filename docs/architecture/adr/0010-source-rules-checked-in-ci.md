# 0010. Rules on the source of the pages, checked in CI

Date: 2026-10-10

## Status

Accepted

## Context

RFC 0002 decides that the site is dark only and has no JavaScript (D2), that the
tokens are the single source of the colours (D13), and that CI guards the
derived files and the shared markup (D13, D15). ADR 0007 records that nothing
failed if someone added a `<script>`, and that a check "has been proposed and is
not decided".

Some rules that were respected in practice were not written down anywhere as
rules. This ADR writes them down and has CI check them, so a hand edit cannot
break them silently.

What was observed on 2026-10-10:

- The files under `public/` have no `<script>`, no `<style>`, no `style=`
  attribute, and load only same-origin files. External addresses appear only as
  `<a href>`.
- The HTML that Cloudflare delivers is not the same as those files.
  `https://www.asymptora.com/` came back with three additions made at the edge:
  a hidden link to `/cdn-cgi/content`, an inline script that loads
  `/cdn-cgi/challenge-platform/scripts/jsd/main.js`, and a `<script type="module">`
  from `static.cloudflareinsights.com` (`data-cf-beacon`). Which Cloudflare
  features add them, and who enabled them, is not yet established (RFC 0003).

## Decision

CI runs `design/build/check-invariants.mjs` over the **source files** in
`public/`. It fails when:

| Rule | Where it comes from |
|---|---|
| A page has `<script>`, an inline event handler or a `javascript:` URL | RFC 0002 D2, ADR 0007 |
| A page has `<style>` or a `style=` attribute | New here: the visual rules live in `style.css`, fed by the tokens (ADR 0006) |
| A page has `<iframe>`, `<object>`, `<embed>` or `<form>` | New here: none is used today; adding one is a decision, not an accident |
| A page or stylesheet loads anything from another origin (`src`, `<link href>`, `srcset`, `@import`, `url()`) | New here, following ADR 0009 (font served by the site) |
| `ink`, `ink-muted` or `accent` has less than 4.5:1 contrast against `surface-page` (dark values) | New here. RFC 0002 reports the contrast of the tokens as a measurement; this turns it into a rule (WCAG 2.x AA for body text) |

The rules apply to what the repository ships. They say nothing about what
Cloudflare adds at the edge, and the check does not see it.

## Alternatives considered

| Alternative | Why it was not chosen |
|---|---|
| Leave the rules to review (the state before this ADR) | ADR 0007 already notes that nothing fails; the first accidental `style=` or external font would be found by a visitor |
| Check only what RFC 0002 states literally (no script) | Leaves the other rules unwritten, and they are what keep the pages self-contained |
| Check the delivered HTML as well, from CI | Needs a request to production or a preview, which the pipeline does not do (no staging; `preview_urls` is set but unused), and the edge additions are not decided yet |
| A full HTML or accessibility validator | A different purpose (validity of markup); not weighed here |

## Consequences

An edit that adds an inline style, an external file, an `iframe` or a low
contrast colour fails CI with the file and the rule. The runbook
(`docs/runbooks/regenerate-visual-assets.md`) says what to do for each message.

The check reads the HTML with regular expressions, not a parser. That is enough
for seven hand-written static pages; it would not catch deliberately malformed
markup.

Contrast covers only the three text colours that `style.css` puts on
`surface-page`. A new text colour on a new surface is not covered until it is
added to the list in the script.

It does not check for `prefers-color-scheme: light` rules (ADR 0007).

A check that sees the delivered HTML, with an explicit list of what Cloudflare
is allowed to inject, is possible later and depends on RFC 0003.

## References

- [RFC 0002: Visual identity for www.asymptora.com](../../rfcs/0002-visual-identity.md), D2, D13, D15, "Colour contrast"
- [ADR 0006: Design tokens, single source, generated CSS](0006-tokens-single-source-generated-css.md)
- [ADR 0007: Dark theme only, no JavaScript](0007-dark-only-theme-no-javascript.md)
- [ADR 0009: Self-hosted variable font and cache policy](0009-self-hosted-variable-font-and-cache-policy.md)
- `design/README.md`, "Page and stylesheet rules"
- Cloudflare docs: JavaScript detections, Web Analytics, AI Labyrinth
