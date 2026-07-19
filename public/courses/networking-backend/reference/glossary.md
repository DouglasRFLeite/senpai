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
