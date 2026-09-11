import { emptyState, grant, root, type State } from "@ehl/core";
import { createServer, memoryStore } from "../src/server.js";
import { facilitatorSettler } from "../src/facilitator.js";
import { createPayer } from "../src/payer.js";
import { fetchSupported, feePayerFor } from "capability-descent-chain/src/index.ts";
import { HBAR, routes } from "../src/routes.js";
import type { DemoDeps } from "../src/demo.js";

// Optional: the shell environment is equally valid, so an absent file is not an error.
try {
  process.loadEnvFile?.(new URL("../.env", import.meta.url).pathname);
} catch {
  /* no .env */
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set; see surface/.env.example`);
  return value;
}

/** CAIP-2 or nothing: a bare chain name would be quoted into 402s the payer can't match. */
function network(): `${string}:${string}` {
  const value = process.env.SURFACE_NETWORK ?? "hedera:testnet";
  if (!/^[^:]+:[^:]+$/.test(value)) throw new Error(`SURFACE_NETWORK must be CAIP-2, got ${value}`);
  return value as `${string}:${string}`;
}

/**
 * The demo family: one parent, two equal children, and a third child capped
 * below the dearer route's price.
 *
 * `child-c`'s cap is what makes "over budget" structural rather than a matter of
 * having spent first: 150 000 tinybar of authority cannot buy the 250 000
 * route, ever, so the refusal is reproducible on a fresh tree by someone
 * holding no key at all.
 */
function demoState(): State {
  const forever = Number.MAX_SAFE_INTEGER;
  const steps = [
    (s: State) => root(s, { id: "parent", child: "parent", limit: 1_000_000n, asset: HBAR, notBefore: 0, notAfter: forever }),
    (s: State) => grant(s, "parent", { id: "child-a", child: "agent-a", limit: 300_000n, asset: HBAR, notBefore: 0, notAfter: forever }),
    (s: State) => grant(s, "parent", { id: "child-b", child: "agent-b", limit: 300_000n, asset: HBAR, notBefore: 0, notAfter: forever }),
    (s: State) => grant(s, "parent", { id: "child-c", child: "agent-c", limit: 150_000n, asset: HBAR, notBefore: 0, notAfter: forever }),
  ];
  let state = emptyState;
  for (const step of steps) {
    const next = step(state);
    if (!next.ok) throw new Error(`demo state refused: ${next.reason}`);
    state = next.value;
  }
  return state;
}

/** The dearest price on offer, in tinybars — the payer's self-imposed ceiling. */
function dearestRoute(): string {
  return routes.reduce((most, route) => (BigInt(route.amount) > BigInt(most) ? route.amount : most), "0");
}

const port = Number(process.env.SURFACE_PORT ?? 8402);
const baseUrl = `http://localhost:${port}`;
const accountId = process.env.HEDERA_ACCOUNT_ID;
const privateKey = process.env.HEDERA_PRIVATE_KEY;

const demo: DemoDeps = {
  reset: demoState,
  // No key: the demo refuses to pay rather than staging a receipt it cannot link.
  // The payer's own ceiling: the dearest route it is ever asked to pay. A quote
  // above it is refused client-side, before the allowance is even consulted.
  ...(accountId && privateKey
    ? { pay: await createPayer(baseUrl, accountId, privateKey, dearestRoute()) }
    : {}),
};

const facilitatorUrl = required("BLOCKY402_FACILITATOR_URL").replace(/\/$/, "");
const feePayer = feePayerFor(await fetchSupported(facilitatorUrl));

const server = createServer(
  {
    routes,
    payTo: required("SURFACE_PAYEE_ACCOUNT_ID"),
    network: network(),
    store: memoryStore(demoState()),
    settle: facilitatorSettler(facilitatorUrl),
    ...(feePayer === undefined ? {} : { feePayer }),
    now: () => Date.now(),
  },
  demo,
  baseUrl,
);

server.listen(port, () => {
  console.log(`surface listening on ${baseUrl}`);
  console.log(demo.pay ? `paying as ${accountId}` : "no Hedera key: /demo/pay will refuse");
  console.log(feePayer ? `facilitator fee payer ${feePayer}` : "facilitator advertises no fee payer");
  for (const route of routes) console.log(`  ${route.path} — ${route.amount} tinybar`);
});
