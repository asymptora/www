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
public/                  Files served as-is (HTML, CSS, 404 page)
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

## Architecture decisions

Records are added when implemented, not before.

| ADR | Title |
|---|---|
| [0001](docs/architecture/adr/0001-plain-html-no-build-step.md) | Plain HTML and CSS, no build step |
| [0002](docs/architecture/adr/0002-hosting-worker-not-pages.md) | Hosting on a Cloudflare Worker, not Pages |
| [0003](docs/architecture/adr/0003-apex-redirect-via-zone-rule.md) | Apex redirect via a zone-level Redirect Rule |
| [0004](docs/architecture/adr/0004-edge-verify-via-api.md) | Verify edge configuration via the Cloudflare API |
| [0005](docs/architecture/adr/0005-deploy-via-github-actions.md) | Automated deploy via GitHub Actions |

## Deployment

Merging to `main` deploys, via GitHub Actions (ADR 0005).
There is no manual deployment path.

## Related

- [asymptora/infra](https://github.com/asymptora/infra): platform, network and
  ingress. The blog (`blog.asymptora.com`) is a separate service, published
  through the tunnel owned there.
