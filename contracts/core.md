# contract: `core/`

Design-owned. `core/` may read every other contract; no lane may write this file.

## Purpose

The delegation and allowance algebra, as **pure functions over explicit state**. `core/` decides
*whether a payment is allowed*; it never performs one.

**Hard rule: no network, no chain SDK, no clock, no `process.env`.** No `viem`, no
`@hashgraph/sdk`, no `fetch`. Time and randomness enter as arguments. This is what makes the money
logic property-testable with no testnet, no faucet, and no flaky CI — and it is the lane that keeps
working when a testnet is down at 3am.

## Model

A **grant** gives a child principal a spending authority derived from its parent's:

```ts
type PrincipalId = string;            // an ENS name; core treats it as an opaque key

type Grant = {
  id: GrantId;
  parent: PrincipalId | null;         // null = root authority
  child: PrincipalId;
  limit: bigint;                      // smallest asset unit, same unit the 402 quotes
  spent: bigint;
  asset: AssetId;                     // opaque; equality-compared, never converted
  notBefore: number;                  // unix seconds, compared against a passed-in `now`
  notAfter: number;
  revoked: boolean;
};
```

`bigint`, never `number`: these are token amounts and JS floats lose integers past 2^53. No
currency conversion anywhere in `core/` — two different `AssetId`s never compare, they refuse.

## Required exports

```ts
grant(state, parentGrantId, child, request): Result<Grant>
authorize(state, grantId, asset, amount, now): Decision      // pure; no side effects
consume(state, grantId, asset, amount, now): Result<State>   // authorize + record
revoke(state, grantId): State                                // subtree, see below
remaining(state, grantId): bigint
```

`asset` is passed on every call and is not optional: a 402 quotes both a price *and* the asset it
wants paid in, and a grant that only checks the number would let a quote denominated in something
else spend against it. Comparing it here is the only place `ASSET_MISMATCH` can be reached.

`Decision` is `{ allowed: true }` or `{ allowed: false, reason: Reason }`, where `Reason` is a
closed enum — `OVER_LIMIT`, `REVOKED`, `EXPIRED`, `NOT_YET_VALID`, `ASSET_MISMATCH`,
`UNKNOWN_GRANT`, `PARENT_REVOKED`. **The reason string is a demo artifact**: it is what
`surface/` renders when a request is refused, and what the results table records. Never collapse
these into a boolean or a bare throw.

## Invariants — these are the property tests, and they are the deliverable

1. **Attenuation is monotonic.** A child's effective authority is never wider than its parent's, on
   any axis: `limit`, validity window, asset. A `grant` call requesting more must fail, not clamp.
2. **Conservation.** For any grant, `spent <= limit` at all times, and the sum of what a subtree has
   spent never exceeds the root's `limit`. No sequence of interleaved `consume` calls may break it.
3. **Revocation is total over the subtree.** After `revoke(g)`, every descendant of `g` refuses with
   `REVOKED` or `PARENT_REVOKED`. There is no ordering of calls that lets a descendant spend after
   an ancestor is revoked.
4. **Idempotence.** `revoke` twice equals `revoke` once. `authorize` is free of side effects and may
   be called any number of times with the same answer for the same `(state, now)`.
5. **No resurrection.** A revoked grant cannot be un-revoked, and a new grant cannot be created
   under a revoked parent.

Test these as **properties over generated call sequences** (fast-check or equivalent), not as a
handful of examples. Arbitrary delegation depth is exercised *here* — the live demo is depth 2
(ADR-0003), so depth is this lane's job to prove.

Include at least one explicit test for the VERA case (ADR-0003): construct a node reachable from two
parents and assert the model **refuses to represent it** rather than silently over-revoking. Our
single-parent restriction has to be enforced in code, not just claimed in the video.

## Interface to the other lanes

`core/` exports types and functions only. It does not know that `PrincipalId` is an ENS name or that
an amount will settle on Hedera — `chain/` supplies those meanings. If `core/` needs to import
anything from `chain/` or `surface/`, the design is wrong; raise it on the issue with `agent:devin`.

State is passed in and returned; `core/` owns no storage. Persistence is `surface/`'s problem.

## Done

`npm test --prefix core` passes (this is `docs/verify.txt`'s `core` line), and the properties above
are covered by generated sequences rather than fixed examples.
