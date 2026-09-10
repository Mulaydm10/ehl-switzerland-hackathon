import { test } from "node:test";
import assert from "node:assert/strict";
import { loadChainEnv } from "../src/env.js";
import { resolveAddress, testnetCaller, vouchesFor } from "../src/ens.js";

loadChainEnv();

/**
 * Live ENSv2 reads against Sepolia. Like the Hedera live tests, these skip with
 * a visible reason rather than passing vacuously: a run with no RPC URL is
 * incomplete, and `contracts/chain.md` requires that be observable.
 */
const rpcUrl = process.env["SEPOLIA_RPC_URL"];
const skip = rpcUrl ? false : "SEPOLIA_RPC_URL unset — no live ENS read attempted";

test("a registered ENSv2 name resolves to its address on Sepolia", { skip }, async () => {
  const caller = testnetCaller(rpcUrl!);
  const resolved = await resolveAddress(caller, "vitalik.eth");

  assert.equal(resolved.kind, "ok", `expected a resolved address, got ${resolved.kind}`);
  if (resolved.kind !== "ok") return;

  assert.match(resolved.value, /^0x[0-9a-fA-F]{40}$/);
  assert.match(resolved.resolver, /^0x[0-9a-fA-F]{40}$/);
  assert.equal(await vouchesFor(caller, "vitalik.eth", resolved.value), true);
});

test("a name nobody registered is unresolvable, with the chain's reason", { skip }, async () => {
  const name = `no-such-agent-${Date.now()}.eth`;
  const resolved = await resolveAddress(testnetCaller(rpcUrl!), name);

  assert.notEqual(resolved.kind, "ok");
  if (resolved.kind === "unresolvable") assert.ok(resolved.error.length > 0);
});
