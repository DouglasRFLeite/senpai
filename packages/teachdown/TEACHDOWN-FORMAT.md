# Teachdown format

The authoring contract for Senpai lessons and references. `/teach` writes
`.md` files against this spec; `packages/teachdown` parses and validates them; the app
renders them. This document is a contract peer of the bank schema (`lib/bank.ts`) and the
report headings (`lib/report.ts`) — change it only together with the parser and its tests.

A Teachdown file is CommonMark + GFM (tables, task lists, strikethrough, autolinks) plus
YAML frontmatter and a **fixed directive vocabulary**. Anything the vocabulary doesn't
cover is plain markdown prose. Unknown directives are validation **errors**, not warnings:
a new pedagogical shape means a new directive in this package first.

## File identity

A lesson is `public/courses/<slug>/lessons/<stem>.md`; a reference is
`public/courses/<slug>/reference/<stem>.md`. The **stem** (e.g.
`0003-how-a-blockchain-works`) is the lesson's identity everywhere: the route
(`/courses/<slug>/lessons/<stem>`), `Lesson.file`, and the `events.lesson_file` key.
Lessons sort by filename — keep the `NNNN-` prefix.

## Frontmatter

```yaml
---
title: How a Blockchain Actually Works   # required — the page <h1> and list title
unit: Unit 1                             # optional — feeds the kicker chrome
related:                                 # optional — cross-links rendered as chrome
  - reference/glossary                   #   `reference/<stem>` → a reference doc
  - 0002-accounts-balances-and-wei       #   bare stem → a sibling lesson
---
```

- `title` (string, required). Missing/empty title is a validation error.
- `unit` (string, optional). The app renders the kicker (`Unit 1 · Lesson 03 · Course`)
  from it — never author a kicker in the body.
- `related` (list of strings, optional). Bare stems point at sibling lessons,
  `reference/<stem>` at the course's reference docs. Prev/next links are app chrome
  derived from lesson order — don't author them.

## Directives

Container directives per `remark-directive`: `:::name{attrs}` … `:::`. Attributes use
`{key="value"}`; ids use the shorthand `{#my-id}`. The vocabulary is **frozen** at:
`quiz`, `ordering`, `note`, `warn`, `win`, `jargon`, `source`.

Only the `:::` container form is vocabulary. The inline `:name`/`::name` colon forms are
treated as plain text (ordinary prose like "a 1:2 ratio" must never trip the parser).

### `quiz` — one multiple-choice question

One directive per question. Body = prompt (any prose), then **exactly one** list whose
items are GFM task-list options; **exactly one** option is checked (`[x]`) — the correct
one. Options may contain inline markdown (code, emphasis, links).

```markdown
:::quiz
The only way to change on-chain state is by sending a…

- [ ] a brand new node
- [x] a signed transaction
- [ ] a read-only query
:::
```

Progress identity: a question's `questionId` defaults to its **1-based position among all
quiz questions in the lesson**, in document order. `:::quiz{#gas-halting}` pins an
explicit id instead. Converted lessons must preserve question order (or pin ids) so a
Learner's struggle-spot history survives.

Behavior (rendered by the app, fixed): a wrong click flags only the clicked option and
disables it; after 2 wrong tries the correct answer is revealed. A question is *resolved*
when answered correctly or revealed. `lesson_completed` fires once when every quiz
question in the lesson is resolved; a lesson with no quiz emits only `lesson_viewed`.

Validation errors: no options list, more than one list, zero or multiple `[x]`, non-task
list items mixed in.

### `ordering` — click-in-order sequence

Body = optional prose prompt, then **exactly one ordered list** in the **correct order**
(the app shuffles presentation deterministically). Practice-only: emits no events and
does not gate `lesson_completed`.

```markdown
:::ordering
Order the lifecycle — click them 1 → 5:

1. You sign a `transfer` transaction with your key
2. The transaction is broadcast to the network's nodes
3. A validator includes it in the next block
4. The block is hash-linked to the chain; it's now immutable
5. Every node updates its copy of the state
:::
```

Validation errors: no ordered list, more than one list, fewer than 2 items.

### `note` / `warn` / `win` — callouts

Prose callouts; optional `title` attribute. `note` is neutral context, `warn` is a
pitfall, `win` marks the lesson's payoff moment.

```markdown
:::note{title="Why your client is paying for this"}
A private database of "who owns which share" requires trusting whoever runs it.
:::
```

### `jargon` — term definitions

Each line is `term :: definition` (definition may contain inline markdown). Renders as a
definition list.

```markdown
:::jargon
It's signed :: Authorized by the sender's private key. Nobody can move shares without it.
It's deterministic :: Same starting state + same transaction = same new state, everywhere.
:::
```

One entry per source line — don't hard-wrap an entry, since a new line starts a new entry.

Validation errors: a non-empty line without ` :: `, an empty body.

### `source` — primary-source pointer

Prose block pointing the Learner at the primary source to read next. Optional `title`
attribute (defaults handled by the app).

```markdown
:::source
[ethereum.org — Intro to Ethereum](https://ethereum.org/en/developers/docs/intro-to-ethereum/)
(accounts, transactions, the EVM). High-trust, vendor-neutral.
:::
```

## Code fences

Language after the backticks; a filename via fence meta:

````markdown
```go title="main.go"
package main
```
````

## What is NOT authored content

The app renders as chrome (never write these in the body): the kicker, the `<h1>` title,
prev/next lesson links, related links, the teacher nudge, completion state. Per-course
stylesheets don't exist; palette comes from `lib/theme.ts`. Course `assets/` hold static
media only (images, diagrams).

## Degradation

Outside Senpai, any markdown renderer shows the prose; directives degrade to their
inner text. Widgets (quiz, ordering) are interactive only in the app.
