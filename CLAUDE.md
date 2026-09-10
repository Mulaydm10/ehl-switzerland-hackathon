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

**Stack: TypeScript/Node** (ADR-0002); Python exists only for the bus canary.

Setup once per worktree: `bash docs/setup.sh` — installs the canary's Python deps and runs an
install in each lane directory that has a `package.json`.

The authoritative per-lane test commands are `docs/verify.txt`, because that is the file CI runs.
Do not restate them elsewhere; the copies below are the same lines:

```
Test (core):     npm test --prefix core
Test (chain):    npm test --prefix chain
Test (surface):  npm test --prefix surface
Test (canary):   python3 -m pytest tests/canary -q
Build / Run:     per-lane, defined by that lane's package.json scripts
Lint:            TODO — set by the first lane PR that adds a linter, then recorded here
```

A lane's command fails until that lane's first PR adds a `package.json` with a real `test` script.
That is the intended order (ADR-0002 "Deviation"), not a broken baseline: design branches are
forbidden by CI from creating files inside lane directories.

## Hard rules

- Never restate a `COMPETITION.md` fact (deadline, rubric weight, hard rule) elsewhere — link to it.
- Never invent a thesis, event identity, deadline, or rubric weight to fill a `TODO(Dhruv)`. An
  obvious blank is cheap to spot; a plausible fabrication is not.
- Any agent finishing a unit of work updates `STATE.md` before yielding — including when yielding
  because you're blocked or out of turn budget. See `AGENTS.md`.
- `DEMO.md` must stay runnable at all times once a demo path exists. Fixing a broken demo outranks
  building new features.
- **No Solidity or other authored onchain surface**, and not because of Q-0001: ADR-0002 removed it
  from the critical path. Hedera x402 settles a plain `TransferTransaction` and cannot call a
  contract, and the ENSv2 contracts are already deployed by the organisers — we *call* them. Note
  `contracts/` here means the bus's lane-interface docs (`contracts/<lane>.md`), not Solidity.
- Q-0001 (event identity) is still formally open because `COMPETITION.md` is LOCKED and unwritten.
  Until Dhruv writes it, **do not restate the event name or deadline anywhere** — link to
  `COMPETITION.md` and let it stay visibly blank rather than filling it in from memory.
- Never assert in the README, the video, or the submission text anything the demo does not actually
  produce. Every claim traces to a row in the results table (ADR-0003).
- Prior-art credit — PlanBound, VERA, the IETF drafts — is a required section of the submission,
  not a courtesy (ADR-0003).
- A claim about someone else's system is unverified until you have fetched the artifact (bytecode,
  ABI, paper, package). One fabricated citation already survived two review passes here; see
  ADR-0003's standing hazard.

## End-of-session checklist

1. Overwrite `STATE.md` with the current snapshot.
2. Append a dated **and timestamped** entry to `worklog.md`.
3. Append any new `EXP-####` row to `experiments/experiment_log.md`.
4. If you touched a LOCKED file, log it in `GOVERNANCE.md`'s audit table.
5. Release any work claim you held in `STATE.md`'s claims table.
6. If a doc you touched is still full of `TODO(Dhruv)`, say so out loud rather than inventing content
   to fill it.
