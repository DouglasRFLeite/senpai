---
title: 'Unit 2, In Practice: Read a Live Connection'
unit: Unit 2
related:
  - 0004-whos-listening-sockets-and-ss
  - 0005-handshake-and-hangup
  - 0006-the-failure-alphabet
  - reference/failure-alphabet
  - reference/glossary
---

You told me Unit 2 landed only *roughly* — you got the big idea (`FIN` vs `RST`
vs silence) but the terminal felt awkward and the practical part didn't stick.
Fair. That usually means the commands were written for one machine and yours
behaves differently. So this lesson adds **no new concepts** — it re-walks the
three Unit 2 moves with your hands on the keys, on a *real* service, with
commands that match **your** OS. Do it, don't read it.

:::warn{title="Output differs by OS — that was probably the whole problem"}
There is no single "correct" output. Tool names, columns, and even whether a
command exists depend on your OS. `ss` is Linux-only; macOS uses `lsof`. If a
Unit 2 command "didn't work," it likely wasn't your fault — it was Linux-only.
Use the row for your system below, and read output for its **shape**, never for
byte-for-byte match.
:::

## Move 1 — what's listening, what's connected (on something real)

Pick a service you actually run — your app on its dev port, Postgres on 5432,
anything. Then ask the box the two questions that open every connection debug:

| Question | Linux | macOS |
|----------|-------|-------|
| What's **listening**? | `ss -tlnp` | `lsof -nP -iTCP -sTCP:LISTEN` |
| What's **connected**? | `ss -tnp` | `lsof -nP -iTCP -sTCP:ESTABLISHED` |
| fallback (either OS) | `netstat -tlnp` | `netstat -an -p tcp` |

Find your service in the `LISTEN` output, then make a request to it (a `curl`, or
just load it) and re-run the connected view. You'll see the same port on two
lines — the **4-tuple** in action:

:::jargon
LISTEN :: A process parked on a port, waiting. Answers "who *accepts* connections here?"
ESTAB / ESTABLISHED :: A live connection. Answers "who is *connected* right now?"
The 4-tuple :: `(local IP, local port, peer IP, peer port)`. Your service keeps one listening port; each client shows up with a different ephemeral port, so every live connection is a distinct tuple. That's how one port serves thousands at once.
:::

Do this against your own running service now. Seeing *your* process on *your*
port is what turns "sockets" from a word into a thing you can point at.

## Move 2 — the one fork that decodes every failure

This is the bit you rated most important, and the one inline question you missed
in Unit 2 — so we drill it properly. When a connection *doesn't* open, the far
side did exactly one of three things:

:::jargon
Refused (`RST`) :: The host **answered** — with a reset. It's up, the packet arrived, nothing was listening. Because it answered, this **rules out** the network path and the firewall. `curl` exit `7`.
No route / unreachable :: The network **answered** — a router said "can't get there." Also a rung-below-the-app problem, but note it *answered*, so it's closer to refused than to timeout. Often exit `7`, and it fails *fast*.
Timeout (silence) :: **Nothing came back at all.** The packet vanished — a firewall dropping silently, dead host, or bad route. Silence **rules out nothing** except "actively refused." `curl` exit `28`, and it *waits*.
:::

:::note{title="The rule, stated once, cold"}
**An answer rules suspects out; silence rules nothing out.** A reset, a "no
route," any reply is *information* — you cross things off. A timeout is the
absence of information — the only thing you learned is that the far side never
spoke. This is the single most useful reflex on an incident call.
:::

## Practice — make all three happen, on purpose

Run these and name each outcome *before* reading the exit code:

```bash
curl -v http://127.0.0.1:9/            # port 9: almost certainly nothing there
curl -v --connect-timeout 3 http://192.0.2.1/   # 192.0.2.0/24 is a test black hole
```

:::warn{title="If the second one fails instantly instead of hanging — good, notice that"}
Depending on your network, the black-hole address may time out (silence, exit
`28`) *or* come back fast with "No route to host" (the network answered, exit
`7`). **Both are correct** — and telling them apart is the whole skill. Don't
expect a fixed result; read the message and the exit code and name the mechanism.
This is exactly the "didn't work as expected" trap, turned into the lesson.
:::

:::quiz
`curl: (7) ... Connection refused`. Which suspect does that let you cross off?

- [x] the network path and firewall
- [ ] the application being down
- [ ] the destination port number
:::

:::quiz
A connect attempt hangs, then fails with exit `(28)`. What did the far side do?

- [x] it sent nothing back at all
- [ ] it answered with a reset
- [ ] it accepted then closed politely
:::

:::quiz
`curl` fails *instantly* with `No route to host`. This is closer to…

- [x] refused — the network answered you
- [ ] timeout — the network stayed silent
- [ ] a hang — the app never replied
:::

:::ordering
Your reflex for any failed connection — do it in this order:

1. Read the `curl` exit code
2. Name the signature (refused / timeout / reset / hang)
3. State what that rules out
4. Reach for the next tool it points to
:::

:::win
You can point `ss`/`lsof` at a real service and narrate what's listening and
what's connected, and you can take any failed connection and say — cold — which
mechanism it was and what it rules out. That's Unit 2 in your hands, not just in
your head. It's also the muscle every later unit reuses.
:::

When this feels automatic on your own machines, you're ready for rung 1 done
properly: DNS. Next lesson.

:::source
[everything curl — Exit codes](https://everything.curl.dev/cmdline/exitcode.html)
(Daniel Stenberg) for `7`/`28`/`56`, and the course
[Failure Alphabet](/courses/networking-backend/reference/failure-alphabet) for
the one-page mechanism/rules-out map to keep beside you.
:::
