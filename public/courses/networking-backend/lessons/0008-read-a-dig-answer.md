---
title: Read a `dig` Answer
unit: Unit 3
related:
  - 0009-which-resolver-answered
  - reference/dns
  - reference/triage-ladder
---

Rung 1 of the ladder asks "does the name resolve?" — and `dig` is the tool that
answers it. But `dig` prints a wall of text, and only four parts of it matter on
call. Learn to read those four, and you can read any answer `dig` ever gives
you. First, make sure the tool is even there:

:::warn{title="`dig` output varies by OS — read the shape, not the exact bytes"}
Your output will differ from what's printed here (different IP, TTL, resolver,
spacing) and that's fine — you're reading for *structure*. If `dig` isn't found:
Debian/Ubuntu `sudo apt-get install -y dnsutils`, RHEL/Fedora
`sudo dnf install bind-utils`, macOS usually ships it (else `brew install bind`).
No `dig` at all? Use the OS fallback in the last note — every OS has one.
:::

```bash
dig example.com
```

```text
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 12345
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; QUESTION SECTION:
;example.com.            IN  A

;; ANSWER SECTION:
example.com.        3600    IN  A   93.184.216.34

;; Query time: 24 msec
;; SERVER: 8.8.8.8#53(8.8.8.8) (UDP)
```

Four things, top to bottom, and nothing else matters yet:

:::jargon
`status: NOERROR` :: The query succeeded. This is the DNS equivalent of a green light — the name was looked up and an answer came back.
ANSWER SECTION :: What the name maps to. Here `example.com` → the `A` record `93.184.216.34`. No answer section, or `ANSWER: 0`, means nothing resolved.
`3600` (the TTL) :: How many seconds this answer may be cached before it must be looked up again. A big number means "you'll keep seeing this even after it changes."
`SERVER: 8.8.8.8#53` :: **Which resolver gave you this answer.** The most-skipped line and the most important — the next lesson is built on it.
:::

:::note{title="The one-liner for scripts and quick checks"}
`dig +short example.com` strips everything but the answer — just `93.184.216.34`
on a line. Great for "does it resolve, yes or no". But when something is *wrong*,
run the full `dig`: the `status` and `SERVER` lines are where the diagnosis
lives, and `+short` throws them away.
:::

:::note{title="No `dig`? Use your OS's app-path lookup"}
On Linux, `getent hosts example.com` resolves the name exactly the way your
*applications* do (glibc) — built in, nothing to install. On macOS the
equivalent is `dscacheutil -q host -a name example.com`. Both print just the
IP(s): they answer "does it resolve for my app?" but not "who answered?" or
"what's the TTL?" — a fallback, not a replacement for `dig`.
:::

:::quiz
A `dig` result shows `status: NOERROR` but `ANSWER: 0` and an empty answer
section. What has it proven?

- [ ] the name resolved to a valid address
- [x] the lookup worked but returned nothing
- [ ] the resolver could not be reached
:::

:::quiz
Which line tells you *which resolver* actually produced the answer you're reading?

- [ ] the `QUESTION SECTION` line
- [ ] the `status: NOERROR` header
- [x] the `SERVER:` line near the bottom
:::

:::quiz
A record's TTL is `3600`. What does that number govern?

- [ ] how long the query itself took
- [x] how long the answer may be cached
- [ ] how many resolvers were contacted
:::

:::win
Given any `dig` output you can now read the four load-bearing parts: did it
succeed, what did it map to, how long is it cached, and who answered. That is
rung 1 of the ladder, in one command.
:::

Run it now against a name you actually care about at work. Next: that `SERVER:`
line — why "DNS is fine" is a meaningless sentence until you name the resolver.

:::source
[How to use dig — Julia Evans](https://jvns.ca/blog/2021/12/04/how-to-use-dig/).
Practitioner-grade, one screen long; the "reading the output" section maps
exactly onto the four parts above.
:::
