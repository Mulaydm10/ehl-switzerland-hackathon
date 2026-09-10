import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyState, grant, root, type State } from "@ehl/core";
import { handleDemo, type DemoDeps } from "../src/demo.js";
import { HBAR, routes } from "../src/routes.js";
import { memoryStore } from "../src/server.js";
import type { ServerDeps } from "../src/types.js";

function start(): State {
  const parent = root(emptyState, { id: "parent", child: "parent", limit: 1_000_000n, asset: HBAR, notBefore: 0, notAfter: 10_000 });
  assert.ok(parent.ok);
  const child = grant(parent.value, "parent", { id: "child-a", child: "a", limit: 300_000n, asset: HBAR, notBefore: 0, notAfter: 10_000 });
  assert.ok(child.ok);
  return child.value;
}

function deps(state: State): ServerDeps {
  return {
    routes,
    payTo: "0.0.999",
    network: "hedera:testnet",
    store: memoryStore(state),
    settle: async () => {
      throw new Error("unused");
    },
    now: () => 1_000,
  };
}

const demo: DemoDeps = { reset: start };

function post(path: string, query = "") {
  return { method: "POST", path, query: new URLSearchParams(query) };
}

test("state reports each grant's headroom and the route prices", async () => {
  const d = deps(start());
  const reply = await handleDemo({ method: "GET", path: "/demo/state", query: new URLSearchParams() }, d, demo);
  const body = reply?.body as { grants: { id: string; remaining: string }[]; routes: unknown[]; canPay: boolean };
  assert.deepEqual(body.grants.map((g) => [g.id, g.remaining]), [["parent", "1000000"], ["child-a", "300000"]]);
  assert.equal(body.routes.length, 2);
  assert.equal(body.canPay, false, "no payer injected, so the demo must admit it cannot pay");
});

test("revoking is the parent's free action and shows up in state", async () => {
  const d = deps(start());
  const reply = await handleDemo(post("/demo/revoke", "grant=child-a"), d, demo);
  assert.equal(reply?.status, 200);
  assert.equal(d.store.read().grants.get("child-a")?.revoked, true);
});

test("revoking an unknown grant is refused rather than silently ignored", async () => {
  const reply = await handleDemo(post("/demo/revoke", "grant=ghost"), deps(start()), demo);
  assert.equal(reply?.status, 404);
});

test("reset restores the tree after a revocation", async () => {
  const d = deps(start());
  await handleDemo(post("/demo/revoke", "grant=child-a"), d, demo);
  await handleDemo(post("/demo/reset"), d, demo);
  assert.equal(d.store.read().grants.get("child-a")?.revoked, false);
});

test("without a key the demo says so instead of faking a settlement", async () => {
  const reply = await handleDemo(post("/demo/pay", "grant=child-a&route=/translate"), deps(start()), demo);
  assert.equal(reply?.status, 503);
  assert.match(String((reply?.body as { error: string }).error), /HEDERA_PRIVATE_KEY/);
});

test("a revoked grant is refused without a key, because refusing costs nothing", async () => {
  const d = deps(start());
  await handleDemo(post("/demo/revoke", "grant=child-a"), d, demo);
  const reply = await handleDemo(post("/demo/pay", "grant=child-a&route=/translate"), d, demo);
  const body = reply?.body as { status: number; body: { reason: string; settled: boolean } };
  assert.equal(body.status, 403, "not 503: the demo has no key, and does not need one to refuse");
  assert.equal(body.body.reason, "REVOKED");
  assert.equal(body.body.settled, false);
});

test("a request over the child's cap is refused without a key", async () => {
  const small = grant(start(), "parent", { id: "child-small", child: "small", limit: 50_000n, asset: HBAR, notBefore: 0, notAfter: 10_000 });
  assert.ok(small.ok);
  const d = deps(small.value);

  const inside = await handleDemo(post("/demo/pay", "grant=child-a&route=/translate"), d, demo);
  assert.equal(inside?.status, 503, "child-a is inside its cap, so this one really does need a key");

  const over = await handleDemo(post("/demo/pay", "grant=child-small&route=/translate"), d, demo);
  const body = over?.body as { status: number; body: { reason: string; settled: boolean } };
  assert.equal(body.status, 403);
  assert.equal(body.body.reason, "OVER_LIMIT", "50 000 tinybar of authority cannot buy a 100 000 route");
  assert.equal(body.body.settled, false);
});

test("a paying demo relays the resource server's own status and reason", async () => {
  const withPayer: DemoDeps = { reset: start, pay: async () => ({ status: 403, body: { reason: "OVER_LIMIT", settled: false } }) };
  const reply = await handleDemo(post("/demo/pay", "grant=child-a&route=/summarize"), deps(start()), withPayer);
  const body = reply?.body as { status: number; body: { reason: string } };
  assert.equal(body.status, 403);
  assert.equal(body.body.reason, "OVER_LIMIT");
});

test("paths outside /demo are left to the paid routes", async () => {
  assert.equal(await handleDemo(post("/translate"), deps(start()), demo), undefined);
});
