import {
  allowed,
  err,
  ok,
  refused,
  type AssetId,
  type Decision,
  type Grant,
  type GrantId,
  type GrantRefusal,
  type GrantRequest,
  type PrincipalId,
  type Reason,
  type Result,
  type State,
} from "./types.js";

/**
 * The delegation algebra. Pure functions over explicit state: `authorize` decides,
 * `consume` records, and neither touches a clock, a network, or a chain.
 *
 * Representation note (`contracts/core.md`, VERA case): a principal may hold at
 * most one grant, so the grant graph is a forest and every node has exactly one
 * parent. Multi-parent authority is *refused at construction*
 * (`ALREADY_DELEGATED`) rather than represented and then over-revoked.
 */

function withGrant(state: State, grant: Grant): State {
  const grants = new Map(state.grants);
  grants.set(grant.id, grant);
  return { grants };
}

function grantOfChild(state: State, child: PrincipalId): Grant | undefined {
  for (const grant of state.grants.values()) if (grant.child === child) return grant;
  return undefined;
}

/**
 * The chain from a grant up to its root, nearest first. Terminates because
 * `grant` refuses to create a cycle: a child that already holds a grant cannot
 * be delegated to again, so no edge can close a loop.
 */
function chainOf(state: State, grantId: GrantId): Grant[] | undefined {
  const chain: Grant[] = [];
  let current = state.grants.get(grantId);
  while (current) {
    chain.push(current);
    if (current.parent === null) return chain;
    current = grantOfChild(state, current.parent);
  }
  return undefined; // dangling parent: not representable through `grant`
}

/** Creates the unattenuated authority a delegation chain descends from. */
export function root(state: State, request: GrantRequest): Result<State, GrantRefusal> {
  return create(state, null, request);
}

/**
 * Delegates a strictly-narrower authority from `parentGrantId` to `request.child`.
 *
 * Attenuation is checked, never clamped: asking for more than the parent holds is
 * an error, because silently narrowing a request would make the demo's refusal
 * reasons unfalsifiable.
 */
export function grant(
  state: State,
  parentGrantId: GrantId,
  request: GrantRequest,
): Result<State, GrantRefusal> {
  return create(state, parentGrantId, request);
}

function create(
  state: State,
  parentGrantId: GrantId | null,
  request: GrantRequest,
): Result<State, GrantRefusal> {
  if (state.grants.has(request.id)) return err("DUPLICATE_GRANT_ID");
  if (request.limit < 0n) return err("NEGATIVE_LIMIT");
  if (request.notAfter <= request.notBefore) return err("EMPTY_WINDOW");
  if (grantOfChild(state, request.child)) return err("ALREADY_DELEGATED");

  let parent: PrincipalId | null = null;
  if (parentGrantId !== null) {
    const parentGrant = state.grants.get(parentGrantId);
    if (!parentGrant) return err("UNKNOWN_PARENT");
    if (parentGrant.child === request.child) return err("SELF_DELEGATION");

    const chain = chainOf(state, parentGrantId);
    if (!chain) return err("UNKNOWN_PARENT");
    if (chain.some((g) => g.revoked)) return err("PARENT_REVOKED");
    if (parentGrant.asset !== request.asset) return err("ASSET_MISMATCH");
    // Against the whole chain, not just the immediate parent: a parent cannot
    // delegate authority wider than the one it received.
    if (chain.some((g) => request.limit > g.limit - g.spent)) return err("EXCEEDS_PARENT_LIMIT");
    if (chain.some((g) => request.notBefore < g.notBefore || request.notAfter > g.notAfter)) {
      return err("EXCEEDS_PARENT_WINDOW");
    }
    parent = parentGrant.child;
  }

  return ok(
    withGrant(state, {
      id: request.id,
      parent,
      child: request.child,
      limit: request.limit,
      spent: 0n,
      asset: request.asset,
      notBefore: request.notBefore,
      notAfter: request.notAfter,
      revoked: false,
    }),
  );
}

/** Decides whether `grantId` may spend `amount` of `asset` at `now`. No side effects. */
export function authorize(
  state: State,
  grantId: GrantId,
  asset: AssetId,
  amount: bigint,
  now: number,
): Decision {
  const chain = chainOf(state, grantId);
  if (!chain) return refused("UNKNOWN_GRANT");
  const self = chain[0] as Grant;

  if (self.revoked) return refused("REVOKED");
  // Reported distinctly from REVOKED: the child did nothing wrong, and the demo's
  // subtree-revocation claim rests on seeing which of the two a descendant gets.
  if (chain.slice(1).some((g) => g.revoked)) return refused("PARENT_REVOKED");
  if (self.asset !== asset) return refused("ASSET_MISMATCH");
  if (amount <= 0n) return refused("OVER_LIMIT");

  for (const g of chain) {
    if (now < g.notBefore) return refused("NOT_YET_VALID");
    if (now >= g.notAfter) return refused("EXPIRED");
  }
  // Every ancestor is debited by `consume`, so conservation over the subtree is
  // exactly this per-link check.
  for (const g of chain) if (amount > g.limit - g.spent) return refused("OVER_LIMIT");

  return allowed();
}

/**
 * Authorizes, then records the spend on the grant **and every ancestor**, which
 * is what keeps a subtree's total spend inside the root's limit.
 */
export function consume(
  state: State,
  grantId: GrantId,
  asset: AssetId,
  amount: bigint,
  now: number,
): Result<State, Reason> {
  const decision = authorize(state, grantId, asset, amount, now);
  if (!decision.allowed) return err(decision.reason);

  const chain = chainOf(state, grantId) as Grant[];
  let next = state;
  for (const g of chain) next = withGrant(next, { ...g, spent: g.spent + amount });
  return ok(next);
}

/**
 * Revokes `grantId`. The subtree follows without being rewritten: `authorize`
 * walks the chain, so a descendant refuses with `PARENT_REVOKED` while only the
 * cut node reports `REVOKED`. Marking descendants instead would collapse those
 * two reasons and lose the distinction the demo's results table records.
 *
 * Idempotent, and there is no inverse: nothing in this module clears `revoked`.
 */
export function revoke(state: State, grantId: GrantId): State {
  const target = state.grants.get(grantId);
  if (!target) return state;
  return withGrant(state, { ...target, revoked: true });
}

/** Spendable amount: the tightest link in the chain, not the grant's own headroom. */
export function remaining(state: State, grantId: GrantId): bigint {
  const chain = chainOf(state, grantId);
  if (!chain) return 0n;
  if (chain.some((g) => g.revoked)) return 0n;
  return chain.reduce((min, g) => {
    const headroom = g.limit - g.spent;
    return headroom < min ? headroom : min;
  }, chain[0]!.limit - chain[0]!.spent);
}
