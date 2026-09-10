# contract: `surface/`

Design-owned. Any lane may read; none may write.

## Purpose

Everything a judge actually sees: the x402-gated resource server, the Bazantic gateway + MCP +
Recipe registration, the demo run-through, and the results table. `surface/` composes `core/` and
`chain/`; it contains **no** authorization logic of its own.

## The demo is the deliverable (ADR-0003)

The project claims evidence, not mechanism, so the run-through *is* the product. Four scenarios,
each producing a row in the results table with a link:

| # | scenario | expected | evidence |
|---|---|---|---|
| 1 | child pays for a service within its allowance | 200, service returns | HashScan tx link |
| 2 | child requests past its allowance | **refused**, `OVER_LIMIT`, **nothing settles** | no tx + the reason |
| 3 | parent revokes, child retries | **refused**, `REVOKED`/`PARENT_REVOKED`, nothing settles | revocation tx + refusal |
| 4 | second child, unaffected by sibling's revocation | 200 | HashScan tx link |

Scenarios 2 and 3 are the ones that win this. Anyone can show a payment; almost nobody shows the
refusal and proves no money moved. **Do not let the demo hide a failure** — if a run fails, the row
records the failure. A results table with an honest failure beats a table that is suspiciously all
green, and `DEMO.md` must stay runnable at all times.

## Two payment surfaces — forced by tooling, not chosen

`bazantic-cli` settles **USDC on Base / Base Sepolia only** (`--network base|base-sepolia`,
per-call `--max-amount`, default $0.01); nothing in its payer path speaks `hedera:testnet` or can
produce a Hedera `TransferTransaction`. **Bazantic therefore cannot be the payer for a
Hedera-settled upstream.**

So the architecture is two surfaces, stated plainly to both sponsors rather than hand-waved as one
unified rail:

- **Hedera** — where the money settles. The judged payment rail.
- **Bazantic** — discovery, gateway, MCP, Recipe; priced in its own USDC/Base terms.

The Bazantic-side endpoint can be **priced free while developing**, so this lane is unblocked with
no Base funding. Open question, small and non-blocking: whether a *registered gateway* (as opposed
to the CLI) can carry upstream auth to an origin demanding x402 on a non-Base chain. That is a
question for the sponsor's Discord, not a spike — record the answer here when it arrives.

## Hard rules

- **No authorization logic here.** Ask `core/` (`authorize`/`consume`), settle via `chain/`. If
  `surface/` is deciding whether a payment is allowed, the layering is broken.
- Render `core/`'s `Reason` verbatim to the user. The refusal text is demo evidence, not UX copy to
  be prettified into "something went wrong".
- The resource server declares its own price per route (`amount`, `asset`, `payTo`); prices are
  arbitrary per route by design (`contracts/chain.md`) — do not assume equal or fixed prices
  anywhere.
- No secrets in the repo; `.env.example` names variables only.

## Done

`npm test --prefix surface` passes (`docs/verify.txt`'s `surface` line), and `DEMO.md` documents a
run-through someone else can reproduce from a clean clone.
