---
title: CNAMEs, TTL, and the Caching Trap
unit: Unit 3
related:
  - 0010-nxdomain-servfail-or-silence
  - reference/dns
  - reference/glossary
---

Two of the most confusing DNS incidents aren't failures at all — the lookup
succeeds, and you *still* hit the wrong box. "We cut over hours ago but traffic
still lands on the old server." "It works on my laptop but `NXDOMAIN`s in the
pod." Both are caching and indirection, not brokenness. This lesson is the two
traps that make DNS feel haunted.

## Names that point at other names

```bash
dig www.example.com
```

```text
;; ANSWER SECTION:
www.example.com.    300   IN  CNAME   lb-prod.example.net.
lb-prod.example.net. 60   IN  A       203.0.113.10
```

:::jargon
CNAME :: An alias: "`www` *is* `lb-prod`, go look **that** up." The chain must be followed to an `A`/`AAAA` before you have an IP. Common in front of load balancers and CDNs.
NS record :: Names the authoritative servers for a zone — "ask these boxes about `example.com`". What `dig NS example.com` shows you, and where `+trace` ends up.
:::

When a name misbehaves, follow the whole chain: a broken `CNAME` target, or a
stale `A` at the *end* of the chain, is the real culprit — not the alias you
started from.

## The caching trap: TTL outlives the change

You changed a record. Why is traffic still going to the old IP?

:::warn{title="Nothing updates until the TTL expires — at every layer"}
An answer with TTL `3600` is cached for an hour by **everything** that saw it:
the recursive resolver, your stub, and — the one people forget — **the app's own
process**. Many runtimes (notably the JVM) cache resolved IPs in-process, some
effectively forever, so a service can keep hammering a decommissioned box long
after DNS itself is correct. To verify DNS *is* right, `dig` the authoritative
server directly (`@` its `NS`); to fix the *app*, you often have to restart it.
Lower the TTL **before** a planned cutover, not during the incident.
:::

## "Works with the IP but not the name"

If `curl https://203.0.113.10/` works but `curl https://api.internal/` fails,
the network, TCP, TLS, and app are all fine — you proved it with the IP. The
*only* thing left is name → IP: a DNS problem, full stop. This one substitution
instantly tells you which half of the ladder to stop looking at.

:::note{title="Split-horizon and the container surprise"}
**Split-horizon:** the same name deliberately resolves to a private IP inside the
network and a public IP outside — so "it resolves differently for you than for
me" can be by design, not a bug. **Containers/K8s:** a pod uses the cluster's DNS
(CoreDNS), not your laptop's, and a `search` suffix with a high `ndots` setting
rewrites short names — which is why a bare name resolves on your machine and
`NXDOMAIN`s in the pod. And `localhost` inside a pod means *the pod itself*, not
your host — a classic self-inflicted "connection refused".
:::

:::quiz
`curl https://203.0.113.10/` succeeds but `curl https://api.internal/` fails.
Where is the problem?

- [x] name resolution, and nothing below it
- [ ] the TLS handshake with the server
- [ ] the application returning an error
:::

:::quiz
You lowered a record's IP an hour ago, but a Java service still hits the old
address. The most likely reason is…

- [x] the app cached the resolved IP in-process
- [ ] the authoritative server was never updated
- [ ] the new address has a firewall blocking it
:::

:::quiz
A bare short name resolves on your laptop but `NXDOMAIN`s from inside a pod. The
usual cause is…

- [ ] the pod has no network connectivity
- [x] a different resolver and search suffix
- [ ] the authoritative server is offline
:::

:::win
The two "haunted DNS" incidents no longer scare you: you follow a `CNAME` chain
to the real record, you know a change is invisible until every TTL (including the
app's own) expires, and "works with the IP, not the name" instantly pins the
fault to resolution.
:::

That completes rung 1. You can read a healthy answer, name the resolver, classify
any failure, and untangle caching and indirection. Suggest running `/author-bank`
for Unit 3 so the drilling layer catches up — then climb to rung 4, HTTP.

:::source
[How to use dig — Julia Evans](https://jvns.ca/blog/2021/12/04/how-to-use-dig/)
for CNAME chains and TTL, and the course
[DNS reference](/courses/networking-backend/reference/dns) for the compressed
version to keep on your desk.
:::
