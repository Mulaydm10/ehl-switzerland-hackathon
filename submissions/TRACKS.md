# Track audit — every prize we could enter, and whether we are in it

Why this file exists: ADR-0005 G-6. A previous entry of ours left an entire track unclaimed because
nobody spent the hour it needed, and a simpler project won it. So the tracks get enumerated and
scored, and an empty row is a decision that has to be made rather than a thing nobody noticed.

**This file cannot be filled in yet, and that is deliberate.** The prize list, the number of prizes
one project may enter, and the submission mechanics are event facts, and event facts live in
`COMPETITION.md`, which is LOCKED and unwritten (Q-0001). Filling these rows from memory is exactly
the failure mode `CLAUDE.md` forbids: an obvious blank is cheap to spot, a plausible fabrication is
not. So what ships now is the *procedure* and the rows we already know the answer to from our own
evidence.

## The procedure, once `COMPETITION.md` exists

1. List every prize on the event page — sponsor prizes, ETHGlobal-run pools, and the small
   non-technical ones (write-ups, threads, feedback, first-time pools). One row each; no
   pre-filtering by whether it "feels like us".
2. For each row: the qualification requirement quoted verbatim, the artifact it demands, our
   estimated hours, and one of `in` / `out — reason` / `blocked — <what's missing>`.
3. Any row estimated under two hours that is not `in` needs a written reason. That is the whole
   point of the file.
4. Check the cap on how many prizes one project may apply to before choosing; if the cap binds,
   rank by (probability × amount) / hours and record the ranking, not just the choice.
5. Re-check the list once more before the deadline. Sponsors add prizes late.

## Rows we can already fill from our own evidence

| Track | Requirement | Our position | Effort left |
|---|---|---|---|
| Hedera / x402 settlement | a real settled payment on Hedera | **blocked** — code-complete, no testnet key, no HashScan link (`RESULTS.md` H-1/H-2) | ~10 min of the human's time, then ~1 h |
| ENS identity (read side) | ENS used as real identity infrastructure | **in** — live Sepolia resolution through the canonical Universal Resolver, three-state (`RESULTS.md` E-1/E-2) | done; depth items queued |
| ENS revocation published onchain | an onchain write | **blocked** — needs a funded Sepolia account (E-3) | faucet + ~1 h |
| Bazantic | account + gateway + MCP server + Recipe + a controlled A/B (ADR-0004) | **blocked** — 0 of 7 artifacts; needs the human to create the account | ~1 day once unblocked |
| Write-up / blog track, if one exists | a public technical write-up | **unclaimed** — and we are unusually well placed: `RESULTS.md`, `SPONSOR-DEPTH.md` and the ADRs are already the raw material, so this is assembly rather than authorship | ~1–2 h |
| Best UI / presentation, if one exists | a memorable interface | **out, by instruction** — further demo/UI work is scoped out (ADR-0005 G-5) | n/a |
| Anything requiring a public repo | repo visible to judges | **blocked** — repo is private; one toggle, and it gates *everything* | ~1 min of the human's time |
| Anything requiring a hosted demo | a live URL | **not started** — the surface runs locally; a deploy would need a key to be worth showing | ~2 h, after the Hedera key |

## The cheapest points on the board, in order

1. Making the repo public. It is a toggle and it gates every other row.
2. The Hedera testnet key. Free, ten minutes, converts two `blocked` rows and the strong half of the
   video.
3. A Sepolia faucet drip. Free, converts E-3.
4. The write-up track, if it exists — the material is already written; it needs assembling and
   posting. This is the exact row we left on the table last time.
5. The Bazantic account. Largest remaining build, but a genuine zero right now.

Items 1–3 and 5 need the human. Item 4 needs the track list, i.e. `COMPETITION.md`.
