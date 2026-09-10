/**
 * One real HBAR transfer on Hedera testnet, settled through the Blocky402
 * facilitator, printed as JSON so the HashScan link can be pasted into
 * https://github.com/Mulaydm10/ehl-switzerland-hackathon/issues/7.
 *
 * Usage: cp chain/.env.example chain/.env, fill it in, then
 * `npm run pay:once --prefix chain`.
 *
 * Default path is direct facilitator settlement — no x402-gated resource server
 * is required to produce a real, linkable transfer (contracts/chain.md). Set
 * X402_RESOURCE_URL to pay a real gated endpoint instead.
 */
import { loadChainEnv } from "../src/env.js";
loadChainEnv();

import { createTestnetSigner, payUrl } from "../src/pay.js";
import { settleDirect } from "../src/settle.js";
import { fetchSupported, feePayerFor } from "../src/supported.js";
import type { Settlement } from "../src/types.js";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`missing ${name} — see chain/.env.example`);
    process.exit(2);
  }
  return value;
}

const signer = createTestnetSigner(required("HEDERA_ACCOUNT_ID"), required("HEDERA_PRIVATE_KEY"));
const resourceUrl = process.env["X402_RESOURCE_URL"];

try {
  let settlement: Settlement;
  if (resourceUrl) {
    const facilitatorUrl = process.env["BLOCKY402_FACILITATOR_URL"];
    if (facilitatorUrl) {
      // Reported first because a feePayer mismatch surfaces inside signing,
      // where the error is far less legible than it is here.
      const kinds = await fetchSupported(facilitatorUrl);
      console.error(`advertised feePayer: ${feePayerFor(kinds) ?? "(none advertised)"}`);
    }
    ({ settlement } = await payUrl(resourceUrl, signer));
  } else {
    ({ settlement } = await settleDirect(
      {
        facilitatorUrl: required("BLOCKY402_FACILITATOR_URL"),
        payTo: required("HEDERA_PAYEE_ACCOUNT_ID"),
        amount: process.env["HEDERA_AMOUNT_TINYBAR"] ?? "100000",
      },
      signer,
    ));
  }
  console.log(JSON.stringify(settlement, null, 2));
} catch (error) {
  // Fail loudly with the chain's own error; a silent fallback is how a demo lies.
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  if (error && typeof error === "object" && "detail" in error && error.detail) console.error(String(error.detail));
  process.exit(1);
}
