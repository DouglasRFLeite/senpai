---
title: The Triage Ladder
unit: Unit 1
related:
  - 0001-one-request-end-to-end
  - 0003-where-did-the-time-go
  - reference/triage-ladder
---

The ticket says: **"service A can't reach service B."** The worst response is
to guess. The best response is a fixed sequence of questions, asked in order,
each answered by one tool. That sequence is the triage ladder, and it's the
skeleton of this whole course.

The [four stages](/courses/networking-backend/lessons/0001-one-request-end-to-end)
become five questions — each one only worth asking if the previous rung passed:

| # | Question | Tool | Healthy answer |
|---|----------|------|----------------|
| 1 | Does the name resolve? | `dig` | An IP address comes back |
| 2 | Is the port reachable? | `curl -v` / `nc` | "Connected to … port …" |
| 3 | Does TLS complete? | `openssl s_client` | "Verify return code: 0 (ok)" |
| 4 | Does the app answer? | `curl -v` | An HTTP status code — any code |
| 5 | Is the path sane? | `mtr` / `traceroute` | Hops reach the destination |

:::note{title="You own the skeleton, not the rungs — yet"}
Right now you only need to know the *order* and which tool owns each rung.
Each rung becomes its own deep unit later: DNS (Unit 3), connections (Unit 2),
TLS (Unit 7), HTTP (Unit 4), the path (Unit 10). Rung 5 is last on purpose —
it's the rarest culprit and the slowest to check.
:::

Two rules make the ladder powerful:

- **Climb in order.** "Is TLS broken?" is meaningless if the name doesn't
  even resolve. Every rung assumes the ones below it passed.
- **A passing rung rules things out.** If `curl -v` says "Connected", the
  network path, firewall, and listener are all fine — whatever is wrong lives
  *above* rung 2. Elimination is the diagnosis.

:::warn{title="Any status code is a rung-4 pass"}
A `500` from service B means A *can* reach B — the network did its job and the
app is broken. That distinction ("network problem" vs "app problem") is the
single most common triage fork, and the ladder answers it at rung 4.
:::

:::ordering
Climb the ladder — click the questions in triage order:

1. Does the name resolve to an IP?
2. Is the port accepting connections?
3. Does the TLS handshake complete?
4. Does the app return a status code?
5. Is the network path itself sane?
:::

:::quiz
`curl -v` shows "Connected to b.internal (10.0.4.12) port 443" then hangs on
"TLS handshake". Which rungs have PASSED?

- [x] rungs 1 and 2
- [ ] rungs 1, 2, 3
- [ ] rungs 2 and 3
:::

:::quiz
Which tool owns rung 1 of the ladder?

- [ ] `mtr`
- [x] `dig`
- [ ] `nc`
:::

:::quiz
Service B returns `HTTP/1.1 503 Service Unavailable`. What kind of problem is
this, per the ladder?

- [ ] a network problem
- [x] an application problem
- [ ] a resolution problem
:::

:::win
You now have the exact sequence senior engineers run in their heads during an
incident. Everything from here on is learning to read what each rung's tool
tells you.
:::

Keep the printable version handy: [Triage Ladder reference](/courses/networking-backend/reference/triage-ladder).

:::source
[_Networking! ACK!_ — Julia Evans](https://wizardzines.com/zines/networking/)
(paid zine, one page per tool: dig, nc, curl, tcpdump). The friendliest
tool-per-question map of this exact ladder.
:::
