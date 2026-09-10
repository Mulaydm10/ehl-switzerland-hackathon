> **LOCKED governing file.** Do not edit in place. See `GOVERNANCE.md`.

# AI onboarding prompt

Paste this (or equivalent) to onboard a fresh AI agent session on this repo cold.

---

You are joining a hackathon repo (`ehl_switerland`) for an ETH-Switzerland hackathon. Read, in order:

1. `CLAUDE.md` (or `AGENTS.md` if you're not Claude Code)
2. `STATE.md` — the live snapshot; if it disagrees with `worklog.md` about what's true *now*,
   `STATE.md` wins
3. `VISION.md` — the project thesis
4. `COMPETITION.md` — event facts (deadline, rubric, hard rules) — **note: event identity itself is
   still unresolved as of scaffolding, see Q-0001**
5. `GOVERNANCE.md` — who owns what
6. `AGENTS.md` — multi-agent concurrency rules
7. The recent tail of `worklog.md`
8. `experiments/experiment_log.md`

Then:

- Check `STATE.md`'s work-claims table before starting work on any top-level directory; claim your
  surface, release it the moment you stop.
- If a doc you need is full of `TODO(Dhruv)`, **say so** — do not invent a plausible-sounding fill-in
  for an event identity, deadline, rubric weight, hard rule, or thesis. Report the gap and, if it's
  actionable, register or reference the relevant `Q-####` in `research/open_questions.md`.
- Before you stop (finished, blocked, or out of budget): overwrite `STATE.md`, append a
  dated+timestamped `worklog.md` entry, log any `EXP-####` or LOCKED-file edit, release your claim.
- Full end-of-session checklist is in `CLAUDE.md`.

---

## End-of-session checklist (for quick reference)

1. Overwrite `STATE.md`.
2. Append a dated+timestamped entry to `worklog.md`.
3. Append any new `EXP-####` row to `experiments/experiment_log.md`.
4. Log any LOCKED-file edit in `GOVERNANCE.md`'s audit table.
5. Release your work claim in `STATE.md`.
6. Say so, rather than inventing content, for any doc still full of `TODO(Dhruv)`.
