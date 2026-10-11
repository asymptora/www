# Runbook: Edge Verification

## Purpose

Manual procedure to investigate edge behaviour (DNS, TLS, HTTP, redirect,
404) when something looks wrong in production. Complements
`edge-verify.yml` (ADR 0004): that one verifies the **configuration** via
the API, automated and ongoing; this one is for a human to **investigate
real behaviour**, live, when there's a concrete symptom (site down,
wrong content, redirect not working).

## Known trap: local DNS caching

**Symptom:** `curl`/browser shows a stale result, or "Could not resolve
host", even after a confirmed change in the Cloudflare dashboard.

**Cause:** your network's DNS resolver (home router, or the machine's
`systemd-resolved`) caches the old answer for a while. This is not a
failure of the change — it's expected, and it happened several times
during this project's development.

**Diagnosis:** compare your default resolver's answer against an
external one:
```bash
dig <hostname> +short              # your default resolver
dig <hostname> @1.1.1.1 +short     # straight to Cloudflare, bypasses local cache
```
If they differ, it's local cache, not a real problem.

**Workaround**, without waiting for the cache to expire: use the IP
confirmed via `@1.1.1.1` and force `curl` to use it directly, bypassing
any DNS:
```bash
curl -sI --resolve <hostname>:443:<IP> https://<hostname>
```

## Known trap: post-deploy edge propagation delay

**Symptom:** right after a merge to `main`, some pages serve the new
content immediately while others still serve the previous version for
a short window (observed: a few minutes, on PRs #42 and #43).

**Cause:** Workers Static Assets serves HTML with
`Cache-Control: public, max-age=0, must-revalidate` (Cloudflare docs),
so this is not HTTP caching. It is more likely the new deployment
propagating across Cloudflare's edge network, which is not
instantaneous for every point of presence. No official propagation
time is documented for Workers Static Assets specifically, so treat
this as expected but unconfirmed in duration.

**Diagnosis:** re-check the same page after a short wait. If it is
still stale after several minutes, treat it as a real symptom, not
propagation, and escalate.

**Why this isn't checked automatically:** `edge-verify.yml`
deliberately avoids requesting www.asymptora.com directly, because Bot
Fight Mode can return a false 403 to datacenter traffic (see that
workflow's own comments). Automating a content-level check here would
reintroduce that same false-negative risk.

## Step 1: DNS resolution

```bash
dig www.asymptora.com +short
dig asymptora.com +short
```
Expected: Cloudflare anycast IPs (`104.x`/`172.67.x` range). Empty means
either no record, or a negative cache (see the trap above).

## Step 2: HTTP status and TLS

```bash
curl -sI https://www.asymptora.com
```
`200` expected. `curl` automatically refuses an invalid TLS certificate,
so a successful response already confirms the certificate is correct, no
separate manual check needed.

## Step 3: distinguishing the Worker from Pages

If there's doubt about which resource is responding (relevant during a
migration or rollback), two reliable signals:

- **`access-control-allow-origin: *` header**: present on Pages, absent
  on the Worker.
- **Inline vs. external CSS**: the Pages placeholder uses `<style>` in
  the `<head>`; the real site (Worker) uses
  `<link rel="stylesheet" href="/style.css">`.
```bash
curl -s https://www.asymptora.com | head -c 300
```

## Step 4: apex redirect

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://asymptora.com/some-path
```
Expected: `301 https://www.asymptora.com/some-path` — confirms the
status code and that the path was preserved, not just redirected to the
home page.

## Step 5: real 404

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://www.asymptora.com/a-path-that-does-not-exist
```
Expected: `404`. A `200` here would indicate a single-page-application
fallback, a symptom of being served by Pages instead of the Worker.

## Equivalent automated check

Steps 1, 3, and 4 (minus the purely local DNS-cache step) have an
automated equivalent, running daily and after every deploy:
`.github/workflows/edge-verify.yml` (ADR 0004), querying the Cloudflare
API directly, with no dependency on DNS and no exposure to bot
protection blocking.

## References

- ADR 0004: Verify edge configuration via the Cloudflare API
- RFC 0001, issues #10, #11, #14, #15 (real executions that revealed the
  DNS caching trap)

## Response headers in production

Use after a change to `public/_headers`, or when the console of a browser shows
a Content Security Policy message you do not recognise. CI checks the file
against `wrangler dev` (ADR 0012); this checks what production answers.

**Headers on a page and on the 404** (read only):
```bash
for p in / /about /nao-existe; do
  echo "== $p"
  curl -sI https://www.asymptora.com$p | grep -iE '^(HTTP|content-security-policy|permissions-policy|x-content-type-options)' | cut -c1-90
done
```
Expected: the three headers on all three paths, and `HTTP/2 404` for the last.
`content-security-policy` must not appear as `-report-only`.

**Console of a browser** (Firefox or a Chromium browser, `Ctrl+Shift+R`, then
the Console): a message that the policy blocked an inline script, with no URL
from this repository, is the Cloudflare JavaScript detections script. It is
expected (ADR 0012). A message that names a file of the site, a font, an image
or a stylesheet is not: it means the policy no longer matches the pages, and
that is a real defect.

**A message about a script or connection to `cloudflareinsights`, or to
`/cdn-cgi/rum`:** the Web Analytics beacon is on again. In the dashboard, Web
Analytics, Manage site, set it to Disable (it was disabled on 2026-10-11).

**An address of the form `<version>-www.<account>.workers.dev` answering `200`:**
per-version preview URLs are on again. Check `preview_urls` in `wrangler.jsonc`
(it must be `false`) and the dashboard, Workers and Pages, `www`, Domains.
