# asymptora-www
[![ci](https://github.com/asymptora/www/actions/workflows/ci.yml/badge.svg)](https://github.com/asymptora/www/actions/workflows/ci.yml)
[![edge verification](https://github.com/asymptora/www/actions/workflows/edge-verify.yml/badge.svg)](https://github.com/asymptora/www/actions/workflows/edge-verify.yml)
[![secret scan](https://github.com/asymptora/www/actions/workflows/secret-scan.yml/badge.svg)](https://github.com/asymptora/www/actions/workflows/secret-scan.yml)
[![issues](https://img.shields.io/github/issues/asymptora/www)](https://github.com/asymptora/www/issues)
[![license](https://img.shields.io/github/license/asymptora/www)](LICENSE)

Source of `www.asymptora.com`: a static site served by a Cloudflare Worker and
deployed by GitHub Actions from the `main` branch.

Publishing this site from the repository, and replacing the previous hosting
project, is tracked in [RFC 0001](docs/rfcs/0001-publishing-www.md).

## Repository layout

```
public/                  Files served as-is (HTML, CSS, fonts, logo and icons, 404 page)
design/                  Design tokens, shared markup and the scripts that derive files from them
wrangler.jsonc           Worker configuration: what is served and how
docs/rfcs/               Design proposals that precede changes
docs/architecture/adr/   Architecture decision records
docs/runbooks/           Operational procedures
```

## Local preview

```
npm ci
npm run dev              # http://localhost:8787
```

## Checks

Every pull request runs these in CI (`.github/workflows/ci.yml`); they can be run
locally with the same commands. `main` only accepts a pull request whose
`Validate` and `Gitleaks` checks pass (ADR 0011).

| Command | What it verifies |
|---|---|
| `npm run tokens:check` | `tokens.css` matches `design/tokens.json`; no literal colours outside it (ADR 0006) |
| `npm run assets:check` | Logo and icon files derive from the font and the original lambda (ADR 0008) |
| `npm run markup:check` | Header, head links and footer are identical across pages |
| `npm run invariants:check` | No script, no inline style, nothing external; contrast of the text colours (ADR 0010) |
| `npm run headers:check -- <url>` | Every page and the 404 carry the headers declared in `public/_headers` (ADR 0012). CI runs it against `wrangler dev` |

## Security

Reporting a vulnerability, and the controls around this repository, are in
[SECURITY.md](SECURITY.md). The HTTP posture of the site is RFC 0003 and ADR 0012.

## Runbooks

| Runbook | Use when |
|---|---|
| [deploy-and-rollback](docs/runbooks/deploy-and-rollback.md) | A change must be deployed, or a deploy must be undone |
| [edge-verification](docs/runbooks/edge-verification.md) | The site misbehaves between the visitor and the Worker, or the response headers need checking in production |
| [regenerate-visual-assets](docs/runbooks/regenerate-visual-assets.md) | Tokens, logo or icons change, or a CI rule on them fails |

## Planning

Work that changes production starts as an RFC, tracked by Milestones and
Issues, not as unversioned local changes.

| RFC | Title | Status |
|---|---|---|
| [0001](docs/rfcs/0001-publishing-www.md) | Publish www.asymptora.com from this repository | Accepted |
| [0002](docs/rfcs/0002-visual-identity.md) | Visual identity for www.asymptora.com | Accepted |
| [0003](docs/rfcs/0003-http-security-posture.md) | HTTP security posture of www.asymptora.com | Accepted |

## Architecture decisions

Records are added when implemented, not before.

| ADR | Title |
|---|---|
| [0001](docs/architecture/adr/0001-plain-html-no-build-step.md) | Plain HTML and CSS, no build step |
| [0002](docs/architecture/adr/0002-hosting-worker-not-pages.md) | Hosting on a Cloudflare Worker, not Pages |
| [0003](docs/architecture/adr/0003-apex-redirect-via-zone-rule.md) | Apex redirect via a zone-level Redirect Rule |
| [0004](docs/architecture/adr/0004-edge-verify-via-api.md) | Verify edge configuration via the Cloudflare API |
| [0005](docs/architecture/adr/0005-deploy-via-github-actions.md) | Automated deploy via GitHub Actions |
| [0006](docs/architecture/adr/0006-tokens-single-source-generated-css.md) | Design tokens: single source, generated CSS |
| [0007](docs/architecture/adr/0007-dark-only-theme-no-javascript.md) | Dark theme only, no JavaScript |
| [0008](docs/architecture/adr/0008-logo-assets-from-font-and-original-lambda.md) | Logo and favicon assets built from the font and the original lambda |
| [0009](docs/architecture/adr/0009-self-hosted-variable-font-and-cache-policy.md) | Self-hosted variable font and cache policy |
| [0010](docs/architecture/adr/0010-source-rules-checked-in-ci.md) | Rules on the source of the pages, checked in CI |
| [0011](docs/architecture/adr/0011-main-protected-by-ruleset.md) | The `main` branch is protected by a repository ruleset |
| [0012](docs/architecture/adr/0012-http-security-headers-and-edge-injections.md) | Security headers from `_headers`, the CSP enforced, and what Cloudflare injects |
| [0013](docs/architecture/adr/0013-actions-pinned-by-commit-sha.md) | GitHub Actions are pinned by commit SHA |

## Deployment

Merging to `main` deploys, via GitHub Actions (ADR 0005).
There is no manual deployment path.

## Related

- [asymptora/infra](https://github.com/asymptora/infra): platform, network and
  ingress. The blog (`blog.asymptora.com`) is a separate service, published
  through the tunnel owned there.
