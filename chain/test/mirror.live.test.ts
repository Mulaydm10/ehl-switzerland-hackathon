import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HEDERA_TESTNET_MIRROR,
  accountFacts,
  confirmTransfer,
  creditedTo,
  disagreement,
} from "../src/mirror.js";

/**
 * Live Hedera reads with **no credentials at all**.
 *
 * These are the only live Hedera tests a stranger can run holding nothing: the
 * mirror node is a public REST view of consensus. They are gated the same way
 * the other live tests are — a skipped run says so out loud rather than passing
 * vacuously (`contracts/chain.md`) — but the gate here is a switch, not a
 * secret, because there is no secret to hold.
 */
const skip = process.env["MIRROR_LIVE"]
  ? false
  : "MIRROR_LIVE unset — no live mirror node read attempted";

test("the fee payer the facilitator quotes is a real, live testnet account", { skip }, async () => {
  // The Blocky402 facilitator's own fee payer, as `/supported` reports it. If
  // this account were deleted or unfunded our quotes would name a payer that
  // cannot pay, and the failure would only surface at settlement time.
  const facts = await accountFacts("0.0.7162784", HEDERA_TESTNET_MIRROR);

  assert.ok(facts, "expected the facilitator's fee payer to exist on testnet");
  assert.equal(facts.deleted, false);
  assert.ok(facts.balanceTinybar > 0n, "a fee payer with no balance cannot pay fees");
  assert.match(facts.evmAddress ?? "", /^0x[0-9a-f]{40}$/);
});

test("an account id nobody has ever created reads as unknown, not as empty", { skip }, async () => {
  const facts = await accountFacts("0.0.999999999", HEDERA_TESTNET_MIRROR);
  assert.equal(facts, undefined);
});

test("an id outside the entity range is a mistake, not an unused account", { skip }, async () => {
  await assert.rejects(
    () => accountFacts("0.0.999999999999", HEDERA_TESTNET_MIRROR),
    /not a valid Hedera account id/,
  );
});

test("a real testnet transfer is confirmed from consensus, and its credit adds up", { skip }, async () => {
  // Rather than pin one transaction id — testnet is periodically reset — take
  // the most recent successful HBAR transfer consensus knows about and verify
  // our reader against it. Whatever it is, the transfer list must balance to
  // zero and the payer must be out of pocket by the fee.
  const listed = await fetch(
    `${HEDERA_TESTNET_MIRROR}/api/v1/transactions?transactiontype=CRYPTOTRANSFER&result=success&limit=1`,
  );
  const body = (await listed.json()) as { transactions?: Array<{ transaction_id?: string }> };
  const id = body.transactions?.[0]?.transaction_id;
  assert.ok(id, "expected the mirror node to list a recent successful transfer");

  const facts = await confirmTransfer(id, HEDERA_TESTNET_MIRROR);
  assert.ok(facts, `expected consensus to know transaction ${id}`);
  assert.equal(facts.result, "SUCCESS");
  assert.ok(facts.chargedTxFeeTinybar > 0n);

  const net = facts.transfers.reduce((sum, t) => sum + t.amount, 0n);
  assert.equal(net, 0n, "a transfer list that does not sum to zero would mean we misread it");

  const credited = facts.transfers.filter((t) => t.amount > 0n);
  assert.ok(credited.length > 0);
  for (const party of credited) {
    assert.equal(creditedTo(facts, party.account), party.amount);
  }
});

test("a receipt naming a transaction consensus never saw is caught as a disagreement", { skip }, async () => {
  // A well-formed id that will not exist: our own payer account with a
  // valid-start far in the past. This is the check that would catch a
  // facilitator handing us a plausible-looking receipt for nothing.
  const invented = "0.0.7162784-1000000000-000000000";
  const facts = await confirmTransfer(invented, HEDERA_TESTNET_MIRROR);

  assert.deepEqual(disagreement(facts, "0.0.7162784", 1n), { kind: "unknown-transaction" });
});
