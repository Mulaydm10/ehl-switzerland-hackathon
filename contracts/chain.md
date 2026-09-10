# contract: `chain/`

Design-owned. Any lane may read; none may write.

## Purpose

Everything that touches a live chain: ENSv2 identity/permission on the ETHOnline hackathon Sepolia
deployment, and Hedera testnet settlement of x402 payments through Blocky402. `chain/` turns
`core/`'s decisions into transactions, and live chain state back into `core/` inputs.

## Verified facts — each names the artifact it came from

These were checked against primary sources, not docs or Discord. **ADR-0003's standing hazard
applies: do not add a fact here without naming the artifact you fetched.**

### ENSv2 (hackathon Sepolia deployment — isolated from ordinary ENS Sepolia)

| what | value | how verified |
|---|---|---|
| `PermissionedResolverImpl` | `0xa9d3814ab151bf6e37a427432795371a8361614e` | deployments page |
| initializer **present** | `initialize((address,uint256)[],bytes[])` \u2192 selector `33cc44a0` | `eth_getCode` on Sepolia, selector found in bytecode |
| initializer **absent** | `initialize(address,uint256)` \u2192 selector `cd6dc687` | same fetch, selector **not** in bytecode |
| `UpgradableUniversalResolverProxy` | `0xd26f2040d083af1cd2962ba303f4bea0c4faf142` | deployments page |
| MockUSDC | `0xcbfd80f74375c54e545af34788ff465f96f66f05` | deployments page |

Two consequences that each cost an afternoon if missed:

1. **The documented initializer does not exist on-chain.** Calling `initialize(address,uint256)`
   reverts with empty data. Use the `Grant[]` form: `Grant = (address account, uint256 roleBitmap)`,
   so a call passes an array of `(account, roleBitmap)` pairs plus a `bytes[]` of follow-on calls.
2. **viem and ethers hardcode a Universal Resolver address.** It must be overridden to the
   hackathon `UpgradableUniversalResolverProxy` above, or every lookup silently resolves against the
   *wrong deployment* and appears simply "not found". Do this once, in one place, and export it —
   do not let each caller construct its own client.

ENS roles are a **boolean bitmap**, not a balance. That is why the allowance lives in `core/` state
and not in a role (ADR-0003); ENS carries identity, the parent/child relation, and revocation.

### Hedera x402 / Blocky402

- The `exact` scheme payload is a signed **`TransferTransaction`** — *not* an arbitrary contract
  call. A facilitator rejects a payload containing non-transfer operations
  (`invalid_exact_hedera_payload_contains_non_transfer_ops`). **No escrow or vault contract can sit
  in the payment path.** This is the constraint that shaped the whole design.
- **Price is declared per route by the resource server**, as `amount` (smallest asset unit, e.g.
  `"100000"`) plus `asset` and `payTo` inside `paymentRequirements`; `/verify` receives payload and
  requirements together and the signed transfer must match **exactly**. Prices are arbitrary per
  route — do not build anything that assumes fungible fixed-size units.
- `asset: "0.0.0"` denotes HBAR; HTS token ids go in the same field.
- `extra.feePayer` must match what the facilitator advertises at `GET /supported`, or the client
  SDK throws before signing. The facilitator's fee-payer co-signs at settlement, so the payer is not
  the only signer on the wire.
- Rate limits: **10 req/s, 10,000 settlements/day per API key.** Do not put a retry loop in the
  demo path without a ceiling.

### The single-use account ceiling — adopted from PlanBound, credited

Since escrow cannot be in the payment path, the enforced ceiling is **an account, not a contract**:
a single-use Hedera account funded with exactly the approved amount, under a multi-sig policy so the
agent cannot complete a payment alone, with a refund path for the remainder. This is PlanBound's
technique (ETHGlobal Lisbon 2026) and it must be **credited in the README, the video, and the
submission text** — see ADR-0003.

## Required exports

```ts
resolveAgent(name): Promise<AgentIdentity>       // via the overridden Universal Resolver
grantOnChain(parent, child, roles): Promise<TxReceipt>
revokeOnChain(parent, child): Promise<TxReceipt>
payForRequest(requirements, signer): Promise<Settlement>   // Settlement carries the HashScan URL
```

`Settlement` **must** carry the explorer URL and the raw transaction id. The HashScan link is the
evidence the whole submission rests on; a payment we cannot link to is worth nothing to us.

## Hard rules

- **`chain/` imports `core/` for decisions and never re-implements them.** No second copy of the
  limit check. If a decision is needed that `core/` does not expose, raise it on the issue with
  `agent:devin` rather than deciding locally.
- **No secrets in the repo.** Keys and API keys come from the environment; commit a
  `.env.example` naming the variables, never values. A leaked testnet key is still a leaked key,
  and the repo goes public.
- Testnet only. Never mainnet, not even "just to check".
- Every live call is retried at most once and then fails loudly with the chain's own error. Silent
  fallbacks are how a demo lies.

## Done

`npm test --prefix chain` passes (`docs/verify.txt`'s `chain` line). Tests that need a live chain
must be skippable without credentials and must **not** silently pass when skipped — report them as
skipped, and record real runs in the results table instead.
