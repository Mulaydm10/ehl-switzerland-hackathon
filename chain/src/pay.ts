import { wrapFetchWithPayment, x402Client, decodePaymentResponseHeader } from "@x402/fetch";
import type { PaymentRequired, PaymentRequirements } from "@x402/fetch";
import type { SettleResponse } from "@x402/core/types";
import { encodePaymentSignatureHeader } from "@x402/core/http";
import { ExactHederaScheme, createClientHederaSigner, PrivateKey, HEDERA_TESTNET_CAIP2, HBAR_ASSET_ID } from "@x402/hedera";
import type { ClientHederaSigner } from "@x402/hedera";
import { hashScanUrl } from "./hashscan.js";
import { accountFacts, HEDERA_TESTNET_MIRROR, type Fetcher } from "./mirror.js";
import { PaymentError, type Settlement } from "./types.js";

/**
 * Headers a resource server may return settlement evidence in, canonical first.
 *
 * x402 v2 — the version this lane pins — names it `PAYMENT-RESPONSE`;
 * `X-PAYMENT-RESPONSE` is the v1 spelling, still emitted by v1 servers and still
 * read by `@x402/fetch`. Reading only the legacy name loses every real v2
 * settlement, which is the one thing this lane exists to produce.
 */
const PAYMENT_RESPONSE_HEADERS = ["PAYMENT-RESPONSE", "X-PAYMENT-RESPONSE"] as const;

/** Header the paid retry carries the signed payload in (v1: `X-PAYMENT`). */
const PAYMENT_SIGNATURE_HEADER = "PAYMENT-SIGNATURE";

/**
 * Builds the payer-side signer. Testnet only — `contracts/chain.md` forbids
 * mainnet, so the network is not a parameter.
 */
export function createTestnetSigner(accountId: string, privateKey: string): ClientHederaSigner {
  return createClientHederaSigner(accountId, parsePrivateKey(privateKey));
}

/** A way the same 32 bytes could be read, and the key that reading produces. */
export type KeyCandidate = { encoding: "DER" | "ECDSA" | "ED25519"; key: PrivateKey };

/**
 * Every reading of a payer key that is not obviously wrong.
 *
 * A bare 32-byte hex string is genuinely ambiguous: the same bytes are a valid
 * secp256k1 scalar and a valid ed25519 seed, and they yield *different* public
 * keys. DER is only attempted when the bytes actually carry a DER prefix,
 * because `fromStringDer` does not reject bare hex — it silently returns an
 * ED25519 key. Guessing there is how a correct key becomes `INVALID_SIGNATURE`
 * at consensus, after the transfer has already been signed and submitted.
 */
export function privateKeyCandidates(privateKey: string): KeyCandidate[] {
  const hex = privateKey.replace(/^0x/i, "");
  const looksDer = hex.length > 64 && hex.startsWith("30");
  // Called through arrows: these statics use `this`, so an unbound reference throws.
  const attempts: Array<[KeyCandidate["encoding"], (k: string) => PrivateKey]> = looksDer
    ? [["DER", (k) => PrivateKey.fromStringDer(k)]]
    : [
        ["ECDSA", (k) => PrivateKey.fromStringECDSA(k)],
        ["ED25519", (k) => PrivateKey.fromStringED25519(k)],
      ];

  const candidates: KeyCandidate[] = [];
  for (const [encoding, parse] of attempts) {
    try {
      candidates.push({ encoding, key: parse(privateKey) });
    } catch {
      continue;
    }
  }
  return candidates;
}

/**
 * Parses a payer key without making the operator guess its encoding.
 *
 * Offline, so an ambiguous bare hex key resolves to the first reading that
 * parses. `signerForAccount` removes the ambiguity by asking consensus; prefer
 * it wherever the account id is known.
 */
export function parsePrivateKey(privateKey: string): PrivateKey {
  const candidate = privateKeyCandidates(privateKey)[0];
  if (!candidate) {
    throw new PaymentError("HEDERA_PRIVATE_KEY is not parseable as DER, ECDSA or ED25519", "bad_private_key");
  }
  return candidate.key;
}

/**
 * Builds a signer whose public key consensus agrees belongs to the account.
 *
 * The mirror node publishes each account's public key, so the encoding does not
 * have to be guessed and a mismatched key is caught *before* a transfer is
 * signed rather than as an `INVALID_SIGNATURE` receipt afterwards.
 */
export async function signerForAccount(
  accountId: string,
  privateKey: string,
  mirrorUrl: string = HEDERA_TESTNET_MIRROR,
  fetcher?: Fetcher,
): Promise<ClientHederaSigner> {
  const candidates = privateKeyCandidates(privateKey);
  if (candidates.length === 0) {
    throw new PaymentError("HEDERA_PRIVATE_KEY is not parseable as DER, ECDSA or ED25519", "bad_private_key");
  }

  const facts = await accountFacts(accountId, mirrorUrl, fetcher);
  if (!facts) throw new PaymentError(`consensus has no account ${accountId}`, "unknown_payer_account");

  const expected = facts.publicKeyHex;
  if (expected === undefined) {
    throw new PaymentError(`consensus publishes no public key for ${accountId}`, "payer_key_unknown");
  }

  const match = candidates.find((c) => c.key.publicKey.toStringRaw().toLowerCase() === expected);
  if (!match) {
    throw new PaymentError(
      `HEDERA_PRIVATE_KEY does not control ${accountId}: consensus holds ${facts.keyType ?? "a key"} ${expected}`,
      "payer_key_mismatch",
      candidates.map((c) => `${c.encoding}:${c.key.publicKey.toStringRaw()}`).join(" "),
    );
  }
  return createClientHederaSigner(accountId, match.key);
}

/**
 * An x402 client that can pay `exact` on Hedera testnet and nothing else.
 *
 * Native HBAR has to be declared. `@x402/core`'s spend controls allow only the
 * assets a scheme calls default, and `@x402/hedera`'s default set is USDC alone
 * — so an undeclared HBAR price is refused client-side, before signing, as
 * "only default assets ... are allowed". The declaration carries an *atomic*
 * per-payment cap (tinybars, not dollars): a ceiling the payer imposes on
 * itself, independent of the allowance the resource server enforces. Two
 * ceilings, two enforcers; either one refusing is enough.
 */
export function createTestnetClient(
  signer: ClientHederaSigner,
  maxTinybarPerPayment?: string,
): x402Client {
  return new x402Client()
    .register(HEDERA_TESTNET_CAIP2, new ExactHederaScheme(signer))
    .setSpendControls({
      allowedAssets: [
        {
          network: HEDERA_TESTNET_CAIP2,
          asset: HBAR_ASSET_ID,
          ...(maxTinybarPerPayment === undefined ? {} : { maxAmountPerPayment: maxTinybarPerPayment }),
        },
      ],
    });
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
  const header = PAYMENT_RESPONSE_HEADERS.map((name) => response.headers.get(name)).find(
    (value): value is string => value !== null,
  );
  if (!header) {
    throw new PaymentError(
      `paid response carried no ${PAYMENT_RESPONSE_HEADERS.join(" or ")} header; settlement cannot be evidenced`,
      "no_settlement_header",
    );
  }
  return settlementOf(decodePaymentResponseHeader(header));
}

/**
 * Turns a facilitator `SettleResponse` into evidence, or throws.
 *
 * Shared by the resource-server path (header-borne) and the direct-facilitator
 * path (body-borne) so both produce byte-identical evidence.
 */
export function settlementOf(settle: SettleResponse): Settlement {
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
  rejectUnreplayableBody(init);
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
  rejectUnreplayableBody(init);

  const payload = await createTestnetClient(signer).createPaymentPayload(required);
  const headers = new Headers(init?.headers);
  headers.set(PAYMENT_SIGNATURE_HEADER, encodePaymentSignatureHeader(payload));
  headers.set("Access-Control-Expose-Headers", PAYMENT_RESPONSE_HEADERS.join(","));

  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    throw new PaymentError(`paid request returned ${response.status}`, "resource_error", await response.text().catch(() => ""));
  }
  return { response, settlement: settlementFrom(response) };
}

/**
 * Refuses a body that cannot survive the paid retry.
 *
 * Both paths send the request twice (unpaid 402, then paid), and a stream is
 * consumed by the first send. Failing before the first request is cheaper than
 * failing after a payment has been signed.
 */
function rejectUnreplayableBody(init?: RequestInit): void {
  if (init?.body instanceof ReadableStream) {
    throw new PaymentError(
      "streamed request bodies cannot be replayed on the paid retry; buffer the body first",
      "unreplayable_body",
    );
  }
}
