import { Interface, dnsEncode, namehash, JsonRpcProvider } from "ethers";

/**
 * ENSv2 identity for the agents in the delegation tree.
 *
 * Resolution goes through the canonical Universal Resolver proxy, which lives at
 * the same address on mainnet and Sepolia. That address is deliberate and is the
 * one thing here that must not be "improved" into an implementation address:
 * the ENSv2 docs warn that implementations are superseded while the proxy stays
 * current, and the implementation this repo first recorded
 * (`0xd26f2040…f142`) already reverts `ResolverNotFound` for `.eth` names.
 */
export const UNIVERSAL_RESOLVER = "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe";

const resolverAbi = new Interface([
  "function resolve(bytes name, bytes data) view returns (bytes result, address resolver)",
]);

const recordAbi = new Interface([
  "function addr(bytes32 node) view returns (address)",
  "function text(bytes32 node, string key) view returns (string)",
]);

/** The minimum of a provider this module needs: one `eth_call`.
 *
 *  `from` is optional and unused by reads, but a simulated *write* is only
 *  meaningful when the resolver is told who is asking (`authority.ts`). */
export type Caller = {
  call(tx: { to: string; data: string; from?: string }): Promise<string>;
};

export function testnetCaller(rpcUrl: string): Caller {
  return new JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
}

/**
 * Three outcomes, not two.
 *
 * `unresolvable` (no resolver in the registry chain) and `unset` (a resolver
 * answered with the zero address / an empty string) are different facts about
 * the world, and the demo's refusal text depends on which one it is: an agent
 * whose name was never registered is a different failure from one whose record
 * was cleared, which is how a revocation looks from the outside.
 */
export type Resolution<T> =
  | { kind: "ok"; value: T; resolver: string }
  | { kind: "unset"; resolver: string }
  | { kind: "unresolvable"; error: string };

export async function resolveAddress(
  caller: Caller,
  name: string,
): Promise<Resolution<string>> {
  const call = recordAbi.encodeFunctionData("addr", [namehash(name)]);
  const answer = await through(caller, name, call);
  if (answer.kind !== "ok") return answer;

  const address = String(recordAbi.decodeFunctionResult("addr", answer.value)[0]);
  return address === ZERO
    ? { kind: "unset", resolver: answer.resolver }
    : { kind: "ok", value: address, resolver: answer.resolver };
}

export async function resolveText(
  caller: Caller,
  name: string,
  key: string,
): Promise<Resolution<string>> {
  const call = recordAbi.encodeFunctionData("text", [namehash(name), key]);
  const answer = await through(caller, name, call);
  if (answer.kind !== "ok") return answer;

  const text = String(recordAbi.decodeFunctionResult("text", answer.value)[0]);
  return text === ""
    ? { kind: "unset", resolver: answer.resolver }
    : { kind: "ok", value: text, resolver: answer.resolver };
}

const ZERO = "0x0000000000000000000000000000000000000000";

/**
 * One wrapped record call through the Universal Resolver.
 *
 * A revert here is an answer, not a crash: an unregistered name is the normal
 * case for a child agent that was never granted anything, and the caller needs
 * to render it rather than have the request fail.
 */
async function through(
  caller: Caller,
  name: string,
  data: string,
): Promise<Resolution<string>> {
  const outer = resolverAbi.encodeFunctionData("resolve", [dnsEncode(name), data]);

  let raw: string;
  try {
    raw = await caller.call({ to: UNIVERSAL_RESOLVER, data: outer });
  } catch (cause) {
    return { kind: "unresolvable", error: reasonOf(cause) };
  }

  const decoded = resolverAbi.decodeFunctionResult("resolve", raw);
  return { kind: "ok", value: String(decoded[0]), resolver: String(decoded[1]) };
}

function reasonOf(cause: unknown): string {
  if (typeof cause === "object" && cause !== null && "shortMessage" in cause) {
    const short = (cause as { shortMessage?: unknown }).shortMessage;
    if (typeof short === "string") return short;
  }
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Whether an ENS name still asserts the agent's address.
 *
 * This is the read half of revocation: once the parent clears or repoints the
 * child's record, the child's name no longer vouches for the key that signs its
 * payments, and anyone — not just this server — can observe that from Sepolia.
 * Publishing the revocation is the write half and needs a funded account; until
 * that exists, nothing in this lane may claim revocation is onchain.
 */
export async function vouchesFor(
  caller: Caller,
  name: string,
  address: string,
): Promise<boolean> {
  const resolved = await resolveAddress(caller, name);
  return resolved.kind === "ok" && eq(resolved.value, address);
}

function eq(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
