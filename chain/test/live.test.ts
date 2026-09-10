import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestnetSigner, payUrl } from "../src/pay.js";
import { fetchSupported, feePayerFor } from "../src/supported.js";

/**
 * Live-chain tests. `contracts/chain.md`: these must be skippable without
 * credentials and must NOT silently pass when skipped — node:test reports a
 * `skip:` reason, so a run with no keys is visibly incomplete rather than green.
 */
const accountId = process.env["HEDERA_ACCOUNT_ID"];
const privateKey = process.env["HEDERA_PRIVATE_KEY"];
const resourceUrl = process.env["X402_RESOURCE_URL"];
const facilitatorUrl = process.env["BLOCKY402_FACILITATOR_URL"];

const missing = [
  accountId ? null : "HEDERA_ACCOUNT_ID",
  privateKey ? null : "HEDERA_PRIVATE_KEY",
  resourceUrl ? null : "X402_RESOURCE_URL",
].filter(Boolean);

const skipPayment = missing.length > 0 ? `live payment needs ${missing.join(", ")} — see chain/.env.example` : false;

test("facilitator advertises an exact/hedera-testnet kind", { skip: facilitatorUrl ? false : "needs BLOCKY402_FACILITATOR_URL" }, async () => {
  const kinds = await fetchSupported(facilitatorUrl!);
  const hedera = kinds.filter((k) => k.network === "hedera:testnet" && k.scheme === "exact");
  assert.ok(hedera.length > 0, `facilitator advertises no exact/hedera:testnet kind; got ${JSON.stringify(kinds)}`);
  // Not an assertion: some facilitators omit feePayer, and absence is not an error.
  console.log("advertised feePayer:", feePayerFor(kinds) ?? "(none advertised)");
});

test("pays a real x402-gated request and returns a HashScan link", { skip: skipPayment }, async () => {
  const signer = createTestnetSigner(accountId!, privateKey!);
  const { response, settlement } = await payUrl(resourceUrl!, signer);

  assert.equal(response.status, 200, "paid request must return 200 after settlement");
  assert.ok(settlement.transactionId.length > 0, "settlement must carry a raw transaction id");
  assert.match(settlement.explorerUrl, /^https:\/\/hashscan\.io\/testnet\/transaction\//);
  assert.equal(settlement.network, "hedera:testnet");

  // The link is the artifact the submission rests on — print it so a real run is copyable into the issue.
  console.log(JSON.stringify(settlement, null, 2));
});
