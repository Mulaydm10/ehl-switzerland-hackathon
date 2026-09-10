# DEMO

The rehearsed judge-facing script. This is not a feature list — it is the exact click-by-click /
command-by-command happy path judges will see. **This file must stay runnable at all times once a
demo path exists: fixing a broken demo outranks building new features.**

Every scenario below is a row in the results table (`ADR-0003`): whatever it prints is the only
thing the README, the video, and the submission may claim. A scenario whose evidence column is
still empty has not been run, and must be described as such out loud.

**Preconditions shared by every scenario**

1. `bash docs/setup.sh` at the repo root.
2. `surface/.env` filled in from `surface/.env.example`:
   - `SURFACE_PAYEE_ACCOUNT_ID` — the seller's Hedera testnet account (`0.0.x`)
   - `BLOCKY402_FACILITATOR_URL` — `https://api.testnet.blocky402.com`
   - `HEDERA_ACCOUNT_ID` / `HEDERA_PRIVATE_KEY` — the child agents' payer account
   - optional `SURFACE_NETWORK` (CAIP-2, default `hedera:testnet`), `SURFACE_PORT` (default `8402`)
3. `npm run serve --prefix surface`, then open `http://localhost:8402`.

On boot the server prints the facilitator's discovered fee payer. **Without
`HEDERA_PRIVATE_KEY` the demo still runs, and every pay button answers `no Hedera key configured`
rather than staging a fake receipt** — that state is honest, but it is not the demo.

The two refusal scenarios below (`DEMO-0002`, `DEMO-0003`) need **none** of that: the server
authorises before it quotes a price, so a refusal costs no key, no funds and no network. A judge
holding nothing can reproduce them; only the settling scenarios need the payer account.

**Reset procedure (the part that matters mid-event):** click `reset`, or
`curl -XPOST localhost:8402/demo/reset`. It rebuilds the grant tree in memory — one parent
(1 000 000 tinybar), two children at 300 000 and a third, `child-c`, at 150 000 — and un-revokes
everything. `child-c` exists so that "over budget" is reachable on a fresh tree: its cap sits below
`/summarize`'s 250 000 price, so refusal needs no prior spending. Nothing is persisted,
so restarting the server has the same effect. Settled HBAR is *not* returned; the payer account
needs enough testnet balance for a full run-through (≈1 000 000 tinybar = 0.01 HBAR).

---

## DEMO-0001 — a child agent pays inside its allowance

**Status:** implemented; run against the live facilitator to fill in the evidence.

**Steps:** in the `child-a` row, click `pay /translate`.

**Expected output:** `200`, a Hedera transaction id, and a HashScan link that resolves to a
`CRYPTOTRANSFER` of 100 000 tinybar to `SURFACE_PAYEE_ACCOUNT_ID`. `child-a`'s remaining allowance
drops 300 000 → 200 000.

**What it proves:** the resource server quotes x402 v2, the child signs with its *own* key, and the
facilitator settles on Hedera testnet. No shared wallet exists anywhere in the flow.

---

## DEMO-0002 — the same agent is refused past its allowance

**Status:** run, no credentials — `surface/evidence/demo-0002-over-limit.png` and
`surface/evidence/refusals-no-credentials.txt`.

**Steps:** click `pay /summarize` on `child-c`, whose cap (150 000) is below the price (250 000).
Equivalently: `curl -XPOST 'localhost:8402/demo/pay?grant=child-c&route=/summarize'`.

**Expected output:** `403 OVER_LIMIT`, no transaction id, and the log line saying nothing settled.

**What it proves:** the limit is enforced *before* money moves, not reconciled afterwards. The
server asks `core.authorize` first and never reaches the facilitator on refusal — the property the
surface tests assert directly.

---

## DEMO-0003 — the parent revokes, mid-flight

**Status:** run, no credentials — `surface/evidence/demo-0003-revoked.png`.

**Steps:** click `revoke` on `child-a`, then `pay /translate` on `child-a`.

**Expected output:** `403 REVOKED`, no transaction. The row shows `revoked`.

**What it proves:** revocation is immediate and needs no cooperation from the child, no onchain
transaction, and no key rotation.

---

## DEMO-0004 — the sibling is untouched

**Status:** implemented; the *unaffected* half is visible without a key (`child-b` passes
authorisation and reaches the payment step), but the `200` needs the payer account, as `DEMO-0001`.

**Steps:** immediately after DEMO-0003, click `pay /translate` on `child-b`.

**Expected output:** `200` plus a second HashScan link; `child-b` drops 300 000 → 200 000.

**What it proves:** revocation is scoped to the subtree it names. Contrast with a shared API key,
where cutting off one agent cuts off all of them.

---

## Adding a new scenario

Copy a block, increment the ID, fill in every section — especially what it proves and where the
evidence lives. If a scenario is replaced by a better one, mark the old header
`DEMO-000N — superseded by DEMO-000M` and leave its content in place rather than deleting it.
