# Unit 2 didn't stick; the cause was environment mismatch, not missing tools

Douglas's Unit 2 report (2026-07-21): he "did not learn much" from Unit 2. He
retained the headline concept (`FIN`/`RST`/silence) but got little *practical*
experience because **"the tools did not work as expected on the terminal. It
was overall a bit awkward."** One missed inline question: Failure Alphabet Q1 —
the "what does `refused` rule out?" logic (2 wrong).

## Correction to my first read (important)

I diagnosed this **twice wrong** before getting it. First I blamed missing
container tools (`Dockerfile.dev` omits `dnsutils`/`iproute2`/`tcpdump`/`nc`) —
but Douglas doesn't run commands in the container. Then I blamed OS mismatch —
but he's on **Linux/WSL**, the same environment the lessons assume. Both wrong.

The real cause was **two broken exercises**, environment-independent:
1. **Observability race (lesson 0004).** It told him to run `curl … &` then
   `ss -tnp` to see the `ESTAB` 4-tuple. A localhost `curl` completes in well
   under a millisecond, so the connection is already gone — `ss` showed nothing.
   Fix: hold a connection open by hand with bash's `/dev/tcp`
   (`exec 3<>/dev/tcp/127.0.0.1/PORT`), then `ss` reliably shows it. Verified.
2. **Un-producible timeout (lesson 0006 / alphabet).** The black-hole address
   was supposed to demonstrate a silent `timeout` (exit 28). But an unroutable
   address makes the kernel answer `Network is unreachable` fast (exit **7**),
   never silence — so a real timeout is impossible to produce that way locally.
   He saw exit 7 in ~5 ms, "regardless of `--connect-timeout`", and reasonably
   read it as the exercise failing. Fix: teach that exit 7 covers refused *and*
   unreachable (read the message, not the number), and produce a **real** timeout
   with a reversible `iptables -j DROP` rule on a port (silence → exit 28) — WSL2
   has a real kernel, so this works.

The Dockerfile change stays (a real latent gap for container users), but it was
never Douglas's problem and is not described as the fix.

## What actually needs to change (durable)

- **Verify every run-it-yourself exercise actually reproduces.** The deeper
  lesson: it is not enough that the *tool* exists — the *exercise* has to produce
  the described result in the target environment. Check for observability races
  (is the thing still there when they look?), timing (does it complete too fast
  to see?), and producibility (can this failure even happen locally?). Author
  commands you have actually run. Also stay environment-honest: read for *shape*
  and *mechanism*, not byte-for-byte; give per-OS variants where they diverge.
- **Practice, not a test, is the goal.** Douglas pushed back — correctly — on
  framing the Question Bank as "the answer." His mission is practical debugging.
  The curriculum already designed the practice path: tool-first run-it-yourself
  (ideally against his *real* systems), the design-review thread (Units 9/11/14),
  the capstone triage walkthroughs, and communities in RESOURCES. Lead with
  those; the Bank is the spaced-retention layer, offered, not pushed.
- **Unit 2 gets a consolidation lesson, not just a callback.** He said the
  highest-leverage unit didn't stick, so lesson `0007-connections-in-practice`
  was authored: re-walks sockets/4-tuple, the RST-vs-silence fork, and the
  five-signature alphabet, OS-honest and hands-on against a real service, and
  re-drills the exact rules-out logic he missed on Q1. Placed before Unit 3 (the
  DNS lessons were renumbered 0008–0011; none had been studied yet).

## Carry forward

- **Environment confirmed: Linux/WSL** (WSL2, same at home and work). Assume
  `ss`, `iptables`, bash `/dev/tcp`, `tcpdump`, `openssl` are available; Units
  6/7/9 run-it-yourself can rely on them — but still dry-run each exercise for
  the observability/timing/producibility traps above.
- Restated from record 0001: clean MC scores are fluency. The retention win here
  is getting real-terminal practice to actually work, on his machine.
