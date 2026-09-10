#!/usr/bin/env bash
# Runtime for the `run` job and for workers. Design-owned; CI executes the copy on the BASE branch, never the PR's.
# Runner is ubuntu-latest (python3, node, go, java preinstalled; BASE_SHA is set).
#
# Two stacks on purpose: Python exists only for the bus canary (tests/canary), TypeScript/Node is
# the project (ADR-0002). Removing the Python half breaks the canary and with it every future
# workflow change, so keep both.

# Python — canary only. Read the manifest from BASE to keep the reviewed trust path.
if [ -n "${BASE_SHA:-}" ]; then git show "$BASE_SHA:requirements-dev.txt" > /tmp/requirements-dev.txt
else cp requirements-dev.txt /tmp/requirements-dev.txt; fi
python3 -m pip install -q -r /tmp/requirements-dev.txt

# Node — one install per lane directory that has a manifest. A lane with no package.json yet is
# skipped, not an error: lanes acquire theirs in their first PR.
#
# Unlike requirements-dev.txt these manifests are read from the PR head, not from BASE. That is a
# weaker trust path than the bus intends (a PR can introduce the dependency it is judged with) and
# is accepted knowingly for a solo, single-account event — see docs/STATE.md "Known gaps". Do not
# copy this into a team-mode repo without pinning to BASE.
for lane in core chain surface; do
  if [ -f "$lane/package.json" ]; then
    if [ -f "$lane/package-lock.json" ]; then npm ci --prefix "$lane" --no-audit --no-fund
    else npm install --prefix "$lane" --no-audit --no-fund; fi
  fi
done
