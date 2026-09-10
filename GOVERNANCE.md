# Governance

This file is itself **not** LOCKED (it defines locking, so it can't lock itself), but it should only
be edited by the Main Agent or with their explicit sign-off.

## Main Agent

**Dhruv** is the Main Agent: the sole authority over LOCKED files. "First name given = sole authority"
— Dhruv was the name given when this repo was scaffolded, so Dhruv holds that authority until the
team explicitly reassigns it (and reassignment itself should be logged below).

## The three file categories

1. **LOCKED** — event facts, the project thesis, and process definitions that must not drift once
   other work depends on them. Opens with the exact banner:

   ```
   > **LOCKED governing file.** Do not edit in place. See `GOVERNANCE.md`.
   ```

   To change a LOCKED file: Dhruv edits it directly (that's what "sole authority" means), or anyone
   else proposes the change and Dhruv applies it. Either way, **log the edit** in the audit table
   below — including the file's *initial authorship*, which is expected and correct, not a violation.
   Files in this category:
   - `COMPETITION.md`
   - `VISION.md`
   - `design/README.md`
   - `experiments/README.md`
   - `research/README.md`
   - `notes/ai_onboarding_prompt.md`
   - `logs/README.md`
   - `tests/README.md`

2. **Deliberately NOT locked** — `CLAUDE.md`, `STATE.md`, `AGENTS.md`, `DEMO.md`. Their entire value
   is staying current; locking them would defeat the purpose. `STATE.md` in particular is meant to be
   **overwritten every session** — that is correct behavior, not drift. `DEMO.md` must stay runnable
   at all times once a demo path exists, which requires it to be freely editable by whoever fixes a
   broken run-through. Any agent may edit these directly. This is stated explicitly here so their
   absence from the LOCKED list reads as intentional, not an oversight.

3. **Append-only** — `worklog.md`, `experiments/experiment_log.md`, `research/prior_art.md`,
   `research/open_questions.md`. Never edit or delete existing entries; add new ones. If something
   recorded there turns out to be wrong, add a new entry that supersedes it — don't rewrite history.

## Audit table

Every LOCKED-file edit is logged here, oldest first. Initial authorship counts as an edit.

| Date (UTC) | File | Change | Author | Notes |
|---|---|---|---|---|
| 2026-09-10 | `COMPETITION.md` | Initial authorship (all event facts TODO — event identity unresolved) | hackathon-setup agent (for Dhruv) | See Q-0001 |
| 2026-09-10 | `VISION.md` | Initial authorship (thesis TODO — not yet given) | hackathon-setup agent (for Dhruv) | See Q-0002 |
| 2026-09-10 | `design/README.md` | Initial authorship (ADR process + ADR-0000/0001/0002) | hackathon-setup agent (for Dhruv) | — |
| 2026-09-10 | `experiments/README.md` | Initial authorship (EXP-#### schema) | hackathon-setup agent (for Dhruv) | — |
| 2026-09-10 | `research/README.md` | Initial authorship (Q-#### schema) | hackathon-setup agent (for Dhruv) | — |
| 2026-09-10 | `notes/ai_onboarding_prompt.md` | Initial authorship | hackathon-setup agent (for Dhruv) | — |
| 2026-09-10 | `logs/README.md` | Initial authorship (log naming convention) | hackathon-setup agent (for Dhruv) | — |
| 2026-09-10 | `tests/README.md` | Initial authorship (no baseline yet, stack undecided) | hackathon-setup agent (for Dhruv) | See ADR-0002, Q-0003 |

Add new rows above this line — never edit existing rows.
