import { ExactHederaScheme, HEDERA_TESTNET_CAIP2, HBAR_ASSET_ID } from "@x402/hedera";
import type { ClientHederaSigner } from "@x402/hedera";
import type { PaymentPayload, PaymentRequirements, SettleResponse } from "@x402/core/types";
import { settlementOf } from "./pay.js";
import { fetchSupported, feePayerFor } from "./supported.js";
import { PaymentError, type Settlement } from "./types.js";

/** x402 protocol version this lane speaks. */
export const X402_VERSION = 2;

/** Terms of a settlement we are asking the facilitator to perform for us. */
export type DirectSettleRequest = {
  /** Blocky402 base URL, no trailing slash. */
  facilitatorUrl: string;
  /** Payee account id, e.g. `0.0.5678`. A real counterparty, never the payer. */
  payTo: string;
  /** Amount in the asset's atomic units — tinybars for HBAR. */
  amount: string;
  /** Hedera asset id; `0.0.0` is native HBAR. */
  asset?: string;
  /** Seconds the facilitator may hold the signed transfer before it expires. */
  maxTimeoutSeconds?: number;
};

/**
 * Builds the requirements the payer signs against.
 *
 * `contracts/chain.md`: a resource server is not required to produce a real
 * settlement — the payer may state the terms itself and hand the facilitator a
 * signed transfer. The transfer, its fees and its HashScan entry are identical
 * either way; only the party who authored the terms differs, and for the
 * demo that party is us.
 */
export function buildRequirements(
  request: DirectSettleRequest,
  feePayer: string | undefined,
): PaymentRequirements {
  return {
    scheme: "exact",
    network: HEDERA_TESTNET_CAIP2,
    asset: request.asset ?? HBAR_ASSET_ID,
    amount: request.amount,
    payTo: request.payTo,
    maxTimeoutSeconds: request.maxTimeoutSeconds ?? 60,
    extra: feePayer === undefined ? {} : { feePayer },
  };
}

/**
 * Settles one real transfer through the facilitator, with no resource server.
 *
 * The fee payer is discovered rather than configured: the facilitator co-signs
 * every transfer, and the SDK refuses to sign for one it does not advertise, so
 * a hard-coded value is a time bomb (`contracts/chain.md`).
 *
 * One attempt. A failed settlement raises; it is never retried, because a retry
 * of an already-broadcast transfer risks paying twice.
 */
export async function settleDirect(
  request: DirectSettleRequest,
  signer: ClientHederaSigner,
): Promise<{ settlement: Settlement; requirements: PaymentRequirements }> {
  const base = request.facilitatorUrl.replace(/\/$/, "");
  const feePayer = feePayerFor(await fetchSupported(base));
  const requirements = buildRequirements(request, feePayer);

  const created = await new ExactHederaScheme(signer).createPaymentPayload(X402_VERSION, requirements);
  const paymentPayload: PaymentPayload = {
    x402Version: created.x402Version,
    accepted: requirements,
    payload: created.payload,
    ...(created.extensions !== undefined ? { extensions: created.extensions } : {}),
  };

  const response = await fetch(`${base}/settle`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ x402Version: X402_VERSION, paymentPayload, paymentRequirements: requirements }),
  });
  if (!response.ok) {
    throw new PaymentError(
      `facilitator POST /settle returned ${response.status}`,
      "settle_unavailable",
      await response.text().catch(() => ""),
    );
  }
  return { settlement: settlementOf((await response.json()) as SettleResponse), requirements };
}
