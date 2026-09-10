import { wrapFetchWithPayment, x402Client, decodePaymentResponseHeader } from "@x402/fetch";
import type { PaymentRequired, PaymentRequirements } from "@x402/fetch";
import { ExactHederaScheme, createClientHederaSigner, PrivateKey, HEDERA_TESTNET_CAIP2 } from "@x402/hedera";
import type { ClientHederaSigner } from "@x402/hedera";
import { hashScanUrl } from "./hashscan.js";
import { PaymentError, type Settlement } from "./types.js";

/** Header the resource server returns settlement evidence in. */
const PAYMENT_RESPONSE_HEADER = "X-PAYMENT-RESPONSE";

/**
 * Builds the payer-side signer. Testnet only — `contracts/chain.md` forbids
 * mainnet, so the network is not a parameter.
 */
export function createTestnetSigner(accountId: string, privateKey: string): ClientHederaSigner {
  return createClientHederaSigner(accountId, parsePrivateKey(privateKey));
}

/**
 * Parses a payer key without making the operator guess its encoding.
 *
 * Hedera portal hands out DER for some accounts and raw hex for others, and
 * ECDSA and ED25519 are both in use on testnet. Trying each in turn costs
 * nothing and removes a failure that looks like a bad key but is a bad parser.
 */
export function parsePrivateKey(privateKey: string): PrivateKey {
  const attempts: Array<(k: string) => PrivateKey> = [
    PrivateKey.fromStringDer,
    PrivateKey.fromStringECDSA,
    PrivateKey.fromStringED25519,
  ];
  for (const parse of attempts) {
    try {
      return parse(privateKey);
    } catch {
      continue;
    }
  }
  throw new PaymentError("HEDERA_PRIVATE_KEY is not parseable as DER, ECDSA or ED25519", "bad_private_key");
}

/** An x402 client that can pay `exact` on Hedera testnet and nothing else. */
export function createTestnetClient(signer: ClientHederaSigner): x402Client {
  return new x402Client().register(HEDERA_TESTNET_CAIP2, new ExactHederaScheme(signer));
}

/**
 * Picks the requirement this lane can actually pay.
 *
 * A 402 may offer several; we only speak `exact` on Hedera testnet. Returning
 * undefined (rather than guessing) is what keeps an unpayable 402 a loud failure.
 */
export function selectHederaRequirement(accepts: readonly PaymentRequirements[]): PaymentRequirements | undefined {
  return accepts.find((r) => r.scheme === "exact" && r.network === HEDERA_TESTNET_CAIP2);
}

/**
 * Reads settlement evidence out of a paid response.
 *
 * The HashScan URL is derived here rather than by the caller so that every
 * payment path produces the same link format.
 */
export function settlementFrom(response: Response): Settlement {
  const header = response.headers.get(PAYMENT_RESPONSE_HEADER);
  if (!header) {
    throw new PaymentError(
      `paid response carried no ${PAYMENT_RESPONSE_HEADER} header; settlement cannot be evidenced`,
      "no_settlement_header",
    );
  }
  const settle = decodePaymentResponseHeader(header);
  if (!settle.success) {
    throw new PaymentError(`settlement failed: ${settle.errorReason ?? "unknown"}`, settle.errorReason, settle.errorMessage);
  }
  return {
    transactionId: settle.transaction,
    explorerUrl: hashScanUrl(settle.transaction, settle.network),
    network: settle.network,
    ...(settle.payer !== undefined ? { payer: settle.payer } : {}),
    ...(settle.amount !== undefined ? { amount: settle.amount } : {}),
  };
}

/**
 * Pays for one x402-gated URL and returns the response together with its
 * settlement evidence.
 *
 * `wrapFetchWithPayment` performs the 402 -> pay -> retry loop once and does not
 * retry a failed payment, which is the ceiling `contracts/chain.md` asks for:
 * every live call is attempted at most once more and then fails with the chain's
 * own error.
 */
export async function payUrl(
  url: string,
  signer: ClientHederaSigner,
  init?: RequestInit,
): Promise<{ response: Response; settlement: Settlement }> {
  const fetchWithPayment = wrapFetchWithPayment(fetch, createTestnetClient(signer));
  const response = await fetchWithPayment(url, init);
  if (!response.ok) {
    throw new PaymentError(`paid request returned ${response.status}`, "resource_error", await response.text().catch(() => ""));
  }
  return { response, settlement: settlementFrom(response) };
}

/**
 * Pays against an already-received 402 body.
 *
 * `contracts/chain.md` specifies `payForRequest(requirements, signer)`. In x402
 * **v2** the resource URL lives on the `PaymentRequired` envelope, not on each
 * `PaymentRequirements` entry (verified against `@x402/core@2.25.0`'s
 * `ResourceInfo`/`PaymentRequired` types), so the envelope is what this takes —
 * a `PaymentRequirements` alone cannot say what it is paying for.
 */
export async function payForRequest(
  required: PaymentRequired,
  signer: ClientHederaSigner,
  init?: RequestInit,
): Promise<{ response: Response; settlement: Settlement }> {
  const requirement = selectHederaRequirement(required.accepts);
  if (!requirement) {
    throw new PaymentError(
      `402 offers no exact/${HEDERA_TESTNET_CAIP2} requirement; offered: ${required.accepts.map((r) => `${r.scheme}/${r.network}`).join(", ") || "none"}`,
      "unpayable_requirements",
    );
  }
  const url = required.resource?.url;
  if (!url) throw new PaymentError("402 carried no resource url", "no_resource_url");
  return payUrl(url, signer, init);
}
