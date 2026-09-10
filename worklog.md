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
