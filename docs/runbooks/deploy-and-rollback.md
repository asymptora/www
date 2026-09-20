# Runbook: Deploy and Rollback

## Purpose

This runbook covers two distinct scenarios, which need different actions:

1. **A code deploy broke production** (bug in the HTML, error in the
   Worker) → version rollback.
2. **The domain configuration needs to be reverted** (during the cutover
   / soak period, or a zone emergency) → custom domain rollback.

## Normal deploy

Every merge to `main` triggers the `deploy` job in `ci.yml`
automatically. Verifying success:

- The `deploy` job in Actions finishes green.
- `edge-verify.yml` runs right after (`workflow_run` trigger) and
  confirms the configuration via the API.
- Manually: `curl -sI https://www.asymptora.com` should return `200`.

Each deploy's Version ID is visible under
`Workers & Pages → www → Deployments`. Record the ID of meaningful
deploys (e.g. `5e25147a`, the first real production deploy, 2026-09-20).

## Scenario 1: Worker version rollback (bad code)

**Symptom:** deploy technically succeeded, but the site is broken
(visual bug, 500, wrong behaviour).

**Action:**
```
npx wrangler rollback [VERSION_ID]
```
Reverts to a previously published version without needing a new deploy
through the pipeline. `VERSION_ID` is optional; without it, rolls back
to the immediately previous version.

**Honesty note:** this command has not been run in a real incident yet —
it is documented from the official `wrangler` reference, not yet
empirically verified. Recommended to test it once, in a controlled way,
before relying on it in a real emergency.

**Always-available alternative:** revert the problematic commit
(`git revert`) and let the normal pipeline redeploy.

## Scenario 2: custom domain rollback (zone configuration)

**When to use:** a DNS/Worker configuration problem prevents the site
from working, and a quick return to a known-good state is needed (the
`asymptora-site` Pages project, kept as fallback during the issue #16
soak).

**Procedure, empirically verified twice on 2026-09-20** (issue #15, one
rehearsal per operator):

1. `Workers & Pages → www → Domains` → remove `www.asymptora.com` from
   the Worker.
2. `Workers & Pages → asymptora-site → Custom domains` → add
   `www.asymptora.com`.
3. Verify: `curl -s https://www.asymptora.com | head -c 300` — the Pages
   placeholder uses **inline** CSS (`<style>` in the `<head>`); the real
   site uses `<link rel="stylesheet" href="/style.css">`. That structural
   difference is the fastest way to confirm which of the two is
   responding.

   If the result looks stale or doesn't match what the dashboard shows,
   local DNS caching (home router or OS resolver) is the likely cause —
   confirm the real state with `curl -s --resolve www.asymptora.com:443:<current-ip> https://www.asymptora.com` instead, using the IP shown for the target project in the dashboard.

**To undo** (back to the Worker): same procedure, reversed — remove from
Pages, add to the Worker.

**Observed timing across both rehearsals:** propagation under 2 minutes
in each direction, both times.

**Why this order, and not simply "add to the destination":** Cloudflare
refuses to add a custom domain that already belongs to another project
(confirmed in issues #10 and #15). Always remove first, add second —
never the other way round.

## References

- RFC 0001, Rollback section
- ADR 0002, ADR 0003 (decisions this runbook operates)
- Issues #10, #14, #15 (real executions that produced this procedure)
