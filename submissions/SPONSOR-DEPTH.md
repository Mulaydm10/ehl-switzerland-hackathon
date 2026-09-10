# Sponsor depth — every capability, the file that uses it, or the reason it is unused

Why this file exists: ADR-0005. A previous entry of ours lost a "best use of X" track to a project
that exercised roughly twenty of the sponsor's capabilities against our eight. Breadth of real use
was the axis; product quality was not. So the breadth is written down, scored honestly, and the gaps
are named rather than hoped over.

Three columns of truth: **used** means a file in this repo calls it and a test or transcript covers
it; **unused** means we don't, with the reason; **blocked** means the code path exists and a
zero-cost credential is the only thing missing. `blocked` rows are the ones worth reading — each one
is a checkbox a faucet would tick.

Nothing here upgrades a claim. Evidence lives in `RESULTS.md` and this file may not contradict it.

## Hedera / x402

| Capability | Status | Where |
|---|---|---|
| x402 v2 payment envelope (`PaymentRequired` terms, `PAYMENT-RESPONSE`) | used | `chain/src/pay.ts`, `chain/src/settle.ts`; the canonical header with legacy fallback |
| `exact` scheme on Hedera CAIP-2 (`ExactHederaScheme`, `HEDERA_TESTNET_CAIP2`) | used | `chain/src/settle.ts` |
| Blocky402 facilitator `/supported` discovery, incl. nested `extra.feePayer` | used | `chain/src/supported.ts`; the quoted fee payer is the facilitator's real one, not a constant |
| Facilitator `/settle` direct path (payer states terms) | used | `chain/src/settle.ts`, per `contracts/chain.md` |
| Hedera SDK transfer signing (`@hiero-ledger/sdk` `TransferTransaction`) | used | `chain/src/pay.ts` |
| HBAR asset (`0.0.0`) in atomic units (tinybar), `bigint` throughout | used | `core/src/types.ts`, `surface/src/routes.ts` |
| Two differently-priced x402 resources | used | `surface/src/routes.ts` — 100 000 vs 250 000 tinybar |
| HTTP 402 → sign → retry the *declared* resource URL | used | `surface/src/handler.ts`, `surface/src/payer.ts` |
| Refusal before quote (facilitator never called on a refused request) | used | `surface/src/handler.ts` `refuse()`; **H-3** |
| HashScan URL construction from a raw transaction id | used | `chain/src/hashscan.ts` (pure; unit-tested) |
| Bounded retry / typed `PaymentError` | used | `chain/src/pay.ts`, `chain/src/types.ts` |
| Mirror Node REST reads (account exists, balance, transaction lookup) | **queued** | needs no key at all — the one genuine Hedera depth item that a stranger can re-run with zero credentials |
| An actual settled transfer on testnet | **blocked** | free faucet key; **H-1/H-2** |
| Token (HTS) assets alongside HBAR | unused | the demo prices in HBAR; adding a token would broaden the asset column without changing what is being proven, and the settlement it depends on is blocked anyway |
| Hedera Consensus Service (HCS) as an audit log of grants | unused | needs a key, same block as H-1; and an audit topic duplicates `RESULTS.md` rather than adding a claim |
| Smart Contract Service | unused, by decision | ADR-0002: x402 settles a plain `TransferTransaction` and cannot call a contract, so onchain enforcement is off the critical path — declining this is the design, not a shortfall |

Honest count: eleven capabilities used, one queued, one blocked on a free key, three declined with
reasons. The blocked row is the expensive one — it is the row a judge on this track looks for first.

## ENS

| Capability | Status | Where |
|---|---|---|
| Resolution through the canonical Universal Resolver proxy | used | `chain/src/ens.ts`; the superseded implementation address this repo first recorded reverts today, which is why the proxy is pinned |
| `resolve(bytes name, bytes data)` with DNS-encoded names (ENSIP-10 shape) | used | `chain/src/ens.ts` |
| `addr` records → an agent's payout address | used | `chain/src/ens.ts` `resolveAddress`; **E-1** live on Sepolia |
| `text` records → agent metadata / vouches | used | `chain/src/ens.ts` `resolveText`, `vouchesFor` |
| Three-state resolution (`ok` / `unset` / `unresolvable`) | used | `chain/src/ens.ts`; a never-registered name and a *cleared* record are different facts, and a cleared record is what a revocation looks like from outside — **E-2** |
| Reverse resolution (address → primary name) | **queued** | read-side, free, and it closes the loop: the surface can name the agent that is paying instead of printing an account id |
| Publishing a revocation onchain (write to a resolver) | **blocked** | funded Sepolia account; **E-3**, and we do not say "published onchain" until a transaction exists |
| Registering the demo agents' own `.eth` names | **blocked** | same faucet; the demo currently resolves names it does not own, which is a read-only demo by necessity |
| ENSIP-16 metadata / offchain (CCIP-read) names | unused | interesting but it proves the resolver's feature, not our claim |

## Bazantic

Every row is blocked on one thing only: an account on their platform, which design cannot create on
Dhruv's behalf (ADR-0004).

| Requirement | Status |
|---|---|
| bazantic.com account + username in the submission | **blocked** — human |
| x402 / MPP gateway | blocked behind the account |
| MCP server exposing our API | blocked behind the account — and per ADR-0005 G-3 this is the single highest-value remaining build in the repo if the account appears, because authoring a tool surface is the depth signal we were short of last time |
| A Recipe (when/why/how to use the service) | blocked behind the account |
| Same task twice, identical prompt/model/settings, Recipe as the only difference | blocked behind the account |
| Repeatable improvement, both arms published (including the arm that did worse) | blocked behind the account |
| Video walkthrough of the difference | blocked behind the account |

Current honest score on this sponsor: zero of seven. Either the account exists and we build the
other six, or Bazantic is dropped and the submission says so in the same words — ADR-0004 already
chose the fallback.

## What this table says to the human, in one line

Two free credentials — a Hedera testnet key and a Sepolia faucet — convert four `blocked` rows into
`used`, and they are the same class of gap that cost us the last hackathon (ADR-0005 G-2). The third
gap, Bazantic, needs an account and nothing else.
