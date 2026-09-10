import { test } from "node:test";
import assert from "node:assert/strict";
import { AbiCoder, Interface, dnsEncode } from "ethers";
import {
  ETH_COIN_TYPE,
  evmCoinType,
  mutualIdentity,
  primaryName,
} from "../src/reverse.js";
import type { Caller } from "../src/ens.js";

/**
 * Offline tests for the reverse direction. Every outcome is driven through a
 * canned caller, including the reverts: the Universal Resolver's custom errors
 * are the part most likely to be silently mis-decoded, and a live test cannot
 * summon a `ReverseAddressMismatch` on demand.
 */

const AGENT = "0x9703d9cF2F834e71D9b70675e746F7B634c9D1e9";
const OTHER = "0x00000000000000000000000000000000000000A1";
const RESOLVER = "0xae66c62AcAE72098BdAc57d8E8AED53EF000b2Ba";
const REVERSE_RESOLVER = "0xae66c62AcAE72098BdAc57d8E8AED53EF000b2Ba";

const coder = AbiCoder.defaultAbiCoder();
const errors = new Interface([
  "error ResolverNotFound(bytes name)",
  "error ResolverNotContract(bytes name, address resolver)",
  "error ReverseAddressMismatch(string primary, bytes primaryAddress)",
  "error HttpError(uint16 status, string message)",
]);
const records = new Interface(["function addr(bytes32 node) view returns (address)"]);

function answers(name: string): Caller {
  return {
    async call() {
      return coder.encode(
        ["string", "address", "address"],
        [name, RESOLVER, REVERSE_RESOLVER],
      );
    },
  };
}

function reverts(data: string): Caller {
  return {
    async call(): Promise<string> {
      throw Object.assign(new Error("execution reverted"), { data });
    },
  };
}

test("a reverse record that forward-verifies is a verified primary name", async () => {
  const out = await primaryName(answers("agent.eth"), AGENT);

  assert.equal(out.kind, "verified");
  if (out.kind !== "verified") return;
  assert.equal(out.name, "agent.eth");
  assert.equal(out.coinType, ETH_COIN_TYPE);
  assert.equal(out.reverseResolver, REVERSE_RESOLVER);
});

test("an empty name is 'none', not an error, and keeps the reverse resolver", async () => {
  const out = await primaryName(answers(""), AGENT);

  assert.equal(out.kind, "none");
  if (out.kind !== "none") return;
  assert.equal(out.reverseResolver, REVERSE_RESOLVER);
});

test("the coin type asked about is part of the answer", async () => {
  const out = await primaryName(answers(""), AGENT, evmCoinType(11155111));

  assert.equal(out.coinType, 2158638759n);
});

test("ENSIP-11 chain-specific coin types are 0x80000000 | chainId", () => {
  assert.equal(evmCoinType(11155111), 2158638759n);
  assert.equal(evmCoinType(1), 2147483649n);
  assert.equal(ETH_COIN_TYPE, 60n);
});

test("the address is lower-cased into the call, whatever case it arrives in", async () => {
  let sent = "";
  const spy: Caller = {
    async call(tx) {
      sent = tx.data;
      return coder.encode(["string", "address", "address"], ["", RESOLVER, RESOLVER]);
    },
  };

  await primaryName(spy, AGENT);
  assert.ok(sent.includes(AGENT.slice(2).toLowerCase()));
});

test("a name the address claims but cannot resolve back is named as such", async () => {
  const data = errors.encodeErrorResult("ResolverNotFound", [dnsEncode("ariutokintumi.eth")]);
  const out = await primaryName(reverts(data), AGENT);

  assert.equal(out.kind, "no-forward-resolver");
  if (out.kind !== "no-forward-resolver") return;
  assert.equal(out.name, "ariutokintumi.eth");
});

test("the same error in the reverse namespace means no reverse resolver at all", async () => {
  const node = `${AGENT.slice(2).toLowerCase()}.addr.reverse`;
  const data = errors.encodeErrorResult("ResolverNotFound", [dnsEncode(node, 255)]);
  const out = await primaryName(reverts(data), AGENT);

  assert.equal(out.kind, "no-reverse-resolver");
});

test("a reverse record naming a different address is an unbacked claim", async () => {
  const data = errors.encodeErrorResult("ReverseAddressMismatch", [
    "someone-else.eth",
    OTHER,
  ]);
  const out = await primaryName(reverts(data), AGENT);

  assert.equal(out.kind, "address-mismatch");
  if (out.kind !== "address-mismatch") return;
  assert.equal(out.name, "someone-else.eth");
});

test("a resolver that is not a contract is a forward-resolution failure", async () => {
  const data = errors.encodeErrorResult("ResolverNotContract", [
    dnsEncode("agent.eth"),
    OTHER,
  ]);
  const out = await primaryName(reverts(data), AGENT);

  assert.equal(out.kind, "no-forward-resolver");
  if (out.kind !== "no-forward-resolver") return;
  assert.equal(out.name, "agent.eth");
});

test("a gateway outage is not a refusal — it stays unresolvable", async () => {
  const data = errors.encodeErrorResult("HttpError", [502, "bad gateway"]);
  const out = await primaryName(reverts(data), AGENT);

  assert.equal(out.kind, "unresolvable");
  if (out.kind !== "unresolvable") return;
  assert.match(out.error, /HttpError/);
});

test("an unknown revert selector is reported by selector, not swallowed", async () => {
  const out = await primaryName(reverts("0xdeadbeef"), AGENT);

  assert.equal(out.kind, "unresolvable");
  if (out.kind !== "unresolvable") return;
  assert.match(out.error, /0xdeadbeef/);
});

test("a transport failure with no revert data carries the transport's reason", async () => {
  const dead: Caller = {
    async call(): Promise<string> {
      throw new Error("socket hang up");
    },
  };
  const out = await primaryName(dead, AGENT);

  assert.equal(out.kind, "unresolvable");
  if (out.kind !== "unresolvable") return;
  assert.equal(out.error, "socket hang up");
});

test("revert data nested under info.error.data is still decoded", async () => {
  const data = errors.encodeErrorResult("ReverseAddressMismatch", ["b.eth", OTHER]);
  const nested: Caller = {
    async call(): Promise<string> {
      throw Object.assign(new Error("execution reverted"), {
        info: { error: { data } },
      });
    },
  };

  assert.equal((await primaryName(nested, AGENT)).kind, "address-mismatch");
});

test("mutual identity holds only when the forward record points back", async () => {
  const both: Caller = {
    async call(tx) {
      return tx.data.startsWith("0x5d78a217") // reverse(bytes,uint256)
        ? coder.encode(["string", "address", "address"], ["agent.eth", RESOLVER, RESOLVER])
        : coder.encode(
            ["bytes", "address"],
            [records.encodeFunctionResult("addr", [AGENT]), RESOLVER],
          );
    },
  };

  const out = await mutualIdentity(both, AGENT);
  assert.equal(out.mutual, true);
  assert.equal(out.forwardAddress?.toLowerCase(), AGENT.toLowerCase());
});

test("mutual identity fails when the forward record names someone else", async () => {
  const crossed: Caller = {
    async call(tx) {
      return tx.data.startsWith("0x5d78a217")
        ? coder.encode(["string", "address", "address"], ["agent.eth", RESOLVER, RESOLVER])
        : coder.encode(
            ["bytes", "address"],
            [records.encodeFunctionResult("addr", [OTHER]), RESOLVER],
          );
    },
  };

  const out = await mutualIdentity(crossed, AGENT);
  assert.equal(out.mutual, false);
  assert.equal(out.reverse.kind, "verified");
});

test("no reverse record means no mutual identity, and says why", async () => {
  const out = await mutualIdentity(answers(""), AGENT);

  assert.equal(out.mutual, false);
  assert.equal(out.reverse.kind, "none");
  assert.equal(out.forwardAddress, undefined);
});
