> **LOCKED governing file.** Do not edit in place. See `GOVERNANCE.md`.

# Design & ADR process

This directory holds architecture decisions as **ADRs** (`ADR-####`), in `design/decisions/`. An ADR
records a decision that was made, the alternatives considered, and why — so a cold agent doesn't
re-litigate a settled question, and so a wrong decision can be revisited with its original reasoning
intact.

## When to write an ADR

Any decision that would be expensive to silently reverse or re-derive: stack/toolchain choice,
architecture shape, a third-party dependency with lock-in, a data model, a deployment target. Not
every code change needs one — routine implementation choices go in `worklog.md` instead.

## Process

1. Copy `decisions/ADR-0000-template.md` to the next number, `ADR-####-short-slug.md`.
2. Fill in Status (`Proposed` / `Accepted` / `Superseded by ADR-####`), Context, Options considered,
   Decision, Consequences.
3. If the decision resolves an open question, cross-reference its `Q-####` in `research/open_questions.md`
   both ways.
4. Never delete or renumber an ADR. A reversed decision gets a new ADR that supersedes the old one;
   mark the old one's Status accordingly.

## Current ADRs

- `ADR-0000-template.md` — the template itself, not a real decision.
- `ADR-0001-scaffold-choices.md` — documents this scaffold's own structural choices (a real, non-empty
  example of the process).
- `ADR-0002-stack-selection.md` — **open**, Status: Proposed. The stack/toolchain has not been chosen
  yet; see `research/open_questions.md` Q-0003.
