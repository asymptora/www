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

## Planning

Work that changes production starts as an RFC, tracked by Milestones and
Issues, not as unversioned local changes.

| RFC | Title |
|---|---|
| [0001](docs/rfcs/0001-publishing-www.md) | Publish www.asymptora.com from this repository |
| [0002](docs/rfcs/0002-visual-identity.md) | Visual identity for www.asymptora.com |

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

## Deployment

Merging to `main` deploys, via GitHub Actions (ADR 0005).
There is no manual deployment path.

## Related

- [asymptora/infra](https://github.com/asymptora/infra): platform, network and
  ingress. The blog (`blog.asymptora.com`) is a separate service, published
  through the tunnel owned there.
