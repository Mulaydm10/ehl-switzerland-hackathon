# Prior art

Append-only. One entry per thing checked, whether or not it turned out to be relevant — a "checked,
nothing found" entry is still useful so nobody re-checks it.

| Date | Candidate idea | What exists already | Verdict | Notes |
|---|---|---|---|---|
| _(none yet — no idea chosen)_ | | | | |
| 2026-09-10 | Recursive attenuated delegation (original "Capability Descent" pitch) | **VERA**, arXiv 2608.30091 — edge-exact revocation over multi-parent delegation graphs; explicitly critiques naive subtree cascade as *over-revoking* | **Kills the claim** | Our headline was the published weaker variant. Verified: paper fetched. Turned into a strength — we are single-parent by design, so we do not hit it (ADR-0003) |
| 2026-09-10 | Monotonic attenuation ("each hop may only narrow") | macaroons / UCAN / ZCAP-LD lineage; `draft-asor-wimse-agent-delegation-chain-01`; Agent Passport System `draft-pidlisnyi-aps-02` carries **spend** as a constraint dimension | **Kills the claim** | APS refutes the narrower "capability systems never attenuate money" argument. Verified: both drafts fetched |
| 2026-09-10 | ENS subnames as an agent capability tree | ENS's own ERC-8004 / agentic-commerce material — `agent.org.eth` controlled by `org.eth` is the documented intended pattern | **Kills the claim** | Implementing it is executing a published roadmap, not an insight |
| 2026-09-10 | Agent spending ceilings on Hedera | **PlanBound** (ETHGlobal Lisbon 2026) — single-use Hedera account funded to exactly the approved amount under multi-sig, because x402 cannot settle into a contract call | **Adopt and credit** | Technique adopted wholesale (ADR-0003). Crediting it converts "isn't this PlanBound?" from a vulnerability into evidence of rigour |
| 2026-09-10 | Agents-as-ENS-subnames + x402 + Hedera | **A2A** (ETHGlobal Cannes 2026) | Occupied | The general pattern is the most saturated one at recent ETHGlobal events |
| 2026-09-10 | Budget as N one-shot boolean "may-spend-once" flags (the proposed pivot) | Chaumian e-cash (1982, shipping as Cashu) — value unary-encoded as N one-time bearer tokens; `agentcard` — single-use payment authorizations with cap/scope/expiry; arXiv 2606.04056 — affine-typed non-Clone `Budget` with `spend(self)` | **Kills the claim, twice** | Also fails on engineering: N flags *is* the integer N in unary, O(N) mints, and x402's per-route arbitrary pricing breaks one-flag-one-call. Dropped entirely (ADR-0003) |
| 2026-09-10 | Adjacent delegation/authorization work | SentinelAgent (arXiv 2604.02767), ResidualAuth (arXiv 2609.08062) | Occupied | Confirms: no unoccupied mechanism remains in this space in 2026 |
| 2026-09-10 | "Pramana Protocol — 187 tests, cascade revocation to depth 15" | **NOTHING. The citation was fabricated** — sourced from a real-looking GitHub issue. The actual repo is a claim-attestation system, 84 tests, zero delegation code | **RETRACTED** | Passed one adversarial pass and one design review before being caught. Standing rule since: a claim about another system is unverified until the artifact is fetched (ADR-0003) |
