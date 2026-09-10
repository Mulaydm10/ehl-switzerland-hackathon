> **LOCKED governing file.** Do not edit in place. See `GOVERNANCE.md`.

# Competition facts

**This file is the single source of truth for event facts.** Every other doc in this repo must
*link here* rather than restate a date, a weight, or a rule. If you find a deadline, a rubric weight,
or a hard rule duplicated in another file, delete the duplicate and replace it with a link to the
relevant section here. A stale copy of a deadline is the most expensive kind of drift in a timed
event — a bare time with no timezone has caused real missed submissions, which is exactly why every
time value below must carry an explicit timezone.

## ⚠️ Event identity is UNRESOLVED — highest-priority open question

All that is currently known: this is **an ETH hackathon in Switzerland** (the working directory was
named `ehl_switerland`). That single fact is ambiguous across at least three readings, and which one
is true changes what kind of project this even is:

1. **ETHGlobal-style Ethereum/onchain hackathon** — would imply a smart-contract / web3 dimension,
   sponsor prize tracks, and possibly a testnet deployment requirement.
2. **ETH Zurich (ETHZ) or EPFL university hackathon** — a general software/AI hackathon with no
   onchain assumption at all.
3. **EHL Lausanne event** — a different institution entirely (hospitality-business school), which
   would suggest yet another theme.

**Do not assume onchain/web3/Ethereum/blockchain until this is resolved.** No `contracts/` directory
or Solidity surface exists in this scaffold, and none should be added until the event identity is
confirmed. Tracked as **Q-0001** in `research/open_questions.md` — resolve it before committing
meaningful build time, since it may determine whether a smart-contract track is even in scope.

## Event identity

- **Event name:** TODO(Dhruv)
- **Host / organizer:** TODO(Dhruv)
- **Event link:** TODO(Dhruv)
- **Location:** TODO(Dhruv) (Switzerland — city/venue unconfirmed)

## Deadline

- **Date:** TODO(Dhruv)
- **Time:** TODO(Dhruv)
- **Timezone:** TODO(Dhruv) — write it out explicitly (e.g. "14:00 CEST", not just "14:00"). A bare
  time with no timezone has caused real missed submissions. Switzerland uses CET (UTC+1) in winter
  and CEST (UTC+2) in summer — do not assume which one applies without checking the event date.
- **Time remaining:** computed and tracked live in `STATE.md`, not here — this file holds the fixed
  target, `STATE.md` holds the live countdown.

## Submission format

- TODO(Dhruv) — what must be submitted (repo link, video, slide deck, live deploy URL, form), and
  where.

## Judging rubric

| Criterion | Weight | Notes |
|---|---|---|
| TODO(Dhruv) | TODO(Dhruv) | |
| TODO(Dhruv) | TODO(Dhruv) | |
| TODO(Dhruv) | TODO(Dhruv) | |

Every row here should have a matching row in `notes/judging_alignment.md` pointing at the concrete
artifact in this repo that satisfies it.

## Team roster

| Name | Role | Contact |
|---|---|---|
| Dhruv | Main Agent / owner | dhruvmulay10@gmail.com |
| TODO(Dhruv) | | |

## Hard rules

- **What may be pre-built before the event starts:** TODO(Dhruv)
- **Licensing constraints on submitted code:** TODO(Dhruv)
- **API keys / rate limits provided or required:** TODO(Dhruv)
- **Rules on AI-generated code:** TODO(Dhruv) — some events require disclosure of AI-assisted
  authorship; check before submitting, since this entire repo is built with AI agents in the loop.
- **Team size limits:** TODO(Dhruv)
- **Sponsor prize tracks:** TODO(Dhruv) — do not assume any exist until confirmed (see identity
  question above; some tracks are onchain-specific and irrelevant if this isn't an ETHGlobal event).

## Cross-reference discipline

If you are about to write a deadline, a rubric weight, or a hard rule anywhere else in this repo —
stop. Link to the relevant heading in this file instead. This file only works as a single source of
truth if nothing else duplicates it.
