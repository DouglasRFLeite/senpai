---
title: Handshake and Hang-up — SYN, FIN, RST
unit: Unit 2
related:
  - 0004-whos-listening-sockets-and-ss
  - 0006-the-failure-alphabet
  - reference/glossary
---

You just watched a connection reach `ESTAB`. Three packets got it there, and
one of two packets will eventually end it. Which one is the mechanism behind
every connection failure in the next lesson — so learn the three-and-two now.
No header diagrams; just the packets that matter on call.

## Opening: three packets

TCP opens with a fixed three-step exchange — the **handshake**:

:::ordering
The three-way handshake, in order:

1. Client → server: `SYN` — "let's talk"
2. Server → client: `SYN-ACK` — "sure, let's talk"
3. Client → server: `ACK` — "great, we're talking"
:::

When step 3 lands, both sides show `ESTAB` in `ss`
([HPBN — Building Blocks of TCP](https://hpbn.co/building-blocks-of-tcp/)).

## Closing: the polite way and the rude way

A connection ends in exactly one of two ways:

:::jargon
FIN :: The polite close. Each side says "I'm done" and waits for acknowledgment — a graceful, negotiated hang-up.
RST :: The rude close. One side says "this connection is over, *now*" — no negotiation, no waiting. It means something is wrong, or someone refused.
:::

That single distinction is the payoff of the whole unit:

:::warn{title="RST is a message; silence is not"}
An `RST` is somebody actively saying **no** — the packet reached a live host and
it answered with a refusal. **Silence** — no `SYN-ACK`, nothing coming back — is
a packet that *vanished*: eaten by a firewall, a dead host, or a routing black
hole. "Answered with a no" versus "answered with nothing" is the fork the next
lesson is built on.
:::

## Two states you'll see named

Reading `ss` at closing time you'll meet two states. Just recognize them for
now — the forensics come in Unit 9:

:::jargon
TIME_WAIT :: The side that closed *first* waits a short while before releasing the socket, to absorb any stray late packets. Normal and healthy.
CLOSE_WAIT :: The peer sent `FIN`, but *this* app hasn't closed its end yet. Piles of these usually mean an application bug — a connection someone forgot to close.
:::

:::quiz
A host replies to a connection attempt with an `RST`. What does that prove about it?

- [x] it is alive and actively refused
- [ ] it is unreachable on the network
- [ ] its certificate has already expired
:::

:::quiz
Which close type is the graceful, negotiated hang-up?

- [ ] an `RST` from either side
- [x] a `FIN` from either side
- [ ] a second `SYN` packet
:::

:::quiz
Thousands of `CLOSE_WAIT` sockets are piling up on your service. The likeliest cause is…

- [x] the app is not closing connections
- [ ] the network path is congested now
- [ ] DNS is returning a stale IP
:::

:::win
You can read a connection's whole life — three packets to open, `FIN` or `RST`
to close — and you own the one distinction that decodes connection failures: a
refusal (`RST`) is not the same as a silence.
:::

Next: point that distinction at real `curl -v` output and turn it into the
five-signature failure alphabet.

:::source
[High Performance Browser Networking — "Building Blocks of TCP"](https://hpbn.co/building-blocks-of-tcp/)
by Ilya Grigorik (free online). The handshake and connection lifecycle at
debugging depth — read the handshake section; skip the congestion-control math.
:::
