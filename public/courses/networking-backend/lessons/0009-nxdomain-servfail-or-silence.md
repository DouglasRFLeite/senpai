---
title: NXDOMAIN, SERVFAIL, or Silence
unit: Unit 3
related:
  - 0008-which-resolver-answered
  - 0010-cnames-ttl-and-the-caching-trap
  - reference/dns
  - reference/failure-alphabet
---

Back in Unit 2 you learned the most valuable fork on call: **refused** (an `RST`
came back — an *answer*) rules out the network path, while **timeout**
(silence — *no answer*) rules out nothing but "actively refused." DNS has the
exact same fork. A failed lookup is one of three things, and — just like the
alphabet — an *answer* rules things out, while *silence* does not.

## The three ways a lookup fails

```bash
dig no-such-name.example.com     # a name nobody owns
```

```text
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 42
;; ANSWER: 0
```

Read the `status` line — that one word is the whole diagnosis:

:::jargon
`NXDOMAIN` :: **An answer: "that name does not exist."** An authoritative server was reached and said no. This *rules out* a broken resolver and a network problem — the DNS system worked; the name is simply wrong (typo, wrong domain, or not created yet).
`SERVFAIL` :: **An answer: "I tried and couldn't finish."** The resolver reached you but failed upstream — a broken authoritative server, a DNSSEC validation failure, or a dead forwarder. This rules out "the name doesn't exist"; the problem is in the resolution *machinery*.
Silence / timeout :: **No answer at all** — `dig` sits, then prints `no servers could be reached`. The resolver itself is unreachable: wrong resolver IP, firewall on port 53, dead resolver. Rules out nothing about the name.
:::

## Map it onto the alphabet you already know

The shape is identical to Unit 2 — which is the point:

| DNS result | Like the alphabet's… | An answer came back? | Rules out |
|-----------|----------------------|----------------------|-----------|
| **NXDOMAIN** | `refused` | yes — "no such name" | resolver + network; name is wrong |
| **SERVFAIL** | (a mid-path failure) | yes — "couldn't finish" | the name being simply absent |
| **silence** | `timeout` | no | nothing about the name |

:::note{title="An answer rules things out; silence rules nothing out"}
This is the same lesson as `refused` versus `timeout`, wearing DNS clothes. When
a server *answers you* — with an `RST`, with `NXDOMAIN`, with `SERVFAIL` — you
have learned something concrete and can cross suspects off. When you get
**silence**, the only thing you know is that the far side never spoke. Reach for
this fork every single time.
:::

:::warn{title="`NODATA` — the sneaky fourth case"}
`status: NOERROR` but `ANSWER: 0` is neither an error nor a real answer: the name
exists, but has no record *of the type you asked for* (e.g. you asked for `AAAA`
and it only has an `A`). The lookup "worked" and still gave you nothing usable —
don't read `NOERROR` as "resolved".
:::

:::quiz
`dig` returns `status: NXDOMAIN`. Which suspect is now *ruled out*?

- [ ] the name having a simple typo
- [x] the resolver and network path
- [ ] the record having been deleted
:::

:::quiz
`dig` sits for seconds, then prints `no servers could be reached`. What kind of
failure is this?

- [ ] an authoritative "no such name"
- [ ] a resolver that failed upstream
- [x] silence — the resolver is unreachable
:::

:::quiz
Which status means the resolver was reached but *couldn't complete* the lookup?

- [ ] `NXDOMAIN`
- [x] `SERVFAIL`
- [ ] `NOERROR`
:::

:::win
You can take any failed lookup and name it — `NXDOMAIN`, `SERVFAIL`, or silence —
and say what each rules out, the same way you place a connection failure in the
five-letter alphabet. Rung 1 now has its own mini-alphabet.
:::

Drill this in the app once `/author-bank` has built Unit 3 —
*status → what it means → what it rules out* is exactly what the Bank grades, and
it's the same skill you just practiced on connections.

:::source
[How to use dig — Julia Evans](https://jvns.ca/blog/2021/12/04/how-to-use-dig/)
for the status codes, and the course's
[Failure Alphabet](/courses/networking-backend/reference/failure-alphabet) for
the parallel with `refused`/`timeout`.
:::
