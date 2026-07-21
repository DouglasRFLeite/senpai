# The dev container is missing the tools the course is built on

Douglas's Unit 2 report (2026-07-21) said he "did not learn much" and got little
practical experience because **"the tools did not work as expected on the
terminal. It was overall a bit awkward."** He did retain the concepts —
explicitly the `FIN`/`RST`/silence distinction — so this is a *practice* failure,
not a comprehension one.

**Root cause (confirmed, not guessed):** `Dockerfile.dev` installs
`jq lsof socat postgresql-client ripgrep git curl ca-certificates openssh-client`
and nothing else. It does **not** install `dnsutils` (`dig`), `iproute2` (`ss`),
`tcpdump`, or `netcat`. So Unit 2's run-it-yourself commands — `ss -tlnp`,
`ss -tnp` — could not run at all in the learner's container, and the fallback the
lesson suggested (`netstat`, in `net-tools`) is missing too. The whole
tool-first method of this curriculum was silently broken by the environment.

**Fixes applied this session:**
- Added `dnsutils iproute2 tcpdump netcat-openbsd` to `Dockerfile.dev` so every
  curriculum tool (`dig`, `ss`, `tcpdump`, `nc`; `curl`/`openssl` already
  present) exists out of the box. Requires a container rebuild
  (`docker compose build dev`) to take effect.
- Unit 3 lessons now open with an explicit install line
  (`sudo apt-get install -y dnsutils`), always show **expected output** so a
  lesson self-checks even when a command can't run, and give the always-present
  `getent hosts` as a no-install fallback for rung 1.

**Implications for future units:**
- Units 6, 7, 9 lean hard on `tcpdump` and `openssl s_client`. Confirm the
  rebuilt container actually has them before authoring those run-it-yourself
  exercises — do not assume the image matches the Dockerfile until verified.
- Keep the "install line + expected output + no-install fallback" pattern in
  every tool-first lesson. Expected output is what makes a lesson survive a
  hostile environment; treat it as mandatory, not decoration.
- Restated learning-record 0001's point: clean MC scores are fluency. The real
  retention win here is getting the *terminal* working so effortful, self-checking
  practice can actually happen — then the Bank.

**Struggle spot carried into Unit 3:** Failure Alphabet Q1 — the "what does
`refused` rule out?" logic (2 wrong). Unit 3's lesson 0009 (NXDOMAIN/SERVFAIL/
silence) is deliberately built as the same "an answer rules things out; silence
rules nothing out" fork, re-teaching that logic in a new setting.
