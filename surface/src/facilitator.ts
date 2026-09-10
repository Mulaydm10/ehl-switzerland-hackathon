import { X402_VERSION, hashScanUrl } from "capability-descent-chain/src/index.ts";
import type { Settler } from "./types.js";

/**
 * The real settler: hands the client's payload to the facilitator and returns
 * what it reports. The chain-specific parts — the protocol version and the
 * explorer URL shape — come from `chain/`, not from a second copy here.
 *
 * A resource server verifies and settles; it does not sign. That is why this
 * takes no key and `chain/`'s signing client stays out of this lane.
 */
export function facilitatorSettler(baseUrl: string): Settler {
  const base = baseUrl.replace(/\/$/, "");
  return async (paymentPayload, paymentRequirements) => {
    const response = await fetch(`${base}/settle`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ x402Version: X402_VERSION, paymentPayload, paymentRequirements }),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`facilitator ${response.status} on /settle: ${text.slice(0, 400)}`);
    }
    const body = JSON.parse(text) as { transaction?: string; transactionId?: string; network?: string; success?: boolean; errorReason?: string };
    const transactionId = body.transaction ?? body.transactionId;
    if (body.success === false || !transactionId) {
      throw new Error(`facilitator settled nothing: ${body.errorReason ?? text.slice(0, 400)}`);
    }
    const network = body.network ?? paymentRequirements.network;
    return { transactionId, explorerUrl: hashScanUrl(transactionId, network), network };
  };
}
