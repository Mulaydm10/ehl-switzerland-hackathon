# SUBMISSION — the text we hand in

Every sentence below is traceable to a row in `RESULTS.md`. The rule is mechanical: if a row is
`blocked`, the corresponding sentence says *blocked* here too, in the same words. Nothing is
softened on the way out of the repo — a judge reading this file and then `RESULTS.md` must find the
same story twice.

Fields whose *format* depends on event facts (character limits, which links are required, whether a
deck is expected) are marked `TODO(COMPETITION.md)`, not guessed: `COMPETITION.md` is LOCKED and
still unwritten (Q-0001).

## One line

Agent-to-agent commerce with a brake on it: one agent buys another agent's service per request over
x402 on Hedera, under an authority its principal caps and can revoke mid-flight — and the refusal
reason comes back *before* a price is quoted.

(The same sentence in our own vocabulary, since the repo is written that way: capped, revocable,
attenuating delegation of spending authority, enforced at the resource server's quote step.)

## Why this is the x402 story, not a delegation paper

x402 makes a machine able to pay for a resource without a human in the request path. The question it
leaves open is the one an operator actually asks: *how much can it spend, and how do I stop it?*
Today the honest answers are "a whole key's worth" and "rotate the key" — which is the same tool for
both, and it takes the agent offline to fix a budget.

This project puts the budget where the price is quoted. A parent agent issues a child a capped,
time-bounded, revocable grant; the child hits a paid route; the server evaluates the grant against
the *quoted* amount and either debits the allowance and settles, or refuses with a reason the caller
can act on (`OVER_LIMIT`, `REVOKED`, `PARENT_REVOKED`). Revocation lands within one request, and no
key is rotated. The interesting property is negative and cheap to check: on a refusal the
facilitator is never called, so no money could have moved even by accident.

## What it does

Three parts, deliberately separated so the money logic is testable without a chain:

- `core/` — the delegation and allowance algebra as pure functions over explicit state: `root`,
  `grant`, `authorize`, `consume`, `revoke`, `remaining`. No network, no SDK, no clock, no
  randomness; amounts are `bigint`. Attenuation is monotonic at every hop, property-tested at depth
  1–5 (**C-1, proven**).
- `chain/` — the live-chain edge: Hedera x402 v2 settlement through the Blocky402 facilitator
  (`@x402/hedera`, `@hiero-ledger/sdk`), and ENS resolution through the canonical Universal
  Resolver proxy on Sepolia.
- `surface/` — an x402-gated resource server with two differently-priced routes (`/translate`
  100 000 tinybar, `/summarize` 250 000 tinybar), a browser demo, the evidence transcripts, and an
  **MCP server** that hands the same algebra to an agent host as tools.

Two things were added after the first working end-to-end path, because both are checkable by a
stranger with no credentials at all:

- **We do not believe receipts.** A facilitator says a payment settled; the mirror node says what
  consensus recorded. `confirmTransfer`/`disagreement` compare them and name the four ways a receipt
  can be false — unknown transaction, not successful, payee not credited, wrong amount — so a
  HashScan link is published only when the amount we claim is the amount consensus shows
  (**H-4, H-5**).
- **We do not accept a name at face value either.** Reverse resolution gives an address's primary
  name; the name is then resolved forward and must point back. An address advertising a name it
  cannot back is a named outcome, not an identity (**E-4, E-5**).

The part we think is worth a judge's attention is *where* the refusal happens. The server evaluates
the child's authority **before** it quotes a price, so an over-budget or revoked request is refused
with a machine-actionable reason (`OVER_LIMIT`, `REVOKED`, `PARENT_REVOKED`) and the facilitator is
never called. That is what makes the interesting half of this demo reproducible by a stranger
holding no keys and no funds (**C-2, C-3, C-4, H-3**).

## The authority as tools, not as our script

A demo script that respects a budget proves nothing about a model that doesn't. So the algebra is
also an MCP server (`npm run mcp --prefix surface`): `allowance_tree`, `check_allowance`, `spend`,
`delegate`, `revoke_authority`, `verify_settlement`. Two design points carry the claim:

- A refusal is a **successful** tool call returning `{ allowed: false, reason: "OVER_LIMIT" }`.
  `isError` is reserved for tools that actually broke. A host that cannot tell those apart retries
  the refusal — which is precisely the loop capped authority exists to stop.
- `spend` re-authorises internally. `check_allowance` exists so a host can plan, not so it can be
  trusted; skipping it, or lying about it, gains a client nothing (**M-1, M-2, M-3**).

This is our own tool surface and is **not** a Bazantic integration — see below.

## What we can prove, and what we cannot

Proven, no credentials required (a judge can re-run these):

- Attenuation holds at every hop — `npm test --prefix core` (**C-1**).
- Over-budget requests are refused with a reason, before any quote (**C-2**).
- Revoking a grant refuses it as `REVOKED` and its descendants as `PARENT_REVOKED` (**C-3**).
- Revoking one child leaves its sibling's budget untouched (**C-4**).
- A refused request never reaches the facilitator (**H-3**, offline test).
- An agent name resolves live through ENS on Sepolia, and an unregistered name is distinguishable
  from a cleared record (**E-1, E-2**).
- An address's primary name resolves and is confirmed in both directions; one that cannot be
  confirmed is refused by name (**E-4, E-5**).
- A settlement is verified against Hedera consensus rather than against the facilitator's receipt,
  with live mirror-node reads that need no key (**H-4, H-5**).
- The delegated authority is usable by an agent host as MCP tools, with refusals as structured
  results (**M-1, M-2, M-3**).

Not proven, and therefore not claimed anywhere:

- **No HBAR has moved.** No Hedera testnet payer key was available, so there is no transaction id
  and no HashScan link (**H-1, H-2, blocked**). The payment path is written and tested against a
  facilitator double; that is not the same thing as a settlement, and we do not present it as one.
- **Revocation is not published onchain.** ENS writes need a funded Sepolia account
  (**E-3, blocked**).
- **Bazantic is not integrated.** Their prize requires an account, a gateway, an MCP server
  registered on their platform, a Recipe, and a controlled A/B showing repeatable improvement
  (ADR-0004). We wrote an MCP server, which satisfies none of the rest, and an unregistered server
  scores zero on a track that measures the platform. No Bazantic claim is made (**B-1, B-2,
  blocked**).
- **Nothing has been settled, so H-4 has never run against a payment of ours.** It runs against
  someone else's real testnet transfer, which proves the verifier and not our payment path.

## Sponsors we are submitting to

`TODO(COMPETITION.md)` for the mechanics of selecting them. On evidence: Hedera (the settlement
path, code-complete but unsettled) and ENS (read-side resolution, live). Bazantic is out unless its
qualification artifacts exist — two honest sponsor integrations beat three where one is a mention.

## Prior art we are standing on

Credited because a judge will find it otherwise, and because it shaped the design:

- **PlanBound** (ETHGlobal Lisbon 2026) — a single-use funded account as the enforced ceiling, on
  the finding that escrow cannot sit inside an x402 payment path. We reached the same constraint;
  our ceiling is an allowance in the resource server rather than a funded account.
- **VERA** (arXiv 2608.30091) — edge-exact revocation, and the observation that subtree cascade
  over-revokes under multiple parents. Our single-parent restriction is *because* of that paper, not
  an accident of scope.
- **`@bazantic/cli`'s `bazantic grant`** — capped, revocable authority to spend from a hosted
  balance, delegated to a device. Adjacent to our claim; ours is agent→agent delegation with
  attenuation depth and typed refusal reasons, not a hosted-balance device grant.
- **macaroons / UCAN / ZCAP-LD**, `draft-asor-wimse-agent-delegation-chain-01`,
  `draft-pidlisnyi-aps-02` — monotonic attenuation and spend as a first-class constraint. The
  mechanism space is saturated; what is scarce is a reproducible demo on the judged rails, which is
  what ADR-0003 committed this project to being.

## Links

| Field | Value |
|---|---|
| Repository | https://github.com/Mulaydm10/ehl-switzerland-hackathon *(must be public before submission — Dhruv only)* |
| Demo video | `TODO` — Cut B (keyless) is recorded; upload target is `TODO(COMPETITION.md)` |
| Evidence table | `RESULTS.md` |
| Demo script | `DEMO.md` |
| Decisions | `design/decisions/ADR-0002`, `ADR-0003`, `ADR-0004`, `ADR-0005` |
| Sponsor capability map | `submissions/SPONSOR-DEPTH.md` — what we exercise per sponsor, and what we don't |
| MCP server | `surface/src/mcp.ts`, run with `npm run mcp --prefix surface` (stdio) |
| Track audit | `submissions/TRACKS.md` |
| Bazantic username | n/a — no account (see above) |

## Known limitations, stated by us first

1. Delegation is depth-2 and single-parent by choice (ADR-0003), not a partial implementation of
   something deeper.
2. Allowance state lives in the resource server's memory, not onchain. The server is the enforcement
   point; a different server would need its own copy of the algebra. Onchain enforcement was cut
   because Hedera x402 settles a plain `TransferTransaction` and cannot call a contract.
3. The demo's grant tree is seeded at startup, so scenarios are reproducible from a fresh state.
4. No settlement has been executed. See H-1.
