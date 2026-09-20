# 0004. Verify edge configuration via the Cloudflare API, not direct HTTP

Date: 2026-09-20

## Status

Accepted

## Context

An automated verification workflow was created to confirm, on an ongoing
basis, that the edge configuration (custom domain binding to the Worker,
apex DNS record, Redirect Rule) stays correct over time, not just at the
moment it was applied.

The first version tested production directly over HTTP
(`curl https://www.asymptora.com`, `curl https://asymptora.com`), the
same method used manually to verify issues #10 and #11. Running on
GitHub Actions, this version failed with `403`, while the identical
command worked normally from a home network. The cause, confirmed by
comparing the two runs: the `asymptora.com` zone has **Bot Fight Mode**
enabled, which treats datacenter traffic (including GitHub-hosted
runners) as suspicious and challenges or blocks it.

Two fixes were investigated and rejected:

- **Allowlisting GitHub Actions IP ranges in the WAF**: the IP ranges
  GitHub Actions uses are published (`api.github.com/meta`) and **shared
  across every GitHub Actions user in the world**, not exclusive to this
  organisation. An allow rule on those ranges would amount to a
  near-total bypass of Bot Fight Mode, usable by any Actions run from
  anyone, not a scoped exception.
- **Disabling Bot Fight Mode zone-wide**: the zone also protects the
  blog's Cloudflare Tunnel, which exposes the Ghost instance running in
  the homelab. Weakening that protection to make a CI test pass would
  affect a system `www` does not own alone to protect — that decision
  belongs to `infra`, not this repository.

## Decision

Verify the configuration through the **Cloudflare Management API**
(`api.cloudflare.com`), instead of requesting the site the way a visitor
would. A new, read-only token (`CLOUDFLARE_API_TOKEN_READONLY`, with
`Workers Scripts:Read`, `Zone DNS:Read`, `Zone Single Redirect:Read`,
scoped to the Asymptora account and the `asymptora.com` zone) queries
directly: the Worker's hostname binding
(`GET /accounts/{id}/workers/domains`), the apex DNS record
(`GET /zones/{id}/dns_records`), and the active Redirect Rule
(`GET /zones/{id}/rulesets/phases/http_request_dynamic_redirect/entrypoint`).

This token is kept separate from the deploy `CLOUDFLARE_API_TOKEN`
(issue #6), following the same minimum-privilege principle: a token that
only reads should never be the one that can write.

## Consequences

The check sidesteps Bot Fight Mode entirely, since it never touches the
zone's public traffic path, only the management API, authenticated by
its own token. This makes the test **deterministic**: it answers "is the
configuration correct?", a question with a stable answer, instead of
"does a visitor get past the bot challenge right now?", a question whose
answer varies by design.

The accepted trade-off is that this test does **not** confirm a real
visitor, at this exact moment, can reach the site without being
challenged by Bot Fight Mode. It verifies the configuration, not the
full edge experience. Closing that gap would require one of the two
rejected alternatives above, and remains open should the Bot Fight Mode
decision change in the future.

The workflow (`edge-verify.yml`) runs on three independent triggers:
after every successful deploy, daily, and on demand — strengthening
issue #19 (edge verification runbook) with an automated component,
instead of relying on manual procedure alone.

## References

- Issue #28: Automated edge verification via Cloudflare API
- Issues #10, #11: the configuration this workflow verifies
- Cloudflare API docs: Workers Domains, DNS Records, Rulesets
  (`http_request_dynamic_redirect` phase)
- GitHub Docs: published IP ranges for Actions (`api.github.com/meta`)
