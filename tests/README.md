> **LOCKED governing file.** Do not edit in place. See `GOVERNANCE.md`.

# Tests

**There is no test baseline yet, and that is correct — do not fake one.** The stack is deliberately
undecided (see `design/decisions/ADR-0002-stack-selection.md`, Q-0003), so there is no toolchain to
run tests with, no test runner configured, and nothing here would actually execute.

A scaffold whose test command fails on first invocation trains everyone to bypass the tooling
forever — so instead of a broken or fabricated "green" stub, this file states plainly: nothing to run
yet.

## Binding rule

Whoever resolves `ADR-0002-stack-selection.md` must land a **real, passing** smoke test in the same
change that adds the toolchain config — not a placeholder, not a test that trivially always passes.
At that point, replace this file's content with:

- How to run the test suite (the actual command — also goes in `CLAUDE.md`'s canonical-commands
  section).
- What the smoke test actually verifies.
- Where to add new tests as the build grows.

Until then: if you're an agent looking for a test command here, there isn't one. Report that plainly
rather than inventing a passing result.
