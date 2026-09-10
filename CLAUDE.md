# CLAUDE.md

This is the auto-loaded cold-start entry point for Claude Code in this repo. Keep it under ~120
lines. It points outward; it never duplicates another doc — if you're about to paste a rubric weight
or a deadline in here, stop and link to `COMPETITION.md` instead.

## What this is

An ETH-Switzerland hackathon repository, scaffolded before the idea, stack, and even the exact event
identity were finalized. It is built to be picked up **cold** by a human under deadline pressure or
by an AI agent with no memory of prior sessions — both must be able to reconstruct full project state
from the files in this repo alone.

## Read order (cold start)

1. `CLAUDE.md` (this file) — or `AGENTS.md` if you are not Claude Code
2. `STATE.md` — live snapshot, wins on any conflict with the worklog
3. `VISION.md` — the thesis (currently all `TODO(Dhruv)`)
4. `COMPETITION.md` — event facts, single source of truth (currently all `TODO(Dhruv)` — **event
   identity itself is unresolved**, see Q-0001)
5. `GOVERNANCE.md` — who owns what, LOCKED vs. not
6. `AGENTS.md` — agent-bus protocol (claiming/lanes/PRs, live since the 2026-09-10 graft); the
   hackathon-specific concurrency model (surface ownership, escalation) moved to
   `AGENTS-project.md` — read both
7. `worklog.md` (recent tail) — how we got to the current state
8. `experiments/experiment_log.md` — what's been tried

## Governance, in one paragraph

Dhruv is the Main Agent and sole authority over LOCKED files (event facts, the vision, and process
definitions in `design/`, `experiments/`, `research/`, `notes/ai_onboarding_prompt.md`, `logs/`,
`tests/`). LOCKED files carry a banner and may only be changed by Dhruv or with Dhruv's sign-off, with
every edit — including initial authorship — logged in `GOVERNANCE.md`'s audit table. `CLAUDE.md`,
`STATE.md`, `AGENTS.md`, and `DEMO.md` are deliberately **not** locked: their value is staying
current. `worklog.md` and the other append-only logs are never edited, only appended to. Full detail
in `GOVERNANCE.md`.

## ID scheme

One scheme, threaded through every log, table, and directory name, so `grep -rn '<ID>' .` recovers a
thing's full trace:

- `ADR-####` — architecture/process decisions, in `design/decisions/`
- `Q-####` — open questions, in `research/open_questions.md`
- `EXP-####` — experiments/spikes, in `experiments/experiment_log.md` and `logs/`
- `DEMO-####` — demo scenarios, in `DEMO.md`

## Unit of ownership

Top-level directories are the unit of ownership (see `AGENTS.md`). This keeps the layout lane-shaped
in case this repo is later put on the agent-bus protocol, where a lane is a top-level directory.

## Canonical commands

**Stack is undecided.** There is no build, run, lint, or test command yet — see
`design/decisions/ADR-0002-stack-selection.md` and `Q-0003`. This section is `TODO(Dhruv)`.

**Binding rule:** whoever resolves ADR-0002 fills in this section *and* lands a green smoke test *in
the same change*. Do not fill in commands here without also making them pass.

```
Build:  TODO(Dhruv)
Run:    TODO(Dhruv)
Test:   TODO(Dhruv)
Lint:   TODO(Dhruv)
```

## Hard rules

- Never restate a `COMPETITION.md` fact (deadline, rubric weight, hard rule) elsewhere — link to it.
- Never invent a thesis, event identity, deadline, or rubric weight to fill a `TODO(Dhruv)`. An
  obvious blank is cheap to spot; a plausible fabrication is not.
- Any agent finishing a unit of work updates `STATE.md` before yielding — including when yielding
  because you're blocked or out of turn budget. See `AGENTS.md`.
- `DEMO.md` must stay runnable at all times once a demo path exists. Fixing a broken demo outranks
  building new features.
- Do not add a `contracts/`, Solidity, or other onchain surface until Q-0001 (event identity)
  resolves that it's in scope.

## End-of-session checklist

1. Overwrite `STATE.md` with the current snapshot.
2. Append a dated **and timestamped** entry to `worklog.md`.
3. Append any new `EXP-####` row to `experiments/experiment_log.md`.
4. If you touched a LOCKED file, log it in `GOVERNANCE.md`'s audit table.
5. Release any work claim you held in `STATE.md`'s claims table.
6. If a doc you touched is still full of `TODO(Dhruv)`, say so out loud rather than inventing content
   to fill it.
