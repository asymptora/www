# 0001. Plain HTML and CSS, no build step

Date: 2026-09-12

## Status

Accepted

## Context

The site defined in [RFC 0001](../../rfcs/0001-publishing-www.md) is a small
institutional site: an initial information architecture of about six pages
(home, about, team, one page per product, journey), all static, with no
per-request logic. It is served by a Cloudflare Worker from a `public/`
directory of static assets.

The pages share a common header and footer. There are two ways to avoid
duplicating that shared markup across pages:

- Author each page as a complete HTML file, accepting that the header and
  footer repeat in every file.
- Introduce a static site generator (Eleventy, Hugo, Astro) that renders pages
  from templates and partials, removing the duplication at the cost of a build
  toolchain: a generator dependency, a build command and a build step in the
  deployment pipeline.

The site is not the organisation's main product; it is its institutional
presence. The time spent on it should be the minimum that ships a correct site,
not an investment in front-end tooling. A generator introduces a template
language and a build step that must be learned and maintained, a cost that is
not justified for six static pages.

## Decision

Author the site as plain, simple HTML and CSS with no build step. Each page is
a complete `.html` file under `public/`; the Worker serves the directory as-is.
The shared header and footer are duplicated across pages.

No generator, no template language, no `npm run build`. The only toolchain in
the repository is Wrangler, used to run and deploy the Worker, not to transform
content.

## Consequences

The deployment pipeline has nothing to build. What is in `public/` is what is
served, byte for byte, which keeps production trivially reproducible from the
repository and removes an entire class of build failures from CI. A broken page
is a broken file, diagnosed by opening that file, not by debugging a render
step.

The cost is duplication. The shared header and footer are copied into every
page, so a change to either is a change to every file. For about six pages this
is tolerable and visible in a single pull request's diff.

The duplication is the signal for revisiting this decision. When the shared
header or footer has had to change across all pages for the third time, or when
the page count grows past what one person tracks by hand, the cost of
duplication has overtaken the cost of a build step, and adopting a generator
becomes a proposal for its own RFC. Migrating plain HTML to a generator is
mechanical and does not change what is served, so deferring the generator
carries a known, bounded cost rather than an open-ended one.

This decision is independent of the hosting choice. A Worker with static assets
serves a generator's output directory exactly as it serves hand-written files,
so a later move to a generator does not touch the Worker configuration or the
pipeline.

## References

- [RFC 0001: Publish www.asymptora.com from this repository](../../rfcs/0001-publishing-www.md)
- Cloudflare Workers docs: static assets.
