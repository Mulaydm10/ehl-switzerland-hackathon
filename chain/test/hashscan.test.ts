import { test } from "node:test";
import assert from "node:assert/strict";
import { hashScanNetwork, hashScanUrl, toHashScanTxId } from "../src/hashscan.js";

test("rewrites a Hedera transaction id into HashScan's separator form", () => {
  assert.equal(toHashScanTxId("0.0.1234@1699999999.000000000"), "0.0.1234-1699999999-000000000");
});

test("leaves an id it does not recognise untouched rather than corrupting it", () => {
  assert.equal(toHashScanTxId("not-an-id"), "not-an-id");
});

test("maps CAIP-2 networks to HashScan path segments", () => {
  assert.equal(hashScanNetwork("hedera:testnet"), "testnet");
  assert.equal(hashScanNetwork("hedera:mainnet"), "mainnet");
});

test("refuses a non-Hedera network instead of guessing a path", () => {
  assert.throws(() => hashScanNetwork("eip155:8453"), /not a Hedera CAIP-2 network/);
});

test("builds the full explorer url", () => {
  assert.equal(
    hashScanUrl("0.0.1234@1699999999.000000000", "hedera:testnet"),
    "https://hashscan.io/testnet/transaction/0.0.1234-1699999999-000000000",
  );
});
