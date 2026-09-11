# contract: `chain/`

Design-owned. Any lane may read; none may write.

## Purpose

Everything that touches a live chain: ENSv2 identity/permission on the ETHOnline hackathon Sepolia
deployment, and Hedera testnet settlement of x402 payments through Blocky402. `chain/` turns
`core/`'s decisions into transactions, and live chain state back into `core/` inputs.

## Verified facts — each names the artifact it came from

These were checked against primary sources, not docs or Discord. **ADR-0003's standing hazard
applies: do not add a fact here without naming the artifact you fetched.**

### ENSv2 on Sepolia

| what | value | how verified |
|---|---|---|
| Universal Resolver (**use this**) | `0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe` | `eth_call` on Sepolia at block 11675328: `vitalik.eth` resolves to `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` via resolver `0xae66c62AcAE72098BdAc57d8E8AED53EF000b2Ba` |
| `PermissionedResolverImpl` | `0xa9d3814ab151bf6e37a427432795371a8361614e` — **not a send target**, see the write-side section | deployments page; its bytecode advertises no resolver getter or setter |
| initializer **present** | `initialize((address,uint256)[],bytes[])` \u2192 selector `33cc44a0` | `eth_getCode` on Sepolia, selector found in bytecode |
| initializer **absent** | `initialize(address,uint256)` \u2192 selector `cd6dc687` | same fetch, selector **not** in bytecode |
| `UpgradableUniversalResolverProxy` `0xd26f2040d083af1cd2962ba303f4bea0c4faf142` | **do not use** | `eth_call` on Sepolia, same block: reverts `0x77209fe8` (`ResolverNotFound`) for every `.eth` name tried |
| MockUSDC | `0xcbfd80f74375c54e545af34788ff465f96f66f05` | deployments page |

Three consequences that each cost an afternoon if missed:

1. **The documented initializer does not exist on-chain.** Calling `initialize(address,uint256)`
   reverts with empty data. Use the `Grant[]` form: `Grant = (address account, uint256 roleBitmap)`,
   so a call passes an array of `(account, roleBitmap)` pairs plus a `bytes[]` of follow-on calls.
2. **Do not override the Universal Resolver address, and never pin an implementation.** This
   contract used to say the opposite: point viem/ethers at `UpgradableUniversalResolverProxy`
   above. That was wrong twice over. The ENSv2 docs warn that an address taken from a deployments
   table can be superseded while the canonical proxy stays current, and that particular address is
   already dead for resolution. The canonical proxy is the **same address on mainnet and Sepolia**,
   so targeting the ENSv2 test deployment is nothing more than selecting the Sepolia chain. Keep the
   constant in one place (`chain/src/ens.ts`, `UNIVERSAL_RESOLVER`) so this correction has one home.
3. **A name has three states, not two.** No resolver in the registry chain (a revert) is a different
   fact from a resolver that answers with the zero address or an empty string. The first means the
   name was never registered; the second is what a cleared — that is, revoked — record looks like
   from outside. A refusal must be able to say which, so a revert is an answer to render, never an
   exception to propagate.

ENS roles are a **boolean bitmap**, not a balance. That is why the allowance lives in `core/` state
and not in a role (ADR-0003); ENS carries identity, the parent/child relation, and revocation.

### ENSv2 write side — the parent's authority over a child's record

Verified 2026-09-11 against the `PermissionedResolver` **runtime bytecode** at
`0xa9d3814ab151bf6e37a427432795371a8361614e` on Sepolia (15,511 bytes, `eth_getCode`) and against the
matching contract source. Read this before writing a single setter call — and note the shape of the
mistake it corrects, because it is the standing hazard in `CLAUDE.md` with teeth: the first version
of this section described the *documented* resolver, whose methods are not the deployed ones. Calling
an absent selector reverts **with no data**, which is indistinguishable from a permission refusal, so
a wrong ABI here produces confident green tests and no error anywhere.

| what | value | how verified |
|---|---|---|
| there is **no shared resolver** | each account gets its own `PermissionedResolver`, a UUPS proxy deployed by the Verifiable Factory; all names owned by that account share it | ENSv2 Permissioned Resolver docs |
| `0xa9d3814ab151bf6e37a427432795371a8361614e` — **do not send to it** | it is the implementation, not a proxy; it advertises no resolver getter (`3b3b57de`, `59d1d43c`) | `eth_getCode` on Sepolia, opcode-walked for `PUSH4` and left-aligned `PUSH32` selector compares — a substring grep is not evidence here |
| the resolver address is therefore **discovered, never configured** | `resolve()`'s second return value, which `Resolution.resolver` already carries | `chain/src/ens.ts` |
| setters **present** in the deployed code | `setText(bytes,string,string)` `c7279f88`, `setAddress(bytes,uint256,bytes)` `b4436dde`, `setData(bytes,string,bytes)` `eb4b73bb`, `setName(bytes,string)` `0ce0112a`, `linkToNode(bytes,bytes32)` `5d27b8e5` | selector scan of the fetched runtime bytecode |
| setters **absent** — do not encode these | `setText(bytes32,string,string)` `10f13a8c`, `setAddr(bytes32,address)` `d5fa2b00`, `clearRecords(bytes32)` `3603d758`, `authorizeNameRoles` / `authorizeTextRoles` / `authorizeAddrRoles` | same scan; they belong to a different, undeployed variant of this contract |
| grant | `grantSetterRoles(bytes setter, address account)` `ccd3eaff` — you pass the **encoded setter call** the account may make, and the resolver derives role and resource from it via its own `decodeSetter` | bytecode + source; `grantRoles(uint256,uint256,address)` exists but reverts `EACCannotGrantRoles` |
| revoke | `revokeRoles(uint256 resource, uint256 roleBitmap, address account)` `dfa70d8b` — a **different method**, taking both explicitly | same |
| role bitmap | `ROLE_SET_ADDRESS = 1 << 0`, `ROLE_SET_TEXT = 1 << 4`, `ROLE_SET_CONTENTHASH = 1 << 8`, `ROLE_SET_ABI = 1 << 12`, `ROLE_SET_INTERFACE = 1 << 16`, `ROLE_SET_NAME = 1 << 20`, `ROLE_SET_DATA = 1 << 24`, `ROLE_LINK = 1 << 28`, admin counterpart at `role << 128` | `PermissionedResolverLib` source; 4-bit spacing and a 128-bit admin shift, so these are `bigint`s and not numbers |
| EAC resource | `keccak256` of the setter's **keyed argument alone** — `bytes(key)` for text/data, the 32-byte word for a coin type, 4 bytes for an interface id. **No node.** | `PermissionedResolverLib.resource` overloads; `keccak256("avatar")` = `0xd1f86c93…f66343` |
| a resource is **not** name-scoped | the proxy is already per-account, so the name is implied by which contract you call | source: `resource()` takes only the argument; `decodeSetter` asserts the result is never `ROOT_RESOURCE` |
| every name argument is **DNS-encoded**, not a namehash — setters included | `dnsEncode("alice.eth")` = `0x05616c6963650365746800`; the root name is `0x` | recomputed locally |

Why this matters beyond plumbing: **EAC is the onchain mirror of `core/`'s algebra**, but a coarser
one than this contract originally claimed. A parent grants a child `ROLE_SET_TEXT` on exactly one
text *key*, and revokes it by naming that key's resource and role. The amount still lives in `core/`
— a role is a boolean, not a balance (ADR-0003) — and so does **per-name attenuation**, because a
role granted on `key = "agent:allowance"` holds for that key across every name the proxy serves.
What ENS carries is identity, the parent/child relation, and revocation; what it does not carry is
one child's allowance being smaller than its sibling's.

Because grant and revoke are separate methods, a lane implementing them must derive
`(resource, roleBitmap)` **once** and use it for both — the resolver derives it for the grant, so a
wrong role constant is invisible until the matching revocation silently clears nothing.

**Broadcast is the only part that needs money.** Building the call, computing its EAC resource, and
asking the deployed resolver what it thinks of it are all free `eth_call` work. But a refusal is
only evidence if the selector exists: an empty revert may equally mean the method is absent, so a
lane claiming preflight evidence must pin its selectors against fetched bytecode. A **decoded, named**
EAC refusal is the strongest claim available without a funded account. It is not the same claim as a
published record, and no lane may blur them.

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
- **Testnet needs no API key.** Base URL `https://api.testnet.blocky402.com` (or `http://localhost:3002`
  locally); network id `hedera:testnet`. The `X-Api-Key` header and the 10 req/s + 10,000
  settlements/day quota are **mainnet-only, per key**, and mainnet is unreleased — so neither
  applies to us. Retry loops still need a ceiling.
- The client path is `@x402/hedera`, which depends on **`@hiero-ledger/sdk`, not `@hashgraph/sdk`**
  (verified from the packed tarball, not the docs): `createClientHederaSigner` →
  `new ExactHederaScheme(signer)` → `x402Client.register("hedera:testnet", scheme)` →
  `wrapFetchWithPayment`. Settlement evidence returns in the **`PAYMENT-RESPONSE`** header — v2's
  name; `X-PAYMENT-RESPONSE` is the v1 legacy spelling and `@x402/fetch@2.25.0` still reads both, so
  read `PAYMENT-RESPONSE` first and fall back. It decodes via `decodePaymentResponseHeader` to
  `{ success, transaction, network, payer? }`.
- HashScan wants the transaction id re-separated: `0.0.123@1699….000000000` →
  `0.0.123-1699…-000000000`.
- A resource server is **not** required to produce a real settlement: build `paymentRequirements`
  yourself and `POST /settle` to the facilitator. The transfer and its HashScan link are real.

### The single-use account ceiling — adopted from PlanBound, credited

Since escrow cannot be in the payment path, the enforced ceiling is **an account, not a contract**:
a single-use Hedera account funded with exactly the approved amount, under a multi-sig policy so the
agent cannot complete a payment alone, with a refund path for the remainder. This is PlanBound's
technique (ETHGlobal Lisbon 2026) and it must be **credited in the README, the video, and the
submission text** — see ADR-0003.

## Required exports

```ts
// identity — reads only: no key, no gas. SEPOLIA_RPC_URL is the whole configuration.
resolveAddress(caller, name): Promise<Resolution<string>>
resolveText(caller, name, key): Promise<Resolution<string>>
vouchesFor(caller, name, address): Promise<boolean>   // does the name still assert this signer?

// payment
payForRequest(required: PaymentRequired, signer): Promise<Settlement>   // Settlement carries the HashScan URL
```

`Resolution<T>` is `{ kind: "ok", value, resolver } | { kind: "unset", resolver } | { kind:
"unresolvable", error }` — the three states above, made unignorable by the type rather than by a
comment.

The write half is **built up to the broadcast**, which is the only step that costs money:

```ts
// authority — pure: builds the call, derives the resource, signs nothing, sends nothing.
textResource(key): bigint                             // keccak256(bytes(key)) — no node
uintResource(value: bigint): bigint                   // keccak256 of the 32-byte word
setTextCall(name, key, value): UnsignedCall           // { data } — `to` comes from discovery
setAddressCall(name, coinType: bigint, bytes): UnsignedCall
setDataCall(name, key, value): UnsignedCall
grantSetterRolesCall(setter: UnsignedCall, account): UnsignedCall    // delegates that exact call
revokeRolesCall(resource: bigint, roles: bigint, account): UnsignedCall
requirementOf(setter: UnsignedCall): Requirement | undefined         // { resource, roleBitmap }

// authority — live, still key-free and gas-free.
preflight(caller, name, call, from): Promise<Preflight>
```

`requirementOf` mirrors the resolver's own `decodeSetter`, and exists so revocation cannot drift from
the grant: the grant's `(resource, roleBitmap)` is derived onchain, the revocation's is passed in, and
only a shared derivation keeps them the same pair.

`Preflight` is `{ kind: "accepted", resolver, resource } | { kind: "refused", resolver, selector,
reason } | { kind: "unresolvable", error }` — the same three-state discipline as `Resolution`, for the
same reason: a revert from an unauthorized sender is the expected answer and must be rendered, not
thrown. `selector` is `"0x"` for an empty revert, which is the case a lane must not read as
authorization having been reached.

Until a funded Sepolia account exists **no lane may claim a record was published onchain.** What the
demo may show is the read half — `vouchesFor` going false — plus a preflighted call whose refusal the
deployed resolver itself produced. Both are checkable against Sepolia by anyone, without trusting
our server.

`payForRequest` takes the whole `PaymentRequired` envelope, not one `PaymentRequirements` entry:
in x402 v2 the resource URL lives on the envelope (`ResourceInfo.url`), so a bare requirements
entry cannot say what it is paying for (verified against `@x402/core@2.25.0`'s types).

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
