import { test } from "node:test";
import assert from "node:assert/strict";
import { encodePaymentResponseHeader } from "@x402/core/http";
import { selectHederaRequirement, settlementFrom } from "../src/pay.js";
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

function responseWith(settle: Record<string, unknown>): Response {
  return new Response("ok", {
    headers: { "X-PAYMENT-RESPONSE": encodePaymentResponseHeader(settle as never) },
  });
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
  assert.match(feePayerMismatch({ feePayer: "0.0.1" }, "0.0.99") ?? "", /asks for feePayer 0\.0\.1/);
  assert.equal(feePayerMismatch({ feePayer: "0.0.99" }, "0.0.99"), undefined);
});
