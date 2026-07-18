# Question Format

Bank files are JSON: `{ "questions": [ … ] }`, merged across every `*.json` in
`public/courses/<slug>/bank/`. English keys, content in the course's language.
The validator (`lib/bank.ts`) enforces the shapes; the rigor rules below are
what make questions *gradeable* — they were learned the hard way running a 4B
grader over real exam content.

## Multiple choice (`"type": "mc"`)

| field | rule |
| --- | --- |
| `id` | unique in the course; convention `M01`, `M02`, … |
| `topic` | from the course's controlled topic list — drives Topic Drill |
| `source` | optional provenance (which exam/chapter it mirrors) |
| `stem` | the case or question; self-contained, no "see above" |
| `options` | 2–6 strings, **exactly one correct** |
| `correctIndex` | 0-based index into `options` |
| `explanation` | teaches *why* — including why the tempting wrong options are wrong |

Rigor rules:

- **Same length, same register.** Options must not leak the answer by
  formatting: no lone short option, no only-one-with-an-article-citation, no
  "all of the above". (Same rule as the lesson Quiz layer.)
- **Distractors are the pedagogy.** Each wrong option should be a real
  misconception a learner plausibly holds; the `explanation` names the trap.
- MC is single-attempt and summative in a Session — never write "trick"
  questions that hinge on wording rather than understanding.

### Worked example (from `espresso`)

```json
{
  "id": "M01",
  "type": "mc",
  "topic": "Brew ratio",
  "source": "Lesson 0001 — The Brew Ratio",
  "stem": "You dose 18 g of ground coffee and want a classic 1:2 espresso. What beverage weight should you stop the shot at?",
  "options": [
    "27 g in the cup, weighed with the portafilter",
    "36 g in the cup, weighed on a cup scale",
    "45 g in the cup, weighed after the crema settles"
  ],
  "correctIndex": 1,
  "explanation": "Ratio is dose to beverage weight: 18 g × 2 = 36 g out. 27 g is a 1:1.5 ristretto pull, and 45 g is a 1:2.5 lungo — both are ratios, just not the classic 1:2 the lesson targets. Always weigh the cup, not the portafilter."
}
```

Note how every option is a full clause of similar length and structure —
nothing about the formatting singles out the answer — and the explanation
dismantles the closest distractors (the ristretto and lungo ratios), not just
the right one.

## Open questions (`"type": "open"`)

| field | rule |
| --- | --- |
| `id` | unique in the course; convention `A01`, `A02`, … |
| `topic` / `source` / `stem` | as above |
| `modelAnswer` | the teacher's expected answer (was *gabarito*) |
| `criteria` | 1–8 individually-creditable points |
| `explanation` | optional post-answer teaching note |

Rigor rules — these decide whether the grader works AT ALL:

- **One criterion = one creditable point.** A small model checks each criterion
  independently against the Model Answer. NO compound criteria ("identifies X
  **and also** explains Y" — split it), NO criteria requiring knowledge outside
  the Model Answer ("cites current jurisprudence"), NO vibes ("answers
  clearly").
- **The Model Answer must satisfy every criterion, verbatim-checkably.** The
  eval harness's tier-1 feeds the Model Answer back as the learner's answer;
  it must score ≈ 1.0. If it doesn't, the question is broken — a criterion
  credits something the Model Answer never states.
- **Score = fraction of criteria met** (computed by the app, not the model), so
  weight material points as separate criteria and keep trivia out of the list.
- Learners get credit for equivalent phrasing and are NOT required to use
  exact terminology — write criteria at the level of the *concept*
  ("Identifies the shot as under-extracted" credits the diagnosis however it
  is phrased, not the word "under-extracted" itself).

### Worked example (from `espresso`)

```json
{
  "id": "A01",
  "type": "open",
  "topic": "Dialing in",
  "source": "Lesson 0002 — Dialing In a New Bag",
  "stem": "Your 1:2 shot runs in 20 seconds and tastes sour. Explain what is happening in the cup and, keeping the dose fixed, what you would change for the next shot and why.",
  "modelAnswer": "The shot is under-extracted: it ran too fast, so water did not dissolve enough of the coffee's sweetness, leaving sour acids dominant. The fix is to grind finer while keeping the dose and the 1:2 ratio fixed, which slows the flow toward the 25–30 second range and raises extraction on the next shot.",
  "criteria": [
    "Identifies the shot as under-extracted",
    "Links the sour taste to too little dissolved from the grounds",
    "Proposes grinding finer as the next single change",
    "Keeps dose and ratio fixed while adjusting"
  ],
  "explanation": "Fast and sour is the classic under-extraction signature; grind is the dialing-in lever, moved one shot at a time."
}
```

Each criterion names ONE distinct point; all four are literally present in the
two-sentence Model Answer; a learner writing "it ran too fast so it's sour —
grind finer, same dose" earns full marks despite matching none of the wording.

## Topics

Keep the per-course topic list small and controlled — it is UI (Topic Drill
buttons) and analytics (per-topic accuracy, Marksman badge). Before adding a
topic, check `listTopics(loadBank('<slug>'))`. Prefer 5–15 topics per course.
