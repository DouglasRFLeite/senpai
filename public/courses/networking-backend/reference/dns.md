---
title: DNS in Anger — dig Cheat Sheet
---

Rung 1 of the [triage ladder](/courses/networking-backend/reference/triage-ladder):
**does the name resolve — from the resolver the app actually uses?** Everything
below is `dig`. Install it once with `sudo apt-get install -y dnsutils`; the
no-install fallback is `getent hosts <name>`.

## The commands you actually run

```bash
dig example.com                 # full answer — read status, ANSWER, SERVER
dig +short example.com          # just the IP(s), for scripts / quick yes-no
dig +short @10.0.0.2 name       # pin a SPECIFIC resolver — the load-bearing move
dig NS example.com              # who is authoritative for the zone
dig +trace example.com          # walk root → TLD → authoritative, bypassing cache
dig AAAA example.com            # ask for IPv6 specifically (A is the default)
cat /etc/resolv.conf            # which resolver + search domain you use by default
getent hosts example.com        # no dig? the resolver path your APPS use (glibc)
```

## Reading the answer — the four parts

| Part | Where | What it tells you |
|------|-------|-------------------|
| `status:` | HEADER line | `NOERROR` = worked · `NXDOMAIN` = no such name · `SERVFAIL` = couldn't finish |
| ANSWER SECTION | middle | what the name maps to; `ANSWER: 0` = nothing came back |
| TTL | number in the answer row | seconds the answer may be cached, at every layer |
| `SERVER:` | near the bottom | **which resolver answered** — never claim "DNS is fine" without it |

## The failure mini-alphabet (rung 1's version of the [Failure Alphabet](/courses/networking-backend/reference/failure-alphabet))

| Result | Meaning | An answer came back? | Rules out | Like… |
|--------|---------|----------------------|-----------|-------|
| `NXDOMAIN` | authoritative "no such name" | yes | resolver + network; name is wrong | `refused` |
| `SERVFAIL` | resolver reached, failed upstream | yes | the name being simply absent | — |
| `NODATA` (`NOERROR`/`ANSWER: 0`) | name exists, not that record type | yes | wrong record type, not wrong name | — |
| silence (`no servers could be reached`) | resolver unreachable | no | nothing about the name | `timeout` |

**The rule:** an *answer* (NXDOMAIN/SERVFAIL) rules suspects out; *silence* rules
nothing out.

## Records at working depth

:::jargon
A / AAAA :: Name → IPv4 (`A`) or IPv6 (`AAAA`) address. The end of any resolution.
CNAME :: Alias — "this name *is* that name, look that up instead". Follow the chain to an `A`/`AAAA`.
NS :: The authoritative servers for a zone. Where `+trace` finishes.
TXT / SRV :: `TXT` = free-form text (SPF, verification). `SRV` = service location (host+port). Know they exist.
:::

## The traps

- **TTL outlives the change.** A record is cached until its TTL expires — at the
  recursive resolver, the stub, **and inside the app process** (the JVM is
  notorious). Lower TTLs *before* a cutover; restart the app to clear its cache.
- **"Works with the IP, not the name"** = a pure DNS problem; everything below
  rung 1 is proven healthy.
- **Search domains** silently append a suffix to short names — the reason a bare
  name works in one place and `NXDOMAIN`s in another. Use the FQDN with a
  trailing dot (`name.`) to bypass it.
- **Split-horizon** = same name, different answer inside vs outside, on purpose.
- **Pods** use cluster DNS (CoreDNS) with their own search/`ndots`, and
  `localhost` means the pod itself.

_Taught in Unit 3 (lessons
[0008](/courses/networking-backend/lessons/0008-read-a-dig-answer)–[0011](/courses/networking-backend/lessons/0011-cnames-ttl-and-the-caching-trap))._
