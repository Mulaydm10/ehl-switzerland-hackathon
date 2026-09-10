# ADR-0001: This scaffold's own structural choices

**Status:** Accepted

**Date:** 2026-09-10

## Context

This repo was scaffolded before the event identity, the thesis, the idea, and the stack were known —
only "an ETH hackathon in Switzerland" was given. The scaffold itself needed a set of decisions about
how to represent that much uncertainty without either inventing facts or leaving the repo unusable.
This ADR documents those scaffolding decisions as a real, non-empty example of the ADR process
described in `design/README.md`.

## Options considered

1. **Guess the event identity / thesis / stack to make the repo look complete.** Rejected — a
   plausible fabrication (e.g. assuming an onchain/Ethereum event) is far more expensive to detect
   and unwind later than an obvious `TODO(Dhruv)` blank, and a wrong assumed hard rule can disqualify
   a submission.
2. **Leave everything blank with no structure until facts arrive.** Rejected — an agent picking this
   up cold would have nothing to reconstruct state from, failing goal #1 of this scaffold (cold-start
   reconstructability).
3. **Scaffold full structure, fill every unknown with `TODO(Dhruv)`, and register each unknown as a
   tracked open question (`Q-####`) with an explicit priority ordering.** Chosen.

## Decision

Scaffold the full three-piece cold-start pattern (`CLAUDE.md` / `STATE.md` / `worklog.md`) plus the
hackathon layer (`COMPETITION.md`, `DEMO.md`, `AGENTS.md`, `notes/judging_alignment.md`,
`submissions/`) with every unknown fact marked `TODO(Dhruv)`, and register the three biggest unknowns
as open questions: **Q-0001** (event identity — highest priority, since it determines whether an
onchain dimension exists at all), **Q-0002** (thesis — nothing else can be built without it), and
**Q-0003** (stack — deferred to `ADR-0002-stack-selection.md`, kept open rather than guessed).
`ideas/` is included (idea not yet chosen); `data/`, `models/`, `evals/`, and `contracts/` are
omitted (no ML pipeline, no confirmed agentic subject matter, and no confirmed onchain dimension in
the brief).

## Consequences

- Makes it easy for a cold agent to see exactly what's known vs. unknown and why (grep
  `TODO(Dhruv)`, grep `Q-####`).
- Makes it slightly slower to "look done" on first read — intentional; a hackathon scaffold that
  looks finished before the idea exists would mislead whoever picks it up next.
- Directly opens `ADR-0002-stack-selection.md` (Q-0003) as the next structural decision to resolve,
  and `ideas/README.md` as the place to resolve Q-0002 once candidate ideas exist.
