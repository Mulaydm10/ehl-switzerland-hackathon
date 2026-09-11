import { test } from "node:test";
import assert from "node:assert/strict";
import { PrivateKey } from "@x402/hedera";
import { privateKeyCandidates, signerForAccount } from "../src/pay.js";
import { PaymentError } from "../src/types.js";
import type { Fetcher } from "../src/mirror.js";

/**
 * Why this file exists: `PrivateKey.fromStringDer` accepts a bare 32-byte hex
 * string and returns an **ED25519** key for it. An ECDSA account's key parsed
 * that way signs perfectly well and settles as `INVALID_SIGNATURE` — a failure
 * that costs a network round trip, a facilitator-paid fee, and looks like a
 * facilitator problem. The bytes alone cannot say which reading is right, so
 * the account's published key decides.
 */

/** An accounts endpoint that answers from a table; no network. */
function accounts(table: Record<string, unknown>): Fetcher {
  return async (url) => {
    const id = decodeURIComponent(url.slice(url.indexOf("/accounts/") + "/accounts/".length).split("?")[0]!);
    const body = table[id];
    return body === undefined
      ? { status: 404, json: async () => ({}) }
      : { status: 200, json: async () => body };
  };
}

function published(key: PrivateKey, type: string): unknown {
  return { account: "0.0.1", deleted: false, balance: { balance: 1 }, key: { _type: type, key: key.publicKey.toStringRaw() } };
}

const ecdsa = PrivateKey.generateECDSA();
const raw = ecdsa.toStringRaw();

test("a bare hex key is read both ways, because the bytes do not say which", () => {
  const candidates = privateKeyCandidates(raw);
  assert.deepEqual(
    candidates.map((c) => c.encoding),
    ["ECDSA", "ED25519"],
  );
  // The whole hazard in one assertion: same bytes, two different public keys.
  assert.notEqual(candidates[0]!.key.publicKey.toStringRaw(), candidates[1]!.key.publicKey.toStringRaw());
  assert.equal(candidates[0]!.key.publicKey.toStringRaw(), ecdsa.publicKey.toStringRaw());
});

test("a 0x prefix is not a different key", () => {
  assert.equal(
    privateKeyCandidates(`0x${raw}`)[0]!.key.publicKey.toStringRaw(),
    privateKeyCandidates(raw)[0]!.key.publicKey.toStringRaw(),
  );
});

test("DER is only attempted when the bytes actually carry a DER prefix", () => {
  const candidates = privateKeyCandidates(ecdsa.toStringDer());
  assert.deepEqual(
    candidates.map((c) => c.encoding),
    ["DER"],
  );
  assert.equal(candidates[0]!.key.publicKey.toStringRaw(), ecdsa.publicKey.toStringRaw());
});

test("picks the reading whose public key the account actually publishes", async () => {
  const signer = await signerForAccount(
    "0.0.1",
    raw,
    "https://mirror.test",
    accounts({ "0.0.1": published(ecdsa, "ECDSA_SECP256K1") }),
  );
  assert.equal(signer.accountId, "0.0.1");
});

test("an ED25519 account is signed for with the ED25519 reading of the same bytes", async () => {
  const ed = PrivateKey.generateED25519();
  const signer = await signerForAccount(
    "0.0.1",
    ed.toStringRaw(),
    "https://mirror.test",
    accounts({ "0.0.1": published(ed, "ED25519") }),
  );
  assert.equal(signer.accountId, "0.0.1");
});

test("a key that controls nothing fails before anything is signed", async () => {
  await assert.rejects(
    signerForAccount("0.0.1", PrivateKey.generateECDSA().toStringRaw(), "https://mirror.test", accounts({ "0.0.1": published(ecdsa, "ECDSA_SECP256K1") })),
    (e: unknown) => e instanceof PaymentError && e.reason === "payer_key_mismatch",
  );
});

test("an account consensus has never heard of is named as such, not as a bad key", async () => {
  await assert.rejects(
    signerForAccount("0.0.404", raw, "https://mirror.test", accounts({})),
    (e: unknown) => e instanceof PaymentError && e.reason === "unknown_payer_account",
  );
});

test("an account that publishes no key cannot be matched, and says so", async () => {
  await assert.rejects(
    signerForAccount("0.0.1", raw, "https://mirror.test", accounts({ "0.0.1": { account: "0.0.1", deleted: false, balance: { balance: 1 }, key: null } })),
    (e: unknown) => e instanceof PaymentError && e.reason === "payer_key_unknown",
  );
});

test("unparseable bytes are refused as a bad key", async () => {
  await assert.rejects(
    signerForAccount("0.0.1", "not-a-key", "https://mirror.test", accounts({ "0.0.1": published(ecdsa, "ECDSA_SECP256K1") })),
    (e: unknown) => e instanceof PaymentError && e.reason === "bad_private_key",
  );
});
