/**
 * `core/` is pure: no network, no chain SDK, no clock, no `process.env`.
 * Time enters as a `now` argument; ids are supplied by the caller. See
 * `contracts/core.md`.
 */

/** An ENS name in practice; `core/` treats it as an opaque key. */
export type PrincipalId = string;

export type GrantId = string;

/** Opaque asset identifier — equality-compared, never converted. */
export type AssetId = string;

export type Grant = {
  id: GrantId;
  parent: PrincipalId | null;
  child: PrincipalId;
  /** Smallest asset unit, the same unit the 402 quotes. */
  limit: bigint;
  spent: bigint;
  asset: AssetId;
  /** Unix seconds, compared against a passed-in `now`. */
  notBefore: number;
  notAfter: number;
  revoked: boolean;
};

export type State = {
  /** Keyed by GrantId. Treated as immutable: every mutator returns a new State. */
  grants: ReadonlyMap<GrantId, Grant>;
};

/** Why a payment was refused. Closed enum: `surface/` renders it, the results table records it. */
export type Reason =
  | "OVER_LIMIT"
  | "REVOKED"
  | "EXPIRED"
  | "NOT_YET_VALID"
  | "ASSET_MISMATCH"
  | "UNKNOWN_GRANT"
  | "PARENT_REVOKED";

/** Why a delegation was refused. Distinct from `Reason`: nothing was spent. */
export type GrantRefusal =
  | "UNKNOWN_PARENT"
  | "PARENT_REVOKED"
  | "DUPLICATE_GRANT_ID"
  | "ALREADY_DELEGATED"
  | "EXCEEDS_PARENT_LIMIT"
  | "EXCEEDS_PARENT_WINDOW"
  | "ASSET_MISMATCH"
  | "EMPTY_WINDOW"
  | "NEGATIVE_LIMIT"
  | "SELF_DELEGATION";

export type Decision = { allowed: true } | { allowed: false; reason: Reason };

export type Result<T, E> = { ok: true; value: T } | { ok: false; reason: E };

export type GrantRequest = {
  id: GrantId;
  child: PrincipalId;
  limit: bigint;
  asset: AssetId;
  notBefore: number;
  notAfter: number;
};

export const emptyState: State = { grants: new Map() };

export function allowed(): Decision {
  return { allowed: true };
}

export function refused(reason: Reason): Decision {
  return { allowed: false, reason };
}

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(reason: E): Result<never, E> {
  return { ok: false, reason };
}
