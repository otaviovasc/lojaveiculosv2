import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encryptSpedyCredential,
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
