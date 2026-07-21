---
title: Which Resolver Answered?
unit: Unit 3
related:
  - 0008-read-a-dig-answer
  - 0010-nxdomain-servfail-or-silence
  - reference/dns
---

"DNS is fine, I checked" is one of the most expensive sentences on an incident
call — because the person who said it checked *a* resolver, and the failing app
uses *a different one*. A name does not have one answer; it has one answer **per
resolver**. So rung 1 isn't "does it resolve?" — it's "does it resolve *from the
resolver the app uses*?"

## Pin the resolver with `@`

`dig` uses your default resolver unless you tell it otherwise. Name it explicitly
with `@` and compare:

```bash
dig +short @8.8.8.8 api.internal      # a public resolver
dig +short @10.0.0.2  api.internal    # your VPC / corporate resolver
```

An internal name will resolve from `10.0.0.2` and return **nothing** from
`8.8.8.8` — because a public resolver has never heard of your private zone. Same
name, two truths. The `SERVER:` line from the last lesson is how you prove which
one you actually asked.

## Where your default comes from

When you *don't* say `@`, the resolver is chosen for you:

:::jargon
`/etc/resolv.conf` :: The file listing your default `nameserver` IPs. `cat` it to see who your box asks by default — the answer to "what does `dig` use when I omit `@`?".
Stub resolver :: The local client (in your libc, or `systemd-resolved`) that reads `resolv.conf` and forwards the query. Often `127.0.0.53` on modern distros.
Recursive resolver :: The server that does the legwork — walking from the root down to the authoritative server and caching the result. This is the `8.8.8.8` or `10.0.0.2` in your config.
Authoritative server :: The server that actually *owns* the zone and gives the original answer. Everyone else is quoting it from cache.
:::

## Watch the whole walk with `+trace`

To see a name resolved from the root down — stub asks recursive, recursive asks
root, then the `.com` servers, then the zone's authoritative server — bypass the
cache and trace it:

```bash
dig +trace example.com
```

Each block is one hop closer to the authoritative answer. You rarely need this on
call, but running it once makes "recursive vs authoritative" stop being words.

:::warn{title="Search domains: the silent suffix"}
`resolv.conf` may also list a `search` domain (e.g. `search corp.example.com`).
Then `dig web` might quietly become `dig web.corp.example.com`. This is why a
bare short name works in one environment and `NXDOMAIN`s in another — the search
suffix differs. When a short name behaves oddly, try the fully-qualified name
(with a trailing dot: `dig web.corp.example.com.`) to take search domains out of
the picture.
:::

:::quiz
An internal name resolves fine with `@10.0.0.2` but returns nothing with
`@8.8.8.8`. What is the most likely explanation?

- [x] the public resolver has no private zone
- [ ] the internal resolver is currently down
- [ ] the name has an expired TLS certificate
:::

:::quiz
You run `dig name` with no `@`. Which file decided which resolver was used?

- [ ] `/etc/hosts` on the local box
- [x] `/etc/resolv.conf` on the local box
- [ ] the authoritative zone file
:::

:::quiz
Which server holds the *original* answer for a zone, that every cache is quoting?

- [ ] the local stub resolver
- [ ] the recursive resolver
- [x] the authoritative server
:::

:::win
You never again say "DNS is fine" without naming the resolver you asked. You can
pin any resolver with `@`, read your default out of `resolv.conf`, and explain
the path a name takes from stub to authoritative.
:::

Next: when a lookup *doesn't* work, `dig` tells you which kind of "no" it is —
and, exactly like `refused` versus `timeout`, each kind rules different things
out.

:::source
[How to use dig — Julia Evans](https://jvns.ca/blog/2021/12/04/how-to-use-dig/)
(the `@` and `+trace` sections), backed by your own `cat /etc/resolv.conf`.
:::
