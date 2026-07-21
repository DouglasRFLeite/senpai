---
title: Glossary
---

Canonical terms for the networking-backend course. In this workspace, a
request always has four **stages** — DNS, TCP, TLS, HTTP — and incidents are
named by the stage (and later, the failure signature) they belong to.

## The four stages

:::jargon
DNS resolution :: Turning a hostname into an IP address via a resolver. Stage ① — nothing else can start until it succeeds. *Avoid:* "lookup issues", "name stuff".
TCP connect :: Opening a connection to an IP and port; healthy sign is curl's "Connected to … port …". Stage ②. *Avoid:* "socket stuff".
TLS handshake :: Negotiating encryption and verifying the server's certificate before any HTTP flows. Stage ③. *Avoid:* "SSL" (legacy protocol name; the handshake is TLS).
HTTP exchange :: The request/response conversation itself — any status code means the exchange happened. Stage ④.
:::

## Triage

:::jargon
Triage ladder :: The fixed question order for "A can't reach B": name resolves? → port reachable? → TLS completes? → app answers? → path sane? Climb in order; a passing rung rules out everything below it.
TTFB (time to first byte) :: The gap between TLS completing and the first response byte — approximately `starttransfer − appconnect` in `curl -w`; mostly server think-time.
:::

## Connections

:::jargon
4-tuple :: The four values that uniquely identify a TCP connection: `(local IP, local port, peer IP, peer port)`. One server port serves many clients because each has a distinct 4-tuple.
Listening socket :: A process parked on a port waiting for connections; shows as `LISTEN` in `ss`. *Avoid:* "open port" (ambiguous — open in a firewall, or actually accepting?).
Ephemeral port :: The client's temporary source port, taken from a high range for one connection's lifetime.
Handshake :: `SYN → SYN-ACK → ACK`, the three packets that open a TCP connection; both sides then read `ESTAB`.
FIN :: The polite, negotiated connection close.
RST :: The abrupt close/refusal — a live host saying "no" or "over, now". *Avoid:* calling every failure a "reset"; only an `RST` is.
TIME_WAIT :: Brief wait by the side that closed first; normal. *Forensics: Unit 9.*
CLOSE_WAIT :: Peer closed, local app hasn't; piles of these signal an app bug. *Forensics: Unit 9.*
:::

## Failure signatures

The course spine — the five things "A can't reach B" reduces to (full sheet:
[Failure Alphabet](/courses/networking-backend/reference/failure-alphabet)).

:::jargon
refused :: `RST` from a closed port (curl exit `7`). Host up, packet arrived, nothing listening. Rules out path/firewall. → `ss -tlnp`.
timeout :: Silent drop, no reply (curl exit `28`). Firewall, routing, or dead host. → host-up and path checks.
reset :: `RST` mid-stream (curl exit `56`). A live connection torn down. → logs/capture (Unit 9).
hang :: Connected, but no reply byte returns. App stuck or reply lost. → `curl -w` TTFB.
resolves-wrong :: Name maps to the wrong IP or none (curl exit `6`). A DNS problem. → `dig` (Unit 3).
:::
