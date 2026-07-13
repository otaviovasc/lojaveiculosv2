// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SaleWorkspaceReadOnlyNotice } from "./SaleWorkspaceReadOnlyNotice";
import type { SaleRecord } from "./types";

describe("SaleWorkspaceReadOnlyNotice", () => {
  afterEach(() => cleanup());

  it("does not describe a closed correction as editable", () => {
    render(
      <SaleWorkspaceReadOnlyNotice
        sale={saleRecord({
          correctionOfSaleId: "sale_original",
          status: "closed",
        })}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("somente leitura");
    expect(screen.getByRole("status")).not.toHaveTextContent(
      "pode ser editada",
    );
  });
});

function saleRecord(overrides: Partial<SaleRecord>): SaleRecord {
  return {
    buyerSnapshot: {},
    closedAt: "2026-07-12T00:00:00.000Z",
    correctionOfSaleId: null,
    createdAt: "2026-07-12T00:00:00.000Z",
    documentPolicySnapshot: {},
    id: "sale_2",
    isCurrentRevision: true,
    leadId: null,
    listingId: null,
    listingSnapshot: {},
    overrideReason: "Corrigir comprador",
    overrideRequiredFields: false,
    payments: [],
    revision: 2,
    salePriceCents: null,
    saleSourceSnapshot: {},
    selectedDocumentKinds: [],
    sellerUserId: null,
    status: "draft",
    unitId: null,
    updatedAt: "2026-07-12T00:00:00.000Z",
    ...overrides,
  };
}
