# Runbook: Visual identity files (regenerate, fix a failing check, verify)

## Purpose

The visual identity has three kinds of derived file. Each one has a source, a
command that regenerates it, and a CI check. This runbook says which command to
run when a check fails or a source changes, and how to verify the result in
production. It does not repeat the long procedures: the logo build has its own
[README](../../design/build/README.md), which is the reference for prerequisites
and commands.

| Derived file | Source | Regenerate with | CI check |
|---|---|---|---|
| `public/tokens.css` | `design/tokens.json` | `npm run tokens` | `npm run tokens:check` |
| The shared `<header>`, head links and `<body>` of every page | `design/shared/` | `npm run markup` | `npm run markup:check` |
| `public/logo.svg`, `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` | the font and the lambda constant | the Python scripts, by hand | `npm run assets:check` (structure only) |

Decisions behind this: ADR 0006 (tokens), ADR 0008 (logo assets), ADR 0009 (font).

## Prerequisites

- Node, the version in `.node-version`, and `npm ci` run once.
- For the logo only: Python 3.13, cairo 1.18 and the font source, as in
  `design/build/README.md`.

## A CI check failed

Run the same check locally first. Each message names the file and what differs.

### "Check design tokens" fails

| Message contains | Meaning | Action |
|---|---|---|
| `public/tokens.css is missing or differs from design/tokens.json` | `tokens.json` changed without regenerating, or `tokens.css` was edited by hand | `npm run tokens`, then commit `public/tokens.css` with the change. Never edit that file by hand |
| `literal colour "..."` | A hex, `rgb()`, `rgba()`, `hsl()` or `hsla()` value in an HTML or CSS file under `public/` | Use a token from `tokens.css` instead; if the colour does not exist, add it to `tokens.json` first |
| `dot-grid-color RGB (...) does not match ink` | `ink` or `dot-grid-color` changed in `tokens.json` and the other did not | Change both in `tokens.json`; the pattern value cannot reference a token, so they are kept equal by this check |

### "Check shared markup" fails

| Message contains | Meaning | Action |
|---|---|---|
| `differs from the canonical header, head links or body tag` | A page was edited by hand in those parts, or `design/shared/` changed without applying it | `npm run markup`, then commit the pages with the change. If the page edit was intended, edit `design/shared/` instead |
| `expected exactly one <header>` / `<footer>` | A page has none or more than one | Fix the page; the 404 page also has a header |
| `the footers differ across pages` | One footer was changed alone | Make the same change on every page in the same pull request. There is no canonical footer file; the pages are the reference |

### "Check logo and favicon files" fails

| Message contains | Meaning | Action |
|---|---|---|
| `does not contain the original lambda path` | A logo file was edited or regenerated from a different path | Regenerate from the scripts. If the lambda itself changed, the Design System changes first, then the constant in `build_logo.py` **and** `design/build/check-assets.mjs` |
| `has entries ... px, expected 16, 32 and 48` or a PNG size message | `favicon.ico` or the Apple icon was not produced by `build_favicon.py` | Regenerate with the scripts |
| `contains a <metadata> block`, `contains a C2PA marker`, `carries a C2PA chunk (caBX)` | The file came from a tool or environment that adds provenance metadata | Do not strip it by hand. Regenerate with the scripts into a directory outside the project and copy from there |

## Change the logo, the font or a colour the scripts repeat

1. Change the source first: the Design System for the lambda or a colour, the
   font file and `OFL.txt` for the typeface.
2. Run the logo scripts into a temporary directory outside the project and
   compare against the committed files, following `design/build/README.md`.
3. Copy the four outputs listed there into `public/`, run `npm run assets:check`.
4. The scripts repeat `ink`, `surface-page` and the divider colour from
   `design/tokens.json` and cannot read it. If a token changed, change the
   script constants by hand to match.
5. Commit the scripts (if changed) and the outputs together, in one pull request.

## Verify in production after the merge

The deploy runs on merge (ADR 0005). Then:

```bash
for p in "" about nao-existe logo.svg favicon.svg favicon.ico apple-touch-icon.png tokens.css style.css fonts/JetBrainsMono-VF.woff2 fonts/OFL.txt; do
  printf '%-34s ' "/$p"
  curl -sI "https://www.asymptora.com/$p" | grep -i -E '^(HTTP|content-type)' | tr -d '\r' | tr '\n' ' '
  echo
done
```

Each line reports the status and the `Content-Type` that Wrangler set from the
file extension. Expected: `200` everywhere except `nao-existe`, which must be
`404`; `image/svg+xml` for both SVGs; `image/vnd.microsoft.icon` for the ICO;
`image/png`; `text/css` for both stylesheets; `font/woff2` for the font.

Then look at the site, in **Firefox and in a Chromium browser**, after a hard
reload (Ctrl+Shift+R):

- Home: the lockup and the tagline centred, the dot grid, no logo in the header.
- `/about`: the logo in the header, dark page, JetBrains Mono.
- The favicon in a light and in a dark browser tab; at 16 px the lambda is about
  5 px wide (RFC 0002, D4).
- A narrow window: the navigation wraps without clipping.

Why two engines: the Home logo once rendered at zero size in Firefox while it
was fine in Chromium, because of a circular percentage width. A check in one
engine did not show it.

If the new files look stale right after a merge, wait a few minutes before
treating it as a fault (see the edge verification runbook, "post-deploy edge
propagation delay").

## Rollback

Revert the pull request with `git revert` on `main`; the pipeline redeploys.
The phases of RFC 0002 are independent, so one change can be reverted alone. For
a Worker version rollback instead, see the deploy and rollback runbook.

## References

- [RFC 0002: Visual identity for www.asymptora.com](../rfcs/0002-visual-identity.md)
- [ADR 0006](../architecture/adr/0006-tokens-single-source-generated-css.md),
  [ADR 0007](../architecture/adr/0007-dark-only-theme-no-javascript.md),
  [ADR 0008](../architecture/adr/0008-logo-assets-from-font-and-original-lambda.md),
  [ADR 0009](../architecture/adr/0009-self-hosted-variable-font-and-cache-policy.md)
- [design/build/README.md](../../design/build/README.md) and [design/README.md](../../design/README.md)
- [Deploy and rollback](deploy-and-rollback.md), [Edge verification](edge-verification.md)
