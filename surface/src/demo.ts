import { remaining, revoke, type Grant, type State } from "@ehl/core";
import { refuse, type Reply } from "./handler.js";
import type { ServerDeps } from "./types.js";

/**
 * The demo's control plane: read the allowance tree, cut a grant, replay.
 *
 * Separate from the paid routes on purpose — these are the *parent's* actions,
 * which are free, while the child's actions cost money. Mixing them would make
 * "the parent revoked and the child was refused" a single opaque step instead of
 * the two independent ones the results table records.
 *
 * `pay` is the child's agent: it drives the real 402 -> sign -> retry loop
 * against this same server over HTTP, so nothing about the payment path is
 * shortcut for the demo's benefit.
 */
export type DemoDeps = {
  /** Restores the tree the demo starts from. */
  reset: () => State;
  /**
   * Performs a paid request as `grant`, or refuses. Absent when no Hedera key
   * is configured, in which case the demo says so rather than faking a receipt.
   */
  pay?: (grant: string, path: string) => Promise<{ status: number; body: unknown }>;
};

type GrantView = {
  id: string;
  child: string;
  parent: string | null;
  limit: string;
  spent: string;
  remaining: string;
  revoked: boolean;
};

function view(state: State): GrantView[] {
  return [...state.grants.values()].map((g: Grant) => ({
    id: g.id,
    child: g.child,
    parent: g.parent,
    limit: g.limit.toString(),
    spent: g.spent.toString(),
    remaining: remaining(state, g.id).toString(),
    revoked: g.revoked,
  }));
}

function json(status: number, body: unknown): Reply {
  return { status, headers: { "content-type": "application/json" }, body };
}

/** Returns a reply for demo paths, or `undefined` so the paid routes see the request. */
export async function handleDemo(
  input: { method: string; path: string; query: URLSearchParams },
  deps: ServerDeps,
  demo: DemoDeps,
): Promise<Reply | undefined> {
  if (input.path === "/demo/state") {
    return json(200, {
      grants: view(deps.store.read()),
      routes: deps.routes.map((r) => ({ path: r.path, amount: r.amount, asset: r.asset })),
      network: deps.network,
      payTo: deps.payTo,
      canPay: demo.pay !== undefined,
    });
  }

  if (input.path === "/demo/revoke" && input.method === "POST") {
    const grantId = input.query.get("grant");
    if (!grantId) return json(400, { error: "?grant= is required" });
    if (!deps.store.read().grants.has(grantId)) return json(404, { error: `no grant ${grantId}` });
    deps.store.write(revoke(deps.store.read(), grantId));
    return json(200, { revoked: grantId, grants: view(deps.store.read()) });
  }

  if (input.path === "/demo/reset" && input.method === "POST") {
    deps.store.write(demo.reset());
    return json(200, { grants: view(deps.store.read()) });
  }

  if (input.path === "/demo/pay" && input.method === "POST") {
    const grantId = input.query.get("grant");
    const route = input.query.get("route");
    if (!grantId || !route) return json(400, { error: "?grant= and ?route= are required" });

    const priced = deps.routes.find((r) => r.path === route);
    if (!priced) return json(404, { error: `no such route ${route}` });

    // A refusal is the server's own answer and costs no key, so ask for it
    // before asking for one. Scenarios 2 and 3 are therefore reproducible by
    // anyone, with or without a funded Hedera account.
    const refusal = refuse(priced, grantId, deps);
    if (refusal) {
      return json(200, { status: refusal.status, body: refusal.body, grants: view(deps.store.read()) });
    }

    if (!demo.pay) {
      return json(503, { error: "no Hedera key configured; set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY (see surface/.env.example)" });
    }
    const attempt = await demo.pay(grantId, route).catch((error: unknown) => ({
      status: 502,
      body: { error: error instanceof Error ? error.message : String(error) },
    }));
    return json(200, { ...attempt, grants: view(deps.store.read()) });
  }

  return undefined;
}
