import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { authorize, consume, emptyState, grant, remaining, revoke, root } from "../src/index.js";
import type { Grant, GrantId, State } from "../src/index.js";

/**
 * `contracts/core.md`: the invariants are the deliverable, so they are properties
 * over generated call sequences rather than a handful of examples. Depth is
 * exercised here because the live demo is only depth 2 (ADR-0003).
 */

const ASSET = "0.0.0";
const T0 = 1_000;
const T1 = 2_000;

function must<T, E>(result: { ok: true; value: T } | { ok: false; reason: E }): T {
  if (!result.ok) assert.fail(`expected ok, got ${String(result.reason)}`);
  return result.value;
}

/** A chain root → c1 → … → cN, each link at the same limit so nothing is slack. */
function chain(depth: number, limit: bigint): { state: State; ids: GrantId[] } {
  let state = must(
    root(emptyState, { id: "g0", child: "root.eth", limit, asset: ASSET, notBefore: T0, notAfter: T1 }),
  );
  const ids: GrantId[] = ["g0"];
  for (let i = 1; i <= depth; i += 1) {
    state = must(
      grant(state, `g${i - 1}`, {
        id: `g${i}`,
        child: `c${i}.eth`,
        limit,
        asset: ASSET,
        notBefore: T0,
        notAfter: T1,
      }),
    );
    ids.push(`g${i}`);
  }
  return { state, ids };
}

const now = T0 + 1;

test("attenuation: a child can never be granted more than its parent holds", () => {
  fc.assert(
    fc.property(fc.bigInt(1n, 1_000n), fc.bigInt(1n, 1_000n), (parentLimit, ask) => {
      const state = must(
        root(emptyState, { id: "g0", child: "p.eth", limit: parentLimit, asset: ASSET, notBefore: T0, notAfter: T1 }),
      );
      const result = grant(state, "g0", {
        id: "g1",
        child: "c.eth",
        limit: ask,
        asset: ASSET,
        notBefore: T0,
        notAfter: T1,
      });
      // Refused, never clamped — a clamp would make OVER_LIMIT unobservable.
      if (ask > parentLimit) return !result.ok && result.reason === "EXCEEDS_PARENT_LIMIT";
      return result.ok && result.value.grants.get("g1")!.limit === ask;
    }),
  );
});

test("attenuation: the validity window can only narrow", () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 4_000 }), fc.integer({ min: 0, max: 4_000 }), (nb, na) => {
      fc.pre(na > nb);
      const state = must(
        root(emptyState, { id: "g0", child: "p.eth", limit: 10n, asset: ASSET, notBefore: T0, notAfter: T1 }),
      );
      const result = grant(state, "g0", {
        id: "g1",
        child: "c.eth",
        limit: 10n,
        asset: ASSET,
        notBefore: nb,
        notAfter: na,
      });
      const widens = nb < T0 || na > T1;
      return widens ? !result.ok && result.reason === "EXCEEDS_PARENT_WINDOW" : result.ok;
    }),
  );
});

test("conservation: no interleaving of consumes lets a subtree outspend the root", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 4 }),
      fc.array(fc.record({ depth: fc.integer({ min: 0, max: 4 }), amount: fc.bigInt(1n, 40n) }), {
        maxLength: 30,
      }),
      (depth, calls) => {
        const limit = 100n;
        let { state, ids } = chain(depth, limit);
        for (const call of calls) {
          const id = ids[Math.min(call.depth, ids.length - 1)]!;
          const result = consume(state, id, ASSET, call.amount, now);
          if (result.ok) state = result.value;
        }
        // The root is debited by every descendant's spend, so its own counter is
        // the subtree total and no grant may exceed its own limit.
        for (const g of state.grants.values()) if (g.spent > g.limit) return false;
        return state.grants.get("g0")!.spent <= limit;
      },
    ),
  );
});

test("revocation is total over the subtree, in any call order", () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 4 }), fc.integer({ min: 0, max: 4 }), (depth, cut) => {
      const { state, ids } = chain(depth, 100n);
      const cutId = ids[Math.min(cut, ids.length - 1)]!;
      const after = revoke(state, cutId);
      const cutIndex = ids.indexOf(cutId);
      return ids.slice(cutIndex).every((id) => {
        const decision = authorize(after, id, ASSET, 1n, now);
        if (decision.allowed) return false;
        // The cut node itself is REVOKED; everything under it is PARENT_REVOKED.
        return id === cutId ? decision.reason === "REVOKED" : decision.reason === "PARENT_REVOKED";
      });
    }),
  );
});

test("revocation does not touch a sibling subtree", () => {
  let state = must(
    root(emptyState, { id: "g0", child: "root.eth", limit: 100n, asset: ASSET, notBefore: T0, notAfter: T1 }),
  );
  for (const [id, child] of [
    ["a", "a.eth"],
    ["b", "b.eth"],
  ] as const) {
    state = must(grant(state, "g0", { id, child, limit: 40n, asset: ASSET, notBefore: T0, notAfter: T1 }));
  }
  const after = revoke(state, "a");
  assert.deepEqual(authorize(after, "a", ASSET, 1n, now), { allowed: false, reason: "REVOKED" });
  assert.deepEqual(authorize(after, "b", ASSET, 1n, now), { allowed: true });
});

test("idempotence: revoke twice equals revoke once, and authorize is side-effect free", () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 4 }), (depth) => {
      const { state } = chain(depth, 100n);
      const once = revoke(state, "g1");
      const twice = revoke(once, "g1");
      const flat = (s: State): Grant[] => [...s.grants.values()].sort((x, y) => x.id.localeCompare(y.id));
      if (JSON.stringify(flat(once), bigints) !== JSON.stringify(flat(twice), bigints)) return false;

      const before = JSON.stringify(flat(state), bigints);
      authorize(state, "g1", ASSET, 5n, now);
      authorize(state, "g1", ASSET, 5n, now);
      return JSON.stringify(flat(state), bigints) === before;
    }),
  );
});

test("no resurrection: a revoked grant stays revoked and cannot be delegated under", () => {
  const { state } = chain(1, 100n);
  const after = revoke(state, "g0");
  const result = grant(after, "g1", {
    id: "new",
    child: "n.eth",
    limit: 1n,
    asset: ASSET,
    notBefore: T0,
    notAfter: T1,
  });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.reason, "PARENT_REVOKED");
  // Re-revoking is the only operation offered; nothing clears the flag.
  assert.equal(revoke(after, "g0").grants.get("g0")!.revoked, true);
});

test("the VERA case is refused, not represented: a principal has at most one parent", () => {
  let state = must(
    root(emptyState, { id: "g0", child: "root.eth", limit: 100n, asset: ASSET, notBefore: T0, notAfter: T1 }),
  );
  state = must(grant(state, "g0", { id: "a", child: "a.eth", limit: 50n, asset: ASSET, notBefore: T0, notAfter: T1 }));
  state = must(grant(state, "g0", { id: "b", child: "b.eth", limit: 50n, asset: ASSET, notBefore: T0, notAfter: T1 }));

  // `shared.eth` under `a` first, then the same principal under `b`.
  state = must(
    grant(state, "a", { id: "s1", child: "shared.eth", limit: 10n, asset: ASSET, notBefore: T0, notAfter: T1 }),
  );
  const second = grant(state, "b", {
    id: "s2",
    child: "shared.eth",
    limit: 10n,
    asset: ASSET,
    notBefore: T0,
    notAfter: T1,
  });
  assert.equal(second.ok, false);
  assert.equal(second.ok === false && second.reason, "ALREADY_DELEGATED");
  // Revoking one parent therefore cannot over-revoke authority held under another.
  assert.deepEqual(authorize(revoke(state, "b"), "s1", ASSET, 1n, now), { allowed: true });
});

test("assets never convert: a mismatched quote refuses instead of spending", () => {
  const { state } = chain(1, 100n);
  assert.deepEqual(authorize(state, "g1", "0.0.999", 1n, now), {
    allowed: false,
    reason: "ASSET_MISMATCH",
  });
  const result = consume(state, "g1", "0.0.999", 1n, now);
  assert.equal(result.ok === false && result.reason, "ASSET_MISMATCH");
});

test("the window is checked against the passed-in now, with distinct reasons", () => {
  const { state } = chain(1, 100n);
  assert.deepEqual(authorize(state, "g1", ASSET, 1n, T0 - 1), {
    allowed: false,
    reason: "NOT_YET_VALID",
  });
  assert.deepEqual(authorize(state, "g1", ASSET, 1n, T1), { allowed: false, reason: "EXPIRED" });
});

test("remaining is the tightest link in the chain, and zero once revoked", () => {
  let { state } = chain(2, 100n);
  state = must(consume(state, "g1", ASSET, 30n, now));
  // g2 is untouched itself, but g1 above it has spent 30.
  assert.equal(remaining(state, "g2"), 70n);
  assert.equal(remaining(state, "g0"), 70n);
  assert.equal(remaining(revoke(state, "g0"), "g2"), 0n);
  assert.equal(remaining(state, "nope"), 0n);
});

test("an unknown grant refuses rather than throwing", () => {
  assert.deepEqual(authorize(emptyState, "nope", ASSET, 1n, now), {
    allowed: false,
    reason: "UNKNOWN_GRANT",
  });
});

function bigints(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}
