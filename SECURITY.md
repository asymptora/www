# Security Policy

## Reporting a vulnerability

Report suspected vulnerabilities or exposed credentials through a private
GitHub security advisory rather than a public issue.

## Threat model

This is a static site served from Cloudflare's edge. It has no origin, no
server-side logic, and no database: no request reaches the lab network. The
attack surface is therefore small and specific:

- The site content is public by design. There is nothing confidential in
  what is served.
- The one privileged secret is the Cloudflare API token used by CI to
  deploy (see Secret handling). Compromise of that token would allow an
  attacker to publish arbitrary Worker code to this account, not to reach
  any other Asymptora system: the token is scoped to Workers Scripts on the
  Asymptora account only.
- Write access to this repository is itself a deployment capability: a merge
  to `main` publishes. Branch protection and required CI are the controls
  that gate it (RFC 0001, phase 2).

## Secret handling

No secret is committed to this repository in any form, encrypted or not.
Unlike a service that ships credentials alongside its code, this site needs
no secret at rest: the only secret exists in GitHub Actions and is never
written to the repository.

| Secret | Where it lives | What it grants |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | GitHub Actions repository secret | Deploy the Worker to the Asymptora account (`Workers Scripts: Edit`) |

The Cloudflare Account ID is not secret on its own and is useless without the
token; where CI needs it, it is stored as a GitHub Actions variable, not
committed inline.

### Cloudflare API token

- Scope: `Account | Workers Scripts | Edit`, account resource restricted to
  Asymptora. No KV, R2, or Workers Routes. No Client IP filter. No TTL.
- Rationale: minimum privilege for `cloudflare/wrangler-action` to run
  `wrangler deploy` (RFC 0001, decision 2). The token deploys new Worker
  versions; it does not manage custom domains, which are configured by hand
  once (RFC 0001, issue #10) and require `Workers Routes` that this token
  deliberately lacks.
- If a deploy fails with a permission error, add the single missing
  permission consciously, record it here and in issue #6, and never widen
  the token beyond what the error names.

### Rotation

The token has no TTL, so rotation is manual and on-demand:

1. In the Cloudflare dashboard (My Profile → API Tokens), roll or recreate
   the `www-deploy-github-actions` token.
2. Update the `CLOUDFLARE_API_TOKEN` secret in GitHub Actions with the new
   value.
3. Trigger a deploy (or re-run the last workflow) to confirm the new token
   works.
4. The old token is invalid the moment it is rolled; no history cleanup is
   needed, because the value was never committed.

A future improvement is to add a TTL and rotate on a fixed cadence; deferred
until a rotation rhythm is established.

## Detection

| Layer | Control |
|---|---|
| Push | GitHub Secret Scanning with Push Protection |
| CI | secret scan on the pull request (planned, RFC 0001 phase 2) |

Because no secret is ever meant to be in the tree, any secret-scanning hit is
treated as a real incident, not a false positive to be dismissed.

## Credential exposure response

If the Cloudflare token is exposed:

1. Roll the token in the Cloudflare dashboard immediately. This invalidates
   the exposed value and is the only step that actually remediates: anything
   else is cleanup.
2. Update the GitHub Actions secret with the new value.
3. Confirm the exposed value no longer works and the new one deploys.

If a secret is ever committed by mistake, rolling it (step 1) comes first;
removing it from Git history with `git filter-repo` is cleanup that only
matters once the value is already invalid.
