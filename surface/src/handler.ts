import { authorize, consume } from "@ehl/core";
import type { PaymentRequired, Requirements, Route, ServerDeps } from "./types.js";

export const PAYMENT_SIGNATURE_HEADER = "payment-signature";
export const PAYMENT_RESPONSE_HEADER = "PAYMENT-RESPONSE";
export const DELEGATION_HEADER = "x-delegation";
export const X402_VERSION = 2;

export type Reply = {
  status: number;
  headers: Record<string, string>;
  body: unknown;
};

export function requirementsFor(route: Route, deps: ServerDeps): Requirements {
  return {
    scheme: "exact",
    network: deps.network,
    amount: route.amount,
    asset: route.asset,
    payTo: deps.payTo,
    maxTimeoutSeconds: 60,
  };
}

export function paymentRequired(route: Route, deps: ServerDeps, url: string): PaymentRequired {
  return {
    x402Version: X402_VERSION,
    accepts: [requirementsFor(route, deps)],
    resource: { url },
  };
}

function decodePaymentSignature(header: string): unknown {
  return JSON.parse(Buffer.from(header, "base64").toString("utf8"));
}

/**
 * One request, as a pure-ish function of the deps: everything that touches the
 * network or the clock is injected, so every branch below — including the
 * refusals, which are the demo's evidence — is reachable from a unit test.
 *
 * The order is load-bearing. Authorization is asked *before* settlement, so a
 * refused request cannot move money: scenario 2 and 3 of the demo claim
 * "nothing settled", and that claim is only true because `deps.settle` is
 * unreachable from those paths.
 */
export async function handle(
  input: { method: string; path: string; url: string; headers: Record<string, string>; body: string },
  deps: ServerDeps,
): Promise<Reply> {
  const route = deps.routes.find((r) => r.path === input.path);
  if (!route) return { status: 404, headers: {}, body: { error: "no such route" } };

  const signature = input.headers[PAYMENT_SIGNATURE_HEADER];
  if (!signature) {
    return {
      status: 402,
      headers: { "content-type": "application/json" },
      body: paymentRequired(route, deps, input.url),
    };
  }

  const grantId = input.headers[DELEGATION_HEADER];
  if (!grantId) {
    return {
      status: 400,
      headers: {},
      body: { error: `paid request carried no ${DELEGATION_HEADER} header; nothing to authorize against` },
    };
  }

  let payload: unknown;
  try {
    payload = decodePaymentSignature(signature);
  } catch {
    return { status: 400, headers: {}, body: { error: `malformed ${PAYMENT_SIGNATURE_HEADER} header` } };
  }

  const requirements = requirementsFor(route, deps);
  const amount = BigInt(requirements.amount);
  const decision = authorize(deps.store.read(), grantId, requirements.asset, amount, deps.now());
  if (!decision.allowed) {
    // The reason is rendered verbatim: it is the row in the results table, not UX copy.
    return {
      status: 403,
      headers: { "content-type": "application/json" },
      body: { reason: decision.reason, settled: false, grant: grantId },
    };
  }

  const settlement = await deps.settle(payload, requirements);

  const spent = consume(deps.store.read(), grantId, requirements.asset, amount, deps.now());
  if (!spent.ok) {
    // Authorized, settled, then refused: the ledger and the chain disagree, so
    // say so rather than serving as though the allowance had been debited.
    return {
      status: 500,
      headers: {},
      body: { error: "settled but could not debit the allowance", reason: spent.reason, settlement },
    };
  }
  deps.store.write(spent.value);

  return {
    status: 200,
    headers: {
      "content-type": "application/json",
      [PAYMENT_RESPONSE_HEADER]: Buffer.from(JSON.stringify(settlement), "utf8").toString("base64"),
    },
    body: { result: route.serve({ body: input.body }), settlement },
  };
}
