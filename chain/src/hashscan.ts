import { HEDERA_MAINNET_CAIP2, HEDERA_TESTNET_CAIP2 } from "@x402/hedera";

/**
 * HashScan encodes a transaction id with `-` separators rather than the `@`/`.`
 * form the SDK and facilitator use, so the raw id cannot be pasted into a URL
 * directly. `0.0.123@1699999999.000000000` becomes `0.0.123-1699999999-000000000`.
 */
export function toHashScanTxId(transactionId: string): string {
  const [account, stamp] = transactionId.split("@");
  if (!account || !stamp) return transactionId;
  return `${account}-${stamp.replace(".", "-")}`;
}

/** Maps a CAIP-2 Hedera network to its HashScan path segment. */
export function hashScanNetwork(network: string): "testnet" | "mainnet" {
  if (network === HEDERA_MAINNET_CAIP2) return "mainnet";
  if (network === HEDERA_TESTNET_CAIP2) return "testnet";
  throw new Error(`not a Hedera CAIP-2 network: ${network}`);
}

/** Builds the HashScan URL for a settled transaction. Pure; no network access. */
export function hashScanUrl(transactionId: string, network: string): string {
  return `https://hashscan.io/${hashScanNetwork(network)}/transaction/${toHashScanTxId(transactionId)}`;
}
