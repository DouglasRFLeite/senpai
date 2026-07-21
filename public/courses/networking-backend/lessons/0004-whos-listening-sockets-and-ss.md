---
title: Who's Listening? Sockets and `ss`
unit: Unit 2
related:
  - 0005-handshake-and-hangup
  - reference/glossary
---

Rung 2 of the ladder asks "is the port reachable?" — but before you debug a
connection you need to *see* the connections a box already has. One command
shows them all: `ss`. Start a server and look.

```bash
python3 -m http.server 8000 &      # a listener on port 8000
ss -tlnp                            # t=TCP  l=listening  n=numeric  p=process
```

```text
State   Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process
LISTEN  0       128           0.0.0.0:8000       0.0.0.0:*      users:(("python3",pid=812,fd=3))
```

That one line is a **listening socket**: a process (`python3`) parked on a port
(`8000`), waiting. `0.0.0.0` means "on every interface"; `Peer` is `*` because
nobody has connected yet.

## The 4-tuple

A `curl` to a local server is over in well under a millisecond — far too fast to
catch with `ss` (run `curl … &` then `ss` and you'll see *nothing*, because the
connection already closed). So **hold one open by hand**: bash can open a raw TCP
socket on a file descriptor and just sit on it.

```bash
exec 3<>/dev/tcp/127.0.0.1/8000    # open a connection on fd 3 and HOLD it
ss -tnp | grep 8000                # now it's alive and there to see
```

```text
State  Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process
ESTAB  0       0         127.0.0.1:8000      127.0.0.1:51834   users:(("python3",...))
ESTAB  0       0         127.0.0.1:51834     127.0.0.1:8000    users:(("bash",...))
```

Release it with `exec 3>&-` when you're done looking.

Every TCP connection is identified by exactly four values — the **4-tuple**:

:::jargon
Local Address:Port :: your side of the connection.
Peer Address:Port :: the other side of the connection.
The tuple :: `(local IP, local port, peer IP, peer port)` — unique for every connection on the box.
:::

This is why one server port serves thousands of clients at once: the server
side is always `:8000`, but each client arrives with a different `(IP, port)`,
so every 4-tuple is distinct. That client-side port (`51834`) is an **ephemeral
port** — grabbed from a high range for the life of one connection.

:::note{title="LISTEN vs ESTAB is the whole read"}
`ss -tlnp` answers "**who is accepting** connections here?" `ss -tnp` answers
"**who is connected** right now?" Ninety percent of `ss` on call is one of
those two questions.
:::

:::note{title="If `ss` isn't there"}
`ss` ships in the `iproute2` package. Missing on a stripped-down box? Install
it (`sudo apt-get install -y iproute2`), or fall back to `netstat -tlnp` — same
idea, older tool.
:::

:::quiz
`ss -tlnp` shows no line for port 8000. What have you just proven?

- [x] nothing is listening on that port
- [ ] a firewall is dropping the packets
- [ ] the TLS certificate has expired
:::

:::quiz
In an `ESTAB` line, which field holds the ephemeral (client-chosen) port?

- [ ] the port the listener was started on
- [x] the high-numbered port on the client side
- [ ] the local port, which is always 8000
:::

:::quiz
Which invocation shows only sockets that are *waiting for* new connections?

- [ ] `ss -tnp`
- [x] `ss -tlnp`
- [ ] `ss -tan`
:::

:::win
You can point `ss` at any box and answer the two questions that open every
connection debug: what's listening, and what's connected. That's rung 2's home
tool — and it's the first thing to run when a connection is *refused*.
:::

Do it now: run the two commands above, then `kill %1` to stop the server. Next
we open the connection you just watched — three packets in, one of two ways
out.

:::source
[_Networking! ACK!_ — Julia Evans](https://wizardzines.com/zines/networking/)
(paid zine, one page per tool). Its `ss`/`netstat` page is the friendliest map
of exactly this output.
:::
