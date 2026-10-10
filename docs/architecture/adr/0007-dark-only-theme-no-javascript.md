# 0007. Dark theme only, no JavaScript

Date: 2026-10-10

## Status

Accepted

## Context

The Design System behind [RFC 0002](../../rfcs/0002-visual-identity.md) defines
ten colour tokens in two themes, light and dark. The site could ship both, follow
the visitor's system preference, or ship one.

The author decided on one: a dark theme, with no JavaScript (RFC 0002, D1 and
D2). The RFC records the decision, not a long argument for it. The points below
are the ones that follow from the state of this repository, not from an
exhaustive comparison.

- The site is seven static pages. A search of `public/*.html` finds no `<script>`
  element: no page has behaviour that needs JavaScript today.
- The logo is drawn in `ink`, a light colour, and exists in a single version
  (ADR 0008). A light theme would need a second logo, and a decision about the
  favicon tile that goes with it.
- The dark pairs of text and background have a contrast of at least 6.73:1
  (RFC 0002, Accessibility), above the 4.5:1 that WCAG 2.x asks of body text.

## Decision

The site has one theme, dark, and no JavaScript.

- `design/build/tokens.mjs` emits only the `dark` values into `public/tokens.css`
  (ADR 0006). The `light` values stay in `design/tokens.json` and are not served.
- `style.css` sets the page background and text colour explicitly and declares
  `color-scheme: dark`, so that the browser's own parts (scrollbars, form
  controls) match the page instead of staying light.
- There is no theme toggle and no script. Behaviour that would need one is a
  change to this decision, not an exception to it.

## Alternatives considered

| Alternative | Why it was not chosen |
|---|---|
| Light and dark, following `prefers-color-scheme` | Needs a light logo and a second set of verified contrasts, for a site that has no content that benefits from it today. RFC 0002 lists it as a non-goal |
| A theme toggle | Needs JavaScript (or a form round trip) and somewhere to store the choice. It would be the first script on the site |

## Consequences

A visitor whose system prefers a light theme still sees the dark site. This is
deliberate, and it is the cost of the decision.

The favicon is the one asset that meets a light surface regardless of the site's
theme, because the browser tab can be light. That is why it sits on a
`surface-page` tile (ADR 0008) and the header logo does not.

Not enforced by CI today: nothing fails if someone adds a `<script>` or a
`prefers-color-scheme: light` rule. Both are visible in review. A check for
them has been proposed and is not decided.

Reversing this decision means a new ADR, a light logo, a light favicon decision
and tokens emitted under a media query; it does not mean deleting a line.

## References

- [RFC 0002: Visual identity for www.asymptora.com](../../rfcs/0002-visual-identity.md), D1, D2, Accessibility
- [ADR 0006: Design tokens: single source, generated CSS](0006-tokens-single-source-generated-css.md)
- [ADR 0008: Logo and favicon assets built from the font and the original lambda](0008-logo-assets-from-font-and-original-lambda.md)
- W3C CSS Color Adjustment Module Level 1 (`color-scheme`)
- WCAG 2.x, contrast thresholds
