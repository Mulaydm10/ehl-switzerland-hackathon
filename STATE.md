# STATE (root)

This file is the **live snapshot** and is deliberately **overwritten** every session — that is
correct behavior, not data loss. If this file and `worklog.md` ever disagree about what is true
*right now*, **STATE.md wins**; the worklog only explains how we got here.

> **Owns:** the hackathon's live project snapshot — deadline countdown, done/in-flight/blocked,
> next step, the open-questions status. Any human or agent (Devin included) may update it.
> **Does not own:** bus mode/merge/lanes — that's `docs/STATE.md`, design-owned (Devin, via
> `claim/state`). Don't put lane rows or `mode:`/`merge:` here; don't put project narrative there.

**Last updated:** 2026-09-10 13:31 (local) — by hackathon-setup agent (initial scaffold)

## Deadline + time remaining

- Deadline: TODO(Dhruv) — see `COMPETITION.md` (not yet filled in; event identity itself unresolved)
- Time remaining: cannot be computed until the deadline above is set

## Done

- Repo scaffolded: three-piece cold-start pattern, hackathon layer, governance, ID scheme.
- `ideas/` opened for candidate scoring (no idea chosen yet).
- Open questions registered: Q-0001 (event identity), Q-0002 (thesis), Q-0003 (stack selection).

## In flight

- Nothing — repo is freshly scaffolded, no build has started.

## Blocked

- Everything downstream of the idea is blocked on **Q-0002** (thesis).
- Everything downstream of event rules is blocked on **Q-0001** (event identity) and the rest of
  `COMPETITION.md`'s `TODO(Dhruv)` fields.
- Stack/tooling is blocked on **Q-0003** / `ADR-0002-stack-selection.md`.

## Next intended step

1. Resolve Q-0001 (confirm which event this actually is).
2. Fill in `COMPETITION.md` event facts, deadline+timezone, rubric, hard rules.
3. Fill in `VISION.md` thesis (Q-0002).
4. Score candidates in `ideas/README.md` and pick one.
5. Resolve `ADR-0002-stack-selection.md` (Q-0003), landing a green smoke test in the same change.

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
