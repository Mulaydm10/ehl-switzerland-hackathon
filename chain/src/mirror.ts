import { toHashScanTxId } from "./hashscan.js";

/**
 * Hedera Mirror Node reads — the half of Hedera that needs no key at all.
 *
 * Everything else in this lane requires a funded testnet account. The mirror
 * node is a public REST view of consensus, so a stranger holding nothing can
 * re-run these calls and get the same answers, which is the standard
 * `RESULTS.md` sets for evidence.
 *
 * The reason this module exists is not breadth for its own sake. A facilitator
 * hands us a receipt and we currently believe it: `Settlement.transactionId`
 * comes from the party we just paid. `confirmTransfer` closes that loop by
 * asking consensus instead — did this transaction reach SUCCESS, and did the
 * payee actually receive the amount we quoted? A receipt is a claim; a mirror
 * node lookup is a check.
 */
export const HEDERA_TESTNET_MIRROR = "https://testnet.mirrornode.hedera.com";

/** What consensus knows about an account, with no key required to ask. */
export type AccountFacts = {
  /** Account id as consensus reports it, e.g. `0.0.7162784`. */
  account: string;
  /** True once an account has been deleted — a payee that can no longer be paid. */
  deleted: boolean;
  /** HBAR balance in tinybars. */
  balanceTinybar: bigint;
  /** EVM address alias, when the account has one. */
  evmAddress?: string;
  /** Key algorithm, e.g. `ED25519` or `ECDSA_SECP256K1`. */
  keyType?: string;
};

/** One transaction as consensus recorded it. */
export type TransferFacts = {
  /** Transaction id in the mirror node's `-` separated form. */
  transactionId: string;
  /** Consensus result; `SUCCESS` is the only one that moved money. */
  result: string;
  /** Consensus timestamp, `seconds.nanos`. */
  consensusTimestamp: string;
  /** Total fee charged, in tinybars. */
  chargedTxFeeTinybar: bigint;
  /** Net tinybar change per account, signed: negative for the payer. */
  transfers: ReadonlyArray<{ account: string; amount: bigint }>;
};

/** A disagreement between a facilitator's receipt and consensus. */
export type Disagreement =
  | { kind: "unknown-transaction" }
  | { kind: "not-successful"; result: string }
  | { kind: "wrong-amount"; credited: bigint; quoted: bigint }
  | { kind: "payee-not-credited"; payTo: string };

/** The minimum of a fetcher this module needs, so tests need no network. */
export type Fetcher = (url: string) => Promise<{ status: number; json(): Promise<unknown> }>;

const defaultFetcher: Fetcher = (url) => fetch(url);

/**
 * Looks up an account. `undefined` means consensus has never heard of it,
 * which is a different fact from "exists but is deleted" and is kept distinct
 * for the same reason ENS resolution keeps `unset` apart from `unresolvable`.
 */
export async function accountFacts(
  account: string,
  mirrorUrl: string = HEDERA_TESTNET_MIRROR,
  fetcher: Fetcher = defaultFetcher,
): Promise<AccountFacts | undefined> {
  const response = await fetcher(`${mirrorUrl}/api/v1/accounts/${encodeURIComponent(account)}?limit=1`);
  if (response.status === 404) return undefined;
  // 400 is not "no such account": the mirror node rejects ids outside the
  // 32-bit entity range before it looks anything up, and silently returning
  // `undefined` would make a typo indistinguishable from an unused id.
  if (response.status === 400) throw new Error(`not a valid Hedera account id: ${account}`);
  if (response.status !== 200) throw new Error(`mirror node ${response.status} for account ${account}`);

  const body = (await response.json()) as {
    account?: string;
    deleted?: boolean;
    balance?: { balance?: number | string };
    evm_address?: string | null;
    key?: { _type?: string } | null;
  };

  return {
    account: body.account ?? account,
    deleted: body.deleted === true,
    balanceTinybar: BigInt(body.balance?.balance ?? 0),
    ...(body.evm_address ? { evmAddress: body.evm_address } : {}),
    ...(body.key?._type ? { keyType: body.key._type } : {}),
  };
}

/**
 * Looks up one transaction by id.
 *
 * Accepts the SDK/facilitator form (`0.0.123@1699999999.000000000`) as well as
 * the `-` separated form the REST API and HashScan use, because the id we hold
 * comes from the facilitator in the first form and nobody should have to know
 * that the two exist.
 */
export async function confirmTransfer(
  transactionId: string,
  mirrorUrl: string = HEDERA_TESTNET_MIRROR,
  fetcher: Fetcher = defaultFetcher,
): Promise<TransferFacts | undefined> {
  const id = toHashScanTxId(transactionId);
  const response = await fetcher(`${mirrorUrl}/api/v1/transactions/${encodeURIComponent(id)}`);
  if (response.status === 404) return undefined;
  if (response.status !== 200) throw new Error(`mirror node ${response.status} for transaction ${id}`);

  const body = (await response.json()) as {
    transactions?: Array<{
      transaction_id?: string;
      result?: string;
      consensus_timestamp?: string;
      charged_tx_fee?: number | string;
      transfers?: Array<{ account?: string; amount?: number | string }>;
    }>;
  };

  // The endpoint returns every transaction sharing the id, including child
  // records; the parent (nonce 0) is the one that carries the transfer list,
  // and it is first.
  const record = body.transactions?.[0];
  if (!record) return undefined;

  return {
    transactionId: record.transaction_id ?? id,
    result: record.result ?? "UNKNOWN",
    consensusTimestamp: record.consensus_timestamp ?? "",
    chargedTxFeeTinybar: BigInt(record.charged_tx_fee ?? 0),
    transfers: (record.transfers ?? []).map((t) => ({
      account: String(t.account ?? ""),
      amount: BigInt(t.amount ?? 0),
    })),
  };
}

/** Net tinybars credited to an account by a transaction; negative if it paid. */
export function creditedTo(facts: TransferFacts, account: string): bigint {
  return facts.transfers
    .filter((t) => t.account === account)
    .reduce((sum, t) => sum + t.amount, 0n);
}

/**
 * Checks a facilitator's receipt against consensus.
 *
 * `undefined` = the receipt holds up: the transaction reached SUCCESS and the
 * payee was credited exactly the quoted amount. Anything else names the
 * disagreement, and a disagreement is the one case where we must not publish a
 * HashScan link as evidence of the amount we said we paid.
 */
export function disagreement(
  facts: TransferFacts | undefined,
  payTo: string,
  quotedTinybar: bigint,
): Disagreement | undefined {
  if (!facts) return { kind: "unknown-transaction" };
  if (facts.result !== "SUCCESS") return { kind: "not-successful", result: facts.result };

  const credited = creditedTo(facts, payTo);
  if (credited === 0n) return { kind: "payee-not-credited", payTo };
  if (credited !== quotedTinybar) return { kind: "wrong-amount", credited, quoted: quotedTinybar };
  return undefined;
}
