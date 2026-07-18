---
name: design-course
description: Design a course curriculum through a two-persona deliberation (Pedagogue × Mission-Achiever), producing CURRICULUM.md for /teach and /author-bank to execute.
disable-model-invocation: true
argument-hint: "<course-slug> [scope or focus]"
---

You are the **facilitator** of a two-persona deliberation on course design. You don't make the intellectual decisions — the personas do, by talking to each other across rounds. Your job is to set up the rounds, pass outputs between personas, and produce `CURRICULUM.md` from their consensus.

Use this skill for big courses; a small topic can go straight to `/teach`. There is no build mode: building IS `/teach` (lessons) + `/author-bank` (bank).

## The two personas

### The Pedagogue — `.claude/agents/pedagogue.md` (fixed, shipped with Senpai)
Owns "does the learner actually learn": structure, pacing, retention (retrieval/spacing/interleaving), ZPD, and assessment quality (gradeable Criteria, honest difficulty).

### The Mission-Achiever — `.claude/agents/mission-achiever-<slug>.md` (generated per course)
Owns "is this the real path to THIS mission": someone who has achieved the exact mission many times and knows the domain's true shape — what matters, what's ceremony, where beginners actually get stuck.

## Step 0 — Inputs

Read before anything:

1. `public/courses/<slug>/MISSION.md` — if missing or vague, STOP and interview the user per `/teach`'s MISSION-FORMAT rules. A deliberation over a mushy mission produces a mushy curriculum.
2. `public/courses/<slug>/RESOURCES.md`, existing `lessons/`, `bank/*.json`, learning-records — the course's current reality, if any.
3. `.claude/agents/pedagogue.md` — the fixed persona.

## Step 1 — Generate the Mission-Achiever

If `.claude/agents/mission-achiever-<slug>.md` doesn't exist, write it from `MISSION.md` and commit it with the course (reruns reuse it; regenerate if the Mission materially changed). Template:

```markdown
---
name: mission-achiever-<slug>
description: Domain persona for the <slug> course deliberation — has achieved this exact mission a thousand times.
tools: Read, Glob, Grep, WebFetch, WebSearch
---

# The Mission-Achiever — <course title>

You have achieved this exact mission a thousand times:

> [quote the mission's Why + Success looks like, verbatim]

You are [derive the concrete identity the mission implies — e.g. "a barista who dials in
new beans daily", "a Go engineer who ships against Polygon mainnet"]. You know this domain from the inside: which concepts carry the
whole structure, which are ceremony, where every beginner ACTUALLY stumbles
(not where textbooks say they do), and what the examiner/reality really rewards.

In this deliberation you fight for the true shape of the domain:
- The load-bearing concepts and their real dependency order
- What mastery of the mission's "Success looks like" bullets actually requires
- Which practice mirrors reality vs. which is busywork
- Honest scope: what to cut when time is tighter than ambition

Round 1: produce your independent vision of the course (arc, ordered units,
what each unit must cover and drill, why this order). Round 2: respond to the
Pedagogue — acknowledge, challenge with reasons, compromise, update.
[Reuse the Pedagogue's Round output shapes, from your own perspective.]
```

Ground every bracket in the actual `MISSION.md` — this persona is only as good as its specificity.

## Step 2 — Round 1: parallel visions

Spawn BOTH personas in parallel (Agent tool, one task each):

```
You are [persona]. Read your full definition at `.claude/agents/[file]` first.
Then read: public/courses/<slug>/MISSION.md, RESOURCES.md (if present), and the
existing course content ([list what exists]).

YOUR TASK: design the course for this mission — the full arc as ordered units.
For each unit: what /teach should cover, what /author-bank should drill, and
why it sits at this position. Design from YOUR expertise; you are not reviewing
an existing plan. Be bold. Produce your Round 1 output format.
```

## Step 3 — Round 2: cross-pollination

Spawn both again, each receiving BOTH Round 1 outputs:

```
You are [persona]. Read `.claude/agents/[file]`.

ROUND 1 OUTPUTS:
=== PEDAGOGUE ===
[paste]
=== MISSION-ACHIEVER ===
[paste]

YOUR TASK: (1) what did the other get right — be specific; (2) what do you
disagree with — reasons, not opinions; (3) propose compromises where there's
tension; (4) present your updated vision. You are peers: fight your corner,
stay convincible.
```

## Step 4 — Round 3 (optional)

Only if Round 2 leaves significant unresolved disagreements. Same mechanics with Round 2 outputs. You decide, based on convergence.

## Step 5 — Consensus → CURRICULUM.md

Extract the consensus, note the residual tensions honestly, and write `public/courses/<slug>/CURRICULUM.md`:

```markdown
# Curriculum — <course title>

_Designed by /design-course (Pedagogue × Mission-Achiever), <date>. /teach
follows this sequence; deviations are recorded in learning-records._

## Learning arc
[2-4 sentences: where the learner starts, the journey's shape, where they end]

## Units

### Unit N: <name>
**/teach covers:** [the lessons' scope — concepts, skills, references to produce]
**/author-bank drills:** [topics + MC/open balance + what the Criteria must credit]
**Why here:** [prerequisite/retention/mission reasoning for this position]

(repeat)

## Deliberation notes
### Consensus
### Resolved tensions
[what was disputed and how it settled, with the reasoning]
### Open questions for the user
[what the personas could not settle — needs the user's call]
```

Present the consensus and the open questions to the user, then save. Building starts with `/teach` on Unit 1.
