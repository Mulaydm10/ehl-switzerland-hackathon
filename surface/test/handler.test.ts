import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyState, grant, remaining, revoke, root, type State } from "@ehl/core";
import { DELEGATION_HEADER, PAYMENT_RESPONSE_HEADER, PAYMENT_SIGNATURE_HEADER, handle } from "../src/handler.js";
import { HBAR, routes } from "../src/routes.js";
import { memoryStore } from "../src/server.js";
import type { PaymentRequired, Requirements, ServerDeps, Settler } from "../src/types.js";

const NOW = 1_000;
const FOREVER = 10_000;

function unwrap<T>(result: { ok: true; value: T } | { ok: false; reason: string }): T {
  assert.equal(result.ok, true, `expected ok, got ${JSON.stringify(result)}`);
  return (result as { ok: true; value: T }).value;
}

/** parent holds 1_000_000 tinybar; child-a 300_000; child-b 300_000. */
function family(): State {
  let state = unwrap(
    root(emptyState, { id: "parent", child: "parent", limit: 1_000_000n, asset: HBAR, notBefore: 0, notAfter: FOREVER }),
  );
  state = unwrap(
    grant(state, "parent", { id: "child-a", child: "a", limit: 300_000n, asset: HBAR, notBefore: 0, notAfter: FOREVER }),
  );
  state = unwrap(
    grant(state, "parent", { id: "child-b", child: "b", limit: 300_000n, asset: HBAR, notBefore: 0, notAfter: FOREVER }),
  );
  return state;
}

type Recorder = { calls: Requirements[]; settle: Settler };

function recorder(): Recorder {
  const calls: Requirements[] = [];
  return {
    calls,
    settle: async (_payload, requirements) => {
      calls.push(requirements);
      return {
        transactionId: `0.0.777@169000000${calls.length}.000000000`,
        explorerUrl: `https://hashscan.io/testnet/transaction/0.0.777-169000000${calls.length}-000000000`,
        network: requirements.network,
      };
    },
  };
}

function deps(state: State, settle: Settler): ServerDeps {
  return { routes, payTo: "0.0.999", network: "hedera:testnet", store: memoryStore(state), settle, now: () => NOW };
}

const signature = Buffer.from(JSON.stringify({ scheme: "exact", signature: "0xtest" }), "utf8").toString("base64");

function request(path: string, headers: Record<string, string> = {}) {
  return { method: "POST", path, url: `http://localhost${path}`, headers, body: "hello world of delegated payments" };
}

test("an unpaid request is refused with 402 and well-formed requirements", async () => {
  const reply = await handle(request("/translate"), deps(family(), recorder().settle));
  assert.equal(reply.status, 402);
  const envelope = reply.body as PaymentRequired;
  assert.equal(envelope.x402Version, 2);
  const [terms] = envelope.accepts;
  assert.ok(terms);
  assert.deepEqual(
    { amount: terms.amount, asset: terms.asset, payTo: terms.payTo, network: terms.network },
    { amount: "100000", asset: HBAR, payTo: "0.0.999", network: "hedera:testnet" },
  );
  assert.equal(envelope.resource.url, "http://localhost/translate");
});

test("the two paid routes quote different prices", async () => {
  const d = deps(family(), recorder().settle);
  const cheap = (await handle(request("/translate"), d)).body as PaymentRequired;
  const dear = (await handle(request("/summarize"), d)).body as PaymentRequired;
  assert.notEqual(cheap.accepts[0]?.amount, dear.accepts[0]?.amount);
  assert.equal(dear.accepts[0]?.amount, "250000");
});

test("a grant we would refuse is told so at quote time, not sent away to sign", async () => {
  const rec = recorder();
  const d = deps(revoke(family(), "child-a"), rec.settle);

  // No payment signature: this is the *first* request of the 402 loop, and the
  // caller holds no key yet. It still gets the reason.
  const reply = await handle(request("/translate", { [DELEGATION_HEADER]: "child-a" }), d);
  assert.equal(reply.status, 403, "quoting a price to a revoked grant would invite a doomed transfer");
  assert.deepEqual(reply.body, { reason: "REVOKED", settled: false, grant: "child-a" });
  assert.equal(rec.calls.length, 0);

  const good = await handle(request("/translate", { [DELEGATION_HEADER]: "child-b" }), d);
  assert.equal(good.status, 402, "an authorized grant still gets the price, not a decision");
});

test("a paid request within the allowance settles, serves, and debits", async () => {
  const state = family();
  const rec = recorder();
  const d = deps(state, rec.settle);
  const reply = await handle(request("/translate", { [PAYMENT_SIGNATURE_HEADER]: signature, [DELEGATION_HEADER]: "child-a" }), d);

  assert.equal(reply.status, 200);
  assert.equal(rec.calls.length, 1);
  assert.match(String(reply.headers[PAYMENT_RESPONSE_HEADER]), /^[A-Za-z0-9+/=]+$/);
  const evidence = JSON.parse(Buffer.from(String(reply.headers[PAYMENT_RESPONSE_HEADER]), "base64").toString("utf8"));
  assert.match(evidence.explorerUrl, /^https:\/\/hashscan\.io\/testnet\/transaction\//);
  assert.equal(remaining(d.store.read(), "child-a"), 200_000n);
});

test("over-limit is refused with core's own reason and nothing settles", async () => {
  const rec = recorder();
  // /summarize costs 250_000; a 100_000 allowance cannot cover it, and a
  // boolean "may spend" flag could not tell the two routes apart at all.
  let state = family();
  state = unwrap(
    grant(state, "child-a", { id: "grandchild", child: "c", limit: 100_000n, asset: HBAR, notBefore: 0, notAfter: FOREVER }),
  );
  const d = deps(state, rec.settle);
  const reply = await handle(request("/summarize", { [PAYMENT_SIGNATURE_HEADER]: signature, [DELEGATION_HEADER]: "grandchild" }), d);

  assert.equal(reply.status, 403);
  assert.deepEqual(reply.body, { reason: "OVER_LIMIT", settled: false, grant: "grandchild" });
  assert.equal(rec.calls.length, 0, "a refused request must not reach the facilitator");
  assert.equal(remaining(d.store.read(), "grandchild"), 100_000n);
});

test("a revoked child is refused, and its sibling is unaffected", async () => {
  const rec = recorder();
  const d = deps(revoke(family(), "child-a"), rec.settle);

  const revoked = await handle(request("/translate", { [PAYMENT_SIGNATURE_HEADER]: signature, [DELEGATION_HEADER]: "child-a" }), d);
  assert.equal(revoked.status, 403);
  assert.deepEqual(revoked.body, { reason: "REVOKED", settled: false, grant: "child-a" });
  assert.equal(rec.calls.length, 0);

  const sibling = await handle(request("/translate", { [PAYMENT_SIGNATURE_HEADER]: signature, [DELEGATION_HEADER]: "child-b" }), d);
  assert.equal(sibling.status, 200);
  assert.equal(rec.calls.length, 1);
  assert.equal(remaining(d.store.read(), "child-b"), 200_000n);
});

test("a descendant of a revoked grant reports PARENT_REVOKED verbatim", async () => {
  let state = family();
  state = unwrap(
    grant(state, "child-a", { id: "grandchild", child: "c", limit: 200_000n, asset: HBAR, notBefore: 0, notAfter: FOREVER }),
  );
  const d = deps(revoke(state, "child-a"), recorder().settle);
  const reply = await handle(request("/translate", { [PAYMENT_SIGNATURE_HEADER]: signature, [DELEGATION_HEADER]: "grandchild" }), d);
  assert.equal((reply.body as { reason: string }).reason, "PARENT_REVOKED");
});

test("an unknown grant is refused rather than served", async () => {
  const rec = recorder();
  const reply = await handle(
    request("/translate", { [PAYMENT_SIGNATURE_HEADER]: signature, [DELEGATION_HEADER]: "nobody" }),
    deps(family(), rec.settle),
  );
  assert.equal(reply.status, 403);
  assert.equal((reply.body as { reason: string }).reason, "UNKNOWN_GRANT");
  assert.equal(rec.calls.length, 0);
});

test("a paid request without a delegation header is a client error, not a free lunch", async () => {
  const rec = recorder();
  const reply = await handle(request("/translate", { [PAYMENT_SIGNATURE_HEADER]: signature }), deps(family(), rec.settle));
  assert.equal(reply.status, 400);
  assert.equal(rec.calls.length, 0);
});

test("a malformed payment header is refused before any settlement", async () => {
  const rec = recorder();
  const reply = await handle(
    request("/translate", { [PAYMENT_SIGNATURE_HEADER]: "%%%not-base64-json%%%", [DELEGATION_HEADER]: "child-a" }),
    deps(family(), rec.settle),
  );
  assert.equal(reply.status, 400);
  assert.equal(rec.calls.length, 0);
});

test("an unknown route is 404 and quotes no price", async () => {
  const reply = await handle(request("/nope"), deps(family(), recorder().settle));
  assert.equal(reply.status, 404);
});

test("a failed settlement leaves the allowance untouched", async () => {
  const d = deps(family(), async () => {
    throw new Error("facilitator refused");
  });
  await assert.rejects(
    handle(request("/translate", { [PAYMENT_SIGNATURE_HEADER]: signature, [DELEGATION_HEADER]: "child-a" }), d),
    /facilitator refused/,
  );
  assert.equal(remaining(d.store.read(), "child-a"), 300_000n);
});

test("repeated payments accumulate until the allowance runs out", async () => {
  const rec = recorder();
  const d = deps(family(), rec.settle);
  const paid = request("/translate", { [PAYMENT_SIGNATURE_HEADER]: signature, [DELEGATION_HEADER]: "child-a" });
  for (let i = 0; i < 3; i += 1) assert.equal((await handle(paid, d)).status, 200);
  assert.equal(remaining(d.store.read(), "child-a"), 0n);
  const overrun = await handle(paid, d);
  assert.equal(overrun.status, 403);
  assert.equal((overrun.body as { reason: string }).reason, "OVER_LIMIT");
  assert.equal(rec.calls.length, 3, "the fourth attempt must not settle");
});
