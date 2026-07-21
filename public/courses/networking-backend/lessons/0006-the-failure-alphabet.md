---
title: The Failure Alphabet
unit: Unit 2
related:
  - 0005-handshake-and-hangup
  - reference/failure-alphabet
  - reference/triage-ladder
---

Almost every "A can't reach B" ticket is one of **five** failure signatures.
Name the signature and you've named the mechanism, the usual culprit, what it
*rules out*, and which tool to reach for next. This is the alphabet the rest of
the course is written in — learn it cold.

## The two you'll meet most: refused vs timeout

Both mean "curl couldn't connect." Underneath they are opposites. Run them:

```bash
curl -v http://127.0.0.1:9999/          # nothing is listening there
```

```text
*   Trying 127.0.0.1:9999...
* connect to 127.0.0.1 port 9999 failed: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 9999
```

```bash
curl -v --connect-timeout 3 http://10.255.255.1/   # a black hole
```

```text
*   Trying 10.255.255.1:80...
* ipv4 connect timeout after 3000ms, move on!
curl: (28) Failed to connect to 10.255.255.1 port 80
```

Same goal, two different worlds — and you already know why from the last lesson:

:::jargon
refused — exit `(7)` :: An `RST` came back. The host is **up**, the packet **arrived**, nothing is **listening**. This rules out the network path and the firewall. Culprit: service down, or wrong port. Next: `ss -tlnp` on the target.
timeout — exit `(28)` :: **Silence** — no reply at all. The packet was dropped: firewall, routing, or a dead host. This rules out "actively refused". Next: is the host even up? is a firewall dropping it?
:::

:::note{title="The single most valuable fork on call"}
"Connection refused" and "connection timed out" look equally red in a log, but
they route to *different teams*. Refused = something's wrong with the **app or
its port**. Timeout = something's wrong with the **path or the firewall**. The
`RST`-versus-silence distinction from the last lesson is what tells them apart.
:::

## The full alphabet

| Signature | Mechanism | Usual culprit | Next tool |
|-----------|-----------|---------------|-----------|
| **refused** | `RST` from a closed port | service down / wrong port | `ss -tlnp` |
| **timeout** | packet silently dropped | firewall, routing, dead host | is the host up? path? |
| **reset** | `RST` *mid-stream* | idle timeout, crash, proxy | logs, capture *(Unit 9)* |
| **hang** | connected, no reply comes | app stuck, or reply lost | `curl -w` TTFB *(Unit 1)* |
| **resolves-wrong** | name → wrong IP / no IP | DNS record, resolver, cache | `dig` *(Unit 3)* |

The `curl` exit code names three of these on sight:

:::jargon
`curl: (6)` :: Couldn't resolve host — **resolves-wrong** (a DNS problem, deep-dived in Unit 3).
`curl: (7)` :: Couldn't connect — **refused** (an `RST` came back from a closed port).
`curl: (28)` :: Timed out — **timeout** (silence; the packet was dropped on the way).
:::

:::quiz
`curl: (7) ... Connection refused`. Which suspect is now *ruled out*?

- [x] the firewall and network path
- [ ] the application being down
- [ ] the port number being wrong
:::

:::quiz
A `curl` sat for 30s, then failed with exit `(28)`. What happened on the wire?

- [x] the packet got no reply at all
- [ ] the server sent back an `RST`
- [ ] the TLS handshake was refused
:::

:::quiz
A connection was healthy, then died mid-download with an `RST`. Which signature is it?

- [ ] refused
- [ ] timeout
- [x] reset
:::

:::quiz
Which signature sends you straight to `dig` instead of `curl` or `ss`?

- [ ] hang
- [ ] reset
- [x] resolves-wrong
:::

:::win
Take any failed connection — an exit code, a `curl -v` line, a symptom in a
ticket — and you can place it in the five-letter alphabet: mechanism, what's
ruled out, next tool. Every later unit is a deep-dive on one of these letters.
:::

Keep it on your desk: [Failure Alphabet reference](/courses/networking-backend/reference/failure-alphabet).
Then drill it in the app once `/author-bank` has built Unit 2's questions —
*symptom → mechanism → rules-out → next tool* is exactly what the Bank grades.

:::source
[everything curl — Exit codes](https://everything.curl.dev/cmdline/exitcode.html)
by Daniel Stenberg. The authoritative list; `6`, `7`, `28`, `35`, and `56` are
the ones you'll read on call.
:::
