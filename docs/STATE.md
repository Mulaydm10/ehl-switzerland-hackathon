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
| `lane:surface` | `surface/` | the paid resource server, our MCP server over the grant algebra, the (unbuilt) Bazantic gateway + Recipe registration, the CLI/demo run-through and the results table | `contracts/surface.md` |
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
- 2026-09-11: a Hedera testnet key existed for one afternoon and HBAR moved: three settlements
  through the demo surface (100 000 tinybar for `child-a` and again for sibling `child-b`, 250 000
  for the dearer route), each verified against consensus by our own mirror-node reader, which
  disagreed with none. H-1/H-2 and the settling half of C-4 leave `blocked`; H-6 (the signer proves
  itself against the account's published key) and H-7 (HBAR declared to x402 plus a payer-side
  per-payment ceiling) are new rows. The first attempt failed `INVALID_SIGNATURE` because a bare-hex
  ECDSA key is *also* a valid ED25519 key with a different public key — worth remembering, since the
  SDK reports no error for the wrong reading. Key was temporary and is being rotated; the ids
  outlive it. **Protocol deviation to record:** #31 and #33 are lane PRs authored by the design node
  again, for the same reason as #24/#26/#28 — no worker session was live — so the human merge is the
  only review.
- 2026-08-31: credential-free sponsor depth, cut from ADR-0005's post-mortem: mirror-node
  consensus verification of a settlement (#24, `claim/23` deleted, #23 closed), ENS reverse +
  mutual identity (#26, `claim/25` deleted, #25 closed), and an MCP server over the grant algebra
  (#28, `status:review`). Claim ledger, `SPONSOR-DEPTH.md`, `SUBMISSION.md`, `README.md` and
  `contracts/surface.md` caught up: H-4/H-5, E-4/E-5, M-1..M-3. **Protocol deviation to record:**
  #24, #26 and #28 are lane PRs authored by the design node, so none had an independent reviewer
  and the human merge was the only review. Nothing about these changes upgrades a blocked row —
  H-1/H-2, E-3 and B-1/B-2 are untouched.
- 2026-09-10: repo created from agent-bus-template; bootstrap run (mode=solo).
- 2026-09-10: design node joined (issue #3). Lanes still provisional (`canary` only) — the real
  split is proposed on #3 and lands once the brief is confirmed, before the first lane claim.
- 2026-09-10: real lane split lands (`core`/`chain`/`surface`) with `docs/verify.txt` and
  `docs/setup.sh` in the same PR, so one canary round covers all three. Idea settled after three
  adversarial passes on #3: the project claims *evidence*, not a novel mechanism — see ADR-0003.
- 2026-08-31: all three lanes merged (#12 chain, #13 core, #14 surface, #17 ENS reads) and their
  design counterparts (#11, #15, #18, #19, #20). `claim/7`, `claim/8`, `claim/9`, `claim/16` deleted;
  #8 and #9 closed. #7 and #16 stay open deliberately — their acceptance criteria are a HashScan link
  and an onchain ENS write, and neither credential exists, so neither is claimed.
