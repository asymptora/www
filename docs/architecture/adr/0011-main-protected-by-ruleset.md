# 0011. The `main` branch is protected by a repository ruleset

Date: 2026-10-10

## Status

Accepted

## Context

A merge to `main` publishes the site (ADR 0005). `SECURITY.md` already says that
branch protection and required CI are the controls that gate this (RFC 0001,
phase 2). Until 2026-10-10 that control did not exist in the repository
settings: Settings, Rules, Rulesets and Settings, Branches both showed nothing
configured.

With no protection, anyone with write access could push straight to `main`
(skipping the pull request), merge a pull request with a failing check, force
push, or delete the branch. The `deploy` job depends on `validate` inside the
push run, so a failing check would still stop the deploy, but only after the
commit was already on `main`.

The repository is worked on by two people. The author merges her own pull
requests; the other owner works mostly on the infrastructure repository.

## Decision

A repository ruleset named `main`, enforcement **Active**, targeting the default
branch, with:

- **Require a pull request before merging**, with **0** required approvals;
- **Require status checks to pass**: `Validate` (job `validate` in `ci.yml`) and
  `Gitleaks` (job `scan` in `secret-scan.yml`). `Deploy` is not required: it is
  skipped on pull requests. "Require branches to be up to date" is off;
- **Block force pushes**;
- **Restrict deletions**.

The bypass list is empty, so the rules apply to repository admins too. The merge
methods stay as GitHub's default (merge commit, squash, rebase).

Verified on 2026-10-10 by trying what the ruleset forbids: a push of an empty
commit straight to `main` was rejected with `GH013: Repository rule violations
found`, "Changes must be made through a pull request" and "2 of 2 required
status checks are expected". The commit was discarded locally and never reached
`main`.

## Alternatives considered

| Alternative | Why it was not chosen |
|---|---|
| One required approval | Every change, a footer email included, would wait for a person who mostly works elsewhere. Revisit if more people write to the repository |
| Classic branch protection rule | Rulesets are the current mechanism; both offer the rules needed here, and the ruleset's bypass list is explicit |
| Require branches to be up to date | Every merge would need an update from `main` and a new CI run first. The cost is high for two people and a small site; the risk it covers (two green branches that break `main` together) is low here |
| A bypass for admins | Removes the point of the rule. A real emergency has a documented path (below) |
| Leave it to convention | `SECURITY.md` already promised a control; a convention fails the first time someone pushes in a hurry |

## Consequences

Every change reaches `main` through a pull request whose `Validate` and
`Gitleaks` checks passed.

The required checks are matched by **job name**, as shown in the checks list.
Renaming the `validate` job's `name:` or the `scan` job's `name:` makes the
required check never report, and every pull request waits forever. Rename them
only together with the ruleset. The workflow files carry a comment saying so.

A rollback by `git revert` also goes through a pull request and its checks
(`docs/runbooks/deploy-and-rollback.md`). If the pipeline itself is what is
broken, the ruleset has to be changed by an admin (set enforcement to Disabled
or add a temporary bypass), the fix pushed, and the ruleset restored in the same
sitting. That change is visible in the repository's audit log and must be
mentioned in the pull request that follows.

The ruleset is a repository setting, not a file in the repository. This ADR is
its record; there is no automatic check that the setting still matches it.
Looking at Settings, Rules, Rulesets is the verification, and trying a direct
push is the test.

Zero approvals means a pull request can be merged by its own author. The
protection is the checks and the audit trail, not a second pair of eyes.

## References

- [ADR 0005: Automated deploy via GitHub Actions](0005-deploy-via-github-actions.md)
- `SECURITY.md`, "Write access to this repository is itself a deployment capability"
- [RFC 0001: Publishing www.asymptora.com](../../rfcs/0001-publishing-www.md), phase 2
- GitHub docs: About rulesets
