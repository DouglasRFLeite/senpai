# Curriculum — Networking for a Backend Engineer & Application Support

_Designed by /design-course (Pedagogue × Mission-Achiever), 2026-07-19. /teach
follows this sequence; deviations are recorded in learning-records._

## Learning arc

The learner starts as a backend/support engineer who uses networks daily but
triages incidents by folklore. Unit 1 shows the whole game — one HTTPS request
traced end to end and a skeleton triage ladder — and every later unit fills in
one rung: connections and the failure alphabet, DNS, HTTP (as a spiral across
four units), the wire (twice), TLS, the IP path, middleboxes, cloud constructs.
The course ends with the learner performing the mission's headline skill whole:
running a methodical "A can't reach B" triage, reading real captures, and
critiquing timeout/retry/pooling designs — with interview fluency as the free
side effect. ~14 units ≈ 3–3.5 months at 30 min/day.

**Course spine:** the five-way failure taxonomy — *refused / timeout / reset /
hang / resolves-wrong* — each mapped to a mechanism and to what it **rules
out**. Introduced in Unit 2, re-encountered in disguise in every unit after.

**Method rules (bind /teach and /author-bank):**
- Tool-first: every concept enters through a terminal artifact (`curl -v`,
  `dig`, `ss`, `tcpdump`, `openssl s_client`); theory only as the explanation
  of output the learner has already stared at.
- Small lessons: one artifact, one concept, one win.
- Run-it-yourself: lessons embed exact commands against a local target
  (`python3 -m http.server` is enough); banks drill interpretation of output
  shaped exactly like what the learner just produced. Banks never show an
  untaught output shape.
- Tool output never retires: `curl -v`/`dig`/`ss` recur in every later bank
  with growing richness (TLS lines from Unit 7, timing from Unit 9).
- Depth caps (hard): no OSI recitation, no tcpdump flag trivia, no TLS
  cipher-suite naming, no HTTP/2 frame taxonomy, no CIDR arithmetic beyond
  block-membership reading, no cloud-console trivia, no header-field
  memorization.

## Units

### Unit 1: The Whole Game *(half-size: 2–3 lessons)*
**/teach covers:** One narrated `curl -v https://…` end to end (DNS → TCP →
TLS → HTTP), line by line. The triage ladder as a skeleton: the ordered
questions for "A can't reach B" (name resolves? port reachable? TLS completes?
app answers? path sane?) and which tool owns each rung. First sight of
`curl -w` timing as the latency map.
**/author-bank drills:** Stage identification from truncated transcripts;
ladder ordering. MC-lean and deliberately soft — first-contact knowledge, no
internals, no manufactured difficulty.
**Why here:** fast.ai whole game — the learner performs a crude version of the
mission's headline skill in week one, and every later unit slots into an
existing schema.

### Unit 2: Connections & the Failure Alphabet
**/teach covers:** Sockets as the 4-tuple; listening vs client sockets;
ephemeral ports; reading `ss -tlnp` / `ss -tnp` (LISTEN, ESTABLISHED). Minimum
TCP: SYN/SYN-ACK/ACK, FIN vs RST — no header diagrams. TIME_WAIT/CLOSE_WAIT
*named and defined only* (forensics deferred to Unit 9). The five failure
signatures with mechanism, usual culprits, and rules-out logic (refused =
RST from a closed port — host up, packet arrived; timeout = silent drop —
firewall/routing/dead host; reset mid-stream = someone tore it down; hang =
dead peer or lost reply; resolves-wrong = DNS). `curl -v` anatomy and exit
codes; first-response tool per symptom.
**/author-bank drills:** Symptom → mechanism → what it rules out → next tool
(open, the course's signature format). Classify `curl -v` transcripts;
interpret `ss` snapshots (listening or not, what's connected). MC only for
signature and culprit-list discrimination. No state-pathology scenarios yet.
**Why here:** highest-leverage unit in the course — the diagnostic alphabet
every later unit re-grounds its failures in. Needs only Unit 1's map.

### Unit 3: DNS in Anger
**/teach covers:** Resolution path (stub → `/etc/resolv.conf`/systemd-resolved
→ recursive → authoritative) walked via `dig` and `dig +trace`. Records at
working depth: A/AAAA, CNAME, NS; TXT briefly; SRV as "exists". TTL and the
caching layers (including the app's own). `dig` against a *specific* resolver
(`@8.8.8.8` vs default) — "DNS is fine" claims are worthless without naming
the resolver. Search domains; NXDOMAIN vs SERVFAIL vs empty answer; "works
with the IP but not the name"; split-horizon; honest containers/K8s note.
**/author-bank drills:** Read `dig` output — status, ANSWER section, which
server answered — and state what it proves/rules out. Scenarios: stale TTL
after a cutover, search-domain surprises, "works on the laptop, NXDOMAIN from
the pod". CNAME chain tracing. MC for NXDOMAIN/SERVFAIL/timeout
discrimination. `curl -w` DNS-phase timings start appearing in stems.
**Why here:** DNS is rung one of the ladder and the most common real culprit;
self-contained, so the clean first deep-dive after the alphabet.

### Unit 4: HTTP I — The Semantics You Actually Use
**/teach covers:** Request/response anatomy on the wire. Methods and their
contracts — safety, idempotency (taught now; pays off in Units 5 and 11).
Status codes as families plus the load-bearing individuals cold (200/201/204,
301/302/304/307/308, 400/401/403/404/405/409/429, 500/502/503/504), with care
on 401 vs 403 and 502 vs 503 vs 504 and *who typically emits* each 5xx. Core
headers as the control plane: Host, Content-Type, Content-Length vs chunked,
Location, Authorization.
**/author-bank drills:** Heavy open retrieval ("client saw 504 vs 502 — what
does each say about the upstream?", "which box generated this 502?",
idempotency judgments). MC for close pairs (301/302/304, 307/308, 401/403,
502/503/504) with real-misconception distractors.
**Why here:** the layer the learner lives in; needs Units 1–2 so "the
connection is fine, HTTP isn't" is a meaningful sentence; must precede the
wire unit so captures contain readable traffic.

### Unit 5: HTTP II — Connection Lifecycle, Timeouts, Retry Hygiene
**/teach covers:** Keep-alive and connection pooling; what breaks without them
(TIME_WAIT storms — Unit 2 callback). The four timeouts (DNS, connect, TLS,
read/response) and where each shows in `curl -w` — run-it-yourself exercises
embedded. Retries done right: idempotency-gated (Unit 4 retrieval), backoff +
jitter, the retry-storm concept. Single-connection scope only — cross-hop
timeout budgets deferred to Unit 11, where the learner has met every box in
the chain.
**/author-bank drills:** Diagnose from `curl -w` breakdowns (slow connect vs
slow TTFB = different suspects). Retry-safety judgments. From this unit on,
~20% of every bank legitimately re-drills retaught earlier material.
**Why here:** the mission's "timeouts" clause at the topology the learner
actually knows; first deliberate spacing event.

### Unit 6: On the Wire I — tcpdump/Wireshark, Plaintext
**/teach covers:** The five-flag home-base command
(`tcpdump -i any -nn -A 'host X and port Y'`); capture vs display filters;
default output line format. Watching the handshake, a clean close, an RST, and
retransmitted SYNs — Unit 2's signatures *as packets*. A full plaintext HTTP
exchange packet by packet. Wireshark: Follow TCP Stream first, display filters
second. Capture-it-yourself exercises against a local `python3 -m http.server`
are a hard requirement. Pre-annotated captures before raw ones.
**/author-bank drills:** Given 5–10 tcpdump lines, tell the story — who
connected, what happened, what failed. Match failure signatures to packet
patterns ("SYN out, nothing back" vs "RST back"). Which invocation answers a
given question. ≥80% open. Only taught packet shapes appear.
**Why here:** captures need known shapes (TCP from Unit 2, HTTP from Unit 4).
Deliberately *before* TLS so first captures are readable plaintext — the fear
of tcpdump dies against legible payloads.

### Unit 7: TLS Without Tears
**/teach covers:** The handshake as a story (hello, cert, key agreement) at
debugging depth; TLS 1.2 vs 1.3 in one honest paragraph. Certificate chains —
leaf/intermediate/root — and why a missing intermediate breaks only *some*
clients (trust stores differ). Hostname verification vs expiry vs untrusted CA
as three distinct failures; SANs; SNI and why it explains "works with curl,
fails from the app". Where TLS terminates (a proxy may be the endpoint —
drilled as diagnosis in Unit 11). `openssl s_client -connect -servername` as
the probe, run-it-yourself. The five error classes (expired, hostname
mismatch, unknown CA/incomplete chain, version mismatch, SNI miss).
ClientHello/SNI in Wireshark — and why the rest is opaque.
**/author-bank drills:** Error text → root cause → fix (open). Read `s_client`
output: chain complete? verify return code? "Works with `-k`, fails without —
what do you now know?" MC among the five error classes; SNI vs Host header.
No record-layer or cipher-suite trivia.
**Why here:** TLS errors are opaque exactly until the handshake's shape is
known; needs Unit 2 (handshake concept) and benefits from Unit 6 (captures).

### Unit 8: HTTP III — Caching & CORS
**/teach covers:** Caching as behavior: the Cache-Control directives that
matter, ETag/If-None-Match and the 304 flow (Unit 4 callback), Last-Modified,
Vary; where caches live (browser, CDN, proxy) and how to *prove* one is
interfering. CORS as what it really is: browser enforcement with a preflight —
the server sees the request fine while the browser blocks it; the three
headers that fix 90% of cases; why "CORS error" often masks a real 500.
**/author-bank drills:** "Stale data after deploy — walk the cache suspects";
"frontend reports CORS error but curl works — what's actually happening?" MC
for no-cache vs no-store and preflight triggers.
**Why here:** the spaced HTTP return after two non-HTTP units — Units 4–5
material must be retrieved, not still-warm. Both topics are frequent support
tickets. First trim target under schedule pressure (validator mechanics before
proxy topology).

### Unit 9: On the Wire II — Latency, Loss, and Socket Pathologies
**/teach covers:** Second capture pass, hunting *time*: retransmissions and
dup ACKs as loss fingerprints; a latency spike in a capture vs in `curl -w`
(full timing decomposition: DNS + connect + TLS + TTFB + transfer). RTT as the
currency — why chatty protocols die cross-region; pooling economics and what
cold connections cost. TIME_WAIT/CLOSE_WAIT forensics end to end (received
from Unit 2 — this unit owns them). Mid-stream RSTs and their usual authors
(idle timeouts, crashing upstreams — foreshadows Unit 11).
**/author-bank drills:** Localize where time was lost (network vs server
think-time vs client) from capture excerpts + timings. Diagnose a
retransmission storm. "Thousands of CLOSE_WAIT — whose bug?" ≥80% open,
scenario-heavy.
**Why here:** spaced second exposure to tcpdump with a harder job; the payoff
of Unit 5's timing model; the deep end of "capture and read real traffic".

### Unit 10: The Path — IP, Subnets, NAT, MTU
**/teach covers:** Same-subnet-or-through-a-gateway; reading CIDR fluently by
inspection, including the block-size trick for membership; private ranges;
route tables and default gateways. NAT: why the server sees a different source
IP; SNAT/DNAT, connection tracking, NAT port exhaustion as an incident class
(intermittent timeouts at scale). Stateful firewalls and why they produce
*timeouts, not refusals* (Unit 2 payoff). MTU, fragmentation, PMTUD black
holes — "small requests work, big ones hang" over a VPN. traceroute/mtr taught
honestly, including their lies (ICMP deprioritization). Every concept enters
via an incident it explains, or it's cut.
**/author-bank drills:** Subnet-membership judgments (reading only — never
host counts, mask conversion, or subnet splitting). Why a firewall drop
presents as a hang. NAT-exhaustion and MTU-black-hole symptom narratives.
traceroute/mtr interpretation. MC for private ranges and SG-style
stateful/stateless discriminations to come.
**Why here:** taught day one this is OSI academia; taught now, every concept
snaps onto failures the learner has already debugged.

### Unit 11: Middleboxes — LBs, Proxies, and Designing the Chain
**/teach covers:** Forward vs reverse proxies; production requests cross 2–4
HTTP hops, each with its own timeouts, buffering, and connection pools.
X-Forwarded-For/Forwarded (Unit 10 NAT reuse); hop-by-hop vs end-to-end
headers; which hop terminated TLS (Unit 7 payoff). L4 vs L7 load balancing and
what each can see/break; health checks and "the LB marked it dead" → 502/503
(Unit 4 reuse); idle-timeout mismatches as the classic mid-stream reset (Unit
9 reuse); connection draining; sticky sessions in a paragraph. **Designing the
chain:** cross-hop timeout budgets (client > sum of downstream = fire),
retry-storm prevention, graceful degradation — the architect lesson.
**/author-bank drills:** Open root-cause chains ("intermittent 502s at exactly
60s"), criteria crediting each causal link separately. Budget reasoning
("client 10s, LB 60s, app 30s — DB hangs, what does the user see?"). Locate
the failing hop in a described topology; which hop terminated TLS. MC for
L4/L7 capability. ≥80% open. Extra eval-harness calibration required.
**Why here:** the great convergence unit — every previous layer's failure
signatures reappear wearing masks, and the debugger becomes the architect.
Only works this late.

### Unit 12: Cloud Networking — VPCs, Security Groups, and Friends
**/teach covers:** VPC/subnet/route-table as Unit 10 concepts with cloud
names. Security groups (stateful) vs NACLs (stateless); the wrong SG as *the*
canonical cloud "timeout, not refused" incident. VPN as "an encrypted tunnel
with its own MTU and routes" (Unit 10 MTU callback); peering/Transit at
conversation depth. Cloud DNS and service discovery (Unit 3 revisit). A short
Kubernetes survival note: Services, DNS names, why `localhost` betrays you in
a pod. Honest framing: vocabulary translation — the ticket infra will respect.
**/author-bank drills:** "Pod resolves the name but connect hangs — walk the
cloud suspects in order." SG vs NACL vs route-table triage (MC — real
misconception territory). Leans more MC than any other unit, legitimately.
Everything answerable from taught material; no provider-console trivia.
**Why here:** pure translation — cheap once Units 3/10/11 exist; completes the
"talk fluently with infra teams" success bullet.

### Unit 13: Modern HTTP — HTTP/2, HTTP/3, and the Interview Lens
**/teach covers:** HTTP/2 multiplexing and why it exists — HTTP-layer
head-of-line blocking solved, TCP-layer HOL *not* solved (understandable only
after Unit 9's loss model). HTTP/3/QUIC as "TCP's HOL problem solved by moving
to UDP"; 0-RTT in one line. Explicitly interview-framed: these are explanation
skills more than debugging skills, and the lesson says so.
**/author-bank drills:** Open "explain it like an interview": why doesn't
HTTP/2 fix packet-loss HOL? When does HTTP/3 actually help? No frame-type or
stream-priority trivia. Re-drilled in Unit 14 (spacing gap on purpose).
**Why here:** needs Unit 9 to be more than buzzwords; lowest-urgency mission
item, so it must not displace debugging skills earlier.

### Unit 14: Capstone — Triage Playbook & Design Review *(half-size teaching, full-size drilling)*
**/teach covers:** No new concepts. Three full "A can't reach B" walkthroughs
from ticket to root cause — one DNS-shaped, one network/firewall-shaped, one
TLS/middlebox-shaped — choosing tools rung by rung. Then the learner writes
their own condensed runbook (the decision tree: DNS? → TCP? → TLS? → HTTP? →
path?) — the teach-back. A lightning-round lesson mapping course knowledge to
the classic interview questions ("what happens when you type a URL", "TCP vs
UDP for X") — they come nearly free by now.
**/author-bank drills:** Fully interleaved across ALL units: multi-step
incident narratives with tool output at each fork, first question always "what
do you run next and why". A design-review band: critique small described
systems' timeout/retry/pooling choices, one criterion per flaw found. An
interview-classics band. Extra eval-harness calibration required.
**Why here:** the mission's success criteria are integrative; this is where
per-unit retrieval strength becomes storage strength, and where illusory
mastery goes to die.

## Assessment plan (global)

- ~70/30 open/MC overall. Units 1, 10, 12 lean MC (vocabulary discrimination
  is genuinely the skill); Units 2, 6, 9, 11, 14 are ≥80% open.
- Signature open format: output excerpt → what failed → what it rules out →
  what you run next. Criteria atomic — one criterion, one concept, one causal
  link; never "correctly diagnoses the problem" as one criterion.
- Stems artifact-anchored and self-contained (tool output quoted in the
  question, ≤15 lines); the grader needs no outside knowledge.
- MC only for close discriminations with real-misconception distractors:
  refused/timeout/reset, 301/307/308, 401/403, 502/503/504, NXDOMAIN/SERVFAIL,
  no-cache/no-store, SNI/Host, SG/NACL, expired/untrusted/hostname-mismatch.
- Units 11 and 14 need extra `npm run eval-grader` calibration passes — long
  causal chains compound the grader's per-criterion false negatives.

## Schedule governance

- **Untouchable spine:** Units 1, 2, 3, 6, 7, 14 — alone they achieve the
  mission's first success bullet.
- **Cut order under pressure:** HTTP/3/QUIC depth → VPN internals → Unit 8
  caching validators → Unit 12 compresses into Unit 11 as a vocabulary
  appendix.

## Deliberation notes

### Consensus
Independently convergent from Round 1: tool-first teaching (every concept via
a terminal artifact), the failure taxonomy as the course spine, connections
before protocols and resolution before routing, ~70/30 open/MC with atomic
artifact-anchored criteria, identical depth-cap lists, and a fully interleaved
capstone. Round 2 produced mutual adoption on nearly everything else.

### Resolved tensions
- **Bottom-up vs whole-game opening:** Mission-Achiever opened with sockets;
  Pedagogue argued schema-before-vocabulary (a narrated `curl -v` needs zero
  prerequisites). Mission-Achiever adopted wholesale; Unit 1 is deliberately
  half-size with an honestly soft bank.
- **Wire before or after TLS:** each side ended up endorsing the other's
  original order; resolved for plaintext-first (Pedagogue's cognitive-load
  argument, explicitly conceded by the Mission-Achiever: "that's how
  practitioners actually learn tcpdump"). TLS-in-Wireshark stays in Unit 7.
- **One wire unit or two:** split (handshake reading vs loss/latency
  forensics) — cognitive-load fix plus a free spacing repetition.
- **Overloaded connections unit:** slimmed, not split — TIME_WAIT/CLOSE_WAIT
  defined in Unit 2, forensics owned by Unit 9.
- **Where timeout budgets live:** Mission-Achiever showed cross-hop budgets at
  Unit 5 would smuggle in untaught topology; single-connection timeouts in
  Unit 5, chain budgets in Unit 11.
- **The architect outcome:** the mission names design as a second outcome;
  rather than a standalone unit it gets three anchored homes — RTT/pooling
  economics in Unit 9, "designing the chain" in Unit 11, a design-review bank
  band in Unit 14.
- **Standalone Modern-HTTP unit vs folding into latency:** kept standalone
  (Unit 13), position locked after Unit 9's loss model; both sides' reasons
  (prerequisite + honest interview framing) are satisfied.
- **Omissions caught:** MTU/PMTUD black holes and traceroute/mtr restored to
  Unit 10 (Mission-Achiever: "I have the scars"); five-way taxonomy (adding
  *hang* and *resolves-wrong*) adopted over the Pedagogue's three.
- **CIDR arithmetic line:** membership-by-inspection via the block-size trick
  is teachable; host counts, mask conversion, and subnet splitting are banned
  from banks.

### Open questions for the user
1. **Practice environment:** run-it-yourself exercises assume a Linux
   terminal where you can run `tcpdump`, `ss`, `dig`, `openssl s_client`, and
   `python3 -m http.server` (the dev container works). Confirm this is
   available — without it, Units 6/9 weaken to interpretation-only.
2. **Cloud flavor for Unit 12:** AWS terminology as the default (VPC, SG,
   NACL), with one mapping note for GCP/Azure — or another primary provider?
3. **Course content language:** lessons/banks in English or pt-BR? (Per-course
   choice; the deliberation assumed English tool output either way.)
4. **Length acceptance:** 14 units ≈ 3–3.5 months at 30 min/day. The cut order
   above is the agreed pressure valve — or should scope be pre-trimmed now?
