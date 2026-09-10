import { Interface, getAddress } from "ethers";
import { UNIVERSAL_RESOLVER, resolveAddress, type Caller } from "./ens.js";

/**
 * The reverse direction of ENS identity.
 *
 * Forward resolution (`ens.ts`) is the weak half: anyone may point their own
 * name at our agent's address, so "some name resolves to this key" says nothing
 * about who the key is. The address's own reverse record is the half that can
 * only be set by whoever controls the address — and ENSIP-19 only calls a
 * primary name valid once the forward record agrees, which is why the Universal
 * Resolver does that second hop itself and reverts when the two disagree.
 *
 * Reads only. No key, no gas, no funded account: this is `eth_call` against
 * already-deployed contracts, so every outcome below is re-checkable by a
 * stranger with a public RPC endpoint.
 */

/** ENSIP-11 default EVM coin type — the `addr.reverse` namespace. */
export const ETH_COIN_TYPE = 60n;

/** ENSIP-11 chain-specific coin type: `0x80000000 | chainId`. */
export function evmCoinType(chainId: number | bigint): bigint {
  return 0x80000000n | BigInt(chainId);
}

/**
 * Why a reverse lookup did not yield a verified name.
 *
 * These are separate facts, not shades of failure. `no-forward-resolver` and
 * `address-mismatch` in particular are the interesting ones: both mean an
 * address is advertising a name it cannot back, which is exactly what a
 * spoofed agent identity looks like from the outside.
 */
export type ReverseOutcome =
  | { kind: "verified"; name: string; coinType: bigint; resolver: string; reverseResolver: string }
  | { kind: "none"; coinType: bigint; reverseResolver: string }
  | { kind: "no-reverse-resolver"; coinType: bigint }
  | { kind: "no-forward-resolver"; name: string; coinType: bigint }
  | { kind: "address-mismatch"; name: string; coinType: bigint }
  | { kind: "unresolvable"; coinType: bigint; error: string };

const reverseAbi = new Interface([
  "function reverse(bytes lookupAddress, uint256 coinType) view returns (string name, address resolver, address reverseResolver)",
]);

/**
 * The Universal Resolver's custom errors, decoded by selector.
 *
 * Matching on selectors rather than message text matters here because the same
 * human-readable string ("execution reverted") covers a name that was never
 * registered, a name whose resolver is not a contract, and a gateway outage —
 * and the first is routine while the last must not be reported as a refusal.
 */
const errorAbi = new Interface([
  "error ResolverNotFound(bytes name)",
  "error ResolverNotContract(bytes name, address resolver)",
  "error UnsupportedResolverProfile(bytes4 selector)",
  "error ReverseAddressMismatch(string primary, bytes primaryAddress)",
  "error HttpError(uint16 status, string message)",
]);

/**
 * What this address says its name is, and whether the name agrees.
 *
 * `coinType` is part of every answer because "no primary name" is only true of
 * a namespace: an agent may have none for the default EVM namespace (60) and
 * one for a specific chain, and collapsing the two would let us claim an
 * identity is absent when we simply asked the wrong question.
 */
export async function primaryName(
  caller: Caller,
  address: string,
  coinType: bigint = ETH_COIN_TYPE,
): Promise<ReverseOutcome> {
  const lookup = getAddress(address).toLowerCase();
  const data = reverseAbi.encodeFunctionData("reverse", [lookup, coinType]);

  let raw: string;
  try {
    raw = await caller.call({ to: UNIVERSAL_RESOLVER, data });
  } catch (cause) {
    return classify(cause, coinType);
  }

  const decoded = reverseAbi.decodeFunctionResult("reverse", raw);
  const name = String(decoded[0]);
  const resolver = String(decoded[1]);
  const reverseResolver = String(decoded[2]);

  // An empty name with a live reverse resolver is the ordinary "never set it"
  // case; the resolver address is kept because it proves the question reached
  // the registry rather than failing somewhere before it.
  if (name === "") return { kind: "none", coinType, reverseResolver };

  return { kind: "verified", name, coinType, resolver, reverseResolver };
}

function classify(cause: unknown, coinType: bigint): ReverseOutcome {
  const data = revertData(cause);
  if (data === undefined) {
    return { kind: "unresolvable", coinType, error: reasonOf(cause) };
  }

  let parsed: ReturnType<Interface["parseError"]>;
  try {
    parsed = errorAbi.parseError(data);
  } catch {
    return { kind: "unresolvable", coinType, error: `unknown revert ${data.slice(0, 10)}` };
  }
  if (parsed === null) {
    return { kind: "unresolvable", coinType, error: `unknown revert ${data.slice(0, 10)}` };
  }

  switch (parsed.name) {
    case "ReverseAddressMismatch":
      return { kind: "address-mismatch", name: String(parsed.args[0]), coinType };
    case "ResolverNotFound": {
      const name = decodeDnsName(String(parsed.args[0]));
      // The reverse hop and the forward hop raise the same error. Which one
      // failed is legible from the name it carries: `…addr.reverse` means the
      // address has no reverse resolver at all, anything else means the name
      // the address claims cannot be resolved back.
      return isReverseNamespace(name)
        ? { kind: "no-reverse-resolver", coinType }
        : { kind: "no-forward-resolver", name, coinType };
    }
    case "ResolverNotContract":
      return {
        kind: "no-forward-resolver",
        name: decodeDnsName(String(parsed.args[0])),
        coinType,
      };
    default:
      return { kind: "unresolvable", coinType, error: parsed.signature };
  }
}

function isReverseNamespace(name: string): boolean {
  return name.endsWith(".reverse");
}

/** Both directions agree — the strongest binding available without a key. */
export async function mutualIdentity(
  caller: Caller,
  address: string,
  coinType: bigint = ETH_COIN_TYPE,
): Promise<{ mutual: boolean; reverse: ReverseOutcome; forwardAddress?: string }> {
  const reverse = await primaryName(caller, address, coinType);
  if (reverse.kind !== "verified") return { mutual: false, reverse };

  const forward = await resolveAddress(caller, reverse.name);
  if (forward.kind !== "ok") return { mutual: false, reverse };

  return {
    mutual: forward.value.toLowerCase() === getAddress(address).toLowerCase(),
    reverse,
    forwardAddress: forward.value,
  };
}

/** Undo `dnsEncode`: length-prefixed labels, terminated by a zero byte. */
function decodeDnsName(encoded: string): string {
  const bytes = encoded.startsWith("0x") ? encoded.slice(2) : encoded;
  const labels: string[] = [];
  let at = 0;

  while (at + 2 <= bytes.length) {
    const length = parseInt(bytes.slice(at, at + 2), 16);
    if (length === 0) break;
    const start = at + 2;
    const end = start + length * 2;
    if (end > bytes.length) break;
    labels.push(Buffer.from(bytes.slice(start, end), "hex").toString("utf8"));
    at = end;
  }

  return labels.join(".");
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
