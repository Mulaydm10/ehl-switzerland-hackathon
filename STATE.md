# STATE (root)

This file is the **live snapshot** and is deliberately **overwritten** every session — that is
correct behavior, not data loss. If this file and `worklog.md` ever disagree about what is true
*right now*, **STATE.md wins**; the worklog only explains how we got here.

> **Owns:** the hackathon's live project snapshot — deadline countdown, done/in-flight/blocked,
> next step, the open-questions status. Any human or agent (Devin included) may update it.
> **Does not own:** bus mode/merge/lanes — that's `docs/STATE.md`, design-owned (Devin, via
> `claim/state`). Don't put lane rows or `mode:`/`merge:` here; don't put project narrative there.

**Last updated:** 2026-08-31 (design node) — credential-free depth landed (mirror-node verification, ENS reverse, MCP server); what remains is credentials

## Deadline + time remaining

- Deadline: TODO(Dhruv) — see `COMPETITION.md` (not yet filled in; event identity itself unresolved)
- Time remaining: cannot be computed until the deadline above is set

## Done

- Repo scaffolded: three-piece cold-start pattern, hackathon layer, governance, ID scheme.
- Agent bus grafted on; design node joined (issue #3). `AGENTS.md` is authoritative for claiming.
- **Idea settled (Q-0002 → ADR-0003).** Parent-to-child capped, revocable spending authority for
  agents: ENSv2 names for identity and revocation, Hedera x402 via Blocky402 for real settlement,
  Bazantic for discovery. Depth 2, single-parent, on purpose. The project claims **evidence, not a
  novel mechanism** — three adversarial passes on #3 found the mechanism space saturated (VERA, the
  IETF delegation drafts, macaroons/UCAN), so what is scarce is a working, reproducible demo on the
  judged rails. Read ADR-0003 before proposing a "novel" angle; that is where it was litigated.
- **Stack settled (Q-0003 → ADR-0002): TypeScript/Node.** Python remains only for the bus canary.
- Three implementation lanes cut: `core/`, `chain/`, `surface/`, each with a `contracts/<lane>.md`.
- **All three lanes are merged.** `core/` (#13) delegation algebra with property tests at depth 1–5;
  `chain/` (#12) Hedera x402 settlement through Blocky402 plus a direct `POST /settle` path;
  `surface/` (#14) two differently-priced x402 routes, quote-time authorisation, browser demo;
  ENS read-side resolution live on Sepolia (#17).
- **`RESULTS.md` is the claim ledger** (#19): C-1..C-4 proven without any credentials; H-1, H-2, E-3,
  B-1 and B-2 `blocked` and named as such.
- Demo video **Cut B** (the keyless cut) recorded — `submissions/VIDEO.md` records what is on it and
  what deliberately is not.
- **Credential-free depth, after ADR-0005's post-mortem of the last loss** — breadth of real
  sponsor-capability use was the axis we lost on, so three items were built that a stranger can
  re-run with no keys at all:
  - **Mirror-node verification** (#24): a settlement is checked against Hedera consensus rather than
    against the facilitator's receipt, and a false receipt is named as one of four failures
    (H-4, H-5).
  - **ENS reverse + mutual identity** (#26): an address's primary name must resolve back to the
    address, and the Universal Resolver's custom errors are decoded into named outcomes (E-4, E-5).
  - **An MCP server over the grant algebra** (#28, awaiting merge): six tools, refusals as
    successful structured results, `spend` re-authorising internally (M-1..M-3). It is ours and
    unregistered — it is **not** Bazantic qualification.

## In flight

- #28 (the MCP server) is open and green, awaiting the human merge.
- Submission text: caught up to the depth work — `RESULTS.md`, `submissions/SPONSOR-DEPTH.md`,
  `submissions/SUBMISSION.md` now carry H-4/H-5, E-4/E-5 and M-1..M-3.
- #7 stays open on purpose: its acceptance criterion is a HashScan link, and none exists.
- #16 stays open for the ENS **write** side (publishing and revoking the vouch record); reads landed.

## Blocked

- **No Hedera testnet key.** Every settlement claim (H-1, H-2, the settling half of C-4, Cut A of the
  video) is `blocked` in `RESULTS.md` and stays there until a key exists.
- **No funded Sepolia account** → E-3 (revocation published onchain) is not built and not claimed.
- **No bazantic.com account** → B-1/B-2 impossible; their prize needs an A/B against a Recipe plus a
  gateway, an MCP server *registered on their platform* and a username (ADR-0004). Our own MCP
  server exists and changes none of that. Either that account exists or we submit to two sponsors
  and say so.
- **Q-0001 (event identity) and the rest of `COMPETITION.md` are still `TODO(Dhruv)`** — LOCKED, and
  nobody else may fill them. This no longer blocks building, but it does block submission: there is
  no confirmed deadline in writing.
- The repo must be made **public** before submission. Dhruv only.

## Next intended step

1. Write the submission package against `RESULTS.md` — no sentence without a row.
2. Dhruv: the three credentials above, or the explicit decision to drop each claim.
3. Dhruv: `COMPETITION.md` + audit row, and the public flip.

## Latest experiment

None yet — `experiments/experiment_log.md` is empty of real rows.

## Work-claims table

Claim a row before starting work on a surface; release it (delete the row) the moment you stop, even
if you didn't finish — a stale claim blocks others worse than no claim at all.

| Surface / top-level dir | Claimed by | Since | Notes |
|---|---|---|---|
| _(none currently claimed)_ | | | |

> **Agent-bus note:** if this repo later moves to the agent-bus protocol, the `claim/<n>` git ref
> becomes the lock and supersedes this table — see `AGENTS.md` for the truth-ordering rule.
