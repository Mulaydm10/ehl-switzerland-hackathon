import { emptyState, grant, root, type State } from "@ehl/core";
import { createServer, memoryStore } from "../src/server.js";
import { facilitatorSettler } from "../src/facilitator.js";
import { HBAR, routes } from "../src/routes.js";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set; see surface/.env.example`);
  return value;
}

/** The demo family: one parent, two children with equal allowances. */
function demoState(): State {
  const forever = Number.MAX_SAFE_INTEGER;
  const steps = [
    (s: State) => root(s, { id: "parent", child: "parent", limit: 1_000_000n, asset: HBAR, notBefore: 0, notAfter: forever }),
    (s: State) => grant(s, "parent", { id: "child-a", child: "a", limit: 300_000n, asset: HBAR, notBefore: 0, notAfter: forever }),
    (s: State) => grant(s, "parent", { id: "child-b", child: "b", limit: 300_000n, asset: HBAR, notBefore: 0, notAfter: forever }),
  ];
  let state = emptyState;
  for (const step of steps) {
    const next = step(state);
    if (!next.ok) throw new Error(`demo state refused: ${next.reason}`);
    state = next.value;
  }
  return state;
}

process.loadEnvFile?.(new URL("../.env", import.meta.url).pathname);

const port = Number(process.env.SURFACE_PORT ?? 8402);
const server = createServer({
  routes,
  payTo: required("SURFACE_PAYEE_ACCOUNT_ID"),
  network: process.env.SURFACE_NETWORK ?? "hedera:testnet",
  store: memoryStore(demoState()),
  settle: facilitatorSettler(required("BLOCKY402_FACILITATOR_URL")),
  now: () => Date.now(),
});

server.listen(port, () => {
  console.log(`surface listening on http://localhost:${port}`);
  for (const route of routes) console.log(`  ${route.path} — ${route.amount} tinybar`);
});
