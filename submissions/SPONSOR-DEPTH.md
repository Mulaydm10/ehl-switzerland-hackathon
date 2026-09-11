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
| Mirror Node REST reads (account exists, balance, transaction lookup) | used | `chain/src/mirror.ts`; live in `chain/test/mirror.live.test.ts`, transcript `chain/evidence/mirror-no-credentials.txt` — zero credentials |
| Consensus-verified settlement: a receipt is checked against the mirror node, not believed | used | `chain/src/mirror.ts` `confirmTransfer` + `disagreement`; **H-4/H-5** |
| Both transaction-id forms (`0.0.1@…` SDK form and the `-` REST/HashScan form) | used | `chain/src/mirror.ts` `toHashScanTxId` — the id we hold comes in the form the REST API does not accept |
| Entity-range and never-allocated account ids distinguished from empty accounts | used | `chain/src/mirror.ts`; a 404 and a malformed id are different facts |
| Consensus checks exposed to an agent host as a tool | used | `surface/src/mcp.ts` `verify_settlement`; unconfigured reader errors rather than reporting a false disagreement |
| An actual settled transfer on testnet | used | three of them, 100 000 ×2 and 250 000 tinybar, `0.0.10328195 → 0.0.10472555`; **H-1/H-2**, transcript `surface/evidence/live-settlement-run.txt` |
| A payer key proved against the key the account publishes, before signing | used | `chain/src/pay.ts` `signerForAccount` — bare hex is a valid ECDSA *and* ED25519 key, and the wrong reading settles as `INVALID_SIGNATURE` with the fee already paid; **H-6** |
| Native HBAR declared through x402 spend controls, with a payer-side per-payment ceiling | used | `chain/src/pay.ts` `createTestnetClient` — `@x402/hedera`'s default asset set is USDC, so an HBAR price is refused client-side until declared; **H-7** |
| Token (HTS) assets alongside HBAR | unused | the demo prices in HBAR; adding a token broadens the asset column without changing what is being proven — the allowance algebra is already asset-keyed |
| Hedera Consensus Service (HCS) as an audit log of grants | unused | an audit topic duplicates `RESULTS.md` rather than adding a claim; the grant tree's authority is the resource server, not a topic |
| Smart Contract Service | unused, by decision | ADR-0002: x402 settles a plain `TransferTransaction` and cannot call a contract, so onchain enforcement is off the critical path — declining this is the design, not a shortfall |

Honest count: nineteen capabilities used, none blocked, three declined with reasons. The row a judge
on this track looks for first — a settled transfer — is filled, by three transaction ids that
consensus agrees with. The key used was a throwaway and is being rotated; the ids outlive it.

## ENS

| Capability | Status | Where |
|---|---|---|
| Resolution through the canonical Universal Resolver proxy | used | `chain/src/ens.ts`; the superseded implementation address this repo first recorded reverts today, which is why the proxy is pinned |
| `resolve(bytes name, bytes data)` with DNS-encoded names (ENSIP-10 shape) | used | `chain/src/ens.ts` |
| `addr` records → an agent's payout address | used | `chain/src/ens.ts` `resolveAddress`; **E-1** live on Sepolia |
| `text` records → agent metadata / vouches | used | `chain/src/ens.ts` `resolveText`, `vouchesFor` |
| Three-state resolution (`ok` / `unset` / `unresolvable`) | used | `chain/src/ens.ts`; a never-registered name and a *cleared* record are different facts, and a cleared record is what a revocation looks like from outside — **E-2** |
| Reverse resolution (address → primary name) | used | `chain/src/reverse.ts` `primaryName`; live on Sepolia, **E-4** |
| Forward-confirmed reverse (the name must point back at the address) | used | `chain/src/reverse.ts` `mutualIdentity` — an unverified reverse record is a claim, not an identity |
| ENSIP-19 chain-specific reverse namespaces (`evmCoinType`, not just coinType 60) | used | `chain/src/reverse.ts`; a name set for mainnet and one set for Sepolia are different records |
| Universal Resolver custom errors decoded by selector (`ResolverNotFound(bytes)`, DNS-decoded payload) | used | `chain/src/reverse.ts` — a revert becomes a named outcome (`no-forward-resolver`, `address-mismatch`, `none`) instead of a crash; **E-5** |
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
| MCP server exposing our API | **built, but not on their platform** — `surface/src/mcp.ts` (six tools, stdio entrypoint `surface/scripts/mcp.ts`); it satisfies ADR-0005 G-3 as *our* depth signal, and satisfies none of Bazantic's requirements, which are about their gateway and their Recipe |
| A Recipe (when/why/how to use the service) | blocked behind the account |
| Same task twice, identical prompt/model/settings, Recipe as the only difference | blocked behind the account |
| Repeatable improvement, both arms published (including the arm that did worse) | blocked behind the account |
| Video walkthrough of the difference | blocked behind the account |

Current honest score on this sponsor: zero of seven — the MCP row is built but unregistered, and an
unregistered server scores nothing on a track that measures the platform. Either the account exists and we build the
other six, or Bazantic is dropped and the submission says so in the same words — ADR-0004 already
chose the fallback.

## Our own agent surface (no sponsor)

Not a sponsor track, and listed separately so it cannot be mistaken for one. Per ADR-0005 G-1 the
axis we lost on last time was breadth of *real* use, and a tool surface is where an agent host
meets the algebra.

| Capability | Status | Where |
|---|---|---|
| MCP tools over the grant algebra (`allowance_tree`, `check_allowance`, `spend`, `delegate`, `revoke_authority`, `verify_settlement`) | used | `surface/src/mcp.ts`; **M-1** |
| Declared output schemas on every tool, structured results not prose | used | same file — a host parses the refusal, it does not read it |
| Tool annotations that mean something (`spend` non-idempotent, `revoke_authority` destructive, the questions read-only) | used | same file; a retried `spend` spends twice and the annotation is the only warning |
| Refusal as a successful result, `isError` reserved for broken tools | used | **M-2** — a model that cannot tell the two apart retries the refusal, which is the loop this project exists to stop |
| Server-side re-authorisation (`spend` never trusts the client's preflight) | used | **M-3** |
| Protocol-level tests over the SDK's in-memory transport, not hand-rolled fakes | used | `surface/test/mcp.test.ts` |
| Amounts as decimal strings across the wire | used | a tinybar cap exceeds `Number.MAX_SAFE_INTEGER`; JSON numbers would silently round it |
| stdio transport, one grant tree per host session | used | `surface/scripts/mcp.ts` |
| Remote/HTTP transport, sampling, resources, prompts | unused | the claim is about authority, not about covering the MCP spec |

## What this table says to the human, in one line

One free credential — a Sepolia faucet — converts the remaining ENS write row from `blocked` into
evidence; the Hedera key that unblocked H-1/H-2 has already been used, and is being rotated.

A free credential left unclaimed is the same class of gap that cost us the last hackathon
(ADR-0005 G-2); one of the two is now closed. The remaining gap, Bazantic, needs an account and
nothing else.
