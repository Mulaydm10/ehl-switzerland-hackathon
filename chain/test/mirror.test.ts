import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accountFacts,
  confirmTransfer,
  creditedTo,
  disagreement,
  type Fetcher,
} from "../src/mirror.js";

/** A fetcher that answers from a table, so these tests touch no network. */
function canned(table: Record<string, { status: number; body?: unknown }>): Fetcher {
  return async (url) => {
    const path = url.slice(url.indexOf("/api/v1"));
    const answer = table[path] ?? { status: 404 };
    return { status: answer.status, json: async () => answer.body ?? {} };
  };
}

const TX = "0.0.7399329-1789077196-645721391";
const transferBody = {
  transactions: [
    {
      transaction_id: TX,
      result: "SUCCESS",
      consensus_timestamp: "1789077205.719777691",
      charged_tx_fee: 133013,
      transfers: [
        { account: "0.0.802", amount: 133013 },
        { account: "0.0.7399329", amount: -10133013 },
        { account: "0.0.9397021", amount: 10000000 },
      ],
    },
  ],
};

test("an account consensus has never heard of is undefined, not an error", async () => {
  const facts = await accountFacts("0.0.999999999", "https://mirror.test", canned({}));
  assert.equal(facts, undefined);
});

test("account facts carry the balance as tinybars, and deletion as a fact of its own", async () => {
  const fetcher = canned({
    "/api/v1/accounts/0.0.7162784?limit=1": {
      status: 200,
      body: {
        account: "0.0.7162784",
        deleted: false,
        balance: { balance: 29055359989622 },
        evm_address: "0xc7a05f74a48f936cc3ed5a908f815471523545ad",
        key: { _type: "ECDSA_SECP256K1" },
      },
    },
  });

  const facts = await accountFacts("0.0.7162784", "https://mirror.test", fetcher);
  assert.equal(facts?.deleted, false);
  assert.equal(facts?.balanceTinybar, 29055359989622n);
  assert.equal(facts?.keyType, "ECDSA_SECP256K1");
  assert.match(facts?.evmAddress ?? "", /^0x[0-9a-f]{40}$/);
});

test("a facilitator's `@`-form transaction id is looked up in the REST `-` form", async () => {
  const seen: string[] = [];
  const fetcher: Fetcher = async (url) => {
    seen.push(url);
    return { status: 200, json: async () => transferBody };
  };

  await confirmTransfer("0.0.7399329@1789077196.645721391", "https://mirror.test", fetcher);
  assert.equal(seen.length, 1);
  assert.ok(seen[0]?.endsWith(`/api/v1/transactions/${encodeURIComponent(TX)}`));
});

test("the payee's credit is read from the transfer list, not from the fee", async () => {
  const facts = await confirmTransfer(TX, "https://mirror.test", canned({
    [`/api/v1/transactions/${encodeURIComponent(TX)}`]: { status: 200, body: transferBody },
  }));

  assert.equal(facts?.result, "SUCCESS");
  assert.equal(creditedTo(facts!, "0.0.9397021"), 10_000_000n);
  assert.equal(creditedTo(facts!, "0.0.7399329"), -10_133_013n);
  assert.equal(creditedTo(facts!, "0.0.404"), 0n);
});

test("a receipt for the quoted amount agrees with consensus", async () => {
  const facts = await confirmTransfer(TX, "https://mirror.test", canned({
    [`/api/v1/transactions/${encodeURIComponent(TX)}`]: { status: 200, body: transferBody },
  }));

  assert.equal(disagreement(facts, "0.0.9397021", 10_000_000n), undefined);
});

/**
 * The four ways a receipt can be wrong. Each is a case where publishing the
 * HashScan link as evidence of "we paid X" would be a false claim, so each has
 * to be nameable rather than collapsed into a boolean.
 */
test("every way a receipt can disagree with consensus is named", async () => {
  const key = `/api/v1/transactions/${encodeURIComponent(TX)}`;
  const ok = await confirmTransfer(TX, "https://mirror.test", canned({
    [key]: { status: 200, body: transferBody },
  }));

  assert.deepEqual(disagreement(undefined, "0.0.9397021", 10n), { kind: "unknown-transaction" });

  assert.deepEqual(disagreement(ok, "0.0.9397021", 9_999_999n), {
    kind: "wrong-amount",
    credited: 10_000_000n,
    quoted: 9_999_999n,
  });

  assert.deepEqual(disagreement(ok, "0.0.404", 10_000_000n), {
    kind: "payee-not-credited",
    payTo: "0.0.404",
  });

  const failed = await confirmTransfer(TX, "https://mirror.test", canned({
    [key]: {
      status: 200,
      body: { transactions: [{ ...transferBody.transactions[0], result: "INSUFFICIENT_ACCOUNT_BALANCE" }] },
    },
  }));
  assert.deepEqual(disagreement(failed, "0.0.9397021", 10_000_000n), {
    kind: "not-successful",
    result: "INSUFFICIENT_ACCOUNT_BALANCE",
  });
});

test("a mirror node error is raised, never swallowed into a false negative", async () => {
  await assert.rejects(
    () => accountFacts("0.0.1", "https://mirror.test", canned({ "/api/v1/accounts/0.0.1?limit=1": { status: 500 } })),
    /mirror node 500/,
  );
});
