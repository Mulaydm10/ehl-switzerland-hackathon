import { test } from "node:test";
import assert from "node:assert/strict";
import { AbiCoder, Interface, dnsEncode, keccak256, namehash, toUtf8Bytes } from "ethers";
import {
  ROLE_LINK,
  ROLE_SET_ADDRESS,
  ROLE_SET_DATA,
  ROLE_SET_NAME,
  ROLE_SET_TEXT,
  ROOT_RESOURCE,
  adminOf,
  grantSetterRolesCall,
  preflight,
  requirementOf,
  revokeRolesCall,
  setAddressCall,
  setDataCall,
  setTextCall,
  textResource,
  uintResource,
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
// Selectors. These are the assertions that would have caught the first version
// of this module, which encoded a plausible ABI nobody has deployed: every one
// is checked against the runtime bytecode at 0xa9d3814a… on Sepolia.
// ---------------------------------------------------------------------------

test("every built call carries a selector the deployed resolver implements", () => {
  const selectors = {
    "setText(bytes,string,string)": "0xc7279f88",
    "setAddress(bytes,uint256,bytes)": "0xb4436dde",
    "setData(bytes,string,bytes)": "0xeb4b73bb",
    "grantSetterRoles(bytes,address)": "0xccd3eaff",
    "revokeRoles(uint256,uint256,address)": "0xdfa70d8b",
  };
  const built = [
    setTextCall("alice.eth", "k", "v"),
    setAddressCall("alice.eth", 60n, "0x" + "11".repeat(20)),
    setDataCall("alice.eth", "k", "0x1234"),
    grantSetterRolesCall(setTextCall("alice.eth", "k", "v"), CHILD),
    revokeRolesCall(textResource("k"), ROLE_SET_TEXT, CHILD),
  ];
  for (const call of built) {
    assert.equal(call.data.slice(0, 10), selectors[call.signature as keyof typeof selectors]);
  }
});

test("the node-keyed setters of the other PermissionedResolver are never built", () => {
  // `setText(bytes32,string,string)`, `setAddr(bytes32,address)`,
  // `clearRecords(bytes32)` and `authorize*Roles` exist on the contracts
  // repo's default branch but are absent from the deployed bytecode. Encoding
  // one produces calldata that reverts wordlessly, which reads exactly like a
  // permission refusal.
  const absent = ["0x10f13a8c", "0xd5fa2b00", "0x3603d758", "0xf2d1eb25"];
  const built = [
    setTextCall("alice.eth", "k", "v"),
    setAddressCall("alice.eth", 60n, "0x00"),
    grantSetterRolesCall(setTextCall("alice.eth", "k", "v"), CHILD),
  ].map((c) => c.data.slice(0, 10));
  for (const selector of absent) assert.ok(!built.includes(selector));
});

// ---------------------------------------------------------------------------
// EAC resources. The deployed resolver scopes by setter *argument*: the proxy
// is per-account, so there is no name in the resource at all.
// ---------------------------------------------------------------------------

test("a text resource is the hash of the key alone, with no name mixed in", () => {
  assert.equal(textResource("avatar"), BigInt(keccak256(toUtf8Bytes("avatar"))));
  assert.equal(
    textResource("avatar"),
    BigInt("0xd1f86c93d831119ad98fe983e643a7431e4ac992e3ead6e3007f4dd1adf66343"),
  );
  // A name-scoped resource would be a different number, and one no setter on
  // the deployed implementation ever checks.
  assert.notEqual(
    textResource("avatar"),
    BigInt(keccak256(coder.encode(["bytes32", "bytes32"], [namehash("alice.eth"), keccak256(toUtf8Bytes("avatar"))]))),
  );
});

test("a uint-keyed resource hashes the word, not its decimal text", () => {
  assert.equal(uintResource(60n), uintResource(BigInt(60)));
  assert.notEqual(uintResource(60n), textResource("60"));
});

test("no resource derived from an argument is the root resource", () => {
  // The contract asserts this: a root grant would cover every key, and cannot
  // be reached through `grantSetterRoles`.
  assert.notEqual(textResource(""), ROOT_RESOURCE);
  assert.notEqual(uintResource(0n), ROOT_RESOURCE);
  assert.equal(ROOT_RESOURCE, 0n);
});

test("admin roles live 128 bits up and survive the shift", () => {
  assert.equal(adminOf(ROLE_SET_TEXT), ROLE_SET_TEXT << 128n);
  // The reason every role here is a bigint: ROLE_LINK's admin counterpart is
  // 1 << 156, far past what a number holds exactly.
  assert.equal(ROLE_LINK, 268435456n);
  assert.equal(adminOf(ROLE_LINK).toString(16), "1" + "0".repeat(39));
});

test("the deployed role bits are nybble-spaced in the deployed order", () => {
  assert.equal(ROLE_SET_ADDRESS, 1n);
  assert.equal(ROLE_SET_TEXT, 1n << 4n);
  assert.equal(ROLE_SET_NAME, 1n << 20n);
  assert.equal(ROLE_SET_DATA, 1n << 24n);
});

// ---------------------------------------------------------------------------
// Calldata. The interesting assertions are about argument *shape*, because
// every one of these mistakes encodes and broadcasts happily.
// ---------------------------------------------------------------------------

test("setters take a DNS-encoded name, never a namehash", () => {
  const call = setTextCall("alice.eth", "allowance", "revoked");
  const encoded = dnsEncode("alice.eth");
  assert.equal(encoded, "0x05616c6963650365746800");
  assert.ok(call.data.includes(encoded.slice(2)));
  assert.ok(!call.data.includes(namehash("alice.eth").slice(2)));
});

test("the root name is reachable, and encodes as 0x", () => {
  const abi = new Interface(["function setText(bytes name, string key, string value)"]);
  const call = setTextCall("", "allowance", "revoked");
  assert.equal(String(abi.decodeFunctionData("setText", call.data)[0]), "0x");
});

test("an address record is opaque bytes for a coin type, not an address word", () => {
  const abi = new Interface(["function setAddress(bytes name, uint256 coinType, bytes value)"]);
  const call = setAddressCall("alice.eth", 60n, "0x" + "ab".repeat(20));
  const args = abi.decodeFunctionData("setAddress", call.data);
  assert.equal(BigInt(String(args[1])), 60n);
  assert.equal(String(args[2]), "0x" + "ab".repeat(20));
});

test("a grant delegates exactly the setter call it carries", () => {
  // Delegation names the call the child may make; the resolver derives role and
  // resource from it. Nothing else can be granted.
  const setter = setTextCall("alice.eth", "allowance", "1000");
  const grant = grantSetterRolesCall(setter, CHILD);
  const abi = new Interface(["function grantSetterRoles(bytes setter, address account)"]);
  const args = abi.decodeFunctionData("grantSetterRoles", grant.data);
  assert.equal(String(args[0]), setter.data);
  assert.equal(String(args[1]), CHILD);
});

test("revocation targets the same resource and role the grant implied", () => {
  // The two calls are different methods here, so the only thing keeping them
  // in agreement is this derivation being shared.
  const setter = setTextCall("alice.eth", "allowance", "1000");
  const need = requirementOf(setter);
  assert.ok(need);
  assert.equal(need.resource, textResource("allowance"));
  assert.equal(need.roleBitmap, ROLE_SET_TEXT);

  const abi = new Interface([
    "function revokeRoles(uint256 resource, uint256 roleBitmap, address account)",
  ]);
  const revoke = revokeRolesCall(need.resource, need.roleBitmap, CHILD);
  const args = abi.decodeFunctionData("revokeRoles", revoke.data);
  assert.equal(BigInt(String(args[0])), textResource("allowance"));
  assert.equal(BigInt(String(args[1])), ROLE_SET_TEXT);
});

test("each setter's requirement names its own role and keyed argument", () => {
  assert.deepEqual(requirementOf(setDataCall("alice.eth", "k", "0x00")), {
    resource: textResource("k"),
    roleBitmap: ROLE_SET_DATA,
  });
  assert.deepEqual(requirementOf(setAddressCall("alice.eth", 60n, "0x00")), {
    resource: uintResource(60n),
    roleBitmap: ROLE_SET_ADDRESS,
  });
  // A grant is not itself a setter: it has no keyed argument of its own.
  assert.equal(requirementOf(grantSetterRolesCall(setTextCall("a.eth", "k", "v"), CHILD)), undefined);
});

test("no built call carries a destination", () => {
  // The resolver is per-account and discovered; a hardcoded `to` here is the
  // single most expensive mistake available in this module.
  const calls = [
    setTextCall("alice.eth", "k", "v"),
    setDataCall("alice.eth", "k", "0x00"),
    grantSetterRolesCall(setTextCall("alice.eth", "k", "v"), CHILD),
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
  const call = setTextCall("alice.eth", "allowance", "revoked");

  const answer = await preflight(c, "alice.eth", call, PARENT);

  assert.equal(answer.kind, "accepted");
  if (answer.kind !== "accepted") return;
  assert.equal(answer.resource, textResource("allowance"));
  assert.equal(writes.length, 1);
  assert.equal(writes[0]!.to, RESOLVER);
  assert.equal(writes[0]!.from, PARENT);
  assert.equal(writes[0]!.data, call.data);
});

test("an unauthorized sender is a named refusal, not an exception", async () => {
  const resource = textResource("allowance");
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

test("a resolver without the profile says so by name", async () => {
  const abi = new Interface(["error UnsupportedResolverProfile(bytes4 selector)"]);
  const { caller: c } = caller(async () => {
    throw Object.assign(new Error("execution reverted"), {
      data: abi.encodeErrorResult("UnsupportedResolverProfile", ["0xdeadbeef"]),
    });
  });

  const answer = await preflight(c, "alice.eth", setTextCall("alice.eth", "k", "v"), CHILD);

  assert.equal(answer.kind, "refused");
  if (answer.kind !== "refused") return;
  assert.equal(answer.selector, "0x7b1c461b");
  assert.match(answer.reason, /does not implement 0xdeadbeef/);
});

test("an unrecognised revert is still a refusal, reported by selector", async () => {
  const { caller: c } = caller(async () => {
    throw Object.assign(new Error("execution reverted"), { data: "0xdeadbeef" + "00".repeat(32) });
  });

  const answer = await preflight(c, "alice.eth", setDataCall("alice.eth", "k", "0x00"), CHILD);

  assert.equal(answer.kind, "refused");
  if (answer.kind !== "refused") return;
  assert.equal(answer.selector, "0xdeadbeef");
  assert.match(answer.reason, /unrecognised revert 0xdeadbeef/);
});

test("a revert with no data is a wordless refusal, not a failure to ask", async () => {
  // A resolver with no such method reverts empty. The chain answered; only its
  // vocabulary is missing.
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

  const answer = await preflight(c, "alice.eth", setTextCall("alice.eth", "k", "v"), CHILD);

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

  const answer = await preflight(c, "nope.eth", setTextCall("nope.eth", "k", "v"), PARENT);

  assert.equal(answer.kind, "unresolvable");
  assert.equal(calls, 1);
});
