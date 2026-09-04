import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertFiscalCredentialRepairSafety,
  prepareFiscalCredentialRepair,
} from "./fiscal-credential-repair.mjs";
import {
  decryptSpedyCredential,
  encryptSpedyCredential,
} from "./spedy-fiscal-client.mjs";

const oldKey = Buffer.alloc(32, 7).toString("base64");
const targetKey = Buffer.alloc(32, 8).toString("base64");

describe("fiscal credential repair", () => {
  it("re-encrypts an affected credential under the target runtime key", () => {
    const current = encryptSpedyCredential("company-secret", oldKey);

    const repair = prepareFiscalCredentialRepair(current, oldKey, targetKey);

    assert.equal(repair.alreadyUsesTargetKey, false);
    assert.equal(
      decryptSpedyCredential(repair.credentialCiphertext, targetKey),
      "company-secret",
    );
    assert.throws(
      () => decryptSpedyCredential(repair.credentialCiphertext, oldKey),
      /cannot be decrypted/,
    );
  });

  it("is idempotent when the credential already uses the target key", () => {
    const current = encryptSpedyCredential("company-secret", targetKey);

    const repair = prepareFiscalCredentialRepair(current, oldKey, targetKey);

    assert.equal(repair.alreadyUsesTargetKey, true);
    assert.equal(repair.credentialCiphertext, current);
  });

  it("blocks unconfirmed writes and remote targets by default", () => {
    assert.throws(
      () =>
        assertFiscalCredentialRepairSafety({
          allowRemoteTarget: false,
          apply: false,
          confirmStoreId: "",
          storeId: "store_1",
          targetUrl: "postgresql://remote.example/lojaveiculosv2",
        }),
      /Remote target blocked/,
    );
    assert.throws(
      () =>
        assertFiscalCredentialRepairSafety({
          allowRemoteTarget: true,
          apply: true,
          confirmStoreId: "store_2",
          storeId: "store_1",
          targetUrl: "postgresql://remote.example/lojaveiculosv2",
        }),
      /confirm-store-id/,
    );
  });
});
