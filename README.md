# asymptora-www

Source of `www.asymptora.com`: a static site served by a Cloudflare Worker
and deployed by GitHub Actions from the `main` branch.

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

## Deployment

Merging to `main` deploys. There is no manual deployment path.

## Related

- [asymptora/infra](https://github.com/asymptora/infra): platform, network and
  ingress. The blog (`blog.asymptora.com`) is a separate service published
  through the tunnel owned there.
