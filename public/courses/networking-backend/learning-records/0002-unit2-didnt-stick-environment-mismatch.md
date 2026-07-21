# Unit 2 didn't stick; the cause was environment mismatch, not missing tools

Douglas's Unit 2 report (2026-07-21): he "did not learn much" from Unit 2. He
retained the headline concept (`FIN`/`RST`/silence) but got little *practical*
experience because **"the tools did not work as expected on the terminal. It
was overall a bit awkward."** One missed inline question: Failure Alphabet Q1 —
the "what does `refused` rule out?" logic (2 wrong).

## Correction to my first read (important)

My first diagnosis was **wrong**. I found that `Dockerfile.dev` omits
`dnsutils`/`iproute2`/`tcpdump`/`nc` and concluded the commands couldn't run.
Douglas corrected me: **he doesn't run the commands in the dev container.** They
*ran* — they just **didn't behave as the lesson described**. The real cause is
that the Unit 2 lessons hard-coded output and commands from one specific Linux
environment (`ss`, exact `curl` messages, a black-hole address that times out),
and his host differs (`ss` may not exist; a filtered address may return "No
route to host" fast instead of hanging). The lessons over-promised exact output.

The Dockerfile change stays (it's a real latent gap for anyone who *does* use the
container per NOTES), but it is **not** what fixed Douglas's problem and must not
be described as such.

## What actually needs to change (durable)

- **Lessons must be environment-honest.** Never promise byte-for-byte output.
  Give per-OS command variants (Linux `ss` / macOS `lsof`), and teach reading
  for *shape* and *mechanism*, not exact bytes. A result that differs from the
  page is a teaching moment, not a failure.
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

- Confirm Douglas's actual OS before authoring more run-it-yourself steps
  (Units 6/7/9 lean on `tcpdump`/`openssl s_client`, which differ or need
  install on macOS). I asked; he hasn't answered yet — assume cross-OS until he
  does.
- Restated from record 0001: clean MC scores are fluency. The retention win here
  is getting real-terminal practice to actually work, on his machine.
