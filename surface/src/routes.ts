import type { Route } from "./types.js";

/** Native HBAR, as `chain/` names it (`asset: "0.0.0"`); prices are tinybars. */
export const HBAR = "0.0.0";

/**
 * Two paid routes at deliberately different prices.
 *
 * The price gap is the point: a boolean "may spend" flag can gate both of these
 * identically, which is exactly the design ADR-0003 rejected. An allowance has
 * to know that the second route costs two and a half times the first.
 */
export const routes: Route[] = [
  {
    path: "/translate",
    amount: "100000",
    asset: HBAR,
    serve: ({ body }) => ({ translated: body.toUpperCase() }),
  },
  {
    path: "/summarize",
    amount: "250000",
    asset: HBAR,
    serve: ({ body }) => ({ summary: body.split(/\s+/).slice(0, 8).join(" ") }),
  },
];
