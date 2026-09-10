> **LOCKED governing file.** Do not edit in place. See `GOVERNANCE.md`.

# Logs

Raw output from experiments/spikes, one directory per experiment:

```
logs/<EXP-####>_<YYYY-MM-DD>_<slug>/
```

Example: `logs/EXP-0001_2026-09-12_rate-limit-check/`.

Log contents are gitignored by default (see `logs/.gitignore`) — they're often large, run-specific,
and reproducible from the experiment description in `experiments/experiment_log.md`, not artifacts to
version. If a specific log file is worth keeping (e.g. a judge-relevant benchmark result), explicitly
un-ignore that one file rather than removing the blanket ignore.
