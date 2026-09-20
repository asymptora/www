# 0002. Hosting on a Cloudflare Worker, not Pages

Date: 2026-09-20

## Status

Accepted

## Context

RFC 0001 proposed hosting `www.asymptora.com` on a Cloudflare Worker with
static assets, instead of keeping the existing Pages project
(`asymptora-site`) that was already serving a placeholder. Two real
options were on the table from the start:

- **Reuse Pages**: reconnect `asymptora-site` to the `www` repository,
  keeping the product that was already configured and already held both
  domains (`asymptora.com`, `www.asymptora.com`).
- **Migrate to a Worker**: create a new resource, with all configuration
  (`wrangler.jsonc`) versioned in the repository, and move the domains to
  it.

`asymptora-site` had a concrete limitation, found during the initial
investigation: its published content came from direct uploads
(`wrangler pages deploy` run by hand, outside Git), with no connection to
any repository. There was no way to rebuild what was live from code.

## Decision

Host the site on a Cloudflare Worker with static assets
(`assets.directory` pointing at `public/`), configured entirely in
`wrangler.jsonc`, versioned in the repository. `www.asymptora.com` was
moved from the Pages project to this Worker (issue #10); the apex
(`asymptora.com`) still resolves through the same zone, now via a
Redirect Rule (separate ADR), no longer as a custom domain of a content
project.

The migration required removing the custom domain from Pages before
adding it to the Worker — Cloudflare does not support moving a hostname
directly between two projects — which opened a real downtime window of a
few minutes, accepted as a one-time cost of a migration that does not
repeat.

## Consequences

Production is now reproducible from the repository: what is live is
exactly what `wrangler deploy` publishes from `main`, with no manual
upload path. The Worker's `not_found_handling` also fixed a problem Pages
had from the start: an unknown path now returns a real `404`, instead of
the single-page-application fallback Pages applied by default.

The accepted cost is being on a product (Workers with static assets) that
requires more explicit configuration than Pages, and depending on a
Cloudflare API token stored as a GitHub secret for automated deployment
(related pipeline ADR). Pages would not require that token to publish
from its dashboard, but it also would not offer configuration as code or
deployment through the pipeline.

The `asymptora-site` project was kept active as a fallback during a
stabilisation period (issue #14) before being removed (issue #15); its
removal is not reverted by this ADR.

## References

- [RFC 0001: Publish www.asymptora.com from this repository](../../rfcs/0001-publishing-www.md)
- Issue #10: Move www custom domain to the Worker
- Cloudflare Workers docs: static assets, migration from Pages.
