import { test } from "node:test";
import assert from "node:assert/strict";
import { AbiCoder, Interface, dnsEncode, namehash } from "ethers";
import {
  ROLE_CLEAR,
  ROLE_SET_TEXT,
  ROOT_RESOURCE,
  adminOf,
  authorizeNameCall,
  authorizeTextCall,
  clearRecordsCall,
  eacResource,
  nameResource,
  partHashText,
  partHashUint,
  preflight,
  setTextCall,
  textResource,
} from "../src/authority.js";
import type { Caller } from "../src/ens.js";

const coder = AbiCoder.defaultAbiCoder();
const eacAbi = new Interface([
  "error EACUnauthorizedAccountRoles(uint256 resource, uint256 roleBitmap, address account)",
]);

const RESOLVER = "0xae66c62AcAE72098BdAc57d8E8AED53EF000b2Ba";
const PARENT = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const CHILD = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

/** The Universal Resolver's answer to the `addr()` discovery hop. */
function discovery(): string {
  const inner = coder.encode(["address"], [PARENT]);
  return coder.encode(["bytes", "address"], [inner, RESOLVER]);
}

function caller(onWrite: (tx: { to: string; data: string; from?: string }) => Promise<string>) {
  const writes: { to: string; from?: string; data: string }[] = [];
  let first = true;
  const c: Caller = {
    async call(tx) {
      if (first) {
        first = false;
        return discovery();
      }
      writes.push({ to: tx.to, from: tx.from, data: tx.data });
      return onWrite(tx);
    },
  };
  return { caller: c, writes };
}

// ---------------------------------------------------------------------------
// EAC resource arithmetic. These vectors come from ENS's own published
// calculator; a mismatch means our code is wrong, never theirs.
// ---------------------------------------------------------------------------

test("the resource for a text key matches ENS's own calculator", () => {
  assert.equal(
    partHashText("avatar"),
    "0xd1f86c93d831119ad98fe983e643a7431e4ac992e3ead6e3007f4dd1adf66343",
  );
  assert.equal(
    namehash("alice.eth"),
    "0x787192fc5378cc32aa956ddfdedbf26b24e8d78e40109add0eea2c1a012c3dec",
  );
  assert.equal(
    textResource("alice.eth", "avatar"),
    BigInt("0xbd3188d6161ab4bb96e293c8c6f6798ba575ab0b7b78481a28dd86aad5cdeb1a"),
  );
});

test("the all-zero resource is the root, not a hash of zeroes", () => {
  // The contract short-circuits this case. Hashing it instead would produce a
  // resource that looks plausible and can never match a permission.
  assert.equal(eacResource("0x" + "00".repeat(32), "0x" + "00".repeat(32)), ROOT_RESOURCE);
  assert.notEqual(nameResource("alice.eth"), ROOT_RESOURCE);
});

test("a name-wide resource is not a record-level one", () => {
  assert.notEqual(nameResource("alice.eth"), textResource("alice.eth", "avatar"));
});

test("a uint-keyed part hashes the word, not its decimal text", () => {
  assert.equal(partHashUint(60n), partHashUint(BigInt(60)));
  assert.notEqual(partHashUint(60n), partHashText("60"));
});

test("admin roles live 128 bits up and survive the shift", () => {
  assert.equal(adminOf(ROLE_SET_TEXT), ROLE_SET_TEXT << 128n);
  // The reason every role here is a bigint: ROLE_CLEAR alone is 1 << 32, and
  // its admin counterpart is 1 << 160 — far past what a number holds exactly.
  assert.equal(ROLE_CLEAR, 4294967296n);
  assert.equal(adminOf(ROLE_CLEAR).toString(16), "1" + "0".repeat(40));
});

// ---------------------------------------------------------------------------
// Calldata. The interesting assertions are about argument *shape*, because
// every one of these mistakes encodes and broadcasts happily.
// ---------------------------------------------------------------------------

test("authorize takes a DNS-encoded name, never a namehash", () => {
  const call = authorizeTextCall("alice.eth", "avatar", CHILD, true);
  const encoded = dnsEncode("alice.eth");
  assert.equal(encoded, "0x05616c6963650365746800");
  assert.ok(call.data.includes(encoded.slice(2)));
  assert.ok(!call.data.includes(namehash("alice.eth").slice(2)));
});

test("setText takes a namehash, never a DNS-encoded name", () => {
  const call = setTextCall("alice.eth", "allowance", "revoked");
  assert.ok(call.data.includes(namehash("alice.eth").slice(2)));
  assert.ok(!call.data.includes(dnsEncode("alice.eth").slice(2)));
});

test("revocation is the grant call with one bit flipped", () => {
  // This is the whole design claim: taking authority back is not a second
  // mechanism, exactly as in core's algebra.
  const grant = authorizeTextCall("alice.eth", "allowance", CHILD, true);
  const revoke = authorizeTextCall("alice.eth", "allowance", CHILD, false);
  const abi = new Interface([
    "function authorizeTextRoles(bytes toName, string key, address account, bool grant)",
  ]);
  const a = abi.decodeFunctionData("authorizeTextRoles", grant.data);
  const b = abi.decodeFunctionData("authorizeTextRoles", revoke.data);

  assert.equal(grant.signature, revoke.signature);
  assert.deepEqual(a.slice(0, 3), b.slice(0, 3));
  assert.equal(a[3], true);
  assert.equal(b[3], false);
});

test("a role bitmap survives the round trip through calldata", () => {
  const roles = ROLE_SET_TEXT | ROLE_CLEAR | adminOf(ROLE_SET_TEXT);
  const call = authorizeNameCall("alice.eth", roles, CHILD, true);
  const abi = new Interface([
    "function authorizeNameRoles(bytes toName, uint256 roleBitmap, address account, bool grant)",
  ]);
  const args = abi.decodeFunctionData("authorizeNameRoles", call.data);
  assert.equal(BigInt(String(args[1])), roles);
});

test("the empty name means any name, and encodes as 0x", () => {
  const call = authorizeNameCall("", ROLE_SET_TEXT, CHILD, true);
  const abi = new Interface([
    "function authorizeNameRoles(bytes toName, uint256 roleBitmap, address account, bool grant)",
  ]);
  assert.equal(String(abi.decodeFunctionData("authorizeNameRoles", call.data)[0]), "0x");
});

test("no built call carries a destination", () => {
  // The resolver is per-account and discovered; a hardcoded `to` here is the
  // single most expensive mistake available in this module.
  const calls = [
    setTextCall("alice.eth", "k", "v"),
    clearRecordsCall("alice.eth"),
    authorizeTextCall("alice.eth", "k", CHILD, false),
  ];
  for (const call of calls) {
    assert.equal("to" in call, false);
    assert.ok(call.data.startsWith("0x"));
  }
});

// ---------------------------------------------------------------------------
// Preflight.
// ---------------------------------------------------------------------------

test("preflight sends to the discovered resolver, as the given sender", async () => {
  const { caller: c, writes } = caller(async () => "0x");
  const call = authorizeTextCall("alice.eth", "allowance", CHILD, false);

  const answer = await preflight(c, "alice.eth", call, PARENT);

  assert.equal(answer.kind, "accepted");
  assert.equal(writes.length, 1);
  assert.equal(writes[0]!.to, RESOLVER);
  assert.equal(writes[0]!.from, PARENT);
  assert.equal(writes[0]!.data, call.data);
});

test("an unauthorized sender is a named refusal, not an exception", async () => {
  const resource = textResource("alice.eth", "allowance");
  const revert = eacAbi.encodeErrorResult("EACUnauthorizedAccountRoles", [
    resource,
    ROLE_SET_TEXT,
    CHILD,
  ]);
  const { caller: c } = caller(async () => {
    throw Object.assign(new Error("execution reverted"), { data: revert });
  });

  const answer = await preflight(c, "alice.eth", setTextCall("alice.eth", "allowance", "0"), CHILD);

  assert.equal(answer.kind, "refused");
  if (answer.kind !== "refused") return;
  assert.equal(answer.selector, "0x4b27a133");
  assert.match(answer.reason, new RegExp(`lacks roles 0x10 on resource 0x${resource.toString(16)}`, "i"));
  assert.equal(answer.resolver, RESOLVER);
});

test("an unrecognised revert is still a refusal, reported by selector", async () => {
  const { caller: c } = caller(async () => {
    throw Object.assign(new Error("execution reverted"), { data: "0xdeadbeef" + "00".repeat(32) });
  });

  const answer = await preflight(c, "alice.eth", clearRecordsCall("alice.eth"), CHILD);

  assert.equal(answer.kind, "refused");
  if (answer.kind !== "refused") return;
  assert.equal(answer.selector, "0xdeadbeef");
  assert.match(answer.reason, /unrecognised revert 0xdeadbeef/);
});

test("a revert with no data is a wordless refusal, not a failure to ask", async () => {
  // A legacy resolver with no such method reverts empty. The chain answered;
  // only its vocabulary is missing.
  const { caller: c } = caller(async () => {
    throw Object.assign(new Error("missing revert data"), { code: "CALL_EXCEPTION" });
  });

  const answer = await preflight(c, "alice.eth", setTextCall("alice.eth", "k", "v"), CHILD);

  assert.equal(answer.kind, "refused");
  if (answer.kind !== "refused") return;
  assert.equal(answer.selector, "0x");
  assert.equal(answer.reason, "reverted without data");
});

test("a transport failure is unresolvable, never a refusal", async () => {
  // A gateway outage must not be reportable as "the resolver said no".
  const { caller: c } = caller(async () => {
    throw Object.assign(new Error("boom"), { shortMessage: "could not coalesce error" });
  });

  const answer = await preflight(c, "alice.eth", clearRecordsCall("alice.eth"), CHILD);

  assert.equal(answer.kind, "unresolvable");
  if (answer.kind !== "unresolvable") return;
  assert.equal(answer.error, "could not coalesce error");
});

test("a name with no resolver is unresolvable before anything is simulated", async () => {
  let calls = 0;
  const c: Caller = {
    async call() {
      calls += 1;
      throw Object.assign(new Error("reverted"), { shortMessage: "ResolverNotFound" });
    },
  };

  const answer = await preflight(c, "nope.eth", clearRecordsCall("nope.eth"), PARENT);

  assert.equal(answer.kind, "unresolvable");
  assert.equal(calls, 1);
});
