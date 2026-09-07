// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CrmLeadEditDialog } from "./CrmLeadEditDialog";
import type { ProductCrmLead } from "./productCrmTypes";

describe("CrmLeadEditDialog", () => {
  it("reads the canonical date and sends null when the date is cleared", async () => {
    const onSave = vi.fn(async () => undefined);
    render(
      <CrmLeadEditDialog
        lead={buildLead()}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    expect(screen.getByText("Atual: 15/05/1990")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Limpar Nascimento" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        birthDate: null,
        buyerEmail: "ana@example.com",
        buyerName: "Ana",
        buyerPhone: "5511999999999",
      }),
    );
  });
});

function buildLead(): ProductCrmLead {
  return {
    assignedUserId: null,
    birthDate: "1990-05-15",
    buyerEmail: "ana@example.com",
    buyerName: "Ana",
    buyerPhone: "5511999999999",
    createdAt: "2026-08-13T12:00:00.000Z",
    id: "33333333-3333-4333-8333-333333333333",
    lastInteractionAt: null,
    listingId: null,
    metadata: {},
    pipelineId: null,
    pipelineStageId: null,
    source: "manual",
    status: "new",
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: "2026-08-13T12:00:00.000Z",
    vehicleTitle: null,
  };
}
