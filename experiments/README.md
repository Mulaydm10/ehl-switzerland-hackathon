> **LOCKED governing file.** Do not edit in place. See `GOVERNANCE.md`.

# Experiments

Tracks any experiment, spike, or throwaway prototype under a stable ID: **`EXP-####`**. This is a
build-and-demo hackathon, not a research project — most "experiments" here will be quick spikes
("does this API work the way we think," "can we get this model to respond in <2s"), not formal
studies. Still log them; a spike that failed silently is exactly the kind of thing a second agent
re-runs by accident if it isn't recorded.

## Schema (locked — don't change the columns without updating this file)

Each row in `experiment_log.md`:　`ID | Date+time | What was tried | Result | Follow-up`

## Conventions

- IDs are sequential and never reused, even for abandoned spikes.
- Corresponding raw output (if any) lives under `logs/<EXP-####>_<YYYY-MM-DD>_<slug>/` — see
  `logs/README.md`.
- `experiment_log.md` itself is **append-only** (see `GOVERNANCE.md`) — this README is the locked
  process description; the log file is the locked-schema, append-only data.
