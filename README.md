# ehl_switerland

A parent agent grants a child agent a **capped, revocable spending authority**; the child pays for
real x402-gated services with it; and when it is over budget or revoked it is **refused before any
money moves** — with a reason it can act on. The interesting half is the refusals, so they are
demonstrated, not described. The same authority is available to an agent host as MCP tools, where a
refusal comes back as a structured result rather than an error.

Two things are checked rather than believed: a settlement is verified against Hedera consensus via
the mirror node, not against the facilitator's receipt; and an address's ENS name must resolve back
to the address before it counts as an identity. Both need no credentials.

The project asserts nothing it does not demonstrate. Every claim in this README, the video, and the
submission traces to a row in **`RESULTS.md`**; a row with no evidence is a claim we do not make
(`ADR-0003`). Sponsor scope and what each sponsor has to carry: `ADR-0004`.

Scaffolded before the event identity, thesis, and stack were finalized — see `COMPETITION.md` and
`VISION.md` for what's still unknown, and `research/open_questions.md` for the tracked open
questions (`Q-0001` event identity, `Q-0002` thesis; `Q-0003` stack is resolved by `ADR-0002`).

## Read order (cold start)

1. `CLAUDE.md` (or `AGENTS.md` if you're not Claude Code)
2. `STATE.md` — live snapshot; wins on any conflict with `worklog.md`
3. `RESULTS.md` — what is actually proven, and what is only written
4. `VISION.md` — the thesis
5. `COMPETITION.md` — event facts, single source of truth
6. `GOVERNANCE.md` — file ownership rules
7. `AGENTS.md` — multi-agent concurrency model
8. Recent tail of `worklog.md`
9. `experiments/experiment_log.md`

## Layout

| Path | What it is |
|---|---|
| `CLAUDE.md` / `AGENTS.md` | Cold-start entry points (Claude Code / vendor-neutral) |
| `STATE.md` | Live, overwritten-every-session snapshot |
| `worklog.md` | Append-only, dated+timestamped history |
| `COMPETITION.md` | LOCKED — event facts, single source of truth |
| `VISION.md` | LOCKED — project thesis |
| `DEMO.md` | Judge-facing demo script, kept runnable at all times |
| `RESULTS.md` | Every public claim and the artifact backing it — empty evidence = not claimed |
| `core/` | Lane: delegation/allowance algebra, pure — no network, no clock, no chain SDK |
| `chain/` | Lane: Hedera x402 settlement via Blocky402, mirror-node verification of it, and ENS identity reads (forward, text, reverse) on Sepolia |
| `surface/` | Lane: the x402-gated resource server, the browser demo, and the MCP server (`npm run mcp --prefix surface`) |
| `contracts/` | Design-owned lane interfaces (`contracts/<lane>.md`) — not Solidity |
| `GOVERNANCE.md` | Who owns what, LOCKED vs. not, audit table |
| `design/` | ADR process + decisions (`ADR-####`) |
| `experiments/` | Experiment/spike log (`EXP-####`) |
| `research/` | Prior art + open questions (`Q-####`) |
| `notes/` | Onboarding prompt, glossary, judging-rubric alignment |
| `ideas/` | Scored idea candidates (idea not yet chosen) |
| `logs/` | Raw experiment output (gitignored by default) |
| `submissions/` | Staged final deliverables |
| `tests/` | Bus canary tests (`tests/canary`); lane tests live under each lane |
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

## Agent-bus protocol

This project runs on the agent-bus protocol — see `AGENTS.md`. Devin is the design node (task
queue, PR review); Claude Code workers on any device claim `lane:*` issues via `/bus:claim`. The
project-specific concurrency model that used to live at `AGENTS.md` has moved to
`AGENTS-project.md`. The lanes are `core`, `chain`, and `surface` — see `docs/STATE.md`.
