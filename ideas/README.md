# Ideas

No idea has been chosen yet (`VISION.md`, Q-0002). This directory holds scored candidates until one
is picked — at that point, the chosen idea's detail moves into `VISION.md` and this directory can be
retired (its scoring history stays here for reference; don't delete it).

## Candidate table

Score each candidate 1–5 on fit criteria before committing build time. Add rows as candidates come
up; don't remove a candidate that gets rejected — mark it rejected with a reason.

| Candidate | Impact (who benefits, how much) | Feasibility in remaining time | Novelty / prior art | Fit to event (once Q-0001 resolves) | Total | Status |
|---|---|---|---|---|---|---|
| TODO(Dhruv) | | | | | | Candidate |
| TODO(Dhruv) | | | | | | Candidate |

## Prior art / impact slots

For each candidate that survives an initial pass, before committing:

- **Prior art check** — has this been built already? Log findings in `research/prior_art.md`.
- **Impact check** — is the underlying problem real and costly enough that anyone would use this, or
  is it a nice-to-have? Worth a real pass (e.g. the `impact-validator` agent, if available) before
  locking in `VISION.md`.

## Once an idea is chosen

1. Fill in `VISION.md` and mark Q-0002 resolved in `research/open_questions.md`.
2. Mark the winning row's Status `Chosen` here (don't delete the table).
3. Move on to `ADR-0002-stack-selection.md` (Q-0003) now that the idea's actual needs are known.
