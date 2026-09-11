import { test } from "node:test";
import assert from "node:assert/strict";
import { loadChainEnv } from "../src/env.js";
import { testnetCaller } from "../src/ens.js";
import { grantSetterRolesCall, preflight, setTextCall } from "../src/authority.js";

loadChainEnv();

/**
 * Live preflight against whichever resolver actually answers on Sepolia.
 *
 * These are still `eth_call`s: no key, no gas, nothing broadcast. What they buy
 * is the one thing an offline test cannot — proof that the calldata we build
 * survives a real resolver's ABI decoder and reaches its permission check,
 * which is exactly where an address we do not control must be turned away.
 *
 * A refusal here is the pass condition. If one of these ever came back
 * `accepted` it would mean we had somehow been authorized on a name we do not
 * own, and that is a finding, not a green test.
 *
 * The refusal's *shape* depends on which resolver answers: a per-account
 * `PermissionedResolver` reverts with a decodable EAC error, while a legacy
 * resolver that never had these methods reverts empty. Both are refusals and
 * both are asserted as such; only `unresolvable` — no answer at all — fails.
 */
const rpcUrl = process.env["SEPOLIA_RPC_URL"];
const skip = rpcUrl ? false : "SEPOLIA_RPC_URL unset — no live ENS preflight attempted";

/** An address with no authority over anything, derived from nothing. */
const STRANGER = "0x000000000000000000000000000000000000dEaD";

test("writing a record on a name we do not own is refused, not accepted", { skip }, async () => {
  const caller = testnetCaller(rpcUrl!);
  const call = setTextCall("vitalik.eth", "agent:allowance", "1");

  const answer = await preflight(caller, "vitalik.eth", call, STRANGER);

  // The RPC endpoint failing us is not the resolver refusing us. Say which, and
  // fail: a skipped-shaped pass hiding inside a live test is what ADR-0003 bans.
  if (answer.kind === "unresolvable") assert.fail(`no answer from Sepolia: ${answer.error}`);
  assert.equal(answer.kind, "refused");
  if (answer.kind !== "refused") return;
  assert.match(answer.selector, /^0x([0-9a-f]{8})?$/);
  assert.ok(answer.reason.length > 0, "a refusal must carry a reason");
});

test("delegating a text role we cannot delegate is refused too", { skip }, async () => {
  const caller = testnetCaller(rpcUrl!);
  const call = grantSetterRolesCall(
    setTextCall("vitalik.eth", "agent:allowance", "1"),
    STRANGER,
  );

  const answer = await preflight(caller, "vitalik.eth", call, STRANGER);

  if (answer.kind === "unresolvable") assert.fail(`no answer from Sepolia: ${answer.error}`);
  assert.equal(answer.kind, "refused");
  if (answer.kind !== "refused") return;
  assert.match(answer.resolver, /^0x[0-9a-fA-F]{40}$/);
});

/**
 * The assertion that decides whether any of the above means anything.
 *
 * Every signature in `authority.ts` is taken from the `PermissionedResolver`
 * implementation deployed on Sepolia, and an ABI derived from the contracts
 * repo's default branch would be a different, plausible, entirely undeployed
 * one — its calls revert wordlessly, which is indistinguishable from a
 * permission refusal. So the selectors are checked against the deployed
 * runtime bytecode itself, which is the only artifact that cannot be out of
 * date with the chain.
 */
const IMPLEMENTATION = "0xa9d3814ab151bf6e37a427432795371a8361614e";

test("the deployed implementation implements the selectors we build", { skip }, async () => {
  const response = await fetch(rpcUrl!, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getCode",
      params: [IMPLEMENTATION, "latest"],
    }),
  });
  const code = ((await response.json()) as { result?: string }).result ?? "";
  assert.ok(code.length > 2, "no code at the implementation address");

  const built = [
    setTextCall("alice.eth", "k", "v"),
    grantSetterRolesCall(setTextCall("alice.eth", "k", "v"), STRANGER),
  ];
  for (const call of built) {
    assert.ok(
      code.includes(call.data.slice(2, 10)),
      `${call.signature} is not in the deployed bytecode`,
    );
  }
  // And the node-keyed setters we used to build are not there at all.
  for (const absent of ["10f13a8c", "d5fa2b00", "3603d758", "f2d1eb25"]) {
    assert.ok(!code.includes(absent), `unexpected ${absent} in deployed bytecode`);
  }
});
