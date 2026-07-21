---
title: The Failure Alphabet
---

The five signatures every "A can't reach B" failure reduces to. Name the
signature → you have the mechanism, what it rules out, and the next tool. This
is the course spine; every later unit deep-dives one row.

## The five signatures

| Signature | curl exit | Mechanism | Rules out | Usual culprit | Next tool |
|-----------|-----------|-----------|-----------|---------------|-----------|
| refused | `7` | `RST` from a closed port — host up, packet arrived, nothing listening | network path, firewall | service down, wrong port | `ss -tlnp` on target |
| timeout | `28` | packet silently dropped, no reply | "actively refused" | firewall, routing, dead host | host-up check, path |
| reset | `56` | `RST` mid-stream — a live connection torn down | "app never connected" | idle timeout, crash, proxy | logs, capture *(Unit 9)* |
| hang | — | connected, no response byte returns | DNS, connect, TLS (all passed) | app stuck, reply lost | `curl -w` TTFB *(Unit 1)* |
| resolves-wrong | `6` | name maps to wrong IP or none | everything above resolution | DNS record, resolver, stale cache | `dig` *(Unit 3)* |

## The core distinction

**`RST` is a message; silence is not.**

- An `RST` (refused, reset) means a live host answered with a refusal — the
  packet arrived.
- Silence (timeout) means the packet vanished — dropped by a firewall, lost in
  routing, or swallowed by a dead host.

That one fork routes the ticket: refused/reset → **app or port**; timeout →
**path or firewall**.

## Reading `ss` (the refused follow-up)

```bash
ss -tlnp     # TCP, listening, numeric, process → who is accepting connections?
ss -tnp      # drop the l → who is connected right now?
```

- A `LISTEN` line present → a process owns the port. Absent → *nothing
  listening* (this is what "refused" proves).
- An `ESTAB` line → a live 4-tuple `(local IP:port ↔ peer IP:port)`; the high
  peer port is the client's ephemeral port.

## Closing states (named; forensics in Unit 9)

- **TIME_WAIT** — the side that closed first, briefly waiting out stray packets. Normal.
- **CLOSE_WAIT** — peer sent `FIN`, local app hasn't closed. Piles of these = an app bug.

_Taught in Unit 2 (lessons
[0004](/courses/networking-backend/lessons/0004-whos-listening-sockets-and-ss),
[0005](/courses/networking-backend/lessons/0005-handshake-and-hangup),
[0006](/courses/networking-backend/lessons/0006-the-failure-alphabet)).
Each row deepens into its own unit._
