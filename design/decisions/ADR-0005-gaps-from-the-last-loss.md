# ADR-0005: The gaps a losing submission taught us, and which of them we are closing

**Status:** Accepted

**Date:** 2026-08-31

## Context

A previous project of Dhruv's — an agent-harness hackathon entry, four tracks, judged in early
September — did not win any track, and the post-mortem is specific enough to be usable here rather
than inspirational. The winners' repositories were read; the diagnosis is not a guess about taste.

What actually decided it, in the order it mattered:

1. **Sponsor surface area.** The main track was "best use of the harness". The winner exercised
   roughly twenty of the sponsor's capabilities; our entry used about eight. Product quality and
   rigour were not the axis being measured.
2. **A named sponsor integration skipped for want of a free key.** One sponsor's sandbox was in the
   winner's stack and absent from ours, for no reason except that nobody had spent ten minutes
   getting a trial credential.
3. **Building someone else's tools instead of our own.** The winner shipped a twelve-tool MCP
   server; our entry only consumed an existing one. Authoring the tool surface reads as depth;
   consuming it reads as configuration.
4. **Off-narrative domain.** The sponsor's own landing page described a scenario almost verbatim,
   and the project that built exactly that scenario won. Ours was more original and less legible.
5. **Form, not polish.** The UI track went to an entry whose *shape* was novel — a stranger could
   pick it up and drive it without domain context. Ours was a competent dashboard.
6. **A whole track left unclaimed.** A write-up track went to a simpler project because we never
   entered it. That was an hour of work not done.
7. **Presence.** Every announced winner had been physically in the room.

And what did *not* decide it: real data at scale, a reviewed-PR trail across a week, honest
documentation, a polished video. That entry was stronger than the winner on all four.

## Decision

Each numbered gap above is either closed, deliberately declined, or human-blocked. No gap is left
implicit, and none is closed by writing prose about it.

**G-1 — sponsor surface area → closing, and measured.** `submissions/SPONSOR-DEPTH.md` is a
capability-to-code map per sponsor: every capability of theirs we exercise, with the file that
exercises it, and every capability we do not, with the reason. It is a checklist that can be scored
against, which is exactly how the last one was lost. Where depth is reachable without credentials it
gets queued as lane work; where it is not, it is named as blocked in the same table.

**G-2 — never skip a named integration over a free credential → the standing rule.** This is the
gap we are *currently repeating*. A Hedera testnet key and a Sepolia faucet are both free, and they
are the only reason H-1, H-2 and E-3 read `blocked` in `RESULTS.md`. Restated as a rule, because
last time it cost the main prize: **no sponsor capability may sit unexercised because a zero-cost
credential was not requested.** Requesting is design's job; providing is the human's, and it is now
the first item on the Board issue rather than a footnote.

**G-3 — author a tool surface, don't only consume one → already the shape of the Bazantic
requirement.** Their prize demands an MCP server for our own API plus a Recipe (ADR-0004), which is
the same lesson arriving as a rule. It stays human-blocked on the account, but the ordering is now
explicit: if the account appears, the MCP server is the highest-value remaining build in the repo,
not an optional extra.

**G-4 — speak the sponsor's language → closing now, costs nothing.** The submission text is written
in delegation-algebra terms. The judged rails describe the same thing as agent-to-agent commerce:
an agent pays another agent's service per request, under an authority its principal can cap and
revoke. Same artifacts, their vocabulary, no new claims. `submissions/SUBMISSION.md` gets that
framing; `RESULTS.md` does not change, because reframing is not evidence.

**G-5 — form over polish → declined for this cycle, on instruction.** Dhruv has scoped further
demo and UI work out. Recorded here so the decline is visible as a decision rather than an
oversight: the demo is a console, which is structurally the thing that lost the UI track, and we are
knowingly accepting that.

**G-6 — leave no cheap track unclaimed → closing, blocked on facts.**
`submissions/TRACKS.md` is the audit: every track, its cost in hours, and whether we are in it. The
list of tracks cannot be filled until `COMPETITION.md` exists (Q-0001, LOCKED), so the file ships
with the *procedure* and empty rows rather than invented tracks.

**G-7 — presence → not applicable, and worth stating.** This event is online, so proximity cannot
be spent against us. The nearest analogue that is free is being visible where the sponsors read:
their Discord and office hours.

**Kept, and not re-invested in:** the evidence table, the honest limitations, the review trail. They
were strengths last time and they are stronger here. `RESULTS.md` is already more disciplined than
the winning entry's documentation was, so further polish there is a poor use of the remaining hours;
depth (G-1) is not.

## Consequences

- Two new artifacts are design-owned and must not drift from `RESULTS.md`:
  `submissions/SPONSOR-DEPTH.md` and `submissions/TRACKS.md`. If a depth row claims a capability is
  exercised, the file it names has to exercise it, or the row is a lie of the same kind ADR-0003
  forbids.
- The depth map will show gaps we cannot close. That is the point: an honest gap list is what makes
  the closed rows believable, and it tells the human exactly which free credential converts which
  row.
- G-5 means the submission's weakest axis is presentation, by choice. If that decision is revisited,
  it should be revisited here.
- This ADR is about a *different* project's loss. Nothing in it is evidence about this one, and no
  row in `RESULTS.md` may cite it.
