# STATE.md — current shape of the project (written by design only, via `claim/state`)

> **Owns:** bus mode/merge/attention, the lane table, verify environment, protocol decisions and
> known gaps — design-owned (Devin), written only via `claim/state`. **Does not own:** the
> hackathon's live project snapshot (deadline, done/in-flight/blocked, next step) — that's root
> `STATE.md`, freely editable by any human/agent. Don't duplicate one file's content into the
> other; point instead.

## Purpose
A delegation-and-payment path for AI agents, shown working end to end on live testnets rather than
asserted: a parent agent grants a child agent a capped, revocable spending authority; the child pays
for a real x402-gated service settled on Hedera testnet via Blocky402; the parent revokes, and the
child's next request is refused with no payment settling. Identity and the parent/child relation are
ENSv2 names on the ETHOnline hackathon Sepolia deployment; discovery is a Bazantic gateway + MCP
surface. Depth 2, single-parent, deliberately (see ADR-0003). Deadline: `COMPETITION.md` (LOCKED,
still TODO(Dhruv) — the binding fact this repo is missing).

mode: solo
attention: active
merge: human
design: devin-ai-integration[bot]
<!-- design: <login>   set by design on join, via claim/state; absent = repo not live, workers report "no design node" -->
<!-- mode: solo | team.  attention: active | paused (workers' cross-repo pick order skips paused repos; design sessions do not wake).
     merge: human | auto-lane (auto-lane = you give up human code review of lane PRs for throughput; design sets auto-merge on green + approved claim PRs; refused unless main requires lane+run; design/* always human).
     CI reads these from the live tip of the base branch and workers from `main`, never from a PR head: a PR must not relax the enforcement it is judged by. -->

## Lanes

| lane | directory | purpose | contract |
|------|-----------|---------|----------|
| `lane:canary` | `canary/` | two standing issues: post-merge canary (permanent claim, draft PR) and pre-merge canary (transient claim per workflow PR) | — |
| `lane:core` | `core/` | the delegation + allowance algebra: grant, attenuate, consume, revoke, and the refusal decision. **No network, no SDK, no chain** — pure functions over explicit state, property-tested | `contracts/core.md` |
| `lane:chain` | `chain/` | everything that touches a live chain: ENSv2 registration/resolution/revocation on the hackathon Sepolia deployment, and Hedera x402 settlement through Blocky402 | `contracts/chain.md` |
| `lane:surface` | `surface/` | the paid resource server, the Bazantic gateway + MCP + Recipe registration, the CLI/demo run-through and the results table | `contracts/surface.md` |
<!-- bootstrap.sh appends one row per lane you pass it; design edits after that. A lane may be a nested path (`src/01_ingest`); no lane may be a prefix of another. -->

## Verify environment
`docs/setup.sh` (design-owned; CI runs the copy on `main`; changing it needs a canary like any workflow change). **TypeScript/Node for the project (ADR-0002), Python retained only for the bus canary** — so setup installs both: `requirements-dev.txt` for `tests/canary`, then `npm ci` in each lane directory that has a `package.json`. Workers run the same script once per worktree.

A lane's verify line fails until that lane's first PR adds a `package.json` with a `test` script;
that is the intended order, and it is the acceptance criterion of each lane's first issue rather than
a broken baseline. Design cannot pre-create those files: CI confines `design/*` to everything
*outside* lane directories, which is the rule working as designed.

## Decisions
- Lock = `claim/<n>` ref via git refs API (201/422). Labels advisory; refs beat labels.
- Lane + per-lane verify (`docs/verify.txt`) are CI jobs in one workflow (`checks.yml`: lane → resolve → run).
- Reclaim renames to `abandoned/…`; resume only on green CI + passing verify.
- Worker id = device/session; sessions hold claims, machines don't. Worktree per claim.
- Contracts in `contracts/<lane>.md`, design-owned.
- Three lanes, not five: lane count tracks *worker* count (one registered device), not module count.
- `core/` is network-free so the money logic is property-testable without a testnet or a faucet.
- Idea decisions (what the project claims, and what it deliberately does not) live in ADR-0003.

## Known gaps
- **`COMPETITION.md` is LOCKED and still `TODO(Dhruv)`** — event identity (Q-0001) and the deadline
  with its timezone are unwritten. Every downstream schedule decision is uncommitted until it lands.
- Repo is private; ETHGlobal requires a public repo with continuous history, and branch protection
  (which makes `lane`/`run` block rather than merely report) needs the public flip.
- `tests/README.md` is LOCKED and still says there is no baseline; ADR-0002's binding rule wants it
  updated in the same change that picks the stack. Needs Dhruv (see ADR-0002 "Deviation").
- Lane `package.json` manifests are installed from the PR head, not from `BASE_SHA` as
  `requirements-dev.txt` is. That is a weaker trust path than the bus intends; accepted knowingly for
  a solo, single-account event, and it should not be copied into a team-mode repo.
- Branch protection (`lane` + `run` required, PR-only `main`) needs a public repo or GitHub Pro/org. Without it checks are advisory — see docs/SETUP.md.
- One GitHub account for all workers (solo mode) = one API rate bucket; GitHub App with per-device tokens before ~20 nodes.
- Actions minutes are one pool per repo; check quota before a team event.

## Log
- 2026-09-10: repo created from agent-bus-template; bootstrap run (mode=solo).
- 2026-09-10: design node joined (issue #3). Lanes still provisional (`canary` only) — the real
  split is proposed on #3 and lands once the brief is confirmed, before the first lane claim.
- 2026-09-10: real lane split lands (`core`/`chain`/`surface`) with `docs/verify.txt` and
  `docs/setup.sh` in the same PR, so one canary round covers all three. Idea settled after three
  adversarial passes on #3: the project claims *evidence*, not a novel mechanism — see ADR-0003.
