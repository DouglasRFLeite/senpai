# Senpai

A personal learning OS: Claude authors courses locally (skills), Senpai serves them for
reading and drills their question banks, grading open answers with a local LLM and turning
every interaction into progress a learner can see and act on.

Born 2026-07-07 as a greenfield rebuild, merging a reading-and-progress platform with a
question-drilling-and-grading tool into one product.

## Language

**Senpai**:
The application in this repo — course browser, lesson reader, session player, dashboard,
grading proxy. Authoring lives in skills, not the app.
_Avoid_: platform, LMS, site

**Course**:
One authored workspace on one topic — lessons, references, shared assets, a question bank,
and authoring state, in a single directory under `public/courses/<slug>/`. The top-level
thing a Learner browses.
_Avoid_: class, module, track

**Lesson**:
One Teachdown document teaching one tightly-scoped thing, numbered `0001-<name>.md` and
identified by its file stem. May embed an inline Quiz. The unit of *teaching*.
_Avoid_: page, article, chapter

**Teachdown**:
The markdown dialect Lessons and References are authored in: standard markdown plus a
fixed Directive vocabulary and frontmatter. Authored by skills, rendered and validated by
Senpai — the author writes content, never design.
_Avoid_: lesson markdown, superset, HTML

**Directive**:
One named block type in the Teachdown vocabulary (`quiz`, `ordering`, `note`, `warn`,
`win`, `jargon`, `source`). The only way a Lesson expresses anything beyond prose; new
shapes require a new Directive, not improvised markup.
_Avoid_: widget (that's the rendered thing), component, shortcode

**Reference**:
A compressed cheat-sheet / glossary Teachdown document built for quick review and
printing. Revisited often; Lessons rarely are.
_Avoid_: doc, note, summary

**Mission**:
The reason the Learner wants the topic; lives in `MISSION.md`. Grounds every Lesson and
Question, titles the Course, and defines the Mission-Achiever persona.
_Avoid_: goal (that word is taken — see Goal), objective

**Assets**:
Static media (images, diagrams) a Course's Lessons embed. Never stylesheets or scripts —
look and behavior belong to Senpai.
_Avoid_: components, includes, partials

**Quiz**:
Multiple-choice questions embedded *inside* a Lesson via the `quiz` Directive.
Formative — "did you get this lesson". Not part of the Question Bank.
_Avoid_: test, exercise (ambiguous)

**Question Bank** (or just **Bank**):
A Course's standalone set of Questions in `bank/*.json`. Summative — exam-style material,
independent of any Lesson. Authored by the `/author-bank` skill.
_Avoid_: deck, question pool

**Question**:
One entry in a Bank. Two types: **MC Question** (stem, options, one correct index,
explanation — instant feedback) and **Open Question** (stem, Model Answer, Criteria —
graded by the Grader or Self-Assessed).
_Avoid_: item, card

**Model Answer**:
The authoritative full answer to an Open Question, written by the course author. What
grading is anchored to.
_Avoid_: gabarito (in code/docs; fine in pt-BR content), answer key

**Criteria**:
The named, individually-creditable points an Open Question's answer must hit. The Grader
scores strictly against these, never its own knowledge. (Was *critérios*.)
_Avoid_: rubric items, checkpoints

**Session**:
One sitting of drilling a Bank, configured at start: **Exam** (the whole Bank, exam-like),
**Quick Practice** (N random Questions), or **Topic Drill** (one topic). Ends in a Results
Panel. The unit of *assessment*.
_Avoid_: attempt, run

**Results Panel**:
The end-of-Session summary: score, per-Question outcomes, Criteria marks on Open
Questions.
_Avoid_: report (taken — see Progress Report)

**Grader**:
The runtime LLM grading pipeline for Open Questions: same-origin proxy to a local Ollama
model, prompt locked to Model Answer + Criteria, tolerant JSON repair, score 0.0–1.0.
Optional at runtime — when unreachable, the Session falls back to Self-Assessment.
_Avoid_: evaluator, corrector, AI (too broad)

**Self-Assessment**:
The Grader-down fallback: the Learner sees the Model Answer + Criteria and marks their own
answer. Same events, flagged as self-assessed.
_Avoid_: manual grading

**Learner**:
A person using Senpai, identified by a trusted name-picker id (no auth). Every event
carries the Learner's id.
_Avoid_: user (in domain talk; fine in code), student

**Event**:
One append-only row in the progress log (lesson viewed/completed, quiz answered, session
started/finished, question answered/graded). The single source of truth all progress is
computed from.
_Avoid_: activity, action

**Dashboard**:
The Learner's motivation view: activity Heatmap, XP, Streak, Badges, Goals.
_Avoid_: profile, stats page

**Heatmap**:
GitHub-style calendar of daily Event volume on the Dashboard.

**XP / Streak**:
Points per completed Lesson and correct answer / consecutive active days. Computed from
Events, never stored.

**Badge**:
A fixed, code-defined achievement computed from Events (e.g. first Exam, 7-day Streak).
_Avoid_: achievement, trophy

**Goal**:
A Learner-set weekly target (lessons or questions per week) shown with progress on the
Dashboard. The one gamification concept that is *stored*, not computed.
_Avoid_: mission (taken), target

**Struggle Spot**:
A Question or Quiz item the Learner got wrong or never got right — surfaced in the
Progress Report as the strongest signal for what to reteach.
_Avoid_: weakness, gap

**Progress Report**:
The exported Markdown summary of a Learner's history (completed Lessons, accuracy,
Struggle Spots) designed to be pasted into `/teach` so the next lesson lands in the zone
of proximal development. The loop that makes teaching + questions one product.
_Avoid_: export, summary

**Pedagogue**:
The fixed deliberation persona in `/design-course`: owns everything about how the Learner
learns — ZPD, storage strength, retrieval practice, and that every Open Question's
Criteria are actually gradeable. Absorbs what other frameworks split into "examiner".

**Mission-Achiever**:
The dynamic deliberation persona, instantiated per Course from `MISSION.md`: the person
who has already achieved the Learner's exact Mission a thousand times (passed that test,
held that job, mastered that practice). Fights for what *actually* gets the Learner there.
_Avoid_: domain expert, SME
