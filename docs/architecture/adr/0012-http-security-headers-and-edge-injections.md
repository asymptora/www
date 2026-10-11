# 0012. Security headers from `_headers`, the CSP enforced, and what Cloudflare injects

Date: 2026-10-11

## Status

Accepted

## Context

RFC 0003 proposed how the site is served over HTTPS and which response headers
it sends. It was accepted on 2026-10-11 and implemented the same day. This ADR
records the decisions that stay true after the work and that a later reader
would otherwise have to reconstruct from the RFC and the pull requests.

What was observed while implementing it:

- The HTML Cloudflare serves is not the HTML in `public/`. Depending on the
  client and the moment, Cloudflare added an inline script (JavaScript
  detections of Bot Fight Mode), a hidden link (consistent with AI Labyrinth),
  and the Web Analytics beacon, which was on by default and unused.
- Per-version preview URLs were enabled and one answered `200` with the whole
  site, without Access.
- The zone has Bot Fight Mode on, which can answer `403` to traffic from
  GitHub runners (`edge-verify.yml` is built around that).

## Decision

1. **Headers come from one block of `public/_headers`**: `/*`, holding
   `X-Content-Type-Options: nosniff`, a `Permissions-Policy` that disables the
   features the site does not use, and the CSP. A header repeated in the file is
   joined with a comma, so the file keeps a single block and a header is
   replaced, not added. In production the file applies to the 404 response too.
2. **The CSP is enforced**: `default-src 'none'; img-src 'self'; style-src
   'self'; font-src 'self'; base-uri 'none'; form-action 'none';
   frame-ancestors 'none'`. Anything that Cloudflare injects and that is not from
   `'self'` is blocked. The JavaScript detections script is the known case: it
   no longer runs on `www` pages. The blog is not affected, because the policy is
   sent only for `www`. Bot Fight Mode stays on (decided by the infra owner,
   because it also protects the blog and its admin login).
3. **Web Analytics is off and preview URLs are off.** The first was an unused
   default that the enforced CSP would have broken anyway; the second was a
   second public URL for nothing (`preview_urls` is `false` in `wrangler.jsonc`).
4. **The headers are checked in CI against `wrangler dev`**, before merge, by
   `design/build/check-headers.mjs` in the `validate` job: every page and the 404
   must carry what `_headers` declares, the three headers must be declared, and
   the CSP must not be Report-Only or contain a wildcard or an `unsafe-` keyword.
5. **Production is not requested from CI.** The zone-side configuration is
   verified through the Cloudflare API (ADR 0004). The headers in production are
   verified by hand with the commands in `docs/runbooks/edge-verification.md`.

## Alternatives considered

| Alternative | Why it was not chosen |
|---|---|
| A post-deploy smoke test that requests production from a runner | Bot Fight Mode can answer `403` to runner traffic, so a failure would not mean the headers are wrong. Not measured on the zone as it is today; can be tried with a manual workflow if the need appears |
| Enforce only `frame-ancestors`, `base-uri` and `form-action` | Would let Cloudflare's scripts keep running, but nothing would restrict scripts or styles. The strict policy was the reason for the RFC |
| Allow the Cloudflare script and beacon in the CSP | A hash cannot allow the inline script (it carries values that change per request); allowing the beacon host weakens `script-src` and `connect-src` for data nobody uses |
| Keep Report-Only for good | Nothing is blocked, the policy is never enforced |
| Turn Bot Fight Mode off to silence the violation | It cannot be turned off with the free Bot Fight Mode controls the documentation describes, and it protects the blog admin login |

## Consequences

Visitors' browsers report a violation in the console for whatever Cloudflare
injects. It is expected, and it hides nothing: a violation from the repository's
own content cannot appear unnoticed, because the pages are checked for scripts,
inline styles and external loads (ADR 0010) and for the headers (this ADR).

The check proves what the repository declares and what Cloudflare's local
runtime serves. It does not prove production. Between a merge and a manual
check, a difference between the two (for example `_headers` not applying to some
response) goes unseen. The runbook has the commands, and the 404 was verified in
production on 2026-10-11.

Anything new that Cloudflare starts to inject is blocked silently for the
visitor. If a feature of the zone is wanted that needs a script on the page, the
CSP has to change, and that is a new decision.

## References

- [RFC 0003: HTTP security posture of www.asymptora.com](../../rfcs/0003-http-security-posture.md)
- [ADR 0004: Verify edge configuration via the Cloudflare API](0004-edge-verify-via-api.md)
- [ADR 0010: Rules on the source of the pages, checked in CI](0010-source-rules-checked-in-ci.md)
- [ADR 0011: The `main` branch is protected by a repository ruleset](0011-main-protected-by-ruleset.md)
- `design/build/check-headers.mjs`, `public/_headers`, `wrangler.jsonc`
- Cloudflare docs: JavaScript detections; Web Analytics; Version URLs
