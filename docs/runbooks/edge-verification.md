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
