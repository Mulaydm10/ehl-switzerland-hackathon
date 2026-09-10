# ADR-0002: Stack selection

**Status:** Accepted — TypeScript/Node (see Decision). Partially discharged; see "Deviation".

**Date:** 2026-09-10

## Context

*(Written while the stack was still open; preserved as the situation that forced the decision. The
constraints that resolved it — the idea settling in ADR-0003 and the three rails' SDKs — arrived
later and are recorded under Decision.)*

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

**TypeScript/Node**, with Python retained *only* for the bus canary (`tests/canary`).

This is option 4 ("something event-specific") collapsing onto option 2, and it is forced rather
than preferred — every rail we must touch ships a TS SDK and nothing else usable:

- **Hedera x402** — the `@x402/hedera` client and Blocky402's facilitator API are TS-first; the
  payload is a signed `TransferTransaction`, produced by the Hedera JS SDK.
- **ENSv2 on the hackathon Sepolia deployment** — viem/ethers, and the hackathon requires
  *overriding* viem's hardcoded Universal Resolver (see `contracts/chain.md`), which is a
  TS-level concern.
- **Bazantic** — gateway/MCP registration and `bazantic-cli` are Node.

No Solidity toolchain: Hedera x402 cannot settle into a contract call, and the ENSv2 contracts we
need are already deployed by the organisers — we call them, we do not author them. This removes
Foundry/Hardhat from the critical path entirely.

Python stays installed because deleting it breaks the canary, and the canary is what certifies
every future workflow change.

## Consequences / binding rule

Whoever resolves this ADR (flips Status to Accepted and names the choice) must, in the **same
change**:
1. Add the toolchain config (e.g. `pyproject.toml` and/or `package.json`) and a language-appropriate
   `src/` tree.
2. Fill in `CLAUDE.md`'s canonical-commands section (build/run/test/lint).
3. Land a **real, passing** smoke test — not a stub, not a placeholder that always passes.
4. Update `tests/README.md` to describe the real baseline instead of stating there is none.
5. Close Q-0003 in `research/open_questions.md`.

## Deviation from the binding rule — stated, not silently skipped

The change accepting this ADR discharges **2** (`CLAUDE.md` commands) and **5** (Q-0003 superseded
by an appended entry, since `research/open_questions.md` is append-only). It does **not** discharge
1, 3, or 4, for two structural reasons rather than convenience:

- **1 and 3 are impossible from a design branch.** The toolchain config and the smoke test belong in
  `core/`, `chain/`, `surface/` — lane directories. CI (`lane`) confines `design/*` branches to
  everything *outside* lane directories, so design physically cannot create them. They are instead
  the **acceptance criteria of each lane's first issue**: no lane PR passes `run` until that lane
  has a `package.json` with a real `test` script, because `docs/verify.txt` invokes it.
- **4 is a LOCKED file.** `tests/README.md` may only be changed by Dhruv or with his sign-off, with
  a row in `GOVERNANCE.md`'s audit table.

**Outstanding, owned by Dhruv:** update LOCKED `tests/README.md` once `core/` lands its first real
test, and log it. Until then the repo correctly states it has no test baseline beyond the canary.
