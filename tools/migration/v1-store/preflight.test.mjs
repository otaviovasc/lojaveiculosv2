import assert from "node:assert/strict";
import test from "node:test";
import { validateMigrationData } from "./preflight.mjs";

test("preflight accepts receiving terms before any target writes", () => {
  assert.doesNotThrow(() =>
    validateMigrationData(
      fixture({ documents: [{ saleId: 1, type: "RECEIVING_TERM" }] }),
      {},
      new Set(["sales"]),
    ),
  );
});

test("preflight reports unknown document kinds immediately", () => {
  assert.throws(
    () =>
      validateMigrationData(
        fixture({ documents: [{ saleId: 1, type: "FUTURE_UNKNOWN_KIND" }] }),
        {},
        new Set(["sales"]),
      ),
    /Unmapped V1 document kind: FUTURE_UNKNOWN_KIND/,
  );
});

function fixture(overrides = {}) {
  return {
    accesses: [{ role: "AGENCY" }],
    documents: [],
    entries: [{ type: "PROFIT" }],
    fiscalDocuments: [{ docType: "NFE" }],
    recurringEntries: [{ type: "EXPENSE" }],
    salePayments: [{ method: "PIX" }],
    sales: [{ id: 1 }],
    ...overrides,
  };
}
