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

## 2026-08-31 (design node) — the docs catch up to the depth work

Three credential-free depth items landed after the submission text was first written, and the
project-facing docs still described the pre-depth project. Caught them up in one design PR:
`RESULTS.md` gains H-4/H-5 (a settlement verified against Hedera consensus via the mirror node
rather than against the facilitator's receipt, and the four named ways a receipt can be false),
E-4/E-5 (an address's primary name resolved and confirmed in both directions; an address
advertising a name it cannot back is a named outcome, not an identity), and a new M-1..M-3 block
for our own MCP server (refusal as a successful structured result, `spend` re-authorising
internally). `submissions/SPONSOR-DEPTH.md` flips the two `queued` rows to `used` with file
references and adds the MCP surface in its own section, explicitly *not* under Bazantic.
`contracts/surface.md` gains the MCP rules so the next worker in that lane is bound by them.

Nothing here upgrades a blocked row. H-1/H-2 (no HBAR has moved), E-3 (no onchain ENS write) and
B-1/B-2 (no bazantic.com account) are unchanged, and the MCP server is written down everywhere as
ours and unregistered so it cannot be mistaken for Bazantic qualification.
