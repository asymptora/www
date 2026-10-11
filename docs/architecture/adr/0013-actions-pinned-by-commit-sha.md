# 0013. GitHub Actions are pinned by commit SHA

Date: 2026-10-11

## Status

Accepted

## Context

The workflows use three third-party actions: `actions/checkout`,
`actions/setup-node` and `cloudflare/wrangler-action`. They were referenced by
version tag (`@v7`, `@v4`). A tag is a pointer that the owner of the action can
move, so the code a workflow runs can change without any change in this
repository. The deploy job runs `cloudflare/wrangler-action` with the Cloudflare
API token (ADR 0005), so a moved tag there would run someone else's code with
the token.

## Decision

Every `uses:` line in `.github/workflows/` names a full 40-character commit SHA,
with the version it corresponds to in a trailing comment:

```yaml
uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
```

The SHAs were taken from the tags that the workflows used on 2026-10-11 (`v7`,
`v7`, `v4`), so pinning did not change the code that runs. Dependabot
(`github-actions` ecosystem, `.github/dependabot.yml`) keeps updating the
actions and changes the SHA and the comment together, as pull requests that go
through the same checks as any other change (ADR 0011).

## Alternatives considered

| Alternative | Why it was not chosen |
|---|---|
| Keep version tags | A moved or republished tag changes what runs, unnoticed. The deploy job holds a secret |
| Pin only `cloudflare/wrangler-action` | The checkout and setup-node actions run in the same job, with the same token available to later steps. One rule is simpler to apply and to review than a split |
| Copy the actions into this repository | Full control, but the repository would have to maintain them by hand; Dependabot already does this |

## Consequences

- A SHA is hard to read, so the comment is the human-readable version. Review a
  Dependabot pull request by the version in the comment and the diff it links.
- A SHA from a fork or an unrelated commit would run there too. When adding an
  action, take the SHA from the owner's repository tag, not from a copy.
- This protects against a moved tag. It does not protect against an owner who
  publishes a malicious new version that Dependabot then proposes: that is what
  the review of the pull request is for.

## References

- [ADR 0005: Deploy via GitHub Actions](0005-deploy-via-github-actions.md)
- [ADR 0011: The `main` branch is protected by a repository ruleset](0011-main-protected-by-ruleset.md)
- GitHub docs: Security hardening for GitHub Actions (using third-party actions)
