# Open questions

Append-only. Each question gets a stable `Q-####` ID, never reused or renumbered. Mark a question
**Resolved** in place (add a resolution note + date) rather than deleting it — the reasoning trail
matters as much as the answer.

## Q-0001 — What event is this actually? [HIGHEST PRIORITY]

**Status:** Open

**Question:** All that's known is "an ETH hackathon in Switzerland." Is this (a) an ETHGlobal-style
Ethereum/onchain hackathon, (b) an ETH Zurich or EPFL university hackathon with no onchain
assumption, or (c) an EHL Lausanne event? This is the single highest-priority unknown in the repo
because it determines whether an onchain/smart-contract dimension exists at all, which shapes
`VISION.md`, `COMPETITION.md`'s hard rules, and `ADR-0002-stack-selection.md`.

**Resolves into:** `COMPETITION.md` event-identity section.

**Resolution:** TODO(Dhruv)

---

## Q-0002 — What is the project thesis?

**Status:** Open

**Question:** No thesis has been given — what are we building, for whom, and why isn't it already
solved? `VISION.md` is fully `TODO(Dhruv)` pending this. Do not fabricate an answer here.

**Resolves into:** `VISION.md`.

**Resolution:** TODO(Dhruv)

---

## Q-0003 — What stack do we build on?

**Status:** Open

**Question:** Stack is deliberately undecided pending the idea (Q-0002) and event identity (Q-0001).
See `design/decisions/ADR-0002-stack-selection.md` for candidates and decision criteria.

**Resolves into:** `ADR-0002-stack-selection.md`, `CLAUDE.md` canonical-commands section,
`tests/README.md`.

**Resolution:** TODO(Dhruv) — binding rule: resolving this must land a green smoke test in the same
change (see ADR-0002).
