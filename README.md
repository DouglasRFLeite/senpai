# Senpai

**Learn anything, then prove you learned it — in one app.**

Claude writes a course as plain files in the repo. Senpai serves it: you read the lessons,
then drill a bank of exam-style questions. Multiple-choice gives instant feedback; for
open-ended answers a small local LLM grades what you wrote against the author's criteria —
never its own knowledge. Everything you do becomes progress you can see: a heatmap, a
streak, and a report of exactly where you're still weak.

Then the part that ties it together: you hand that report back to the authoring skill, and
the next lessons aim straight at your gaps. Teaching and testing feed each other. That's
the whole idea.

## See it running

The dev stack bundles Postgres, so one command brings up everything:

```bash
docker compose up -d              # app container + Postgres 16
docker compose exec dev bash
npm install && npm run dev        # → http://localhost:3003
```

No Docker? You need Node 22 and a Postgres 16 you can point `DATABASE_URL` at (the schema
builds itself on first run — Postgres is required), then `npm install && npm run dev` — the
app is at http://localhost:3000 (3003 is the Docker port mapping).

Open the app, type a name — no signup, this is built for a trusted circle — and open the
**espresso** course that ships with the repo.

Grading open answers is optional. Run [Ollama](https://ollama.com) and set `OLLAMA_URL`
and it grades for real; leave it unset and every open question falls back to
self-assessment. The app never breaks when the grader is offline.

## Write your own course

Courses are authored by [Claude Code](https://claude.com/claude-code), right in the repo —
the three skills under `.claude/skills/` do the work:

```
claude                          # start Claude Code in the repo root
/teach how espresso extraction works    # it interviews you, then writes the lessons
/author-bank espresso                   # then writes the question bank
```

For a bigger course, run `/design-course <slug>` first — two personas deliberate a
curriculum before any lesson is written. A course is just files under
`public/courses/<slug>/`, so refresh the app and study. When you're done drilling, export
your progress report from the dashboard and paste it into `/teach`: the next lessons aim
straight at your gaps.

## Where to go next

This README is the front door. The rest of the repo lets you go as deep as you need:

| If you want to… | Read |
| --- | --- |
| Understand every term precisely (Course, Bank, Grader, Progress Report…) | **[`CONTEXT.md`](CONTEXT.md)** — the domain glossary |
| Change the code | **[`CLAUDE.md`](CLAUDE.md)** — tech stack, TDD workflow, the Grader, conventions |
| See how the skills author | Each skill's `SKILL.md` under `.claude/skills/` — the formats are contracts with the app |

A quick map of the code itself:

```
app/                 Next.js App Router — pages + API routes
lib/                 Core logic: db, grading, bank validation, report generation
packages/teachdown/  The markdown dialect lessons are written in
public/courses/       The courses themselves (lessons, references, question banks)
```

Stack, in one line: Next.js 16 (App Router, Node 22) · TypeScript strict · PostgreSQL 16
(plain `pg`, no ORM) · next-intl (`en` + `pt-BR`) · Vitest · Ollama for grading.

## Status & license

A personal project — not a packaged product, but MIT-licensed (see [`LICENSE`](LICENSE)),
so you're welcome to learn from it, fork it, and build on it.
