import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decryptSpedyCredential,
  encryptSpedyCredential,
  prepareSpedyFiscalMigration,
  reconcileSpedyFiscalDocuments,
} from "./spedy-fiscal.mjs";

describe("Spedy V1 fiscal migration", () => {
  it("uses provider status and flags legacy emissions missing at Spedy", () => {
    const rows = reconcileSpedyFiscalDocuments(
      [
        legacyDocument(1, "provider_1", "AUTHORIZED"),
        legacyDocument(2, "missing_at_provider", "AUTHORIZED"),
      ],
      [{ accessKey: "key", id: "provider_1", status: "cancelled" }],
      [{ id: "provider_only", status: "authorized" }],
      { legacyStoreId: 200 },
    );

    assert.equal(rows.length, 3);
    assert.deepEqual(pick(rows, "provider_1"), {
      documentKind: "nfe",
      reconciliationStatus: "matched",
      status: "cancelled",
    });
    assert.deepEqual(pick(rows, "missing_at_provider"), {
      documentKind: "nfe",
      reconciliationStatus: "not_found_at_spedy",
      status: "error",
    });
    assert.deepEqual(pick(rows, "provider_only"), {
      documentKind: "nfse",
      reconciliationStatus: "provider_only",
      status: "authorized",
    });
  });

  it("encrypts a company key without embedding plaintext", () => {
    const key = Buffer.alloc(32, 9).toString("base64");
    const encrypted = encryptSpedyCredential("company-secret", key);

    assert.match(encrypted, /^fiscal:v1\./);
    assert.equal(encrypted.includes("company-secret"), false);
    assert.equal(decryptSpedyCredential(encrypted, key), "company-secret");
  });

  it("rejects a Spedy credential encrypted with a different key", () => {
    const ciphertext = encryptSpedyCredential(
      "company-secret",
      Buffer.alloc(32, 9).toString("base64"),
    );

    assert.throws(
      () =>
        decryptSpedyCredential(
          ciphertext,
          Buffer.alloc(32, 8).toString("base64"),
        ),
      /cannot be decrypted/,
    );
  });

  it("preserves V1 fiscal data when Spedy DNS is unavailable", async () => {
    const originalFetch = globalThis.fetch;
    const originalEnvironment = {
      FISCAL_CREDENTIAL_ENCRYPTION_KEY:
        process.env.FISCAL_CREDENTIAL_ENCRYPTION_KEY,
      SPEDY_API_URL: process.env.SPEDY_API_URL,
      SPEDY_OWNER_API_KEY: process.env.SPEDY_OWNER_API_KEY,
      SPEDY_WEBHOOK_URL: process.env.SPEDY_WEBHOOK_URL,
    };
    process.env.FISCAL_CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString(
      "base64",
    );
    process.env.SPEDY_API_URL = "https://api.spedy.invalid/v1/";
    process.env.SPEDY_OWNER_API_KEY = "owner-key";
    process.env.SPEDY_WEBHOOK_URL = "https://example.test/webhooks/spedy";
    globalThis.fetch = async () => {
      const error = new TypeError("fetch failed");
      error.cause = Object.assign(new Error("DNS lookup failed"), {
        code: "ENOTFOUND",
      });
      throw error;
    };

    try {
      const prepared = await prepareSpedyFiscalMigration(
        {
          fiscalAddon: {
            active: true,
            config: {
              apiKey: "company-secret",
              companyId: "company_1",
              companyInfo: { legalName: "Legacy issuer" },
            },
          },
          fiscalDocuments: [legacyDocument(1, "provider_1", "AUTHORIZED")],
        },
        { apply: false, legacyStoreId: 200 },
      );

      assert.equal(prepared.providerSync.status, "unavailable");
      assert.equal(prepared.providerSync.errorCode, "spedy_dns_unavailable");
      assert.equal(prepared.webhookRegistered, false);
      assert.equal(prepared.issuerProfile.legalName, "Legacy issuer");
      assert.match(prepared.credentialCiphertext, /^fiscal:v1\./);
      assert.equal(
        prepared.credentialCiphertext.includes("company-secret"),
        false,
      );
      assert.equal(prepared.fiscalDocuments.length, 1);
      assert.equal(
        prepared.fiscalDocuments[0].metadata.reconciliationStatus,
        "provider_unavailable",
      );
      assert.equal(prepared.fiscalDocuments[0].status, "authorized");
    } finally {
      globalThis.fetch = originalFetch;
      for (const [name, value] of Object.entries(originalEnvironment)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  });
});

function pick(rows, providerDocumentId) {
  const row = rows.find(
    (candidate) => candidate.providerDocumentId === providerDocumentId,
  );
  return {
    documentKind: row?.documentKind,
    reconciliationStatus: row?.metadata.reconciliationStatus,
    status: row?.status,
  };
}

function legacyDocument(id, invoiceId, status) {
  return {
    accessKey: null,
    createdAt: new Date("2026-07-01T12:00:00.000Z"),
    docType: "NFE",
    id,
    invoiceId,
    issuedAt: new Date("2026-07-01T12:00:00.000Z"),
    status,
    updatedAt: new Date("2026-07-01T12:00:00.000Z"),
  };
}
