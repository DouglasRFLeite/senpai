---
name: author-bank
description: Author or extend a course's Question Bank (bank/*.json) — summative MC and open questions the Senpai app drills and the Ollama grader scores.
disable-model-invocation: true
argument-hint: "<course-slug> [topic or source material]"
---

The user wants Question Bank content for a course. The Bank is the summative layer of Senpai: the app builds Exams, Quick Practice and Topic Drills from it, and open answers are graded by a small local model strictly against YOUR Model Answer and Criteria. Every rule below exists because a 4B grader is unforgiving of sloppy authoring.

## Where things live

- Bank files: `public/courses/<slug>/bank/*.json` (relative to the repo root). The app merges every `*.json` in the dir — split files by topic or type as suits the course (`mc.json` + `open.json`, or `iter-criminis.json`, …).
- Schema and rigor rules with worked examples: [QUESTION-FORMAT.md](./QUESTION-FORMAT.md). Read it before writing a single question.
- The validator: `lib/bank.ts` — it runs on every load and fails loudly, naming the file and question. Your output MUST pass it with zero errors.
- English JSON keys always; question content in the course's own language.

## Workflow

1. **Ground yourself.** Read the course's `MISSION.md`, `CURRICULUM.md` (if present — it says what each unit should drill), `RESOURCES.md`, and existing `bank/*.json`. When the Mission is an exam, mirror the real exam's style, sources and difficulty — that's the product.
2. **Fix the topic list first.** Topics drive the app's Topic Drill and per-topic accuracy. Keep a small controlled list per course (reuse the existing bank's topics; add sparingly). Never invent a one-question topic when an existing one fits.
3. **Author per the format doc**, one topic at a time. Unique ids within the course (`M##` for MC, `A##` for open is the convention).
4. **Validate**: load the bank and confirm zero errors — e.g.
   ```bash
   node -e "const{loadBank}=require('./lib/bank.ts');console.log(loadBank('<slug>').length,'questions ok')"
   ```
5. **Calibrate the open questions** (needs live Ollama):
   ```bash
   npm run eval-grader -- <slug>
   ```
   Tier "full" feeds each question its own Model Answer — it should score ≈ 1.0. **A Model Answer that scores below ~0.9 against its own Criteria is a bug in the QUESTION, not the grader**: a criterion is compound, requires outside knowledge, or isn't actually satisfied by the Model Answer. Fix the question and re-run before ever blaming the grader. Baseline (qwen3.5:4b, the reference course it was calibrated on): full ≈ 0.88, false positives ≈ 0.
6. **Show the user a sample** (one MC + one open) before mass-producing, and confirm the topic list.

## What this skill does NOT do

- No lessons, no reference docs — that's `/teach`.
- No inline lesson Quizzes — those live in lesson HTML per `/teach`'s EXERCISE-FORMAT.
- No grader prompt changes. If calibration is off after the questions are clean, report it; the grader is owned by `lib/grading.ts` and measured by the harness.
