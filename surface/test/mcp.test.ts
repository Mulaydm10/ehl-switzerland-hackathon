import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { emptyState, root } from "@ehl/core";
import { createMcpServer, stateStore, type McpDeps } from "../src/mcp.js";

const HBAR = "hedera:testnet/native";
const NOW = 1_700_000_000;

function seeded() {
  const withRoot = root(emptyState, {
    id: "g-parent",
    child: "parent.eth",
    limit: 1000n,
    asset: HBAR,
    notBefore: 0,
    notAfter: NOW + 3600,
  });
  assert.ok(withRoot.ok);
  return withRoot.value;
}

/** Drives the real server object over the real protocol; only the socket is fake. */
async function connect(overrides: Partial<McpDeps> = {}) {
  const store = overrides.store ?? stateStore(seeded());
  const server = createMcpServer({ now: () => NOW, ...overrides, store });
  const client = new Client({ name: "test", version: "0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, store };
}

type Structured = Record<string, unknown>;

async function call(client: Client, name: string, args: Record<string, unknown> = {}) {
  const result = await client.callTool({ name, arguments: args });
  return result as { structuredContent?: Structured; isError?: boolean; content: unknown };
}

test("every tool declares an output schema and an annotation set", async () => {
  const { client } = await connect();
  const { tools } = await client.listTools();

  assert.deepEqual(
    tools.map((t) => t.name).sort(),
    ["allowance_tree", "check_allowance", "delegate", "revoke_authority", "spend", "verify_settlement"],
  );
  for (const tool of tools) {
    assert.ok(tool.outputSchema, `${tool.name} has no output schema`);
    assert.ok(tool.annotations, `${tool.name} has no annotations`);
  }
});

test("the questions are marked read-only and revocation is marked destructive", async () => {
  const { client } = await connect();
  const byName = new Map((await client.listTools()).tools.map((t) => [t.name, t.annotations]));

  assert.equal(byName.get("check_allowance")?.readOnlyHint, true);
  assert.equal(byName.get("allowance_tree")?.readOnlyHint, true);
  assert.equal(byName.get("spend")?.readOnlyHint, false);
  assert.equal(byName.get("spend")?.idempotentHint, false);
  assert.equal(byName.get("revoke_authority")?.destructiveHint, true);
});

test("check_allowance answers without spending", async () => {
  const { client, store } = await connect();

  const answer = await call(client, "check_allowance", { grantId: "g-parent", asset: HBAR, amount: "400" });

  assert.equal(answer.structuredContent?.allowed, true);
  assert.equal(answer.structuredContent?.remaining, "1000");
  assert.equal(store.read().grants.get("g-parent")?.spent, 0n);
});

test("spend deducts, and the second spend past the cap is refused with core's reason", async () => {
  const { client, store } = await connect();

  const first = await call(client, "spend", { grantId: "g-parent", asset: HBAR, amount: "600" });
  assert.equal(first.structuredContent?.allowed, true);
  assert.equal(first.structuredContent?.remaining, "400");

  const second = await call(client, "spend", { grantId: "g-parent", asset: HBAR, amount: "600" });
  assert.equal(second.structuredContent?.allowed, false);
  assert.equal(second.structuredContent?.reason, "OVER_LIMIT");
  // The refused call must leave the ledger exactly as the allowed one did.
  assert.equal(store.read().grants.get("g-parent")?.spent, 600n);
});

test("a refusal is not a protocol error", async () => {
  const { client } = await connect();

  const refused = await call(client, "spend", { grantId: "nope", asset: HBAR, amount: "1" });

  assert.notEqual(refused.isError, true);
  assert.equal(refused.structuredContent?.allowed, false);
  assert.equal(refused.structuredContent?.reason, "UNKNOWN_GRANT");
});

test("delegate attenuates: a child may not be granted more than its parent holds", async () => {
  const { client } = await connect();

  const tooBig = await call(client, "delegate", {
    id: "g-child",
    child: "child.eth",
    asset: HBAR,
    limit: "5000",
    notBefore: 0,
    notAfter: NOW + 60,
    parentGrantId: "g-parent",
  });

  assert.equal(tooBig.structuredContent?.granted, false);
  assert.equal(tooBig.structuredContent?.reason, "EXCEEDS_PARENT_LIMIT");
});

test("revoking a parent refuses its descendants and leaves the sibling spendable", async () => {
  const { client } = await connect();
  const window = { notBefore: 0, notAfter: NOW + 60, asset: HBAR };
  await call(client, "delegate", { id: "g-a", child: "a.eth", limit: "100", parentGrantId: "g-parent", ...window });
  await call(client, "delegate", { id: "g-b", child: "b.eth", limit: "100", parentGrantId: "g-parent", ...window });
  await call(client, "delegate", { id: "g-a1", child: "a1.eth", limit: "50", parentGrantId: "g-a", ...window });

  const revoked = await call(client, "revoke_authority", { grantId: "g-a" });
  assert.deepEqual([...(revoked.structuredContent?.revoked as string[])].sort(), ["g-a", "g-a1"]);

  const descendant = await call(client, "check_allowance", { grantId: "g-a1", asset: HBAR, amount: "1" });
  assert.equal(descendant.structuredContent?.reason, "PARENT_REVOKED");

  const sibling = await call(client, "spend", { grantId: "g-b", asset: HBAR, amount: "10" });
  assert.equal(sibling.structuredContent?.allowed, true);
});

test("allowance_tree reports amounts as strings, so a tinybar cap survives JSON", async () => {
  const huge = root(emptyState, {
    id: "g-huge",
    child: "whale.eth",
    limit: 9_007_199_254_740_993n, // Number.MAX_SAFE_INTEGER + 2
    asset: HBAR,
    notBefore: 0,
    notAfter: NOW + 60,
  });
  assert.ok(huge.ok);
  const { client } = await connect({ store: stateStore(huge.value) });

  const tree = await call(client, "allowance_tree");
  const grants = tree.structuredContent?.grants as Array<{ limit: string }>;

  assert.equal(grants[0]?.limit, "9007199254740993");
});

test("an amount that is not a whole number of units is rejected by the schema", async () => {
  const { client } = await connect();

  // Schema violation is a genuine tool failure, unlike a refusal: nothing was decided.
  const rejected = await call(client, "spend", { grantId: "g-parent", asset: HBAR, amount: "1.5" });

  assert.equal(rejected.isError, true);
  assert.equal(rejected.structuredContent, undefined);
});

test("verify_settlement reports the disagreement rather than the receipt", async () => {
  const { client } = await connect({
    fetcher: async () => ({
      status: 200,
      json: async () => ({
        transactions: [
          {
            transaction_id: "0.0.1-1700000000-000000000",
            result: "SUCCESS",
            consensus_timestamp: "1700000000.000000000",
            charged_tx_fee: 1,
            transfers: [{ account: "0.0.999", amount: 50 }],
          },
        ],
      }),
    }),
  });

  const checked = await call(client, "verify_settlement", {
    transactionId: "0.0.1@1700000000.000000000",
    payTo: "0.0.999",
    amount: "100",
  });

  assert.equal(checked.structuredContent?.agrees, false);
  assert.equal(checked.structuredContent?.disagreement, "wrong-amount");
  assert.deepEqual(checked.structuredContent?.detail, { credited: "50", quoted: "100" });
});

test("an unconfigured mirror reader errors instead of reporting a disagreement", async () => {
  const { client } = await connect();

  const checked = await call(client, "verify_settlement", {
    transactionId: "0.0.1@1700000000.000000000",
    payTo: "0.0.999",
    amount: "100",
  });

  assert.equal(checked.isError, true);
  assert.equal(checked.structuredContent, undefined);
});
