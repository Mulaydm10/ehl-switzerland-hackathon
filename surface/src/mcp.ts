import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { authorize, consume, grant, remaining, revoke, root, type Grant, type State } from "@ehl/core";
import { HEDERA_TESTNET_MIRROR, confirmTransfer, disagreement, type Fetcher } from "capability-descent-chain/src/index.ts";
import type { Store } from "./types.js";

export type McpDeps = {
  store: Store;
  /** Unix seconds. Injected so a host's clock, and the tests', are the same kind of thing. */
  now: () => number;
  /** Absent = no mirror reads; `verify_settlement` then refuses instead of pretending. */
  fetcher?: Fetcher;
  mirrorUrl?: string;
};

/**
 * A refusal is a *successful* call. `isError` means the tool broke; a model that
 * cannot tell "you may not spend that" from "the tool crashed" will retry the
 * first one, which is exactly the loop delegated authority exists to stop.
 */
function reply(structured: Record<string, unknown>) {
  return { content: [{ type: "text" as const, text: JSON.stringify(structured) }], structuredContent: structured };
}

function view(g: Grant) {
  return {
    id: g.id,
    parent: g.parent,
    child: g.child,
    asset: g.asset,
    limit: g.limit.toString(),
    spent: g.spent.toString(),
    remaining: (g.limit - g.spent).toString(),
    revoked: g.revoked,
    notBefore: g.notBefore,
    notAfter: g.notAfter,
  };
}

const grantShape = {
  id: z.string(),
  parent: z.string().nullable(),
  child: z.string(),
  asset: z.string(),
  limit: z.string(),
  spent: z.string(),
  remaining: z.string(),
  revoked: z.boolean(),
  notBefore: z.number(),
  notAfter: z.number(),
};

/**
 * Amounts cross the wire as decimal strings, never numbers: a tinybar allowance
 * exceeds `Number.MAX_SAFE_INTEGER` long before it exceeds anyone's budget, and
 * JSON has no other way to say so. `core/` speaks `bigint`; the boundary converts.
 */
const amount = z.string().regex(/^[0-9]+$/, "smallest asset unit, decimal digits only");

function parseAmount(raw: string): bigint {
  return BigInt(raw);
}

/**
 * The delegation algebra as a tool surface.
 *
 * No authorization logic lives here (`contracts/surface.md`): every decision is
 * `core/`'s, and its `Reason` is rendered verbatim rather than reworded into
 * something friendlier — the refusal string is the evidence.
 */
export function createMcpServer(deps: McpDeps): McpServer {
  const server = new McpServer(
    { name: "capability-descent", version: "0.1.0" },
    {
      instructions:
        "Spending authority is delegated and capped. Call check_allowance before spend; " +
        "a refusal carries allowed=false and a reason from a closed set, and is not an error. " +
        "Never work around a refusal by splitting the amount across calls: the cap is cumulative.",
    },
  );

  server.registerTool(
    "allowance_tree",
    {
      title: "Read the allowance tree",
      description: "Every grant currently known, with its cap, spend and revocation state.",
      inputSchema: {},
      outputSchema: { grants: z.array(z.object(grantShape)) },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    () => reply({ grants: [...deps.store.read().grants.values()].map(view) }),
  );

  server.registerTool(
    "check_allowance",
    {
      title: "Ask whether a spend would be allowed",
      description:
        "Answers without spending. The same question `spend` asks internally, exposed so a host " +
        "can plan; `spend` re-asks it regardless, because a host is not trusted to have checked.",
      inputSchema: { grantId: z.string(), asset: z.string(), amount },
      outputSchema: {
        allowed: z.boolean(),
        reason: z.string().optional(),
        remaining: z.string(),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    ({ grantId, asset, amount: raw }) => {
      const state = deps.store.read();
      const decision = authorize(state, grantId, asset, parseAmount(raw), deps.now());
      return reply({
        allowed: decision.allowed,
        ...(decision.allowed ? {} : { reason: decision.reason }),
        remaining: remaining(state, grantId).toString(),
      });
    },
  );

  server.registerTool(
    "spend",
    {
      title: "Spend against a grant",
      description:
        "Deducts from the grant's remaining allowance, or refuses with a reason. This records the " +
        "authority consumed; settling the payment on-chain is a separate step.",
      inputSchema: { grantId: z.string(), asset: z.string(), amount },
      outputSchema: { allowed: z.boolean(), reason: z.string().optional(), remaining: z.string() },
      // Not idempotent, and the annotation is the only warning a host gets before
      // a retried call spends twice.
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    ({ grantId, asset, amount: raw }) => {
      const next = consume(deps.store.read(), grantId, asset, parseAmount(raw), deps.now());
      if (!next.ok) {
        return reply({ allowed: false, reason: next.reason, remaining: remaining(deps.store.read(), grantId).toString() });
      }
      deps.store.write(next.value);
      return reply({ allowed: true, remaining: remaining(next.value, grantId).toString() });
    },
  );

  server.registerTool(
    "delegate",
    {
      title: "Grant authority to a child",
      description:
        "Creates a grant. With `parentGrantId`, the new grant is attenuated: it can never outlive " +
        "or outspend its parent, and dies with it. Without one, it is a root grant.",
      inputSchema: {
        id: z.string(),
        child: z.string(),
        asset: z.string(),
        limit: amount,
        notBefore: z.number().int(),
        notAfter: z.number().int(),
        parentGrantId: z.string().optional(),
      },
      outputSchema: { granted: z.boolean(), reason: z.string().optional(), grant: z.object(grantShape).optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    ({ id, child, asset, limit, notBefore, notAfter, parentGrantId }) => {
      const request = { id, child, asset, limit: parseAmount(limit), notBefore, notAfter };
      const state = deps.store.read();
      const next = parentGrantId === undefined ? root(state, request) : grant(state, parentGrantId, request);
      if (!next.ok) return reply({ granted: false, reason: next.reason });
      deps.store.write(next.value);
      const created = next.value.grants.get(id);
      return reply({ granted: true, ...(created ? { grant: view(created) } : {}) });
    },
  );

  server.registerTool(
    "revoke_authority",
    {
      title: "Revoke a grant and everything under it",
      description:
        "Revoking a grant refuses its descendants too, and leaves its siblings untouched. " +
        "Already-recorded spend is not undone; only future spend is refused.",
      inputSchema: { grantId: z.string() },
      outputSchema: { revoked: z.array(z.string()) },
      // Re-revoking is a no-op, hence idempotent; it is still destructive.
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    ({ grantId }) => {
      const before = deps.store.read();
      const after = revoke(before, grantId);
      deps.store.write(after);
      const now = deps.now();
      const refused = [...after.grants.values()]
        .filter((g) => {
          const decision = authorize(after, g.id, g.asset, 1n, now);
          return !decision.allowed && (decision.reason === "REVOKED" || decision.reason === "PARENT_REVOKED");
        })
        .map((g) => g.id);
      return reply({ revoked: refused });
    },
  );

  server.registerTool(
    "verify_settlement",
    {
      title: "Check a payment against consensus",
      description:
        "Reads Hedera's mirror node directly rather than trusting the facilitator's receipt, and " +
        "reports the ways a receipt can be false: unknown transaction, failed, wrong amount, " +
        "payee not credited. Needs no key.",
      inputSchema: { transactionId: z.string(), payTo: z.string(), amount },
      outputSchema: {
        agrees: z.boolean(),
        disagreement: z.string().optional(),
        detail: z.record(z.string()).optional(),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ transactionId, payTo, amount: raw }) => {
      if (deps.fetcher === undefined) {
        // An unconfigured reader says so. Reporting "agrees: false" here would
        // read as a caught fraud rather than an absent network.
        return {
          content: [{ type: "text" as const, text: "no mirror node reader is configured" }],
          isError: true,
        };
      }
      const facts = await confirmTransfer(transactionId, deps.mirrorUrl ?? HEDERA_TESTNET_MIRROR, deps.fetcher);
      const found = disagreement(facts, payTo, parseAmount(raw));
      if (found === undefined) return reply({ agrees: true });
      const { kind, ...rest } = found;
      return reply({
        agrees: false,
        disagreement: kind,
        detail: Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, String(v)])),
      });
    },
  );

  return server;
}

/** The mutable holder, again — `core/` returns a new `State` and never keeps one. */
export function stateStore(initial: State): Store {
  let current = initial;
  return { read: () => current, write: (next) => void (current = next) };
}
