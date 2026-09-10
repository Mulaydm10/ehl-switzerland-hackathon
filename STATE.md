# STATE (root)

This file is the **live snapshot** and is deliberately **overwritten** every session — that is
correct behavior, not data loss. If this file and `worklog.md` ever disagree about what is true
*right now*, **STATE.md wins**; the worklog only explains how we got here.

> **Owns:** the hackathon's live project snapshot — deadline countdown, done/in-flight/blocked,
> next step, the open-questions status. Any human or agent (Devin included) may update it.
> **Does not own:** bus mode/merge/lanes — that's `docs/STATE.md`, design-owned (Devin, via
> `claim/state`). Don't put lane rows or `mode:`/`merge:` here; don't put project narrative there.

**Last updated:** 2026-09-10 (design node, via PR #6) — idea and stack resolved, lanes queued

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

## In flight

- #7 `chain` — one real Hedera x402 payment with a HashScan link (p0, the qualifying artifact).
- #8 `core` — allowance algebra + property tests (p0, parallel with #7, no dependency).
- #9 `surface` — x402-gated server, blocked-by #7.

## Blocked

- **Q-0001 (event identity) and the rest of `COMPETITION.md` are still `TODO(Dhruv)`** — LOCKED, and
  nobody else may fill them. This no longer blocks building, but it does block submission: there is
  no confirmed deadline in writing.
- The repo must be made **public** before submission. Dhruv only.

## Next intended step

1. Land the lanes (#7, #8, #9); #7 first — everything downstream assumes the rail works.
2. Wire the four demo scenarios in `contracts/surface.md` into a reproducible results table.
3. Record the demo video against that table.
4. Dhruv: `COMPETITION.md` + audit row, and the public flip.

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
