import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { facilitatorSettler } from "../src/facilitator.js";
import { HBAR } from "../src/routes.js";
import type { Requirements } from "../src/types.js";

const requirements: Requirements = {
  scheme: "exact",
  network: "hedera:testnet",
  amount: "100000",
  asset: HBAR,
  payTo: "0.0.999",
  maxTimeoutSeconds: 60,
};

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function stubFetch(status: number, body: unknown): { calls: { url: string; body: unknown }[] } {
  const calls: { url: string; body: unknown }[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return { calls };
}

test("a settled payment becomes a HashScan URL", async () => {
  const stub = stubFetch(200, { success: true, transaction: "0.0.123@1699999999.000000000", network: "hedera:testnet" });
  const settlement = await facilitatorSettler("https://api.testnet.blocky402.com/")({ signature: "0x" }, requirements);

  assert.equal(stub.calls[0]?.url, "https://api.testnet.blocky402.com/settle");
  assert.deepEqual((stub.calls[0]?.body as { x402Version: number }).x402Version, 2);
  assert.equal(settlement.explorerUrl, "https://hashscan.io/testnet/transaction/0.0.123-1699999999-000000000");
});

test("a facilitator error is raised, never turned into a fake receipt", async () => {
  stubFetch(400, { error: "insufficient balance" });
  await assert.rejects(facilitatorSettler("https://api.testnet.blocky402.com")({}, requirements), /400 on \/settle/);
});

test("success:false with no transaction id is a failure, not a 200", async () => {
  stubFetch(200, { success: false, errorReason: "invalid_signature" });
  await assert.rejects(facilitatorSettler("https://api.testnet.blocky402.com")({}, requirements), /invalid_signature/);
});
