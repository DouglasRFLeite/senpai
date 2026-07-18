# Senpai

Personal learning OS: course reading + progress merged with question drilling +
LLM-graded open answers. Domain glossary: `CONTEXT.md`.

## Communication Style

Be brief. Short answers, minimal explanation. Skip preambles and summaries. Just do the work.

## Tech Stack

- Next.js **16.2.10** (App Router, Node 22), TypeScript strict — the version is exact on
  purpose; if you upgrade it, update this line in the same commit.
- next-intl (cookie-based locale, `en` + `pt-BR`, default `pt-BR`):
  `lib/i18n.ts` + `i18n/request.ts` + `lib/actions/set-locale.ts`.
- PostgreSQL 16 **bundled in dev compose** as service `db` (Postgres always, no
  fallback). `DATABASE_URL` is preset in the dev container env.
- vitest for tests, `pg` for DB access (no ORM).

## Docker Development Environment

Claude runs INSIDE a Docker container. All commands execute in the container, not on the host.

```bash
docker compose up -d                                     # dev container + postgres
docker compose exec dev claude --dangerously-skip-permissions
docker compose exec dev bash                             # or just shell in
docker compose down                                      # stop
```

The container mounts `.` as `/app`, so code edits persist on the host. Host ports:
app on **3003**, bundled postgres on **5433** (override via `APP_PORT` / `POSTGRES_PORT`).

## TDD Workflow

Every change follows: **red → green → refactor → validate → commit**.

1. Write a failing test FIRST.
2. Write the minimum code to make it pass.
3. Refactor if needed, keeping tests green.
4. Run validation — all checks must pass.
5. Commit.

Validate command: `npm run validate` (= `vitest run && tsc --noEmit && next build`)

## Grader (Ollama)

`lib/grading.ts` + `POST /api/grade` grade Open answers strictly against Model Answer +
Criteria (the model must not use its own knowledge). Env:

- `OLLAMA_URL` (default `http://127.0.0.1:11434`), `MODEL` (default `qwen3.5:4b`)
- `OLLAMA_THINK` (`false`), `OLLAMA_KEEP_ALIVE` (`-1`), `OLLAMA_TIMEOUT_MS` (`45000`)
- `OPEN_PASS` (`0.6`) — pass threshold for Open answers
- `GRADER_BEST_OF` (`1`) — set to `2` to grade twice and union met Criteria
  (mitigates the ~13% per-criterion false negatives at 2× latency/cost)

With Ollama down, `/api/grade` returns 502 fast and the player falls back to
Self-Assessment — the app must stay fully usable.

After any prompt or model change, run the eval harness against a real course
(needs live Ollama, not part of `npm test`):

```bash
npm run eval-grader -- espresso        # 4 questions × 3 tiers × 2 reps
npm run eval-grader -- espresso 6 3    # more coverage
```

Baseline (qwen3.5:4b): full-answer tier ≈ 0.88, ~13% per-criterion false
negatives, ~0% false positives.

## The three product skills & the core loop

Courses are authored with three in-repo skills (`.claude/skills/`):

- **`/design-course <slug>`** — two-persona deliberation (fixed Pedagogue at
  `.claude/agents/pedagogue.md` × generated Mission-Achiever) → `CURRICULUM.md`
  in the course workspace. Optional; small courses go straight to `/teach`.
- **`/teach`** — authors lessons/references/quizzes under `public/courses/<slug>/`,
  follows `CURRICULUM.md` when present. Never writes bank files.
- **`/author-bank <slug>`** — authors `bank/*.json` per its QUESTION-FORMAT rigor
  rules; output must pass `lib/bank.ts` validation and calibrate on the eval harness.

The core loop: **design → teach → author-bank → study in the app → export
progress report → paste into /teach** (the report's headings are a contract —
see `lib/report.ts`). Formats are contracts shared with the app: bank schema
(`lib/bank.ts`), report headings (`lib/report.ts`), lesson format
(`packages/teachdown/TEACHDOWN-FORMAT.md`, parsed/validated by the `teachdown`
workspace package).

## Self-hosting

`Dockerfile.prod` builds a production image. Bring your own PostgreSQL 16
(`DATABASE_URL`) and, optionally, an Ollama endpoint for grading — without one
the app runs fine and Open answers fall back to Self-Assessment.

## Language

Code, comments, commits, docs: English (including question-bank JSON keys). UI copy lives
in `messages/*.json` (`en` + `pt-BR`); course content language is per-course.
