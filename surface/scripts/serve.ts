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

/** The demo family: one parent, two children with equal allowances. */
function demoState(): State {
  const forever = Number.MAX_SAFE_INTEGER;
  const steps = [
    (s: State) => root(s, { id: "parent", child: "parent", limit: 1_000_000n, asset: HBAR, notBefore: 0, notAfter: forever }),
    (s: State) => grant(s, "parent", { id: "child-a", child: "agent-a", limit: 300_000n, asset: HBAR, notBefore: 0, notAfter: forever }),
    (s: State) => grant(s, "parent", { id: "child-b", child: "agent-b", limit: 300_000n, asset: HBAR, notBefore: 0, notAfter: forever }),
  ];
  let state = emptyState;
  for (const step of steps) {
    const next = step(state);
    if (!next.ok) throw new Error(`demo state refused: ${next.reason}`);
    state = next.value;
  }
  return state;
}

const port = Number(process.env.SURFACE_PORT ?? 8402);
const baseUrl = `http://localhost:${port}`;
const accountId = process.env.HEDERA_ACCOUNT_ID;
const privateKey = process.env.HEDERA_PRIVATE_KEY;

const demo: DemoDeps = {
  reset: demoState,
  // No key: the demo refuses to pay rather than staging a receipt it cannot link.
  ...(accountId && privateKey ? { pay: createPayer(baseUrl, accountId, privateKey) } : {}),
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
