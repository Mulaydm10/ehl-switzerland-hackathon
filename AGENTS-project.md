# AGENTS-project.md

> **Graft note (2026-09-10):** this repo is now on the agent-bus protocol — see root `AGENTS.md`
> for the live rules. That file is authoritative for **claiming, lanes, and PRs**: the `claim/<n>`
> git ref is the lock (truth ordering refs > CI > labels), superseding the claims table below for
> any cross-device/cross-agent work. What still applies from *this* file: surface ownership within
> a lane, the escalation rule for conflicting work, and the end-of-session discipline. If you are a
> bus worker or Devin (design), read root `AGENTS.md` first.

The vendor-neutral twin of `CLAUDE.md` — read this if you are not Claude Code. It carries the
**multi-agent concurrency model**: this repo will be worked by humans and AI agents *at the same
time*, often several agents at once. `CLAUDE.md` points here rather than restating any of this; keep
the two consistent.

For the ID scheme and read order, see `CLAUDE.md` — they live there, not here, so they exist in
exactly one place.

## Surface ownership

**Top-level directories are the unit of ownership.** Before working across more than one top-level
directory at once, claim each one you touch (see below). Within a single top-level directory,
coordinate more loosely — that's expected to be one person/agent's active surface at a time.

## How to claim work

1. Add a row to the work-claims table in `STATE.md`: surface (top-level dir), your name/agent id, a
   timestamp, and a one-line note on what you're doing.
2. Release the claim — delete the row — **the moment you stop**, whether you finished, got blocked,
   or ran out of turn budget. A stale claim blocks others worse than no claim at all.

## The one hard rule

**Any agent finishing a unit of work updates `STATE.md` before yielding.** "Finishing" includes
blocking on something and includes running out of turn/context budget — you update `STATE.md` (Done
/ In flight / Blocked / Next intended step) and release your claim *before* you stop, not after
someone notices you went quiet.

## Escalation rule for conflicting work

If two agents produced conflicting work on the same surface (diverged branches, contradictory
decisions, two versions of the same artifact): **never silently pick a winner.** Record the conflict
under Blocked in `STATE.md`, keep both versions discoverable (don't delete either), and name what
decision is needed to resolve it. A human (Dhruv, or whoever the team designates) resolves it
explicitly; log the resolution in `worklog.md`.

## Agent-bus protocol — now live

This repo was grafted onto the **agent-bus protocol** (Devin as design node + N Claude Code workers,
coordinating through GitHub issues, git refs, and PRs) on 2026-09-10. The `claim/<n>` **git ref** is
now the lock and supersedes the `STATE.md` claims table above for cross-device/cross-agent work;
truth ordering is refs > CI > labels. See root `AGENTS.md` for the full protocol. The claims table
above and the surface-ownership rule still apply for lighter-weight, same-session coordination (e.g.
a human and a local agent working the same checkout) where standing up a `claim/<n>` ref would be
overkill — but for anything crossing devices or sessions, the ref is truth, not this table.
