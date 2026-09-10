# AGENTS.md

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

## Forward-looking: agent-bus protocol

This repo may later be grafted onto the **agent-bus protocol** (Devin as design node + N Claude Code
workers, coordinating through GitHub issues, git refs, and PRs). That graft is a separate, later step
done by a dedicated setup process — nothing here assumes it yet. If/when it happens: the `claim/<n>`
**git ref** becomes the lock and supersedes the `STATE.md` claims table above; truth ordering becomes
refs > CI > labels. Until then, `STATE.md`'s table is the real lock — treat it as such.
