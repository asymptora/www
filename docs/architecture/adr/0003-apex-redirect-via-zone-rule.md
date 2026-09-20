# 0003. Apex redirect via a zone-level Redirect Rule

Date: 2026-09-20

## Status

Accepted

## Context

`asymptora.com` (the apex, without `www`) and `www.asymptora.com` served
the same content, from the same project, with no redirect between them.
That left two canonical hostnames for the same resource — bad for SEO and
inconsistent with the decision to use `www` as the single hostname (RFC
0001, Goals).

Two ways to implement the apex-to-`www` redirect were considered:

- **In the Worker**: the `www` code itself detects the request's hostname
  and responds with a redirect, using the static assets' `_redirects`
  file or logic in the Worker.
- **At the zone**: a zone-level Redirect Rule, outside any project,
  evaluated at Cloudflare's edge before any Worker is invoked.

The static assets' `_redirects` file only matches by path, not by
hostname, so it cannot redirect all of `asymptora.com` to
`www.asymptora.com`. Doing this in the Worker would mean running the
Worker on every apex request just to emit a redirect, and the apex would
need a non-trivial DNS target of its own for content it no longer has.

## Decision

Redirect the apex with a zone-level Redirect Rule, Cloudflare's official
template ("Redirect from root to WWW"): `asymptora.com/*` →
`https://www.asymptora.com/${1}`, `301`, preserving path and query
string.

The apex stopped being a custom domain of any content project (Worker or
Pages). Instead, it received a proxied `A` record pointing at
`192.0.2.1`, the reserved address Cloudflare documents for hostnames that
exist only to receive rules — no real server behind it, since the
Redirect Rule intercepts the request before the absence of content
matters.

## Consequences

The redirect runs entirely at the edge, before any Worker is invoked: a
request to `asymptora.com/anything` never consumes `www` Worker
execution, and the response carries no trace of it. `asymptora.com/sobre`
reaches `www.asymptora.com/sobre`, path preserved, because the rule uses
`wildcard_replace` over the full URI, not a fixed redirect to the home
page.

Since the `A` record and the Redirect Rule live in the `asymptora.com`
zone, not in any project of the `www` repository, this change touched a
shared resource. Following RFC 0001's scope boundary, it was flagged to
and approved by the `infra` owner before being applied (issue #11), and
is documented here, in the repository that proposed it, since the zone
itself has no documentation surface of its own.

As in ADR 0002, moving a hostname that was already in use (the apex, as a
Pages custom domain) required removing it there first before creating the
new record, opening a brief downtime window, accepted for the same
reason: a one-time cost of a migration that does not repeat.

## References

- [RFC 0001: Publish www.asymptora.com from this repository](../../rfcs/0001-publishing-www.md)
- [ADR 0002: Hosting on a Cloudflare Worker, not Pages](0002-hosting-worker-not-pages.md)
- Issue #11: Apex redirect (A 192.0.2.1 + Redirect Rule)
- Cloudflare Rules docs: "Redirect from root to WWW" template; Fundamentals:
  "Redirect one domain to another" (the `192.0.2.1` record).
