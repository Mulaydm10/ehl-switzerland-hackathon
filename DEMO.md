# DEMO

The rehearsed judge-facing script. This is not a feature list — it is the exact click-by-click /
command-by-command happy path judges will see. **This file must stay runnable at all times once a
demo path exists: fixing a broken demo outranks building new features.**

There is no idea yet (see `VISION.md`, Q-0002), so this is almost entirely `TODO(Dhruv)` — that is
correct for now. The full structure is written so the shape exists the moment an idea is chosen.
Retire a scenario by marking it `superseded by DEMO-####` — never by deleting it.

---

## DEMO-0001 — TODO(Dhruv): name this scenario

**Status:** TODO(Dhruv) — not yet written; no idea chosen.

**Preconditions:**
- TODO(Dhruv) — what must be running/seeded/logged-in before this scenario starts.

**Steps:**
1. TODO(Dhruv)
2. TODO(Dhruv)
3. TODO(Dhruv)

**Expected output per step:**
1. TODO(Dhruv)
2. TODO(Dhruv)
3. TODO(Dhruv)

**Known-broken edges to avoid:**
- TODO(Dhruv) — list the inputs/paths that are known to fail so whoever drives the demo steers
  around them live.

**Reset procedure:**
- TODO(Dhruv) — the exact steps to get back to a clean state after a failed run-through, fast. This
  is the part of this file that matters most mid-event: write it before you need it, not after a
  failed run in front of judges.

---

## Adding a new scenario

Copy the `DEMO-0001` block, increment the ID, fill in every section — especially the reset procedure.
If a scenario is replaced by a better one, mark the old header `DEMO-000N — superseded by DEMO-000M`
and leave its content in place rather than deleting it.
