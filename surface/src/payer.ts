import { createTestnetClient, createTestnetSigner } from "capability-descent-chain/src/index.ts";
import { DELEGATION_HEADER, PAYMENT_SIGNATURE_HEADER } from "./handler.js";
import type { PaymentRequired } from "./types.js";

/**
 * The child agent, as a function: it does the whole 402 -> sign -> retry loop
 * over HTTP against the resource server, holding only its own key and a grant
 * id. It knows nothing about allowances — that is the server's answer to give,
 * and a refusal comes back as a status and a reason, not as an exception.
 */
export function createPayer(baseUrl: string, accountId: string, privateKey: string) {
  const signer = createTestnetSigner(accountId, privateKey);
  const client = createTestnetClient(signer);

  return async (grant: string, path: string): Promise<{ status: number; body: unknown }> => {
    const url = new URL(path, baseUrl).toString();
    const headers: Record<string, string> = { [DELEGATION_HEADER]: grant, "content-type": "text/plain" };
    const body = "delegated agents should not need a shared wallet";

    const quoted = await fetch(url, { method: "POST", headers, body });
    if (quoted.status !== 402) {
      return { status: quoted.status, body: await quoted.json().catch(() => null) };
    }

    const required = (await quoted.json()) as PaymentRequired;
    const payload = await client.createPaymentPayload(required);
    const paid = await fetch(url, {
      method: "POST",
      headers: { ...headers, [PAYMENT_SIGNATURE_HEADER]: Buffer.from(JSON.stringify(payload), "utf8").toString("base64") },
      body,
    });
    return { status: paid.status, body: await paid.json().catch(() => null) };
  };
}
