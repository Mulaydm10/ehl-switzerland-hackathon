/**
 * One real x402-gated payment on Hedera testnet, settled through Blocky402.
 *
 * Usage: cp .env.example .env && fill it in, then `npm run pay:once --prefix chain`.
 * Prints the Settlement as JSON so the HashScan link can be pasted into issue #7.
 */
import { createTestnetSigner, payUrl } from "../src/pay.js";
import { fetchSupported, feePayerFor } from "../src/supported.js";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`missing ${name} — see chain/.env.example`);
    process.exit(2);
  }
  return value;
}

const accountId = required("HEDERA_ACCOUNT_ID");
const privateKey = required("HEDERA_PRIVATE_KEY");
const resourceUrl = required("X402_RESOURCE_URL");
const facilitatorUrl = process.env["BLOCKY402_FACILITATOR_URL"];

if (facilitatorUrl) {
  // Checked first because a feePayer mismatch throws inside signing, where the
  // error is far less legible than it is here.
  const kinds = await fetchSupported(facilitatorUrl);
  console.error(`facilitator kinds: ${kinds.map((k) => `${k.scheme}/${k.network}`).join(", ") || "(none)"}`);
  console.error(`advertised feePayer: ${feePayerFor(kinds) ?? "(none advertised)"}`);
}

try {
  const { settlement } = await payUrl(resourceUrl, createTestnetSigner(accountId, privateKey));
  console.log(JSON.stringify(settlement, null, 2));
} catch (error) {
  // Fail loudly with the chain's own error; a silent fallback is how a demo lies.
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  if (error && typeof error === "object" && "detail" in error && error.detail) console.error(String(error.detail));
  process.exit(1);
}
