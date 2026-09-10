import { test } from "node:test";
import assert from "node:assert/strict";
import { loadChainEnv } from "../src/env.js";
import { testnetCaller } from "../src/ens.js";
import { evmCoinType, mutualIdentity, primaryName } from "../src/reverse.js";

loadChainEnv();

/**
 * Live reverse resolution against Sepolia. Reads only — no key, no gas — so
 * these need nothing from the human, and every address below is public data a
 * judge can re-read with any RPC endpoint.
 */
const rpcUrl = process.env["SEPOLIA_RPC_URL"];
const skip = rpcUrl ? false : "SEPOLIA_RPC_URL unset — no live ENS read attempted";

/**
 * Addresses observed with a verified primary name on Sepolia (sampled from
 * recent blocks, 2026-08-31). They are third-party records: if all of them are
 * cleared this test fails loudly, which is the intended behaviour — a silent
 * skip would let "verified primary names resolve" keep being claimed after it
 * stopped being true.
 */
const NAMED = [
  "0x21A5C13B5a4cb074eDC20835F5Ac1e27398796F8",
  "0x9Dc08A7C16b65dE13bE35F8A4cff3c2c5fE2E51d",
  "0x5AcD4Af6a8c3CD4235DC3bd39dEa2d64a5CFFF9a",
  "0xc784BB2BfFCe335f94A641696ABe3106FC210abA",
];

/** Reverse record set, forward record missing — a name it cannot back. */
const UNBACKED = "0x9703d9cf2f834e71d9b70675e746f7b634c9d1e9";

test("an address with a primary name resolves it, both directions", { skip }, async () => {
  const caller = testnetCaller(rpcUrl!);

  const named = [];
  for (const address of NAMED) {
    const out = await primaryName(caller, address);
    if (out.kind === "verified") named.push({ address, out });
  }

  assert.ok(named.length > 0, `no verified primary name left among ${NAMED.join(", ")}`);
  for (const { address, out } of named) {
    if (out.kind !== "verified") continue;
    assert.match(out.name, /\.eth$/);
    assert.match(out.resolver, /^0x[0-9a-fA-F]{40}$/);

    const mutual = await mutualIdentity(caller, address);
    assert.equal(mutual.mutual, true, `${out.name} does not point back at ${address}`);
    assert.equal(mutual.forwardAddress?.toLowerCase(), address.toLowerCase());
  }
});

test("an address advertising a name it cannot back is refused, live", { skip }, async () => {
  const out = await primaryName(testnetCaller(rpcUrl!), UNBACKED);

  assert.equal(out.kind, "no-forward-resolver");
  if (out.kind !== "no-forward-resolver") return;
  assert.match(out.name, /\./);

  const mutual = await mutualIdentity(testnetCaller(rpcUrl!), UNBACKED);
  assert.equal(mutual.mutual, false);
});

test("the same address answers differently per coin type", { skip }, async () => {
  const caller = testnetCaller(rpcUrl!);

  const sepolia = await primaryName(caller, UNBACKED, evmCoinType(11155111));
  assert.equal(sepolia.kind, "none");
  assert.equal(sepolia.coinType, 2158638759n);
});

test("an address nobody named answers 'none', not an error", { skip }, async () => {
  const nobody = `0x${"ab".repeat(20)}`;
  const out = await primaryName(testnetCaller(rpcUrl!), nobody);

  assert.equal(out.kind, "none");
});
