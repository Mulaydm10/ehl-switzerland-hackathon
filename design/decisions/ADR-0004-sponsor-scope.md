# ADR-0004: Which sponsors we are judged on, and what each one has to carry

**Status:** Accepted

**Date:** 2026-09-10

## Context

A submission may name many sponsors; a submission that *wins* one names few and makes each
load-bearing. ADR-0003 already fixed the claim as evidence rather than mechanism, so the sponsor
question reduces to: for each prize, is there a run we can put in the results table, and does the
build get worse if we remove it? Anything that fails both is a mention, and mentions cost credibility
without buying a prize.

Bazantic's prize page was fetched today and changes the shape of the work, which is why this is an
ADR and not a line in the README.

## Decision

**Three judged sponsors: Hedera, ENS, Bazantic.** No fourth.

**Hedera** carries settlement. It is load-bearing by construction: the refusal cases are only
interesting because the success case moves real testnet HBAR, and `contracts/chain.md` records that
the plain-`TransferTransaction` constraint is what shaped the whole design. Evidence = a HashScan
link per successful run. *Blocked on testnet credentials; until they exist the pay button answers
"no Hedera key configured" and we claim nothing.*

**ENS** carries identity and revocation. The read half is live and checkable by anyone against
Sepolia (`vouchesFor`); the write half needs a funded Sepolia account and is deferred, per
`contracts/chain.md`. We do not say "revocation is published onchain" until a transaction exists.

**Bazantic** is not an integration prize, and reading it as one would have cost us the submission.
Its qualification requirements are an *experiment*: create an account on bazantic.com, deploy an
x402/MPP gateway plus an MCP server for our API, write a Recipe that says when, why, and how to use
the service, then run the same task twice with the same prompt, model, settings, and API access —
once with only raw API information, once with the Recipe — with the Recipe as the only material
difference, and show a repeatable improvement, with a video walking through the difference and the
account username in the submission.

Two consequences follow:

1. **The A/B is a run in the results table like any other**, with both transcripts published,
   including the raw-API arm that did worse. If the improvement is not repeatable we report that
   instead; a negative result honestly reported beats a tuned one.
2. **Only the human can create the bazantic.com account.** Design cannot sign up on Dhruv's behalf,
   so this sponsor is human-blocked in a way the other two are not, and the fallback if the account
   never appears is to drop Bazantic to two judged sponsors rather than to claim an untested Recipe.

## Prior art to credit, found while reading their docs

`@bazantic/cli` ships `bazantic grant` — "authorize a device to pay from your Bazantic-hosted
balance (capped, revocable)". That is adjacent enough to our headline that a judge may reach for it,
so we say it first, in the video and the submission text, exactly as ADR-0003 requires for PlanBound.
The honest distinction is narrow and worth stating narrowly: theirs delegates spend from a hosted
balance to a *device* the account holder controls; ours delegates between *agents*, attenuating at
each hop, and its output is a refusal reason a caller can act on rather than only an allow/deny. We
do not claim they lack revocation — they have it — and we do not claim novelty over them.

## Consequences

- Every sponsor now has a named evidence artifact: HashScan link (Hedera), Sepolia resolution
  (ENS), published A/B transcripts (Bazantic).
- Two of the three are blocked on the human for credentials or an account, and the blocks are
  independent, so the demo path must degrade honestly per sponsor rather than all-or-nothing.
- A fourth sponsor is out of scope even if it looks cheap; the cost of a mention is the credibility
  of the other three.
