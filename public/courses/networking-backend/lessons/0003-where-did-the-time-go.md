---
title: Where Did the Time Go?
unit: Unit 1
related:
  - 0002-the-triage-ladder
  - reference/triage-ladder
---

"It's slow" is the vaguest ticket in existence. But you already know the four
stages every request walks through — so "slow" just means one of them is
eating the time. `curl -w` prints the stopwatch.

Run this (it's in your dev container; `-o /dev/null -s` hides the body):

```bash
curl -o /dev/null -s -w '
namelookup:    %{time_namelookup}s
connect:       %{time_connect}s
appconnect:    %{time_appconnect}s
starttransfer: %{time_starttransfer}s
total:         %{time_total}s
' https://example.com/
```

Typical output:

```text
namelookup:    0.012s
connect:       0.145s
appconnect:    0.289s
starttransfer: 0.433s
total:         0.434s
```

## The stopwatch is cumulative

Each number is time since the start — so each *stage's* cost is the gap
between neighbors ([Cloudflare — A Question of Timing](https://blog.cloudflare.com/a-question-of-timing/)):

:::jargon
`time_namelookup` :: DNS done — stage ① cost, straight up.
`time_connect` :: TCP connected — stage ② cost is `connect − namelookup`.
`time_appconnect` :: TLS done — stage ③ cost is `appconnect − connect`.
`time_starttransfer` :: First response byte arrived — the gap after `appconnect` is mostly the **server thinking**.
`time_total` :: Last byte arrived — the rest is transfer.
:::

:::note{title="The gap that matters most"}
`starttransfer − appconnect` is (roughly) *time to first byte*: the network is
done, and you're waiting for the application. A big gap here means the
slowness is in service B's code or its dependencies — not in DNS, not in the
network. That one subtraction routes the ticket to the right team.
:::

:::quiz
Which timer stops the moment the TLS handshake completes?

- [ ] `time_connect`
- [x] `time_appconnect`
- [ ] `time_starttransfer`
:::

:::quiz
namelookup: 0.010s, connect: 0.030s, appconnect: 0.070s,
starttransfer: 4.8s. Where did the time go?

- [ ] the TLS handshake
- [x] the server thinking
- [ ] the DNS resolution
:::

:::win
You can now split "it's slow" into DNS / connect / TLS / server / transfer
with one command — before anyone opens a dashboard. This map deepens into a
full latency-forensics skill in Unit 9.
:::

Try it on two sites now — one nearby, one overseas — and see which gaps grow.
That difference is round-trip time, and it becomes a main character later.

:::source
[Cloudflare — "A Question of Timing"](https://blog.cloudflare.com/a-question-of-timing/)
— the canonical walkthrough of `curl -w` timers and what each phase contains.
:::
