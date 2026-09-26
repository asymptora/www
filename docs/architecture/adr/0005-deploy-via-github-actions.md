# 0005. Automated deploy via GitHub Actions

Date: 2026-09-26

## Status

Accepted

## Context

Publishing the site needed a deploy mechanism. Two real options:

- **Cloudflare Workers Builds**: Cloudflare itself watches the
  repository and triggers the build/deploy when it detects a push, with
  no workflow to configure on the developer's side.
- **GitHub Actions with `cloudflare/wrangler-action`**: a workflow
  versioned in the repository (`ci.yml`) runs `wrangler deploy` using an
  API token stored as a secret.

RFC 0001's goals already established that no deploy should happen by
manual upload (the project's original problem, when `asymptora-site` was
found with no reconstructible source), and that the pipeline should be
visible and reviewable alongside the code.

## Decision

Deploy via GitHub Actions, using the official `cloudflare/wrangler-action`,
maintained by the vendor. The workflow (`ci.yml`) has two jobs: `validate`,
which runs on every pull request and checks content (internal links, via
`linkinator`); `deploy`, which only runs on push to `main`, after
`validate` passes.

The API token used by `wrangler-action` (`CLOUDFLARE_API_TOKEN`) has
minimum scope, restricted to `Workers Scripts: Edit` on this account,
stored as a GitHub Actions secret, never committed.

## Consequences

The entire pipeline is versioned code: anyone opening the repository sees
exactly what happens on every push, with no dependency on hidden
configuration in an external dashboard. This fulfils RFC 0001's central
goal — production always reproducible from `main`.

The accepted cost is keeping a secret (the token) outside the
repository, with the rotation discipline that requires (documented in
`SECURITY.md`) — something Workers Builds would not require, since it
authenticates through Cloudflare's own GitHub integration, with no
explicit token on the developer's side.

This choice also later allowed adding content validation before deploy
(the `validate` job), something that would be harder to add with the
same ease to a pipeline managed entirely by Cloudflare.

## References

- [RFC 0001: Publish www.asymptora.com from this repository](../../rfcs/0001-publishing-www.md)
- [ADR 0002: Hosting on a Cloudflare Worker, not Pages](0002-hosting-worker-not-pages.md)
- `SECURITY.md` — token scope and rotation
