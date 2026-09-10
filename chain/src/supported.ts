import { HEDERA_TESTNET_CAIP2 } from "@x402/hedera";
import { PaymentError } from "./types.js";

/** One entry of the facilitator's `GET /supported` response. */
export type SupportedKind = {
  x402Version: number;
  scheme: string;
  network: string;
  extra?: Record<string, unknown>;
};

/**
 * Reads the facilitator's advertised capabilities.
 *
 * `extra.feePayer` must match what the facilitator advertises here or the client
 * SDK throws before signing (contracts/chain.md), so this is worth checking
 * up front rather than discovering it inside a signing failure.
 *
 * One attempt, no retry loop: the facilitator allows 10 req/s and a retry storm
 * against a rate limit is how a demo dies on stage.
 */
export async function fetchSupported(facilitatorUrl: string): Promise<SupportedKind[]> {
  const url = `${facilitatorUrl.replace(/\/$/, "")}/supported`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new PaymentError(`facilitator GET /supported failed: ${res.status}`, "supported_unavailable", await res.text().catch(() => ""));
  }
  const body = (await res.json()) as { kinds?: SupportedKind[] };
  return body.kinds ?? [];
}

/** Returns the advertised fee payer for the exact/Hedera-testnet kind, if the facilitator declares one. */
export function feePayerFor(kinds: SupportedKind[], network: string = HEDERA_TESTNET_CAIP2): string | undefined {
  const kind = kinds.find((k) => k.network === network && k.scheme === "exact");
  const feePayer = kind?.extra?.["feePayer"];
  return typeof feePayer === "string" ? feePayer : undefined;
}

/**
 * Checks the fee payer a 402 asks us to use against the one the facilitator
 * advertises. Returns the mismatch as a message rather than throwing, so callers
 * can report it as a payment refusal instead of a crash.
 */
export function feePayerMismatch(required: Record<string, unknown>, advertised: string | undefined): string | undefined {
  const extra = required["extra"];
  const asked = extra && typeof extra === "object" ? (extra as Record<string, unknown>)["feePayer"] : undefined;
  if (typeof asked !== "string" || advertised === undefined) return undefined;
  return asked === advertised ? undefined : `402 asks for feePayer ${asked} but facilitator advertises ${advertised}`;
}
