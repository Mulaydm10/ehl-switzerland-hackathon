# ADR-0003: What the project claims — evidence, not mechanism

**Status:** Accepted

**Date:** 2026-09-10

## Context

The project began as **Capability Descent**: an agent spawning a sub-agent could hand down only a
subset of its own budget and permissions; the hierarchy would *be* the ENSv2 name tree, the budget a
Hedera allowance, and revoking a parent would instantly void the whole subtree's spending power. The
distinct claim was **recursion** — every precedent was one principal to one agent, or a flat market.

Three adversarial passes (two by the `mac` worker, one by design) killed that claim, then killed its
replacement. This ADR records the reasoning so it is not re-litigated at day 6, and so the demo
script and submission text can be written from a settled position.

## What was rejected, and why

**1. Recursion as the distinct claim — rejected.**

- **VERA** (arXiv 2608.30091, *Authority-Preserving Edge Revocation for Federated AI-Agent
  Workflows*) defines edge-exact revocation over multi-parent delegation graphs and explicitly
  critiques naive subtree cascade as **over-revoking** — it kills authority a shared agent still
  legitimately holds from another parent. Our headline was the published *weaker* variant.
- Monotonic attenuation ("each hop may only narrow, never widen") is the macaroons / UCAN / ZCAP-LD
  lineage, and is specified in `draft-asor-wimse-agent-delegation-chain-01`. The Agent Passport
  System draft (`draft-pidlisnyi-aps-02`) carries **spend** as a first-class constraint dimension,
  which refutes the narrower claim that capability systems never attenuate money. SentinelAgent
  (2604.02767) and ResidualAuth (2609.08062) occupy adjacent ground.
- "ENS subnames as an agent capability tree" is **ENS's own documented roadmap** (their ERC-8004 /
  agentic-commerce material uses `agent.org.eth` controlled by `org.eth` as the intended pattern).
  Implementing it is executing a published use case, not an insight.

**2. Boolean one-shot spend flags as the mechanism — rejected, on engineering grounds as well as
novelty grounds.**

The proposed replacement was: the budget is never a number anywhere — a cap is N pre-minted
`may-spend-once` boolean role flags on ENS subnames, one flipped per payment. It was rejected twice
over:

- *As novelty:* it is Chaumian e-cash (1982, still shipping as Cashu) — value unary-encoded as N
  discrete one-time bearer tokens. `agentcard` already ships single-use payment authorizations with
  cap, merchant scope, expiry and vault enforcement.
- *As engineering:* N flags **is** the integer N in unary — same semantics, N storage slots, N mint
  transactions ($50 at $0.01 granularity = 5,000 mints and 5,000 flips), and it stops no attack an
  allowance doesn't. Decisively, **x402 prices are quoted per route by the resource server and
  settled exact-match** (see ADR-0002 and `contracts/chain.md`), so "one flag = one call" holds only
  if every price is rigged equal — a demo that works because we tuned it.

**3. A market-pain narrative — rejected as unverifiable.** The widely-circulated "agent burned
$47,000 in 11 days" story traces to vendor promotional material with no named company and no
post-mortem; the "96% of enterprises exceeded AI cost estimates" figure appears only in search
summaries. Neither goes in the pitch. We claim the demo, not the market.

## Decision

**The claim is evidence, not mechanism.** There is no unoccupied mechanism left in agent delegation
and agent payments in 2026, and hunting for one is the losing move. What is *not* saturated is
working, reproducible proof on the judged rails.

So the project asserts nothing it does not demonstrate:

1. A parent agent grants a child a capped, revocable spending authority.
2. The child pays for a real x402-gated service, settled on **Hedera testnet** through Blocky402,
   with a HashScan receipt.
3. The child is **refused** when over budget — shown, not described.
4. The parent revokes, and the child's next request is **refused with no settlement** — shown, with
   the on-chain state that caused the refusal.
5. Every run lands in a results table with links, including the failures.

Supporting decisions:

- **Allowance, not flags** — an ordinary allowance denominated in the same units the 402 quotes, so
  it composes with arbitrary per-route pricing without changing representation.
- **Adopt and credit PlanBound's single-use account.** Hedera x402 settles a plain
  `TransferTransaction`, so a contract escrow cannot sit in the payment path; PlanBound solved this
  with a single-use account funded to exactly the approved amount under a multi-sig policy. Credit
  it out loud, in the video and the submission text, *before a judge asks "isn't this PlanBound?"* —
  that converts our biggest vulnerability into evidence of rigour.
- **Depth 2, single-parent, deliberately.** Not a scope cut we are hiding: a tree cascade is
  edge-exact precisely when every node has one parent, so single-parent gives us VERA-correct
  semantics for free. Saying *why* on camera — "multi-parent is where subtree cascade over-revokes,
  per VERA; we are single-parent, so we do not hit it" — demonstrates we read the judges' own
  literature, which is worth more than any novelty claim we could have made.
- Arbitrary depth is a **property test in `core/`**, not something a judge can see.

## Consequences

- Easier: the build is de-risked and the pitch is honest. Prior art becomes an asset (a credited
  precedent) instead of a threat.
- Harder: if a judge weights novelty heavily, we lose to a worse build with a fresher story. Accepted
  knowingly — the mitigation is that the demo shows failure cases almost nobody else shows.
- Every claim in the submission text must be traceable to a run in the results table. If it is not
  demonstrated, it is not written.
- Prior-art credit (VERA, PlanBound, the IETF drafts) is a **required section** of the submission,
  not a courtesy.

## Standing hazard, recorded deliberately

A citation used in this debate — "Pramana Protocol: 187 tests, cascade revocation through depth 15" —
was **fabricated**, and it was sourced from a real, reputable-looking GitHub issue. It passed one
adversarial pass and one design review before the worker caught it: the real repository is a
claim-attestation system with 84 tests and no delegation code at all. It is retracted, and nothing
above rests on it.

**Rule for the rest of this event:** a claim about someone else's system is unverified until the
artifact itself has been fetched — bytecode, ABI, paper, or package. Prose in an issue, a Discord
message, or a vendor page is a lead, not a fact. This applies to design and workers equally; the
verified facts in `contracts/chain.md` each name the artifact they came from.
