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
| H-4 | A settlement is checked against Hedera consensus, not against the facilitator's receipt | `MIRROR_LIVE=1 npm test --prefix chain` | `chain/evidence/mirror-no-credentials.txt` — live mirror-node reads of a real testnet transfer, its credit summed and matched; **no credentials of any kind** | proven |
| H-5 | A false receipt is caught and named: unknown transaction, not-successful, payee-not-credited, wrong-amount | same command, `chain/test/mirror.test.ts` + `mirror.live.test.ts` | a receipt naming a transaction consensus never saw is rejected live; the other three are unit-covered | proven for `unknown-transaction` live, offline for the rest |
| E-1 | An agent's identity resolves live through ENS on Sepolia | `SEPOLIA_RPC_URL=… npm test --prefix chain` | `vitalik.eth` → `0xd8dA6BF2…96045` via resolver `0xae66c62A…b2Ba`, live test in #17 | proven |
| E-2 | An unregistered name is distinguishable from a cleared record | same command, `ens.live.test.ts` | live revert vs. zero-address, both asserted | proven |
| E-4 | An address's *primary name* resolves, and the name is checked to point back at the address | `SEPOLIA_RPC_URL=… npm test --prefix chain` | `chain/evidence/ens-reverse-no-credentials.txt` — `0x21A5C13B…96F8` → `kahlotyroneshoes.eth`, `mutual: true`, live | proven |
| E-5 | An address advertising a name it cannot back is a *named* refusal, not a crash or an accepted identity | same command | same file: `0x9703d9cF…D1e9` → `no-forward-resolver ariutokintumi.eth`, decoded from the Universal Resolver's `ResolverNotFound(bytes)` custom error | proven |
| E-3 | Revocation is *published* to ENS onchain | — | — | blocked — needs a funded Sepolia account; **do not claim** |
| B-1 | A Recipe measurably improves an agent's use of our service | same prompt/model/settings, raw-API arm vs. Recipe arm (ADR-0004) | *(both transcripts, verbatim)* | blocked — needs a bazantic.com account |
| B-2 | Our service is reachable by an agent through a Bazantic x402/MPP gateway + MCP server | *(to be written)* | — | blocked — same |

## Agent-surface claims (MCP, no sponsor account)

These are about our own tool server, not about Bazantic. Bazantic qualification needs their account,
gateway, Recipe and measured runs; none of those exist and **B-1/B-2 stay blocked regardless of
these rows**.

| # | Claim | How to reproduce | Evidence | Status |
|---|---|---|---|---|
| M-1 | An agent host can hold the delegated authority as MCP tools, not as our demo script | `npm test --prefix surface`; run it with `npm run mcp --prefix surface` | `surface/src/mcp.ts` — six tools over `@ehl/core`; protocol tests drive the real server through the SDK's in-memory transport (#28) | proven (offline) |
| M-2 | A policy refusal is a *successful* tool call carrying core's reason, and `isError` is reserved for tools that actually broke | same command | `{ allowed: false, reason: "OVER_LIMIT" }` with `isError` unset; a schema violation returns `isError: true` | proven (offline) |
| M-3 | A client that skips the preflight gains nothing — `spend` re-authorises internally | same command | `spend` calls `consume` regardless of whether `check_allowance` was called | proven (offline) |

## Core claims (no sponsor, no network)

| # | Claim | How to reproduce | Evidence | Status |
|---|---|---|---|---|
| C-1 | A child may be granted only a subset of its parent's authority; attenuation holds at every hop | `npm test --prefix core` | property tests, depth 1–5 | proven |
| C-2 | Over-budget requests are refused with a reason a caller can act on (`OVER_LIMIT`), not a bare deny | `DEMO-0002`, no credentials of any kind | `surface/evidence/demo-0002-over-limit.png`, transcript in `surface/evidence/refusals-no-credentials.txt` | proven |
| C-3 | Revoking a parent refuses the whole subtree, and reports *which* — `REVOKED` vs `PARENT_REVOKED` | `DEMO-0003`, no credentials | `surface/evidence/demo-0003-revoked.png` (`REVOKED`, the cut grant); `PARENT_REVOKED` for a descendant asserted in `surface/test/handler.test.ts` | proven for `REVOKED`; `PARENT_REVOKED` offline only |
| C-4 | Revoking one child leaves its sibling unaffected | `DEMO-0004`, no credentials for the authorisation half | `surface/evidence/demo-0004-sibling-no-key.png` — `child-a` revoked, `child-b` still holds its full 300 000 tinybar and passes authorisation, then stops at `no Hedera key configured`; the settlement that would finish it is H-1 | proven that the sibling is unaffected; blocked for the settlement that follows |

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
2. **A funded Sepolia account** — unblocks E-3. The reads (E-1, E-2, E-4, E-5) need neither key nor
   gas, and are the whole ENS read surface.
3. **A bazantic.com account** — unblocks B-1 and B-2. The MCP server (M-1) is *ours*, and does not
   substitute for any of their requirements. If it never arrives, ADR-0004's fallback is two judged
   sponsors rather than an untested Recipe.
