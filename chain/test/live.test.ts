import { test } from "node:test";
import assert from "node:assert/strict";
import { loadChainEnv } from "../src/env.js";
import { signerForAccount } from "../src/pay.js";
import { settleDirect } from "../src/settle.js";
import { fetchSupported, feePayerFor } from "../src/supported.js";

loadChainEnv();

/**
 * Live-chain tests. `contracts/chain.md`: these must be skippable without
 * credentials and must NOT silently pass when skipped — node:test reports a
 * `skip:` reason, so a run with no keys is visibly incomplete rather than green.
 */
const accountId = process.env["HEDERA_ACCOUNT_ID"];
const privateKey = process.env["HEDERA_PRIVATE_KEY"];
const facilitatorUrl = process.env["BLOCKY402_FACILITATOR_URL"];
const payTo = process.env["HEDERA_PAYEE_ACCOUNT_ID"];

const missing = [
  accountId ? null : "HEDERA_ACCOUNT_ID",
  privateKey ? null : "HEDERA_PRIVATE_KEY",
  facilitatorUrl ? null : "BLOCKY402_FACILITATOR_URL",
  payTo ? null : "HEDERA_PAYEE_ACCOUNT_ID",
].filter(Boolean);

const skipPayment = missing.length > 0 ? `live payment needs ${missing.join(", ")} — see chain/.env.example` : false;

test("facilitator advertises an exact/hedera-testnet kind", { skip: facilitatorUrl ? false : "needs BLOCKY402_FACILITATOR_URL" }, async () => {
  const kinds = await fetchSupported(facilitatorUrl!);
  const hedera = kinds.filter((k) => k.network === "hedera:testnet" && k.scheme === "exact");
  assert.ok(hedera.length > 0, `facilitator advertises no exact/hedera:testnet kind; got ${JSON.stringify(kinds)}`);
  // Not an assertion: some facilitators omit feePayer, and absence is not an error.
  console.log("advertised feePayer:", feePayerFor(kinds) ?? "(none advertised)");
});

test("settles a real transfer through the facilitator and returns a HashScan link", { skip: skipPayment }, async () => {
  const signer = await signerForAccount(accountId!, privateKey!);
  const { settlement } = await settleDirect(
    {
      facilitatorUrl: facilitatorUrl!,
      payTo: payTo!,
      amount: process.env["HEDERA_AMOUNT_TINYBAR"] ?? "100000",
    },
    signer,
  );

  assert.ok(settlement.transactionId.length > 0, "settlement must carry a raw transaction id");
  assert.match(settlement.explorerUrl, /^https:\/\/hashscan\.io\/testnet\/transaction\//);
  assert.equal(settlement.network, "hedera:testnet");

  // The link is the artifact the submission rests on — print it so a real run is copyable into the issue.
  console.log(JSON.stringify(settlement, null, 2));
});
