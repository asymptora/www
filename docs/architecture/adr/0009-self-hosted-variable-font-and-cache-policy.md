# 0009. Self-hosted variable font and cache policy

Date: 2026-10-10

## Status

Accepted

## Context

JetBrains Mono is the typeface of every page, the logo included (RFC 0002, D1).
The site needs the font file to be served to the visitor.

The facts that bear on the choice:

- The font is under the SIL Open Font License 1.1, which allows it to be served
  with the site if the licence text ships with it.
- The variable `woff2` (version 2.305, weights 100 to 800) is 113,672 bytes. The
  three static files for weights 400, 500 and 600 would total about 281 KB.
- Static assets on the Worker are served with
  `Cache-Control: public, max-age=0, must-revalidate` and an `ETag` (Cloudflare
  Workers docs, static assets, Headers). Every visit revalidates the file.
- Long-lived `immutable` caching only works safely for a file whose name changes
  when its content changes.

## Decision

The font is self-hosted: `public/fonts/JetBrainsMono-VF.woff2`, the variable
file, with `public/fonts/OFL.txt` beside it. `style.css` declares it with
`font-weight: 100 800` and `font-display: swap`. Until it loads, the fallback
stack of the token `--font-mono` (`ui-monospace`, `SFMono-Regular`, `Menlo`,
`monospace`) is shown.

The cache policy is the default: revalidation with `ETag`, no `_headers` file
(RFC 0002, D18). The `Content-Type` that Wrangler sets from the extension was
verified in production on 2026-10-10: `font/woff2` for the font, `text/plain`
for the licence.

## Alternatives considered

| Alternative | Why it was not chosen |
|---|---|
| Three static files (400, 500, 600) | About 281 KB against 113,672 bytes for the same use, and the variable file covers every weight the styles can ask for |
| Long-lived `immutable` caching of the font | Would need a fingerprinted file name, which this repository has no step to produce (ADR 0001, ADR 0006). Revisit after measuring |
| A font host outside the site | Not weighed in RFC 0002. Self-hosting keeps every served byte in the repository (ADR 0001) and the licence next to the file |
| System fonts only | Does not meet D1: the identity is JetBrains Mono |

## Consequences

While the font loads, the page shows the fallback face, which looks different
from JetBrains Mono. This is the accepted cost of `font-display: swap`.

Each visit makes a conditional request for a 113 KB file, which normally returns
`304`. No measurement of this has been done; the policy was kept as the default
on purpose and is to be revisited with data, not on a guess.

Only the upright style is shipped. Where the HTML uses `em`, the browser
synthesises an oblique from the upright face. It reads acceptably in the pages
as they are; a real italic file would add bytes and is not planned.

Updating the font means replacing the `woff2` and `OFL.txt` together, recording
the new source commit in `design/README.md`, and regenerating the logo assets if
the glyph outlines changed (ADR 0008).

## References

- [RFC 0002: Visual identity for www.asymptora.com](../../rfcs/0002-visual-identity.md), D1, D18, "Typeface"
- `design/README.md`: source and SHA-256 of the font files
- Cloudflare Workers docs: static assets, Headers
- JetBrains Mono: official repository, `OFL.txt` and `fonts/webfonts/`
- [ADR 0008: Logo and favicon assets built from the font and the original lambda](0008-logo-assets-from-font-and-original-lambda.md)
