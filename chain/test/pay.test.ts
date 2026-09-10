import { test } from "node:test";
import assert from "node:assert/strict";
import { encodePaymentResponseHeader } from "@x402/core/http";
import { payUrl, selectHederaRequirement, settlementFrom, settlementOf } from "../src/pay.js";
import { buildRequirements } from "../src/settle.js";
import { PaymentError } from "../src/types.js";
import { feePayerFor, feePayerMismatch } from "../src/supported.js";

const hederaRequirement = {
  scheme: "exact",
  network: "hedera:testnet",
  asset: "0.0.0",
  amount: "100000",
  payTo: "0.0.5678",
  maxTimeoutSeconds: 60,
  extra: {},
} as const;

function responseWith(settle: Record<string, unknown>, header = "PAYMENT-RESPONSE"): Response {
  return new Response("ok", { headers: { [header]: encodePaymentResponseHeader(settle as never) } });
}

test("selects the exact/hedera-testnet requirement out of a mixed 402", () => {
  const chosen = selectHederaRequirement([
    { ...hederaRequirement, scheme: "exact", network: "eip155:8453" },
    hederaRequirement,
  ] as never);
  assert.equal(chosen?.network, "hedera:testnet");
});

test("returns undefined when nothing is payable, rather than picking a wrong rail", () => {
  assert.equal(selectHederaRequirement([{ ...hederaRequirement, network: "eip155:8453" }] as never), undefined);
});

test("extracts settlement evidence and derives the HashScan url", () => {
  const settlement = settlementFrom(
    responseWith({
      success: true,
      transaction: "0.0.1234@1699999999.000000000",
      network: "hedera:testnet",
      payer: "0.0.1234",
    }),
  );
  assert.equal(settlement.transactionId, "0.0.1234@1699999999.000000000");
  assert.equal(settlement.explorerUrl, "https://hashscan.io/testnet/transaction/0.0.1234-1699999999-000000000");
  assert.equal(settlement.payer, "0.0.1234");
});

test("still reads the v1 X-PAYMENT-RESPONSE spelling", () => {
  const settlement = settlementFrom(
    responseWith(
      { success: true, transaction: "0.0.1234@1699999999.000000000", network: "hedera:testnet" },
      "X-PAYMENT-RESPONSE",
    ),
  );
  assert.equal(settlement.transactionId, "0.0.1234@1699999999.000000000");
});

test("treats a missing settlement header as a failure, never as a silent success", () => {
  assert.throws(() => settlementFrom(new Response("ok")), (e: unknown) => e instanceof PaymentError && e.reason === "no_settlement_header");
});

test("surfaces a facilitator-reported settlement failure", () => {
  assert.throws(
    () => settlementFrom(responseWith({ success: false, errorReason: "transaction_failed", transaction: "", network: "hedera:testnet" })),
    /settlement failed: transaction_failed/,
  );
});

test("reads the advertised fee payer and flags a mismatch", () => {
  const kinds = [{ x402Version: 2, scheme: "exact", network: "hedera:testnet", extra: { feePayer: "0.0.99" } }];
  assert.equal(feePayerFor(kinds), "0.0.99");
  assert.match(feePayerMismatch({ ...hederaRequirement, extra: { feePayer: "0.0.1" } }, "0.0.99") ?? "", /asks for feePayer 0\.0\.1/);
  assert.equal(feePayerMismatch({ ...hederaRequirement, extra: { feePayer: "0.0.99" } }, "0.0.99"), undefined);
  assert.equal(feePayerMismatch(hederaRequirement, "0.0.99"), undefined);
});

test("refuses a streamed body before signing, since the paid retry cannot replay it", async () => {
  await assert.rejects(
    payUrl("https://example.invalid/paid", {} as never, {
      method: "POST",
      body: new ReadableStream(),
      duplex: "half",
    } as RequestInit),
    (e: unknown) => e instanceof PaymentError && e.reason === "unreplayable_body",
  );
});

test("builds requirements from the facilitator's advertised fee payer", () => {
  const requirements = buildRequirements(
    { facilitatorUrl: "https://f.invalid", payTo: "0.0.5678", amount: "100000" },
    "0.0.99",
  );
  assert.deepEqual(requirements, {
    scheme: "exact",
    network: "hedera:testnet",
    asset: "0.0.0",
    amount: "100000",
    payTo: "0.0.5678",
    maxTimeoutSeconds: 60,
    extra: { feePayer: "0.0.99" },
  });
  assert.deepEqual(
    buildRequirements({ facilitatorUrl: "https://f.invalid", payTo: "0.0.5678", amount: "1" }, undefined).extra,
    {},
  );
});

test("turns a facilitator settle response into linkable evidence", () => {
  const settlement = settlementOf({
    success: true,
    transaction: "0.0.1234@1699999999.000000000",
    network: "hedera:testnet",
    payer: "0.0.1234",
  } as never);
  assert.equal(settlement.explorerUrl, "https://hashscan.io/testnet/transaction/0.0.1234-1699999999-000000000");
});
