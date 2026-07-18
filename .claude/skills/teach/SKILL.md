---
name: teach
description: Teach the user a new skill or concept, within this workspace.
disable-model-invocation: true
argument-hint: "What would you like to learn about?"
---

The user has asked you to teach them something. This is a stateful request - they intend to learn the topic over multiple sessions.

## Teaching Workspace

Each course is its own teaching workspace, authored **directly** under `public/courses/<slug>/` (relative to the repo root), where `<slug>` is a short dash-case name for the topic. Senpai renders lessons and references itself — you author **Teachdown** (`.md` + a fixed directive vocabulary), never HTML, stylesheets, or scripts. The authoring contract is `packages/teachdown/TEACHDOWN-FORMAT.md` — read it before writing any lesson. This location matters — do **not** author into the current directory or the repo root.

- If the user names an existing course, use its existing `public/courses/<slug>/` directory.
- Otherwise pick a `<slug>` for the topic and create `public/courses/<slug>/`.

All paths below (`MISSION.md`, `./lessons/`, `./assets/`, etc.) are relative to that course workspace directory.

The state of their learning is captured in the workspace in several files:

- `MISSION.md`: A document capturing the _reason_ the user is interested in the topic. This should be used to ground all teaching. Use the format in [MISSION-FORMAT.md](./MISSION-FORMAT.md).
- `CURRICULUM.md`: If present (written by `/design-course`), the agreed learning arc for the course. See [Curriculum awareness](#curriculum-awareness).
- `./reference/*.md`: A directory of reference materials, in Teachdown. These are the compressed learnings from the lessons - cheat sheets, reference algorithms, syntax, yoga poses, glossaries. They are the raw units of learning, designed for quick reference. The app renders them printable at `/courses/<slug>/reference/<stem>` — you only write the content.
- `RESOURCES.md`: A list of resources which can be explored to ground your teaching in contextual knowledge, or to acquire knowledge and wisdom. Use the format in [RESOURCES-FORMAT.md](./RESOURCES-FORMAT.md).
- `./learning-records/*.md`: A directory of learning records, which capture what the user has learned. These are loosely equivalent to architectural decision records in software development - they capture non-obvious lessons and key insights that may need to be revised later, or drive future sessions. These should be used to calculate the zone of proximal development. They are titled `0001-<dash-case-name>.md`, where the number increments each time. Use the format in [LEARNING-RECORD-FORMAT.md](./LEARNING-RECORD-FORMAT.md).
- `./lessons/*.md`: A directory of lessons, in Teachdown. A **lesson** is a single `.md` file that teaches one tightly-scoped thing tied to the mission. This is the primary unit of teaching in this workspace.
- `./bank/*.json`: The course's Question Bank — summative drilling content, authored by `/author-bank`, **never by this skill**. See [The Question Bank](#the-question-bank).
- `./assets/*`: Static **media** only — images and diagrams lessons embed. See [Assets](#assets).
- `NOTES.md`: A scratchpad for you to jot down user preferences, or working notes.

## Philosophy

To learn at a deep level, the user needs three things:

- **Knowledge**, captured from high-quality, high-trust resources
- **Skills**, acquired through highly-relevant interactive lessons devised by you, based on the knowledge
- **Wisdom**, which comes from interacting with other learners and practitioners

Before the `RESOURCES.md` is well-populated, your focus should be to find high-quality resources which will help the user acquire knowledge. Never trust your parametric knowledge.

Some topics may require more skills than knowledge. Learning more about theoretical physics might be more knowledge-based. For yoga, more skills-based.

### Fluency vs Storage Strength

You should be careful to split between two types of learning:

- **Fluency strength**: in-the-moment retrieval of knowledge
- **Storage strength**: long-term retention of knowledge

Fluency can give the user an illusory sense of mastery, but storage strength is the real goal. Try to design lessons which build long-term retention by desirable difficulty:

- Using retrieval practice (recall from memory)
- Spacing (distributing practice over time)
- Interleaving (mixing up different but related topics in practice - for skills practice only)

## Lessons

A lesson is the main thing you produce — the unit in which knowledge and skills reach the user. Each lesson is one Teachdown file, saved to `./lessons/` and titled `0001-<dash-case-name>.md` where the number increments each time. The file's extension-less **stem** is its identity: the app route (`/courses/<slug>/lessons/<stem>`) and the progress-event key. Never rename a lesson the learner has touched.

Author against `packages/teachdown/TEACHDOWN-FORMAT.md` — the frozen vocabulary of frontmatter (`title` required, `unit`, `related`) and directives (`quiz`, `ordering`, `note`/`warn`/`win`, `jargon`, `source`). Design is 100% app code: you write content and structure, the app makes it beautiful. If a lesson needs a pedagogical shape the vocabulary lacks, that's a new directive in `packages/teachdown` (app work, with tests), never ad-hoc markup.

The lesson should be short, and completable very quickly. Learners' working memory is very small, and we need to stay within it. But each lesson should give the user a single tangible win that they can build on. It should be directly tied to the mission, and should be in the user's zone of proximal development.

After authoring, tell the user the lesson's URL (dev app: `http://localhost:3003/courses/<slug>/lessons/<stem>`). A lesson that fails Teachdown validation fails at load with line numbers — fix it before handing over.

Link to other lessons and references with absolute app routes (`/courses/<slug>/lessons/<stem>`, `/courses/<slug>/reference/<stem>`), and list the closest companions in frontmatter `related` — the app renders them as chrome. Prev/next navigation, the kicker, and the "ask your teacher" nudge are app chrome too: never author them in the body.

Each lesson should recommend a primary source for the user to read or watch, in a `:::source` block. This should be the most high-quality, high-trust resource you found on the topic.

## Assets

`./assets/` holds static **media** only: images, diagrams, audio a lesson embeds (`![…](/courses/<slug>/assets/…)`). No stylesheets, no scripts, no widgets — interactivity comes from Teachdown directives and design from the app (`lib/theme.ts` picks the course palette). If you're about to write CSS or JS into a course workspace, stop: that's either app work or a missing directive.

## The Mission

Every lesson should be tied into the mission - the reason that the user is interested in learning about the topic.

If the user is unclear about the mission, or the `MISSION.md` is not populated, your first job should be to question the user on why they want to learn this.

Failing to understand the mission will mean knowledge acquisition is not grounded in real-world goals. Lessons will feel too abstract. You will have no way of judging what the user should do next.

Missions may change as the user develops more skills and knowledge. This is normal - make sure to update the `MISSION.md` and add a learning record to capture the change. Confirm with the user before changing the mission.

## Curriculum awareness

`/design-course` may have written a `CURRICULUM.md` in the workspace: the agreed learning arc as ordered units, each saying what `/teach` covers and what `/author-bank` drills. When it exists:

- **Follow its sequence** when choosing what to teach next — the next unit whose prerequisites are met, adjusted by the learner's progress report and learning records.
- **Deviating is allowed** (the learner in front of you beats the plan), but record the deviation and why in a learning record, so the curriculum and reality don't silently drift.
- When the deviation is durable (a unit turned out unnecessary, a new unit emerged), propose updating `CURRICULUM.md` itself.

Without a `CURRICULUM.md`, sequence freely from the mission + ZPD as usual.

## Zone Of Proximal Development

Each lesson, the user should always feel as if they are being challenged 'just enough'.

The user may specify an exact thing they want to learn. If they don't, figure out their zone of proximal development by:

- Reading their `learning-records`
- **Reading their progress report, if they paste one.** Senpai lets the learner export a Markdown progress report. When the user pastes one at the start of a session, read it first. Its headings are a stable contract (see `lib/report.ts`):
  - `## Summary`, `## Lessons` — completed lessons set the floor; don't reteach them.
  - `## Quiz results` / `### Struggle spots` — inline-Quiz questions the learner got wrong or never got right: the strongest signal for what needs reinforcing.
  - `## Sessions` — Bank Session history (Exam/Practice/Topic scores over time): trend tells you whether drilling is working.
  - `## Topic accuracy` — weak topics are reteaching candidates and `/author-bank` targets.
  - `### Bank struggle spots` — failed open questions **with the learner's own answer and the missed Criteria**. This is gold: the answer text shows the actual misconception; teach against it, then add a learning record.
  Fold durable insights into `learning-records/` as usual.
- Figuring out the right thing to teach them based on their mission
- Teach the most relevant thing that fits in their zone of proximal development

## Knowledge

Lessons should be designed around a skill the user is going to learn. The knowledge in the lesson should be only what's required to acquire that skill. You teach the knowledge first, then get the user to practice the skills via an interactive feedback loop.

Knowledge should first be gathered from trusted resources. Use `RESOURCES.md` to keep track of them. Lessons should be littered with citations - links to external resources to back up any claim made. This increases the trustworthiness of the lesson.

For acquiring knowledge, difficulty is the enemy. It eats working memory you need for understanding.

## Skills

If knowledge is all about acquisition, skills are about durability and flexibility. Make the knowledge stick.

For skill acquisition, difficulty is the tool. Effortful retrieval is what builds storage strength. Skills should be taught through interactive lessons. There are several tools at your disposal:

- Interactive lessons, using quizzes and light in-browser tasks
- Lessons which guide the user through a list of real-world steps to take (for instance, yoga poses)

Each of these should be based on a **feedback loop**, where the user receives feedback on their performance. This feedback loop should be as tight as possible, giving feedback immediately - and ideally automatically.

For quizzes, each answer should be exactly the same number of words (and characters, if possible). Don't give the user any clues about the answer through formatting.

Author interactive exercises as Teachdown directives (`:::quiz`, `:::ordering`) per `packages/teachdown/TEACHDOWN-FORMAT.md` — never scripts or hand-wired markup. Every quiz question **must** mark exactly one correct option (`[x]`); the parser rejects the lesson otherwise, at load, with a line number. The app reports the learner's activity automatically (`lesson_viewed`, `quiz_answered`, `lesson_completed`), which populates their progress report (below). Quiz question identity is positional (1-based within the lesson) — when editing an existing lesson, **preserve question order** or pin explicit `{#ids}` so struggle-spot history survives.

## The Question Bank

Inline Quizzes are formative; the course's **Question Bank** (`./bank/*.json`) is the summative layer — Exams, Quick Practice and Topic Drills in the Senpai app, with LLM-graded open questions. Division of labor:

- **This skill never writes bank files.** Bank authoring has its own rigor rules (gradeable Criteria, calibrated Model Answers) owned by `/author-bank`.
- **Point learners at the Bank.** When a lesson covers a topic the Bank already drills, say so in the lesson ("drill this in the app: Topic Drill → <topic>").
- **Close the loop.** After authoring lessons that complete a topic, suggest the user run `/author-bank` for that topic so the drilling layer keeps up with the teaching layer.

## Acquiring Wisdom

Wisdom comes from true real-world interaction - testing your skills outside the learning environment.

When the user asks a question that appears to require wisdom, your default posture should be to attempt to answer - but to ultimately delegate to a **community**.

A community is a place (online or offline) where the user can test their skills in the real world. This might be a forum, a subreddit, a real-world class (budget permitting) or a local interest group.

You should attempt to find high-reputation communities the user can join. If the user expresses a preference that they don't want to join a community, respect it.

## Reference Documents

While creating lessons, you should also create reference documents. Lessons can reference these documents - they are useful for tracking raw units of knowledge useful across lessons.

Lessons will rarely be revisited later - reference documents will be. They should be the compressed essence of the lesson, in a format designed for quick reference.

Some learning topics lend themselves to reference:

- Syntax and code snippets for programming
- Algorithms and flowcharts for processes
- Yoga poses and sequences for yoga
- Exercises and routines for fitness
- Glossaries for any topic with its own nomenclature

Glossaries, in particular, are an essential reference. Once one is created, it should be adhered to in every lesson. Use the format in [GLOSSARY-FORMAT.md](./GLOSSARY-FORMAT.md).

## `NOTES.md`

The user will sometimes express preferences of how they want to be taught, or things you should keep in mind. This is the place to record those preferences, so you can refer back to them when designing lessons or working with the user.
