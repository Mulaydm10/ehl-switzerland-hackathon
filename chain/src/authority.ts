import {
  AbiCoder,
  Interface,
  dnsEncode,
  getAddress,
  keccak256,
  toBeHex,
  toUtf8Bytes,
} from "ethers";
import { resolveAddress, type Caller } from "./ens.js";

/**
 * The write side of ENS identity — built, addressed and rehearsed, but not sent.
 *
 * `ens.ts` reads who an agent claims to be. This module builds the calls a
 * parent would send to *decide* who may speak for a child, and asks the
 * deployed resolver what it thinks of them. Only the last step — broadcasting a
 * signed transaction — costs money, and none of it happens here.
 *
 * ENSv2's Enhanced Access Control is the onchain mirror of `core/`'s algebra: a
 * parent grants a child one role, scoped to one record key, and takes it back
 * with `revokeRoles`. The *amount* still lives in `core/` because a role is a
 * boolean and not a balance (ADR-0003); what lives here is the question of who
 * may write at all.
 *
 * The resolver's address is never configured. In ENSv2 each account gets its
 * own `PermissionedResolver` proxy, so the only honest way to address a call is
 * to ask the Universal Resolver which resolver answers for the name — which is
 * what `Resolution.resolver` has been carrying all along.
 *
 * Every signature, role bit and resource below is taken from the implementation
 * actually deployed on Sepolia (`0xa9d3814a…`, whose runtime bytecode contains
 * `setText(bytes,string,string)`, `setAddress(bytes,uint256,bytes)` and
 * `grantSetterRoles(bytes,address)` and does *not* contain the `bytes32`-node
 * setters or `authorize*Roles`), i.e. the record-id refactor of
 * `PermissionedResolver` rather than the per-name version on the contracts'
 * default branch. Where the two disagree, the deployed one wins: it is the one
 * a transaction would reach.
 */

/** `PermissionedResolverLib` roles, as deployed. Nybble-spaced, so `bigint` is
 *  not optional: the admin shift below overflows a `number` outright. */
export const ROLE_SET_ADDRESS = 1n << 0n;
export const ROLE_SET_TEXT = 1n << 4n;
export const ROLE_SET_CONTENTHASH = 1n << 8n;
export const ROLE_SET_ABI = 1n << 12n;
export const ROLE_SET_INTERFACE = 1n << 16n;
export const ROLE_SET_NAME = 1n << 20n;
export const ROLE_SET_DATA = 1n << 24n;
export const ROLE_LINK = 1n << 28n;

/** Every role has exactly one admin counterpart, 128 bits up: holding it is
 *  what lets a parent hand the base role to someone else. Hierarchical
 *  delegation is this shift. */
export function adminOf(role: bigint): bigint {
  return role << 128n;
}

/** The registry-wide resource. A role held here applies to *every* key of that
 *  record type, which is why granting it is never what a parent wants — and why
 *  the contract refuses to derive it from a setter argument. */
export const ROOT_RESOURCE = 0n;

const coder = AbiCoder.defaultAbiCoder();

/**
 * The EAC resource for a string-keyed setter argument — a text or data key.
 *
 * `keccak256(bytes(key))`, with no name mixed in. The deployed resolver scopes
 * permissions by *argument*, not by name: the proxy is per-account, so the name
 * dimension is the proxy itself. Hashing a namehash in here would compute a
 * resource no setter ever checks, and every grant would silently miss.
 */
export function textResource(key: string): bigint {
  return BigInt(keccak256(toUtf8Bytes(key)));
}

/** The EAC resource for a uint256-keyed setter argument — a coin type for
 *  `setAddress`, a content type for `setABI`. `keccak256` of the 32-byte word,
 *  not of its decimal text. */
export function uintResource(value: bigint): bigint {
  return BigInt(keccak256(coder.encode(["uint256"], [value])));
}

/** The EAC resource for a `bytes4`-keyed setter argument — an interface id.
 *  Hashed over 4 bytes, not over a 32-byte word. */
export function interfaceResource(interfaceId: string): bigint {
  return BigInt(keccak256(interfaceId));
}

/**
 * A call with no `to`, because the resolver is discovered rather than known,
 * and no signature, because nothing here holds a key.
 */
export type UnsignedCall = {
  readonly signature: string;
  readonly data: string;
};

const resolverAbi = new Interface([
  "function setText(bytes name, string key, string value)",
  "function setAddress(bytes name, uint256 coinType, bytes addressBytes)",
  "function setData(bytes name, string key, bytes value)",
  "function grantSetterRoles(bytes setter, address account) returns (bool)",
  "function revokeRoles(uint256 resource, uint256 roleBitmap, address account) returns (bool)",
]);

function build(signature: string, name: string, args: unknown[]): UnsignedCall {
  return { signature, data: resolverAbi.encodeFunctionData(name, args) };
}

/** Publish a text record. The child's allowance is *not* what goes here — see
 *  ADR-0003 — but its parent, its status and its revocation are.
 *
 *  The name is **DNS-encoded**: the deployed setters take the name itself and
 *  hash it internally. A namehash passed here encodes fine and writes to a
 *  record nobody reads. */
export function setTextCall(name: string, key: string, value: string): UnsignedCall {
  return build("setText(bytes,string,string)", "setText", [encodeName(name), key, value]);
}

/** Publish an address record for one coin type. ENSIP-9/19 addresses are opaque
 *  bytes, not `address` — the deployed resolver has no `setAddr(bytes32,address)`. */
export function setAddressCall(
  name: string,
  coinType: bigint,
  addressBytes: string,
): UnsignedCall {
  return build("setAddress(bytes,uint256,bytes)", "setAddress", [
    encodeName(name),
    coinType,
    addressBytes,
  ]);
}

/** Publish a data record (ENSIP-24) — arbitrary bytes under a string key. */
export function setDataCall(name: string, key: string, value: string): UnsignedCall {
  return build("setData(bytes,string,bytes)", "setData", [encodeName(name), key, value]);
}

/**
 * Delegate exactly the authority one setter call would need.
 *
 * The argument is the setter's own calldata: the resolver decodes it, derives
 * the role and the resource from the keyed argument, and grants that pair. So a
 * parent delegates by *naming the call it is willing to let the child make*,
 * which is the closest onchain analogue of `core/`'s attenuation — you cannot
 * ask for a role you cannot express as a call.
 *
 * Grants are argument-scoped, never root-scoped: the contract asserts the
 * derived resource is non-zero. Plain `grantRoles` is disabled on this
 * implementation (it reverts `EACCannotGrantRoles`), so this is the only grant
 * path, and `revokeRolesCall` is its inverse.
 */
export function grantSetterRolesCall(setter: UnsignedCall, account: string): UnsignedCall {
  return build("grantSetterRoles(bytes,address)", "grantSetterRoles", [
    setter.data,
    getAddress(account),
  ]);
}

/** Take a role back. Revocation is resource-and-bitmap shaped rather than
 *  call-shaped, so `resourceOf` exists to keep the two sides in agreement. */
export function revokeRolesCall(
  resource: bigint,
  roleBitmap: bigint,
  account: string,
): UnsignedCall {
  return build("revokeRoles(uint256,uint256,address)", "revokeRoles", [
    resource,
    roleBitmap,
    getAddress(account),
  ]);
}

/** What a setter call will be checked against: the role it needs and the
 *  resource its keyed argument names. Mirrors the resolver's `decodeSetter`, so
 *  a grant and the later revoke of that same grant cannot drift apart. */
export type Requirement = { readonly resource: bigint; readonly roleBitmap: bigint };

export function requirementOf(setter: UnsignedCall): Requirement | undefined {
  const selector = setter.data.slice(0, 10);
  const tail = "0x" + setter.data.slice(10);
  switch (selector) {
    case resolverAbi.getFunction("setText")!.selector: {
      const [, key] = coder.decode(["bytes", "string", "string"], tail);
      return { resource: textResource(String(key)), roleBitmap: ROLE_SET_TEXT };
    }
    case resolverAbi.getFunction("setData")!.selector: {
      const [, key] = coder.decode(["bytes", "string", "bytes"], tail);
      return { resource: textResource(String(key)), roleBitmap: ROLE_SET_DATA };
    }
    case resolverAbi.getFunction("setAddress")!.selector: {
      const [, coinType] = coder.decode(["bytes", "uint256", "bytes"], tail);
      return { resource: uintResource(BigInt(String(coinType))), roleBitmap: ROLE_SET_ADDRESS };
    }
    default:
      // Authorization calls have no keyed argument of their own, and profiles
      // this module does not build are not ours to guess at.
      return undefined;
  }
}

/** `dnsEncode("")` is `0x`, and `dnsEncode` itself will not produce it — but the
 *  empty name is the root name the default record is managed through, so it has
 *  to be reachable. */
function encodeName(name: string): string {
  return name === "" ? "0x" : dnsEncode(name);
}

/**
 * What the deployed resolver says about a call nobody has signed.
 *
 * Three states for the same reason `Resolution` has three: a refusal from an
 * unauthorized sender is the *expected* answer to most of these questions, and
 * an expected answer must be rendered, not thrown. `unresolvable` is reserved
 * for not getting an answer at all.
 */
export type Preflight =
  | { kind: "accepted"; resolver: string; resource: bigint }
  | { kind: "refused"; resolver: string; reason: string; selector: string }
  | { kind: "unresolvable"; error: string };

/** A revert that carried no data still came from the chain. `"0x"` marks it, so
 *  a caller can tell "the resolver said no, wordlessly" — a legacy resolver
 *  with no such method, typically — from "we never got an answer". */
const NO_DATA = "0x";

const eacAbi = new Interface([
  "error EACUnauthorizedAccountRoles(uint256 resource, uint256 roleBitmap, address account)",
  "error EACCannotGrantRoles(uint256 resource, uint256 roleBitmap, address account)",
  "error EACCannotRevokeRoles(uint256 resource, uint256 roleBitmap, address account)",
  "error EACRootResourceNotAllowed()",
  "error EACMaxAssignees(uint256 resource, uint256 role)",
  "error EACMinAssignees(uint256 resource, uint256 role)",
  "error EACInvalidRoleBitmap(uint256 roleBitmap)",
  "error EACInvalidAccount()",
  "error UnsupportedResolverProfile(bytes4 selector)",
  "error Error(string message)",
  "error Panic(uint256 code)",
]);

/**
 * Simulate the call against whichever resolver actually answers for the name.
 *
 * This is the strongest thing that can be said without a funded account, and it
 * is worth more than it sounds: a *decoded* `EACUnauthorizedAccountRoles` is
 * proof that the call shape survived the resolver's ABI decoder and reached its
 * permission check. A malformed call never gets that far.
 *
 * It is not proof that a record was published. Nothing here may be reported as
 * one.
 */
export async function preflight(
  caller: Caller,
  name: string,
  call: UnsignedCall,
  from: string,
  resource: bigint = requirementOf(call)?.resource ?? ROOT_RESOURCE,
): Promise<Preflight> {
  const found = await resolveAddress(caller, name);
  if (found.kind === "unresolvable") {
    return { kind: "unresolvable", error: found.error };
  }

  try {
    await caller.call({ to: found.resolver, data: call.data, from: getAddress(from) });
  } catch (cause) {
    return refusalOf(cause, found.resolver);
  }

  return { kind: "accepted", resolver: found.resolver, resource };
}

function refusalOf(cause: unknown, resolver: string): Preflight {
  const data = revertData(cause);
  if (data === undefined) {
    // Ethers raises `CALL_EXCEPTION` only when the node executed the call and
    // it reverted. Empty revert data is then a fact about the contract, not a
    // transport failure, and calling it `unresolvable` would hide a real
    // refusal behind the same label as an RPC outage.
    return reverted(cause)
      ? { kind: "refused", resolver, selector: NO_DATA, reason: "reverted without data" }
      : { kind: "unresolvable", error: reasonOf(cause) };
  }

  const selector = data.slice(0, 10);
  return { kind: "refused", resolver, selector, reason: explain(data, selector) };
}

function explain(data: string, selector: string): string {
  let parsed: ReturnType<Interface["parseError"]> = null;
  try {
    parsed = eacAbi.parseError(data);
  } catch {
    parsed = null;
  }
  // An unrecognised revert is still a refusal — the resolver answered, we just
  // don't know its vocabulary. Reporting the selector keeps it diagnosable
  // without pretending to have understood it.
  if (parsed === null) return `unrecognised revert ${selector}`;

  switch (parsed.name) {
    case "EACUnauthorizedAccountRoles":
      return `${parsed.args[2]} lacks roles ${hex(parsed.args[1])} on resource ${hex(parsed.args[0])}`;
    case "EACCannotGrantRoles":
      return `caller may not grant roles ${hex(parsed.args[1])} on resource ${hex(parsed.args[0])}`;
    case "EACCannotRevokeRoles":
      return `caller may not revoke roles ${hex(parsed.args[1])} on resource ${hex(parsed.args[0])}`;
    case "UnsupportedResolverProfile":
      return `resolver does not implement ${String(parsed.args[0])}`;
    case "Error":
      return String(parsed.args[0]);
    default:
      return parsed.signature;
  }
}

function hex(value: unknown): string {
  return toBeHex(BigInt(String(value)));
}

function reverted(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    (cause as { code?: unknown }).code === "CALL_EXCEPTION"
  );
}

function revertData(cause: unknown): string | undefined {
  if (typeof cause !== "object" || cause === null) return undefined;

  const direct = (cause as { data?: unknown }).data;
  if (typeof direct === "string" && direct.length > 2) return direct;

  const info = (cause as { info?: { error?: { data?: unknown } } }).info;
  const nested = info?.error?.data;
  return typeof nested === "string" && nested.length > 2 ? nested : undefined;
}

function reasonOf(cause: unknown): string {
  if (typeof cause === "object" && cause !== null && "shortMessage" in cause) {
    const short = (cause as { shortMessage?: unknown }).shortMessage;
    if (typeof short === "string") return short;
  }
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Broadcast is deliberately absent.
 *
 * Signing and sending needs a funded Sepolia account, which this project does
 * not have. A stub that threw at runtime would still be a function other lanes
 * could call and a claim the ledger could accidentally inherit; leaving the
 * capability out means the gap is visible in the type system. When an account
 * exists, `broadcast` belongs here and E-3 moves in the same PR that proves it.
 */
