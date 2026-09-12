# RFC 0001: Publishing www.asymptora.com from this repository

Status: Draft

Author: Janaína Cazuza

Reviewer: Higor Cazuza

## Summary

Makes `www.asymptora.com` a site that is built, deployed and operated from
this repository, with production always reproducible from the `main` branch.
Replaces the current hosting project, which was populated by direct uploads
from an unversioned source tree, with a Cloudflare Worker serving static
assets, deployed by GitHub Actions. Defines the initial information
architecture, the redirect and not-found behaviour, and the operational
documents the site must ship with.

## Motivation

The public site is the one part of the Asymptora presence that must stay up
when the lab is down. It is also the first workload that a second operator
must be able to change, review and roll back without knowledge held by the
person who first published it. Today neither property holds in a verifiable
way: the site is online, but nothing in Git produces it.

## Current state

Verified on 2026-09-12 from the workstation and the Cloudflare dashboard.

| Layer | Observed | Evidence |
|---|---|---|
| DNS delegation | Zone `asymptora.com` is authoritative on Cloudflare | `dig NS asymptora.com` → `julian`/`paislee.ns.cloudflare.com` |
| `www` record | Proxied; clients receive Cloudflare anycast addresses | `dig www.asymptora.com` → `172.67.162.72`, `104.21.73.120` |
| `blog` record | Does not exist | `dig blog.asymptora.com` → empty |
| Hosting | Cloudflare Pages project `asymptora-site`, **no Git connection** | Dashboard, Workers & Pages → Settings → Build |
| Deployments | ~8 production deployments, latest 3 months old, all direct uploads (`Source: main` is the branch label passed at upload time, not a Git branch) | Dashboard, Deployments |
| Custom domains | `asymptora.com` and `www.asymptora.com` both bound to `asymptora-site`, SSL active | Dashboard, Custom domains |
| Content served | Placeholder: title, "Under maintenance", contact e-mail | `curl https://www.asymptora.com` |
| Apex behaviour | `asymptora.com` returns `200` with the same content; no redirect | `curl -sI https://asymptora.com` |
| Not-found behaviour | `/nao-existe` returns `200 text/html` (single-page-application fallback, no `404.html`) | `curl -sI https://www.asymptora.com/nao-existe` |
| Repository | 3 commits; `index.html` is 10 bytes (`Asymptora`); working tree clean | `git log`, `cat index.html`, `git status` |
| Source of the live content | **Not versioned anywhere.** The operator who uploaded it no longer has the source tree | Confirmed with Higor, 2026-09-12 |

Conclusion: production is not reproducible from any repository. The
placeholder has no content worth preserving.

## Goals

- Production content equals the `main` branch of this repository, always.
  Every change reaches production through a pull request, a review and an
  automated deployment; no direct uploads.
- A hosting project created and configured from this repository, under this
  repository's name, with its configuration versioned.
- One canonical hostname (`www.asymptora.com`); the apex redirects to it.
- A real `404` for unknown paths.
- The initial information architecture defined in the Fase 0 syllabus (M10):
  home, about, team, one page per product (Collect, Balance, Pay), journey.
- Rollback executable by either operator from the runbook alone.

## Non-goals

- The blog. `blog.asymptora.com` is a separate service with its own
  repository and is published through the ingress tunnel owned by
  `asymptora/infra` (RFC 0001 there). This site only links to it.
- Server-side logic, forms, or any Worker script beyond serving assets.
- A static site generator. The initial site is plain HTML and CSS; adopting
  a generator, if duplication becomes a problem, is a later RFC.
- Analytics and SEO tooling beyond `<title>`, meta descriptions and a
  sitemap. Cloudflare Web Analytics is enabled after the cutover as its own
  issue.

## Scope boundary

`asymptora/infra` owns the platform: nodes, network, tunnel ingress and the
DNS records that point into the lab. This repository owns the site: its
content, its build, its deployment and its operational runbooks.

Shared surface: the DNS zone `asymptora.com` and its zone-level rules. The
records and the redirect rule for `www` and the apex are created for this
site and change only with it, so they are proposed and documented here and
reviewed by the `infra` owner. If a zone-level rule is used for the apex
redirect, it is recorded in the `infra` edge table (M10, item 8) as owned by
`www`.

## Decisions to be recorded as ADRs

Recorded when implemented, following the `infra` convention.

1. **Hosting: Cloudflare Worker with static assets instead of Pages.**
   Cloudflare's own documentation now provides a Pages-to-Workers migration
   guide and ships new platform features to Workers first; static asset
   requests cost the same on both. Workers keeps the entire configuration in
   `wrangler.jsonc` in the repository, which is the property this RFC exists
   to establish. Trade-off accepted: a scoped Cloudflare API token stored as
   a GitHub secret, and a few seconds of downtime when custom domains move.
   Alternative rejected: reconnecting the existing `asymptora-site` Pages
   project to this repository. It would avoid the domain move, but inherits
   a project created outside this repository, on a product that is no longer
   the vendor's direction.
2. **Deployment by GitHub Actions rather than Cloudflare Workers Builds.**
   The pipeline is visible, reviewable and versioned next to the code, and
   it is the same tool the project will use for every later workload.
   Trade-off accepted: the API token. Mitigations: token scoped to Workers
   Scripts on this account only, `main` protected with required review, and
   workflow permissions set to read-only by default.
3. **Plain HTML and CSS, no build step.** Fase 0 object of study; eliminates
   a class of CI failures. Review trigger: when the shared header/footer
   changes for the third time across all pages.
4. **`www` as canonical hostname; apex redirected by a zone-level Redirect
   Rule, not by the Worker.** Cloudflare's own example implements the
   root-to-www redirect as a Redirect Rule (`https://asymptora.com/*` →
   `https://www.asymptora.com/${1}`, `301`, query string preserved). The
   `_redirects` file of static assets only matches file paths, not
   hostnames, and Worker code is not invoked for requests that match an
   asset unless `run_worker_first` is enabled, which would run the Worker on
   every request to serve a redirect. The apex keeps a proxied `A` record
   pointing at `192.0.2.1`, the reserved address Cloudflare documents for
   hostnames that exist only to receive rules, and is no longer a custom
   domain of the site.

## Plan

Each item is one issue and one pull request. Order matters: nothing is
removed until its replacement is verified.

### Phase 1: Source of truth

1. Repository skeleton: `public/` for assets, `docs/architecture/adr/`,
   `docs/rfcs/`, `docs/runbooks/`, `README.md` as entry point only.
2. `wrangler.jsonc` with `name`, `compatibility_date`, `assets.directory`
   and `not_found_handling: "404-page"`; `public/404.html`.
3. Home page and `404` in plain HTML/CSS; verified locally with
   `wrangler dev`.

### Phase 2: Pipeline

4. Cloudflare API token created with the minimum scope for `wrangler deploy`
   on this account; stored as a GitHub Actions secret; token scope and
   rotation procedure documented in `SECURITY.md`.
5. Workflow: on pull request, validate HTML and fail on broken internal
   links; on push to `main`, `wrangler deploy`. Permissions declared
   explicitly per job.
6. Branch protection on `main`: pull request required, one approving review
   from the other operator, status checks required, no force push.
7. First deployment verified on the `workers.dev` preview hostname.

### Phase 3: Cutover

8. Custom domain `www.asymptora.com` moved from `asymptora-site` to the
   Worker. Verified with `dig`, `curl -vI` (status,
   `server`, certificate issuer) from outside the lab network.
9. Apex: custom domain removed from the site; proxied `A 192.0.2.1` record;
   Redirect Rule to `www` with `301`. Zone change, reviewed by the `infra`
   owner and added to the edge table there. Verified with `curl -sI`.
10. `404` verified with `curl -sI https://www.asymptora.com/nao-existe`.
11. Soak: 3 days with the Pages project kept as fallback, during which each
    operator executes the rollback runbook once.
12. `asymptora-site` deleted. Its deployment history is unrecoverable
    afterwards; accepted, because none of it is versioned or wanted.

### Phase 4: Content

13. About, team, journey and the three product pages ("em construção"), one
    pull request each, following the information architecture in the M10
    syllabus. Link to `blog.asymptora.com` added only once the blog resolves.
14. Sitemap and meta descriptions; Cloudflare Web Analytics.

### Phase 5: Documentation

15. ADRs 1–4 above, written as each decision becomes real.
16. Runbook: edge verification (DNS, TLS, HTTP, redirect, 404) with expected
    outputs and their interpretation.
17. Runbook: deploy and rollback (Worker versions rollback; and, during the
    soak, domain rebinding to `asymptora-site`).

## Completion criteria

- A change merged to `main` is live on `www.asymptora.com` without any
  manual step, and the deployed content is byte-identical to the repository.
- `asymptora.com` redirects to `www.asymptora.com` with `301`; an unknown
  path returns `404`.
- The other operator rolls back a deployment following the runbook alone.
- `asymptora-site` no longer exists and no direct-upload path remains.
- The four ADRs and two runbooks exist and match what is deployed.

## Rollback

- Before item 12: rebind `www.asymptora.com` (and, if the apex rule
  misbehaves, the apex) to `asymptora-site`, which still holds the
  placeholder. Seconds of downtime.
- After item 12: roll back to the previous Worker version from the
  dashboard or `wrangler rollback`. Content-level mistakes are reverted with
  `git revert` on `main`, which redeploys through the normal pipeline.

## Open questions

- Whether the contact e-mail from the placeholder should reappear on the
  site, and where. Content decision, Phase 4.

## References

- Asymptora Fase 0 syllabus, Módulo 10 (information architecture, hybrid
  presence architecture).
- `asymptora/infra`, RFC 0001 (platform commissioning; ingress ownership).
- Cloudflare Workers documentation: static assets, `_redirects`, migration
  from Pages, custom domains, versions and rollbacks.
- Cloudflare Rules documentation: "Redirect from root to WWW" example;
  Fundamentals: "Redirect one domain to another" (the `192.0.2.1` record).
- GitHub documentation: Actions permissions, encrypted secrets, branch
  protection rules.
