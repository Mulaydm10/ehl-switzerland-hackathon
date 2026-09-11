import {
  AbiCoder,
  Interface,
  dnsEncode,
  getAddress,
  keccak256,
  namehash,
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
 * parent grants a child one role, scoped to one record on one name, and revokes
 * it with the same call and `grant: false`. The *amount* still lives in `core/`
 * because a role is a boolean and not a balance (ADR-0003); what lives here is
 * the question of who may write at all.
 *
 * The resolver's address is never configured. In ENSv2 each account gets its
 * own `PermissionedResolver` proxy, so the only honest way to address a call is
 * to ask the Universal Resolver which resolver answers for the name — which is
 * what `Resolution.resolver` has been carrying all along.
 */

/** `PermissionedResolverLib` roles. Nybble-spaced, so `bigint` is not optional:
 *  `1 << 32` is already wrong as a JS number in the sign bit sense, and the
 *  admin shift below overflows a `number` outright. */
export const ROLE_SET_ADDR = 1n << 0n;
export const ROLE_SET_TEXT = 1n << 4n;
export const ROLE_SET_NAME = 1n << 24n;
export const ROLE_SET_ALIAS = 1n << 28n;
export const ROLE_CLEAR = 1n << 32n;
export const ROLE_SET_DATA = 1n << 36n;

/** Every role has exactly one admin counterpart, 128 bits up: holding it is
 *  what lets a parent hand the base role to someone else. Hierarchical
 *  delegation is this shift. */
export function adminOf(role: bigint): bigint {
  return role << 128n;
}

/** `resource(0, 0)`, the registry-wide resource. A role held here applies to
 *  every name, which is why granting it is never what a parent wants. */
export const ROOT_RESOURCE = 0n;

const coder = AbiCoder.defaultAbiCoder();

/** Record-type identifier for a string-keyed record (`partHash(string)`). */
export function partHashText(key: string): string {
  return keccak256(toUtf8Bytes(key));
}

/** Record-type identifier for a uint256-keyed record (`partHash(uint256)`) —
 *  coin types for `addr`, and data keys. Note this is `keccak256` of the
 *  32-byte word, not of its decimal text. */
export function partHashUint(value: bigint): string {
  return keccak256(coder.encode(["uint256"], [value]));
}

const ZERO_PART = "0x" + "00".repeat(32);

/**
 * `keccak256(node, part)` — the EAC resource a write is checked against.
 *
 * The all-zero case is special-cased to `0` by the contract, so computing it
 * here would silently produce a resource that is *not* `ROOT_RESOURCE` and a
 * permission check that can never match.
 */
export function eacResource(node: string, part: string): bigint {
  if (BigInt(node) === 0n && BigInt(part) === 0n) return ROOT_RESOURCE;
  return BigInt(keccak256(coder.encode(["bytes32", "bytes32"], [node, part])));
}

/** The name-wide resource: a grant here covers every record of that type. */
export function nameResource(name: string): bigint {
  return eacResource(namehash(name), ZERO_PART);
}

/** The resource for one text key on one name — the narrowest grant available. */
export function textResource(name: string, key: string): bigint {
  return eacResource(namehash(name), partHashText(key));
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
  "function setText(bytes32 node, string key, string value)",
  "function setAddr(bytes32 node, address addr)",
  "function clearRecords(bytes32 node)",
  "function authorizeNameRoles(bytes toName, uint256 roleBitmap, address account, bool grant) returns (bool)",
  "function authorizeTextRoles(bytes toName, string key, address account, bool grant) returns (bool)",
  "function authorizeAddrRoles(bytes toName, uint256 coinType, address account, bool grant) returns (bool)",
]);

function build(signature: string, name: string, args: unknown[]): UnsignedCall {
  return { signature, data: resolverAbi.encodeFunctionData(name, args) };
}

/** Publish a text record. The child's allowance is *not* what goes here — see
 *  ADR-0003 — but its parent, its status and its revocation are. */
export function setTextCall(name: string, key: string, value: string): UnsignedCall {
  return build("setText(bytes32,string,string)", "setText", [namehash(name), key, value]);
}

/** Clear every record on a name at once, by bumping its version. The blunt form
 *  of revocation: it needs `ROLE_CLEAR` on the name, not on a record. */
export function clearRecordsCall(name: string): UnsignedCall {
  return build("clearRecords(bytes32)", "clearRecords", [namehash(name)]);
}

/**
 * Grant or revoke roles across a whole name.
 *
 * `grant` is the entire difference between delegation and revocation, which is
 * the same shape `core/` has: authority is one fact, and taking it back is not
 * a different mechanism.
 *
 * The name argument is **DNS-encoded**, not a namehash — the contract hashes it
 * itself. Passing a namehash here compiles, encodes, and authorizes a resource
 * nobody owns.
 */
export function authorizeNameCall(
  name: string,
  roleBitmap: bigint,
  account: string,
  grant: boolean,
): UnsignedCall {
  return build(
    "authorizeNameRoles(bytes,uint256,address,bool)",
    "authorizeNameRoles",
    [encodeName(name), roleBitmap, getAddress(account), grant],
  );
}

/** Grant or revoke `ROLE_SET_TEXT` for exactly one key on one name. */
export function authorizeTextCall(
  name: string,
  key: string,
  account: string,
  grant: boolean,
): UnsignedCall {
  return build(
    "authorizeTextRoles(bytes,string,address,bool)",
    "authorizeTextRoles",
    [encodeName(name), key, getAddress(account), grant],
  );
}

/** Grant or revoke `ROLE_SET_ADDR` for one coin type on one name. */
export function authorizeAddrCall(
  name: string,
  coinType: bigint,
  account: string,
  grant: boolean,
): UnsignedCall {
  return build(
    "authorizeAddrRoles(bytes,uint256,address,bool)",
    "authorizeAddrRoles",
    [encodeName(name), coinType, getAddress(account), grant],
  );
}

/** `dnsEncode("")` is `0x`, and `dnsEncode` itself will not produce it — but the
 *  empty name means "any name" to `authorize*`, so it has to be reachable. */
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
  resource: bigint = nameResource(name),
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
    case "Error":
      return String(parsed.args[0]);
    default:
      return parsed.signature;
  }
}

function hex(value: unknown): string {
  return `0x${BigInt(String(value)).toString(16)}`;
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
