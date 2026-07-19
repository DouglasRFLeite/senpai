---
title: The Triage Ladder
---

The fixed question sequence for **"service A can't reach service B"**. Climb
in order; every rung assumes the ones below it passed; a passing rung *rules
out* everything below it.

## The ladder

| # | Question | Tool | Healthy sign | If it fails, suspect… |
|---|----------|------|--------------|-----------------------|
| 1 | Does the name resolve? | `dig <name>` | ANSWER section has an IP | DNS: resolver, record, TTL *(Unit 3)* |
| 2 | Is the port reachable? | `curl -v` / `nc <host> <port>` | "Connected to … port …" | listener down, firewall, routing *(Units 2, 10)* |
| 3 | Does TLS complete? | `openssl s_client -connect host:443 -servername host` | "Verify return code: 0 (ok)" | certs, chain, SNI, trust store *(Unit 7)* |
| 4 | Does the app answer? | `curl -v https://…` | Any HTTP status code | the application, not the network *(Units 4, 5)* |
| 5 | Is the path sane? | `mtr <host>` / `traceroute` | Hops reach the destination | MTU, NAT, middleboxes *(Units 10, 11)* |

## Reading rules

- **Any status code passes rung 4.** A `500` means the network delivered the
  request fine — route the ticket to the app team, not the network team.
- **"Connected" at rung 2 clears the path.** Firewall, routing, and listener
  are all fine; the problem lives above.
- **Rung 5 last.** It's the rarest culprit and the slowest to check.

## The stopwatch (when the ticket is "it's slow")

```bash
curl -o /dev/null -s -w 'namelookup: %{time_namelookup}s
connect: %{time_connect}s
appconnect: %{time_appconnect}s
starttransfer: %{time_starttransfer}s
total: %{time_total}s
' https://<host>/
```

Timers are cumulative — a stage's cost is the gap between neighbors:

| Gap | Stage billed |
|-----|--------------|
| `namelookup` | DNS |
| `connect − namelookup` | TCP connect |
| `appconnect − connect` | TLS handshake |
| `starttransfer − appconnect` | server think-time (≈ TTFB) |
| `total − starttransfer` | body transfer |

_This sheet grows as the course fills in each rung. Taught in Unit 1
(lessons [0002](/courses/networking-backend/lessons/0002-the-triage-ladder),
[0003](/courses/networking-backend/lessons/0003-where-did-the-time-go))._
