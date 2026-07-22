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
That wasn't you: two of those exercises were simply **broken** — one asked you to
watch a connection that closes faster than you can look, the other waited for a
timeout that an unroutable address can never produce. This lesson fixes both and
adds **no new concepts** — it re-walks the three Unit 2 moves, hands on the keys,
against a *real* service, in a way that actually works. Do it, don't read it.

:::warn{title="Read output for its shape, not byte-for-byte"}
Your exact output — IPs, ports, columns, spacing — will differ from what's
printed here, and that's fine; you're reading for *structure*, not an exact
match. (Tools differ across systems too: `ss` is Linux/WSL — yours — while macOS
uses `lsof`; both are in the table below.)
:::

## Move 1 — what's listening, what's connected (on something real)

Pick a service you actually run — your app on its dev port, Postgres on 5432,
anything. Then ask the box the two questions that open every connection debug:

| Question | Linux | macOS |
|----------|-------|-------|
| What's **listening**? | `ss -tlnp` | `lsof -nP -iTCP -sTCP:LISTEN` |
| What's **connected**? | `ss -tnp` | `lsof -nP -iTCP -sTCP:ESTABLISHED` |
| fallback (either OS) | `netstat -tlnp` | `netstat -an -p tcp` |

Find your service in the `LISTEN` output. Now catch a *live* connection — and
here's the trap that bit you in Unit 2: a normal request finishes in under a
millisecond, so `curl … &` then `ss` shows **nothing**, because the connection
already closed. So hold one open by hand (bash opens a raw TCP socket on a file
descriptor and sits on it):

```bash
exec 3<>/dev/tcp/127.0.0.1/<PORT>   # open a connection and HOLD it
ss -tnp | grep <PORT>               # now the live connection is there to see
exec 3>&-                           # release it when you're done looking
```

You'll see `<PORT>` on two lines — same port, two directions — the **4-tuple**
in action:

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

## Practice — produce each signature on purpose (this is where Unit 2 broke)

**refused** — the easy one. Point `curl` at a local port with nothing on it
(confirm it's free with `ss -tlnp` first):

```bash
curl -v http://127.0.0.1:9999/
# → curl: (7) Failed to connect ... Connection refused    (an RST came back)
```

**unreachable** — this is what you actually saw with the "black hole", and it
was *correct*. An address with no route answers **fast**, because your own kernel
says "I can't get there":

```bash
curl -v --connect-timeout 3 http://192.0.2.1/
# → curl: (7) ... Network is unreachable / No route to host    (in a few ms)
```

:::warn{title="Exit 7 is not one thing — read the message, not the number"}
Both commands above give exit `7`. Exit `7` does **not** mean "refused"; it means
"the connection didn't open", and the *message* says which flavour: `Connection
refused` (an RST — host up, port closed) versus `Network is unreachable` /
`No route to host` (the network answered that it can't route there). That's why
your black-hole test returned in 5 ms with exit 7 instead of hanging — an
unroutable address **can't** give you silence, so it can't give you a timeout.
Nothing was broken; the exercise was.
:::

**timeout** — the one you *can't* fake with a bad address, because a timeout is
**silence**, and silence means a packet was *dropped* — your own kernel won't
silently drop its outbound packets, it errors fast. To see a real timeout
locally you install the drop yourself with a firewall rule (fully reversible):

```bash
python3 -m http.server 8080 &                         # a real listener
sudo iptables -I OUTPUT -p tcp --dport 8080 -j DROP   # eat the SYNs silently
curl -v --connect-timeout 3 http://127.0.0.1:8080/    # now it HANGS, then (28)
sudo iptables -D OUTPUT -p tcp --dport 8080 -j DROP   # undo it
kill %1
```

:::note{title="This is the whole point, not a party trick"}
You just made the course's central fork happen with your own hands: same
destination, but a **DROP** rule (silence → `timeout`, exit 28) versus a **closed
port** (an RST → `refused`, exit 7). "Timeout ⇒ something is *dropping* packets —
a firewall, a routing black hole, a dead host" is now something you *produced*,
not a claim on a page. (WSL2 runs a real kernel, so `iptables` works; if it
errors, try `sudo iptables-legacy`.)
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
