# ehl_switerland

An ETH-Switzerland hackathon repository. Scaffolded before the event identity, thesis, idea, and
stack were finalized — see `COMPETITION.md` and `VISION.md` for what's still unknown, and
`research/open_questions.md` for the tracked open questions (`Q-0001` event identity, `Q-0002`
thesis, `Q-0003` stack).

## Read order (cold start)

1. `CLAUDE.md` (or `AGENTS.md` if you're not Claude Code)
2. `STATE.md` — live snapshot; wins on any conflict with `worklog.md`
3. `VISION.md` — the thesis
4. `COMPETITION.md` — event facts, single source of truth
5. `GOVERNANCE.md` — file ownership rules
6. `AGENTS.md` — multi-agent concurrency model
7. Recent tail of `worklog.md`
8. `experiments/experiment_log.md`

## Layout

| Path | What it is |
|---|---|
| `CLAUDE.md` / `AGENTS.md` | Cold-start entry points (Claude Code / vendor-neutral) |
| `STATE.md` | Live, overwritten-every-session snapshot |
| `worklog.md` | Append-only, dated+timestamped history |
| `COMPETITION.md` | LOCKED — event facts, single source of truth |
| `VISION.md` | LOCKED — project thesis |
| `DEMO.md` | Judge-facing demo script, kept runnable at all times |
| `GOVERNANCE.md` | Who owns what, LOCKED vs. not, audit table |
| `design/` | ADR process + decisions (`ADR-####`) |
| `experiments/` | Experiment/spike log (`EXP-####`) |
| `research/` | Prior art + open questions (`Q-####`) |
| `notes/` | Onboarding prompt, glossary, judging-rubric alignment |
| `ideas/` | Scored idea candidates (idea not yet chosen) |
| `logs/` | Raw experiment output (gitignored by default) |
| `submissions/` | Staged final deliverables |
| `tests/` | Test baseline (none yet — stack undecided) |
| `scratch/` | Untracked personal scratch space |

Top-level directories are the unit of ownership — see `AGENTS.md` for the concurrency model.

## End-of-session checklist

1. Overwrite `STATE.md`.
2. Append a dated+timestamped entry to `worklog.md`.
3. Append any new `EXP-####` row to `experiments/experiment_log.md`.
4. Log any LOCKED-file edit in `GOVERNANCE.md`'s audit table.
5. Release your work claim in `STATE.md`.
6. If a doc is still full of `TODO(Dhruv)`, say so rather than inventing content to fill it.

## License

MIT — see `LICENSE`.
