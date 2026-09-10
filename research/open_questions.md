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

---

## Q-0004 — Can a registered Bazantic gateway carry upstream auth to a non-Base x402 origin?

**Status:** Open (non-blocking)

**Question:** `bazantic-cli` settles USDC on Base/Base-Sepolia only and cannot produce a Hedera
`TransferTransaction`, so it cannot be the payer for our Hedera-settled upstream (verified — see
`contracts/surface.md`). Unknown is whether the *hosted gateway*, as opposed to the CLI, can carry
upstream auth to an origin that itself demands x402 on another chain.

**Why it does not block:** the answer changes nothing about the build. Two surfaces (Hedera for
settlement, Bazantic for discovery) is the design either way; a "yes" would only add a nicer demo
path. Ask the sponsor's Discord rather than spending a spike on it.

**Resolves into:** `contracts/surface.md`.

**Resolution:** TODO

---

## Q-0003 (superseded entry — append-only, original above stands)

**Status:** Resolved 2026-09-10 by ADR-0002.

**Resolution:** **TypeScript/Node**, Python retained only for the bus canary. Forced by the rails:
`@x402/hedera` + Hedera JS SDK, viem/ethers for the hackathon ENSv2 deployment (which requires
overriding viem's hardcoded Universal Resolver), and Node for Bazantic. **No Solidity toolchain** —
Hedera x402 cannot settle into a contract call, and the ENSv2 contracts are already deployed by the
organisers, so we call them rather than author them.

ADR-0002's binding rule is only **partly** discharged, deliberately and in the open: `CLAUDE.md`
commands are filled in here, but the toolchain config and smoke test live inside lane directories
that CI forbids a `design/*` branch from touching, so they are the acceptance criteria of each
lane's first issue instead. LOCKED `tests/README.md` still needs Dhruv. See ADR-0002 "Deviation".
