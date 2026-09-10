import { describe, expect, it } from "vitest";
import { AppApiError } from "../../lib/apiErrors";
import { saleSaveErrorMessage } from "./saleWorkspacePersistence";
import {
  findUnitIdsWithCurrentSale,
  isSaleUnitConflict,
  saleUnitConflictMessage,
} from "./salesModuleSupport";
import type { SaleRecord } from "./types";

function saleRecord(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    buyerSnapshot: {},
    closedAt: null,
    correctionOfSaleId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    documentPolicySnapshot: { requiredDocumentKinds: [] },
    id: "sale_1",
    isCurrentRevision: true,
    leadId: null,
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

describe("findUnitIdsWithCurrentSale", () => {
  it("collects units held by current non-cancelled sales", () => {
    const sales = [
      saleRecord({ id: "sale_draft", status: "draft", unitId: "unit_a" }),
      saleRecord({ id: "sale_pending", status: "pending", unitId: "unit_b" }),
      saleRecord({ id: "sale_closed", status: "closed", unitId: "unit_c" }),
      saleRecord({
        id: "sale_cancelled",
        status: "cancelled",
        unitId: "unit_d",
      }),
      saleRecord({
        id: "sale_old_revision",
        isCurrentRevision: false,
        unitId: "unit_e",
      }),
      saleRecord({ id: "sale_no_unit" }),
    ];

    expect(findUnitIdsWithCurrentSale(sales)).toEqual(
      new Set(["unit_a", "unit_b", "unit_c"]),
    );
  });

  it("excludes the sale currently being edited", () => {
    const sales = [
      saleRecord({ id: "sale_active", unitId: "unit_a" }),
      saleRecord({ id: "sale_other", unitId: "unit_b" }),
    ];

    expect(findUnitIdsWithCurrentSale(sales, "sale_active")).toEqual(
      new Set(["unit_b"]),
    );
  });
});

describe("saleSaveErrorMessage", () => {
  it("explains unit conflicts with an actionable message", () => {
    const conflict = new AppApiError({
      code: "SALE_UNIT_CONFLICT",
      message: "Vehicle unit already has a current sale.",
      status: 409,
    });

    expect(isSaleUnitConflict(conflict)).toBe(true);
    expect(saleSaveErrorMessage(conflict)).toBe(saleUnitConflictMessage());
  });

  it("keeps the generic fallback for non-API errors", () => {
    expect(saleSaveErrorMessage(new Error("boom"))).toBe("boom");
    expect(saleSaveErrorMessage("nope")).toBe(
      "Não foi possível salvar a venda.",
    );
  });
});
