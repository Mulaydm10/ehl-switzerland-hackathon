/**
 * Evidence of one settled x402 payment.
 *
 * The explorer URL is the artifact the whole submission rests on: a payment we
 * cannot link to is worth nothing to us (contracts/chain.md). Both fields are
 * returned, never merely logged.
 */
export type Settlement = {
  /** Raw Hedera transaction id as the facilitator reported it, e.g. `0.0.123@1699999999.000000000`. */
  transactionId: string;
  /** HashScan URL for `transactionId` on the settled network. */
  explorerUrl: string;
  /** CAIP-2 network actually settled on, from the facilitator's response. */
  network: string;
  /** Payer account id, when the facilitator reports one. */
  payer?: string;
  /** Atomic units actually settled, when the scheme reports it. */
  amount?: string;
};

/** Thrown when a payment attempt fails. Carries the chain's own error, never a silent fallback. */
export class PaymentError extends Error {
  constructor(
    message: string,
    readonly reason?: string,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "PaymentError";
  }
}
