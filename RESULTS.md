# RESULTS — every public claim, and the artifact that backs it

ADR-0003 fixed the project's claim as *evidence, not mechanism*. This file is where that promise is
kept or visibly broken: one row per claim the README, the video, or the submission text is allowed
to make. **A row with an empty evidence column has not been demonstrated, and no deliverable may
assert it** — not softened, not implied, not in a bullet that "summarises" it.

Rows are never deleted. A claim that failed stays here with its failure, because a results table
that only contains successes is a marketing page and judges read it as one.

Status vocabulary, deliberately small:

- **proven** — the artifact exists and a stranger can re-check it without us.
- **blocked** — the code path exists and the blocker is named; nothing is claimed.
- **not run** — implemented, nobody has executed it yet.

A refusal costs no key, no funds, and no chain: the server decides before it quotes a price. So the
refusal rows are reproducible by a judge holding nothing at all, and are recorded separately from
the settling rows, whose evidence is a HashScan link nobody can fabricate.

## Sponsor claims

| # | Claim | How to reproduce | Evidence | Status |
|---|---|---|---|---|
| H-1 | A child agent's in-allowance request settles real HBAR on Hedera testnet | `DEMO-0001` | *(HashScan link)* | blocked — no testnet credentials |
| H-2 | Two differently-priced routes settle the exact quoted amount, not a fixed unit | `DEMO-0001` + `DEMO-0004` (100 000 vs 250 000 tinybar) | *(two HashScan links)* | blocked — same |
| H-3 | A refused request reaches the facilitator **never** — refusal precedes settlement | `npm test --prefix surface` (the facilitator double is asserted un-called) | offline test, green in CI on #14 | proven (offline) |
| E-1 | An agent's identity resolves live through ENS on Sepolia | `SEPOLIA_RPC_URL=… npm test --prefix chain` | `vitalik.eth` → `0xd8dA6BF2…96045` via resolver `0xae66c62A…b2Ba`, live test in #17 | proven |
| E-2 | An unregistered name is distinguishable from a cleared record | same command, `ens.live.test.ts` | live revert vs. zero-address, both asserted | proven |
| E-3 | Revocation is *published* to ENS onchain | — | — | blocked — needs a funded Sepolia account; **do not claim** |
| B-1 | A Recipe measurably improves an agent's use of our service | same prompt/model/settings, raw-API arm vs. Recipe arm (ADR-0004) | *(both transcripts, verbatim)* | blocked — needs a bazantic.com account |
| B-2 | Our service is reachable by an agent through a Bazantic x402/MPP gateway + MCP server | *(to be written)* | — | blocked — same |

## Core claims (no sponsor, no network)

| # | Claim | How to reproduce | Evidence | Status |
|---|---|---|---|---|
| C-1 | A child may be granted only a subset of its parent's authority; attenuation holds at every hop | `npm test --prefix core` | property tests, depth 1–5 | proven |
| C-2 | Over-budget requests are refused with a reason a caller can act on (`OVER_LIMIT`), not a bare deny | `DEMO-0002`, no credentials of any kind | `surface/evidence/demo-0002-over-limit.png`, transcript in `surface/evidence/refusals-no-credentials.txt` | proven |
| C-3 | Revoking a parent refuses the whole subtree, and reports *which* — `REVOKED` vs `PARENT_REVOKED` | `DEMO-0003`, no credentials | `surface/evidence/demo-0003-revoked.png` (`REVOKED`, the cut grant); `PARENT_REVOKED` for a descendant asserted in `surface/test/handler.test.ts` | proven for `REVOKED`; `PARENT_REVOKED` offline only |
| C-4 | Revoking one child leaves its sibling unaffected | `DEMO-0004` | sibling reaches the payment step untouched (transcript, same file); the settlement that would finish it is H-1 | blocked — the *unaffected* half needs the Hedera key |

## Prior art credited, per ADR-0003 and ADR-0004

Not evidence for us — evidence that we read the field before claiming anything in it.

| Work | What it already does | Where we say so |
|---|---|---|
| PlanBound (ETHGlobal Lisbon 2026) | Single-use funded account as the enforced ceiling, since escrow cannot sit in an x402 payment path | README, video, submission text |
| VERA (arXiv 2608.30091) | Edge-exact revocation; names subtree cascade as over-revoking under multi-parent | Submission text; our single-parent choice is *because* of it |
| `@bazantic/cli` `bazantic grant` | Capped, revocable authority to spend from a hosted balance, delegated to a device | Video and submission text, before a judge raises it |
| macaroons / UCAN / ZCAP-LD, `draft-asor-wimse-agent-delegation-chain-01`, `draft-pidlisnyi-aps-02` | Monotonic attenuation, spend as a first-class constraint | Submission text |

## What is blocked on a human, right now

1. **Hedera testnet credentials** — account id + private key. Everything chain-side is written and
   tested against a double; without these, rows H-1 and H-2 stay empty and the demo's pay button
   answers `no Hedera key configured`, which is honest and unimpressive.
2. **A funded Sepolia account** — unblocks E-3. Reads (E-1, E-2) need neither key nor gas.
3. **A bazantic.com account** — unblocks B-1 and B-2. If it never arrives, ADR-0004's fallback is
   two judged sponsors rather than an untested Recipe.
