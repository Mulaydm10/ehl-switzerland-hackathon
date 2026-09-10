import { test } from "node:test";
import assert from "node:assert/strict";
import { AbiCoder, Interface, dnsEncode, namehash } from "ethers";
import {
  UNIVERSAL_RESOLVER,
  resolveAddress,
  resolveText,
  vouchesFor,
  type Caller,
} from "../src/ens.js";

const coder = AbiCoder.defaultAbiCoder();
const resolverAbi = new Interface([
  "function resolve(bytes name, bytes data) view returns (bytes result, address resolver)",
]);

const RESOLVER = "0xae66c62AcAE72098BdAc57d8E8AED53EF000b2Ba";
const AGENT = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

/** A `Caller` that answers with `inner`, wrapped exactly as the UR wraps it. */
function answering(inner: string, resolver = RESOLVER): Caller & { seen: string[] } {
  const seen: string[] = [];
  return {
    seen,
    async call(tx) {
      seen.push(tx.to);
      return coder.encode(["bytes", "address"], [inner, resolver]);
    },
  };
}

function reverting(shortMessage: string): Caller {
  return {
    async call() {
      throw Object.assign(new Error("call revert exception"), { shortMessage });
    },
  };
}

test("an address record resolves through the canonical Universal Resolver", async () => {
  const caller = answering(coder.encode(["address"], [AGENT]));
  const resolved = await resolveAddress(caller, "agent.eth");

  assert.deepEqual(resolved, { kind: "ok", value: AGENT, resolver: RESOLVER });
  assert.deepEqual(caller.seen, [UNIVERSAL_RESOLVER]);
});

test("a name is wrapped as DNS-encoded bytes with the namehash inside", async () => {
  let outer = "";
  const caller: Caller = {
    async call(tx) {
      outer = tx.data;
      return coder.encode(["bytes", "address"], [coder.encode(["address"], [AGENT]), RESOLVER]);
    },
  };

  await resolveAddress(caller, "child.agent.eth");

  const decoded = resolverAbi.decodeFunctionData("resolve", outer);
  assert.equal(String(decoded[0]), dnsEncode("child.agent.eth"));
  assert.ok(String(decoded[1]).includes(namehash("child.agent.eth").slice(2)));
});

test("zero address is `unset`, not `ok` — a cleared record is not an identity", async () => {
  const zero = "0x0000000000000000000000000000000000000000";
  const resolved = await resolveAddress(answering(coder.encode(["address"], [zero])), "gone.eth");

  assert.deepEqual(resolved, { kind: "unset", resolver: RESOLVER });
});

test("a revert is an answer: an unregistered name is `unresolvable`, and keeps its reason", async () => {
  const resolved = await resolveAddress(reverting("execution reverted: ResolverNotFound"), "nope.eth");

  assert.equal(resolved.kind, "unresolvable");
  assert.match(
    resolved.kind === "unresolvable" ? resolved.error : "",
    /ResolverNotFound/,
  );
});

test("an empty text record is `unset`", async () => {
  const caller = answering(coder.encode(["string"], [""]));
  assert.deepEqual(await resolveText(caller, "agent.eth", "agent:role"), {
    kind: "unset",
    resolver: RESOLVER,
  });
});

test("a text record round-trips its value", async () => {
  const caller = answering(coder.encode(["string"], ["child"]));
  assert.deepEqual(await resolveText(caller, "agent.eth", "agent:role"), {
    kind: "ok",
    value: "child",
    resolver: RESOLVER,
  });
});

test("vouchesFor ignores address casing but not a different address", async () => {
  const caller = answering(coder.encode(["address"], [AGENT]));

  assert.equal(await vouchesFor(caller, "agent.eth", AGENT.toLowerCase()), true);
  assert.equal(
    await vouchesFor(caller, "agent.eth", "0x0000000000000000000000000000000000000001"),
    false,
  );
});

test("vouchesFor is false — never throws — when the name does not resolve", async () => {
  assert.equal(await vouchesFor(reverting("ResolverNotFound"), "nope.eth", AGENT), false);
});
