# RFC 0003: HTTP security posture of www.asymptora.com

Status: Accepted

Author: Janaína Cazuza

Reviewer: Higor Cazuza (also the owner of `asymptora/infra`, who decides the zone-level items)

Status of each proposal below: P1, P2 and P3 were applied and verified by the
`infra` owner on 2026-10-10, during the review (see "Applied during the
review"). P4 is not proposed in this RFC. P5 and P6 are accepted by the reviewer on 2026-10-11 and are implemented in their
own pull requests: P5 is in production (#86), P6 was in production in
Report-Only mode (#87) and is enforced since #90 (2026-10-11). #86 and #87 were
merged before the reviewer's approval of this RFC on 2026-10-11, so for P1, P2,
P3, P5 and the Report-Only step implementation preceded acceptance; #90 came
after. The facts in "Current state"
were observed before P1, P2 and P3 were applied, except where a row says another
date.

## Summary

Proposes how `www.asymptora.com` should be served over HTTPS and which response
headers it should send. When this RFC was written, the site answered in plain
HTTP, the apex failed over HTTP, the zone accepted TLS 1.0, HSTS was off, and the
pages carried none of the common security headers. The items split in two by owner: settings of the
`asymptora.com` zone, which the blog shares and `infra` decides, and headers
that this repository can set for the site alone.

## Motivation

The visual identity work (RFC 0002) made the files of this repository serve only
same-origin content: no JavaScript, no inline styles, no third-party resources
(ADR 0007). That makes a strict Content Security Policy feasible for the first
time. What Cloudflare adds to the HTML at the edge is not in the repository and
is dealt with below. While
checking the edge for it, three gaps showed up that are independent of any
header: an unencrypted HTTP path for `www`, a hard failure (522) for the apex over
HTTP, and a TLS floor that is below what the IETF deprecated in 2021.

## Current state

Observed on 2026-10-10 from a home network, against `main` at `db9a9d1`, before P1, P2 and P3 were applied.

| Layer | Observed | Evidence |
|---|---|---|
| HTTPS, `www` | `200`, served by Cloudflare. Over HTTPS, the apex answers `301` to `https://www.asymptora.com/` | `curl -sI` |
| HTTP, `www` | `HTTP/1.1 200 OK`: no redirect to HTTPS | `curl -sI http://www.asymptora.com/` |
| HTTP, blog | `HTTP/1.1 200 OK`: no redirect to HTTPS | `curl -sI http://blog.asymptora.com/` |
| HTTP, apex | `522` after 19.7 s (an earlier attempt with a 10 s limit timed out) | `curl -sI -m 40 -o /dev/null -w '%{http_code} em %{time_total}s' http://asymptora.com/` |
| Cause of the apex failure | The Redirect Rule "Redirect from root to WWW" has the request URL pattern `https://asymptora.com/*`, so it matches HTTPS only. An HTTP request reaches the proxied `A` record, whose address is a documentation-range placeholder with no server behind it (ADR 0003) | Dashboard, Rules, Redirect Rules; ADR 0003 |
| Always Use HTTPS | Off | Dashboard, SSL/TLS, Edge Certificates |
| HSTS | Not enabled | Same page, "Enable HSTS" button shown |
| Minimum TLS version | TLS 1.0 (default) | Same page |
| Response headers on `/` | Present: `cache-control: public, max-age=0, must-revalidate`, `cf-cache-status`, `server: cloudflare`. Absent: `strict-transport-security`, `content-security-policy`, `x-content-type-options`, `x-frame-options`, `referrer-policy`, `permissions-policy`, `cross-origin-*` | `curl -sI` filtered by those names |
| What the repository's pages load | No `<script>`, no `<style>`, no `style=` attribute. Subresources are same-origin only: two stylesheets, three icon links, the logo image and one font loaded from the stylesheet. External addresses appear only as `<a href>` (the blog, GitHub, LinkedIn) | `grep` over `public/` |
| HTML served by Cloudflare | Observed on 2026-10-11: `/` contains one inline `<script>` that Cloudflare injects (the challenge-platform JavaScript detections of Bot Fight Mode; it loads `/cdn-cgi/challenge-platform/scripts/jsd/main.js`) and one hidden link with an inline `style` attribute (`/cdn-cgi/content`, consistent with AI Labyrinth; the documentation does not show that URL, so this is not confirmed). On 2026-10-10 the same page also carried a `<script type="module">` from `static.cloudflareinsights.com` (the Web Analytics beacon, `data-cf-beacon`); it was absent on 2026-10-11 and the reason is not established. The reviewer reports that the blog receives the same inline script; not checked here | `curl -s https://www.asymptora.com/ \| grep -oP '\x3cscript[^\x3e]*\x3e'` and `grep -oP 'cdn-cgi/content\|static\.cloudflareinsights\.com\|data-cf-beacon'` |
| `Content-Type` | Correct for every asset served (RFC 0002, verification on 2026-10-10) | `curl -I` |
| Who decides zone settings | Not declared as code in `asymptora/infra`. By precedent (ADR 0003, ADR 0004) a zone-wide change is proposed here, documented here, and approved by the `infra` owner | Search of `infra` at `57a0a1e`; ADRs 0003 and 0004 |

What the Cloudflare documentation says about `_headers` for Workers static
assets (the site has no Worker script): the file sits in the assets directory,
supports up to 100 rules and 2,000 characters per line, and "overrides what
Cloudflare ordinarily sends". It does not apply to responses generated by Worker
code. The documentation does not say whether it applies to the 404 response.

What the Cloudflare documentation says about the JavaScript detections: with
Bot Fight Mode they are enabled automatically and cannot be disabled. It asks a
site that uses a CSP to allow what is under `/cdn-cgi/challenge-platform/` and
adds nonces to the scripts it injects by parsing the CSP response header.

What the documentation did not say when this RFC was written, and the tests of
P1 and P2 then answered: the order in which Always Use HTTPS and Redirect Rules
run. P1 alone fixed the apex (see "Applied during the review").

## Goals

- No page of the site is readable over plain HTTP.
- The apex reaches `https://www.asymptora.com/` over HTTP and HTTPS alike.
- No connection below TLS 1.2.
- The site sends the headers that its own content allows it to send, with a CSP
  that matches what the pages actually load.
- Every change is verifiable with a command, reversible, and recorded.

## Non-goals

- The blog's own response headers: the blog is a separate service owned by
  `infra`.
- Changing anything under Security. Bot Fight Mode stays as it is; what it does to the CSP is a decision below.
- The HSTS preload list.
- Managing the zone as code. Worth a separate discussion with `infra`.
- CORS and cookies: the site sets none.

## Scope boundary

The zone `asymptora.com` is shared with the blog, which is published through a
tunnel owned by `infra`. Items marked **Zone** in this RFC change a setting that
applies to every hostname of the zone. They are proposed here and applied by the
`infra` owner, as in ADR 0003. Items marked **Site** are `_headers` rules of this
repository and affect only `www`.

## Proposals

| # | Owner | Proposal |
|---|---|---|
| P1 | Zone | **Applied 2026-10-10.** Turn **Always Use HTTPS** on. Effect: every `http` request to every host of the zone is redirected to `https`. Fixes `www` and the blog over HTTP, and probably the apex (see P2) |
| P2 | Zone | **Applied 2026-10-10: P1 alone was enough, the Redirect Rule is unchanged.** Make the apex redirect work over HTTP. Preferred: rely on P1, then test `http://asymptora.com/`. If it still fails, change the Redirect Rule so its pattern also matches `http`, which is a change of the rule from ADR 0003. The order in which P1 and the rule run is not documented, so the test decides |
| P3 | Zone | **Applied 2026-10-10.** Raise the **minimum TLS version** to 1.2. RFC 8996 deprecated TLS 1.0 and 1.1. Cost: clients that only speak those versions can no longer connect. Their number is unknown |
| P4 | Zone | **Not proposed in this RFC.** HSTS: the reviewer does not want it for now. The dashboard offers a `max-age` of 1 to 12 months, so it cannot be undone quickly, and with P1 in place the benefit for a static site without cookies is small. To be reopened in its own RFC if wanted |
| P5 | Site | **Applied 2026-10-11 (#86).** `public/_headers` with a single `/*` block holding `X-Content-Type-Options: nosniff` and a `Permissions-Policy` that disables the features the site does not use: `accelerometer`, `camera`, `geolocation`, `gyroscope`, `magnetometer`, `microphone`, `payment`, `usb`. Verified with `wrangler dev` on `/`, `/about` and a path that does not exist, then on production after the deploy |
| P6 | Site | **Report-Only applied 2026-10-11 (#87); enforced 2026-10-11 (#90).** A **Content Security Policy** matching the repository's pages: `default-src 'none'; img-src 'self'; style-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`. In the same `/*` block as P5. A header repeated in `_headers` is joined with a comma, so moving from Report-Only to enforced replaces the header, it does not add one. Shipped first as `Content-Security-Policy-Report-Only`, checked in the browser console of Firefox and of a Chromium browser on all seven pages, then enforced. `frame-ancestors` also covers what `X-Frame-Options` does, so that header is not added. No page links a web manifest, so `manifest-src` is not needed; add it if one is linked |

Not proposed: `Referrer-Policy`. Browsers already default to
`strict-origin-when-cross-origin`, so setting it would change nothing.

Not proposed: the `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`
and `Cross-Origin-Resource-Policy` headers. The site keeps no session or other
state that another origin could reach, embeds nothing, and shares no data with
other sites, so there is nothing for them to isolate.

## Decision: Cloudflare JavaScript detections stay enabled, the CSP is enforced

The HTML that Cloudflare serves contains an inline script and a hidden link that
are not in this repository (see "Current state"). Once P6 is enforced the CSP
blocks both: the inline script (`script-src` falls back to `default-src 'none'`)
and the inline `style` attribute of the hidden link. The JavaScript detections
therefore stop running on `www` pages, and the browser console reports
violations on every page load that come from Cloudflare, not from the site's
content.

| Option | Consequence |
|---|---|
| Turn the detections off | Not possible with Bot Fight Mode, and Bot Fight Mode also protects the blog and its admin login, which the infra owner decided to keep |
| Keep P6 in Report-Only for good | Nothing is blocked, but the policy is never enforced |
| Enforce only the directives that do not fall back to `default-src` (`frame-ancestors`, `base-uri`, `form-action`) | Cloudflare keeps working and there are no violations, but nothing restricts scripts or styles |
| **Enforce the full CSP of P6 and accept the violations** | Chosen. `www` gets the strict policy; the detections do not run on `www`; the console shows the expected violations |

Decision: keep Bot Fight Mode on, enforce the CSP, and document the violations.
The blog is unaffected, because this CSP is sent only for `www`. The decision on
Bot Fight Mode was taken by the infra owner; the decision to enforce the CSP is
the author's.

The Report-Only test lists the violations; its result is in "Result of the
Report-Only test". What Cloudflare injects varies by client, so no fixed list is
promised. Any violation that does not come from Cloudflare comes from the
repository and has to be fixed before enforcement.

## Applied during the review

The infra owner applied P1, P2 and P3 on 2026-10-10 while reviewing, before the
status of this RFC changed. They are recorded here as they happened. All three
are reversible at once in the dashboard. The procedure, the commands and the
expected output are in `asymptora/infra#32`. The numbers below are the reviewer's
report of that procedure; the author did not repeat them.

P1 and P2, `curl` over `http`, before and after:

| Host | Before | After |
|---|---|---|
| `www` | `200` | `301` to https, then `200` |
| apex | `522` | `301` to https, `301` to `www`, then `200` |
| `blog` | `200` | `301` to https, then `200` |
| `blog-admin` | not measured before | `301` to https, then `404` (Ghost has no route at `/`, expected) |

Over https, `www` and the blog answer one `200` with no redirect loop.

P3, `nmap --script ssl-enum-ciphers`:

| Host | Before | After |
|---|---|---|
| `www` | TLS 1.0, 1.1, 1.2, 1.3 (3DES present under 1.0) | TLS 1.2, 1.3 |
| `blog-admin` | not measured before | TLS 1.2, 1.3 (the setting applies to the whole zone) |

## Alternatives considered

| Alternative | Why it was not chosen |
|---|---|
| Redirect HTTP to HTTPS only for `www`, with a Single Redirect | The Cloudflare documentation recommends this only when part of an application cannot serve HTTPS. The reviewer confirmed that every hostname of the zone serves HTTPS (see "Points for the reviewer, answered"), so P1 covers everything with one switch |
| HSTS set by `_headers` instead of the zone setting | Would apply to `www` alone and leave the blog and the apex without it. It is also the same irreversibility, decided in a place `infra` does not see |
| CSP enforced from the first deploy | There is no preview environment (ADR 0005 deploys on merge). A mistake in the policy would break the site in production before anyone sees it. Report-Only costs one more pull request |
| A site generator or Worker script to set headers | Rejected by ADR 0001. `_headers` is the documented mechanism for static assets |

## Design

### Order

Order matters because each step depends on the previous one being true.

1. P1 and P2, tested together: `http` on `www`, apex, blog and `blog-admin`
   must end on `https`. The blog was tested first, because the zone is shared and
   Cloudflare warns that origin-side redirects combined with this setting can
   loop. Done on 2026-10-10.
2. P3. Done on 2026-10-10.
3. P5, then P6 in Report-Only, then P6 enforced. Each is one pull request.

### `_headers`

The file lives in `public/`. It is served to nobody; Cloudflare reads it. Two
things have to be tested, not assumed: that the rules also apply to the 404
response, and that `wrangler dev` applies the file the same way production does.

### Checks

A check that `public/_headers` parses and stays within the documented limits is
possible in CI. A check of the live headers after deploy belongs to the
post-deploy smoke test, which is a separate proposal still to be written.

## Completion criteria

- `curl -sI` over `http` returns a redirect to `https` for `www`, the apex, the
  blog and `blog-admin`. Met on 2026-10-10.
- `curl -sI` on `/`, `/about` and an unknown path returns the headers of P5 and
  P6. Met on 2026-10-11, including the 404 response for P5; P6 is enforced
  (see "After enforcement").
- No CSP violation originating from repository content appears in the console of
  Firefox and of Chromium on the seven pages while the policy is in Report-Only.
  The violations that come from Cloudflare are expected and are listed after the
  test. Met on 2026-10-11 (see "Result of the Report-Only test").
- TLS 1.1 and below are refused. Met on 2026-10-10.

## Rollback

- P1, P2, P3: switch the setting back in the dashboard (or restore the rule's
  previous pattern). Immediate.
- P5, P6: `git revert` of the pull request; the pipeline redeploys (RFC 0001,
  Rollback). Removing a header does not need a new deploy order.

## Points for the reviewer, answered

Answered by the reviewer on 2026-10-11 (issue #79). Verification of P1, P2 and
P3 is in `asymptora/infra#32`.

- **Subdomains.** `www`, the apex, `blog` and `blog-admin` (flat). No other
  proxied DNS record. All of them serve HTTPS.
- **The blog under P1.** No loop. The redirect happens at the edge before the
  tunnel, and the proxy in front of Ghost forces `X-Forwarded-Proto: https`
  (blog-service ADR 0003, per the reviewer).
- **TLS 1.0 and 1.1 clients.** Not measured. The rollback is one selector in the
  dashboard.
- **P2.** P1 alone was enough. The apex Redirect Rule (ADR 0003) stays unchanged.
- **P4.** Not wanted for now. Removed from this RFC.

## Result of the Report-Only test

Observed on 2026-10-11, after #86 and #87 were deployed.

- **Headers in production.** `/`, `/about` and an unknown path return
  `x-content-type-options: nosniff` and the `permissions-policy` of P5, and the
  unknown path returns `404`. The documentation does not say whether `_headers`
  applies to the 404 response; in production it does. `wrangler dev` behaved the
  same way.
- **Chromium, seven pages, `wrangler dev`.** Every response carries the
  `Content-Security-Policy-Report-Only` header, and there is no violation and no
  console message. A copy with a `<style>` and a `style=` attribute produced
  `style-src-elem` and `style-src-attr` violations, so the check can fail.
- **Firefox, home page, production.** Before the change below, two violations,
  both from Cloudflare: the script `static.cloudflareinsights.com/beacon.min.js`
  (`script-src-elem`) and the connection to `/cdn-cgi/rum` (`connect-src`). That
  is the Web Analytics beacon.
- **Web Analytics.** The zone setting read "Enable" (automatic injection for
  every visitor). The Cloudflare documentation says automatic setup is enabled by
  default for proxied sites, so nobody is known to have chosen it. The data is
  not used. The author set it to "Disable" in the dashboard on 2026-10-11, after
  which the beacon violations disappeared.
- **Firefox, the seven pages, production, after the change.** Only the notice
  that Firefox prints for any Report-Only policy without `report-uri`
  ("CSP will not block and cannot report violations of this policy"). No
  violation.
- **What Cloudflare injects differs by client.** `curl` received the inline
  script of the JavaScript detections and the hidden link on 2026-10-11, while
  Firefox did not report either. The reason is not established.

## After enforcement

Observed on 2026-10-11, after #90 was deployed.

- `curl -sI https://www.asymptora.com/` returns `content-security-policy` (no
  `-report-only`), `permissions-policy` and `x-content-type-options: nosniff`.
- Firefox, home page: the logo, the font and the dot grid render normally, and
  the console shows one message: the policy blocked an inline script
  (`script-src-elem`). The script is not in the repository. It is most likely
  the JavaScript detections script that Cloudflare injects, but its content was
  not inspected. A hash source cannot allow it: the injected script carries
  values that change per request.
- `/about` and `/nao-existe` render normally.
- So the JavaScript detections do reach at least some browser visitors, and the
  enforced policy stops them from running on `www` pages. This is the
  consequence accepted in "Decision: Cloudflare JavaScript detections stay
  enabled, the CSP is enforced".

## Still open

- The hidden link was attributed to AI Labyrinth by its markup, not by a
  documented URL. Read in the dashboard on 2026-10-11 (Security, Settings, Bot
  traffic): AI Labyrinth (Beta) is on, together with Bot Fight Mode. That
  matches the hidden link. The feature adds `nofollow` links that only bots
  see, so it does not change what a visitor sees and the CSP does not affect
  it. It is a zone-wide setting and stays as it is; changing it is for the
  infra owner.
- `workers_dev` was `false` in `wrangler.jsonc`, but `preview_urls` was `true`.
  Observed on 2026-10-11: the dashboard showed the Preview URL enabled ("Anyone
  with this URL can visit"), and a version address of the form
  `<version>-www.asymptora.workers.dev` answered `200` with the site. The
  setting is changed to `false` in `wrangler.jsonc`. The Wrangler documentation
  says an omitted `preview_urls` leaves the existing setting alone, so an
  explicit value changes it.

## Left to implementation

- Whether `Content-Security-Policy-Report-Only` needs a reporting endpoint. It
  works without one, with violations visible only in the browser console.

## References

- [RFC 0002: Visual identity for www.asymptora.com](0002-visual-identity.md)
- [ADR 0003: Apex redirect via a zone-level Redirect Rule](../architecture/adr/0003-apex-redirect-via-zone-rule.md)
- [ADR 0004: Verify edge configuration via the Cloudflare API](../architecture/adr/0004-edge-verify-via-api.md)
- [ADR 0007: Dark theme only, no JavaScript](../architecture/adr/0007-dark-only-theme-no-javascript.md)
- `asymptora/infra#32`: runbook that enforces HTTPS and the minimum TLS version on the zone, with the evidence of 2026-10-10
- Cloudflare Workers docs: static assets, Headers (`_headers`)
- Cloudflare docs: JavaScript detections; Web Analytics; AI Labyrinth
- Cloudflare SSL/TLS docs: Always Use HTTPS; HTTP Strict Transport Security
- RFC 8996: Deprecating TLS 1.0 and TLS 1.1
