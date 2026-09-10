# VIDEO — the 2–4 minute demo, shot list and narration

The video is a deliverable governed by `RESULTS.md`: **a sentence may be spoken only if a row backs
it**, and the rows that are `blocked` must be said out loud as blocked rather than skipped. Event
facts (length limits, where it is uploaded) are `COMPETITION.md`'s, not this file's.

## Two cuts, decided by one fact

Whether the Hedera payer account exists when we record:

- **Cut A (payer configured).** All four scenarios, ending on a HashScan page loaded live.
- **Cut B (no payer).** Scenarios 2 and 3 in full, and scenario 1 shown up to the honest
  `no Hedera key configured` answer, said out loud as *"this is the one thing we cannot show you
  today; the code path is in `chain/`, the evidence row is empty and stays empty."*

Cut B is a weaker video and an honest one. Do not narrate Cut A's script over Cut B's screen.

## Shot list

| # | Screen | Narration (the claim) | Row |
|---|---|---|---|
| 0 | The grant table, `reset` just clicked | "Three child agents, each with its own key and its own budget. No shared wallet." | C-1 |
| 1 | `child-a` → `pay /translate` | "It pays for what it asked for, on Hedera testnet." → transaction id, then the HashScan page | H-1, H-2 |
| 2 | `child-c` → `pay /summarize` | "Over budget. Refused *before* a price is quoted — the facilitator is never called, so no money could have moved." | C-2, H-3 |
| 3 | `revoke` on `child-a`, then `pay /translate` | "The parent cuts it. No key rotation, no onchain transaction, no cooperation from the child." | C-3 |
| 4 | `child-b` → `pay /translate` | "Its sibling is untouched — revocation is scoped to the subtree it names." | C-4 |
| 5 | ENS test output, or a resolved name onscreen | "Agents are named through ENS, resolved live on Sepolia." Say that *publishing* revocation to ENS is not built. | E-1, E-2, E-3 |
| 6 | `RESULTS.md` onscreen, scrolled | "Every claim in this video is a row here, with the artifact next to it — including the ones we could not prove." | — |

Shot 6 is not filler: it is the only shot that makes the previous five checkable.

## Rules while recording

- No cuts inside a scenario. A refusal or a settlement must be one continuous take from click to
  answer, or a judge cannot tell it from a mock.
- Never speak a number the screen doesn't show.
- Bazantic is not mentioned unless B-1 and B-2 have artifacts by then (`ADR-0004`).
- Prior art (PlanBound, the IETF drafts) is credited aloud or in the description, per `ADR-0003`.
