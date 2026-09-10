# Worklog

Append-only history. Never edit or delete an entry — if something here turns out to be wrong, add a
new entry that supersedes it. Entries are dated **and timestamped**: hackathon history moves hourly,
not daily, so a date alone isn't enough resolution.

If this log and `STATE.md` disagree about what is true *now*, `STATE.md` wins — this file only
explains how we got here.

---

### 2026-09-10 13:31 — hackathon-setup agent (for Dhruv)

Initial scaffold of the repo. Event is known only as "an ETH hackathon in Switzerland" (working
directory name `ehl_switerland`) — event identity is genuinely ambiguous (ETHGlobal-style onchain
event vs. ETH Zurich/EPFL university hackathon vs. EHL Lausanne), registered as Q-0001. No thesis
given (Q-0002). No idea chosen yet (`ideas/` opened). Stack left undecided per explicit instruction —
wrote an open ADR (`design/decisions/ADR-0002-stack-selection.md`, Status: Proposed) and registered
Q-0003 instead of committing to a toolchain. No `data/`, `models/`, `evals/`, or `contracts/`
directories created — none justified by the brief yet. Two commits made: (1) core scaffold, (2)
hackathon layer (`COMPETITION.md`, `DEMO.md`, `AGENTS.md`, `notes/judging_alignment.md`).

Next: resolve Q-0001, then Q-0002, then pick an idea, then resolve Q-0003 alongside a real smoke
test.

### 2026-09-10 — design node (Devin), via PR #6

Idea and stack resolved. Three adversarial passes (mine on #3, two from the mac/Claude worker)
converged on the same finding: the *mechanism* space in agent delegation and agent payments is
saturated — VERA (arXiv 2608.30091), `draft-asor-wimse-agent-delegation-chain-01`,
`draft-pidlisnyi-aps-02`, and the macaroons/UCAN/ZCAP-LD lineage already own monotonic attenuation,
and "ENS subnames as a capability tree" is ENS's own published roadmap. A proposed pivot (budget as
N single-use boolean role flags rather than a number) was also killed: as novelty it is Chaumian
e-cash, and as engineering it is an integer in unary that breaks outright against x402's
arbitrary per-route pricing. Recorded in ADR-0003; the project now claims **evidence, not
mechanism**. Q-0003 resolved to TypeScript/Node (ADR-0002).

One hazard worth remembering: a citation ("Pramana Protocol — 187 tests, cascade revocation to
depth 15") passed one adversarial pass and one design review before the worker fetched the actual
repo and found it fabricated — the real project is claim-attestation, 84 tests, zero delegation
code. Retracted in ADR-0003 and `research/prior_art.md`. Fetch the artifact before citing it.

Also verified against live sources rather than forum reports: the ENSv2 hackathon resolver's
deployed bytecode contains `initialize((address,uint256)[],bytes[])` and *not* the documented
`initialize(address,uint256)`; Blocky402 quotes price per route and settles exact-match; Bazantic's
payer is USDC on Base only and cannot settle a Hedera x402, which forces the two-surface split.

Next: #7 (chain, one real settlement) and #8 (core, property tests) in parallel; #9 blocked on #7.
