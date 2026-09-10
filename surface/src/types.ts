import type { AssetId, State } from "@ehl/core";

/** The x402 v2 `PaymentRequirements` this server quotes. One per paid route. */
export type Requirements = {
  scheme: "exact";
  network: string;
  /** Smallest unit of `asset` — tinybars for HBAR. Never a decimal amount. */
  amount: string;
  asset: AssetId;
  payTo: string;
  maxTimeoutSeconds: number;
};

/** The x402 v2 `PaymentRequired` envelope returned with a 402. */
export type PaymentRequired = {
  x402Version: 2;
  accepts: Requirements[];
  resource: { url: string };
};

/** A paid route: what it costs, and what it does once paid for. */
export type Route = {
  path: string;
  /** Price in the smallest unit of `asset`. Prices differ per route by design. */
  amount: string;
  asset: AssetId;
  serve: (request: { body: string }) => unknown;
};

/**
 * Settlement of one payment payload, as reported by the facilitator.
 *
 * A port, not an implementation: settling is `chain/`'s job and this lane may
 * not reach a chain SDK itself (contracts/surface.md). Tests inject a fake; the
 * demo injects the real one.
 */
export type Settler = (
  payload: unknown,
  requirements: Requirements,
) => Promise<{ transactionId: string; explorerUrl: string; network: string }>;

/** Mutable holder for `core/`'s immutable state. The mutation lives here, not in `core/`. */
export type Store = {
  read: () => State;
  write: (next: State) => void;
};

export type ServerDeps = {
  routes: Route[];
  payTo: string;
  network: string;
  store: Store;
  settle: Settler;
  /** Injected so tests control the validity window without waiting. */
  now: () => number;
};
