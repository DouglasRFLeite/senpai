# Networking for Backend Engineers — Resources

## Knowledge

- [Book: _everything curl_ — Daniel Stenberg](https://everything.curl.dev/)
  Free book by curl's author; the [Verbose](https://everything.curl.dev/usingcurl/verbose/index.html) chapter decodes `curl -v` line by line, and [Exit codes](https://everything.curl.dev/cmdline/exitcode.html) maps `6`/`7`/`28`/`35`/`56` to failure signatures (Unit 2). Use for: anything curl shows or does — verbose output, exit codes, timings, TLS options.
- [Book: _High Performance Browser Networking_ — Ilya Grigorik (free online)](https://hpbn.co/)
  Rigorous but readable coverage of latency, TCP, TLS, HTTP/1.1–HTTP/2; the [Building Blocks of TCP](https://hpbn.co/building-blocks-of-tcp/) chapter covers the handshake and lifecycle at debugging depth (Unit 2). Use for: the "why" behind RTT, handshakes, and connection reuse (Units 2, 5, 9, 13).
- [Docs: MDN — HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview)
  The reference for HTTP semantics: methods, status codes, headers, caching, CORS. Use for: Units 4, 5, 8 — cite it instead of guessing header behavior.
- [Article: "A Question of Timing" — Cloudflare blog](https://blog.cloudflare.com/a-question-of-timing/)
  The canonical walkthrough of `curl -w` timing variables and what each phase contains. Use for: latency decomposition (Units 1, 5, 9).
- [Article: "How to use dig" — Julia Evans](https://jvns.ca/blog/2021/12/04/how-to-use-dig/)
  Practitioner-grade dig tutorial: querying specific resolvers, reading answers, tracing. Use for: Unit 3 and the ladder's rung 1.
- [Zine: _Networking! ACK!_ — Julia Evans (wizardzines, paid)](https://wizardzines.com/zines/networking/)
  One-page-per-tool debugging zine (ping, dig, nc, curl, tcpdump). Use for: a friendly second angle on any tool that isn't clicking.

## Wisdom (Communities)

- [Server Fault](https://serverfault.com)
  High-signal Q&A for sysadmin/networking problems; strong moderation. Use for: sanity-checking a diagnosis writeup, searching prior incidents by symptom.
- [r/devops](https://www.reddit.com/r/devops/)
  Practitioner discussion of infra/debugging war stories. Use for: how real teams structure triage and on-call habits.

## Gaps

- No single high-trust source for the full "A can't reach B" triage ladder — it's assembled across the sources above; the course's own `reference/triage-ladder.md` is the compressed version.
- tcpdump: need a vetted beginner-safe primer before Unit 6 (candidates: Julia Evans' tcpdump material, man page EXAMPLES section).
