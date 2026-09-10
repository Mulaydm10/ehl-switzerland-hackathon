# ADR-0002: Stack selection

**Status:** Proposed

**Date:** 2026-09-10

## Context

No stack has been chosen. This is a deliberate decision, not an omission: the idea isn't chosen yet
(`VISION.md`, Q-0002), and the event identity itself is unresolved (`COMPETITION.md`, Q-0001) — an
onchain-shaped event vs. a plain software/AI hackathon would plausibly point at different stacks. Per
the scaffold's own rule, no `pyproject.toml`, `package.json`, `Makefile`, `.python-version`, or
language-specific `src/` tree has been created — committing to one now would have to be unwound the
moment the idea or event identity clarifies.

Registered as **Q-0003** in `research/open_questions.md`.

## Options considered (candidates, not a decision)

1. **Python** — fast for ML/data/agent-orchestration work, huge library surface, good for a backend +
   notebook-driven demo. Weaker for a polished frontend under time pressure.
2. **TypeScript/Node (full-stack, e.g. Next.js)** — strong for a judge-facing web demo with minimal
   glue, good for a hosted deployment. Weaker if the idea turns out to be ML/data-heavy.
3. **Both (Python backend + TypeScript frontend)** — most flexible, most setup overhead; only worth
   it if the idea clearly needs both a serious backend and a polished UI.
4. **Something event-specific** (e.g. a Solidity/onchain toolchain, a specific SDK a sponsor
   provides) — only in scope if Q-0001 resolves to an onchain-shaped event; do not scaffold this
   speculatively.

## Decision criteria

- What does the chosen idea actually need (data/ML pipeline vs. web demo vs. both)?
- What does the resolved event identity require or provide (sponsor SDKs, onchain tooling, a
  specific deployment target)?
- What does the team already know well enough to move fast under deadline pressure — under a hard
  deadline, familiarity often beats theoretical fit.
- Whatever is chosen must land with a **green smoke test in the same change** — see the binding rule
  below.

## Decision

Not yet made. TODO(Dhruv) once the idea and event identity are known enough to decide.

## Consequences / binding rule

Whoever resolves this ADR (flips Status to Accepted and names the choice) must, in the **same
change**:
1. Add the toolchain config (e.g. `pyproject.toml` and/or `package.json`) and a language-appropriate
   `src/` tree.
2. Fill in `CLAUDE.md`'s canonical-commands section (build/run/test/lint).
3. Land a **real, passing** smoke test — not a stub, not a placeholder that always passes.
4. Update `tests/README.md` to describe the real baseline instead of stating there is none.
5. Close Q-0003 in `research/open_questions.md`.
