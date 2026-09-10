import { describe, expect, it } from "vitest";
import { findResumableLeadSaleId } from "./crmLeadLinkedRecords";
import type { SaleRecord } from "../sales/types";

function saleRecord(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    buyerSnapshot: {},
    closedAt: null,
    correctionOfSaleId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    documentPolicySnapshot: { requiredDocumentKinds: [] },
    id: "sale_1",
    isCurrentRevision: true,
    leadId: "lead_1",
    listingId: null,
    listingSnapshot: {},
    overrideReason: null,
    overrideRequiredFields: false,
    payments: [],
    revision: 1,
    salePriceCents: null,
    saleSourceSnapshot: {},
    selectedDocumentKinds: [],
    sellerUserId: null,
    status: "draft",
    unitId: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("findResumableLeadSaleId", () => {
  it("returns the most recently updated draft or pending sale", () => {
    const sales = [
      saleRecord({ id: "sale_old", updatedAt: "2026-01-01T00:00:00.000Z" }),
      saleRecord({
        id: "sale_recent",
        status: "pending",
        updatedAt: "2026-02-01T00:00:00.000Z",
      }),
    ];

    expect(findResumableLeadSaleId(sales)).toBe("sale_recent");
  });

  it("ignores cancelled, closed, and superseded revisions", () => {
    const sales = [
      saleRecord({ id: "sale_cancelled", status: "cancelled" }),
      saleRecord({ id: "sale_closed", status: "closed" }),
      saleRecord({ id: "sale_old_revision", isCurrentRevision: false }),
    ];

    expect(findResumableLeadSaleId(sales)).toBeNull();
    expect(findResumableLeadSaleId([])).toBeNull();
  });
});
