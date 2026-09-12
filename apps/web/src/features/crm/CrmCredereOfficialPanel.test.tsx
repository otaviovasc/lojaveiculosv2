// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CredereSimulation } from "../simulations/types";
import { CrmCredereOfficialPanel } from "./CrmCredereOfficialPanel";
import type { ProductCrmLead } from "./productCrmTypes";

describe("CrmCredereOfficialPanel", () => {
  afterEach(cleanup);

  it("links the CRM lead and lists only its official simulations", async () => {
    render(
      <CrmCredereOfficialPanel
        lead={lead}
        loadSimulations={async () => [
          simulation("simulation_1", "lead_1", 2),
          simulation("simulation_2", "lead_2", 1),
        ]}
      />,
    );

    expect(screen.getByText("Consulta oficial Credere")).toBeVisible();
    expect(await screen.findByText("2 condições")).toBeVisible();
    expect(screen.queryByText("1 condição")).toBeNull();
    expect(
      screen.getByRole("link", { name: /Simular no Credere/ }),
    ).toHaveAttribute("href", "/simulations?leadId=lead_1&listingId=listing_1");
  });

  it("shows a degraded state instead of pretending the history is empty", async () => {
    render(
      <CrmCredereOfficialPanel
        lead={lead}
        loadSimulations={vi.fn().mockRejectedValue(new Error("offline"))}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar o histórico oficial",
    );
    expect(screen.queryByText(/Nenhuma consulta oficial/)).toBeNull();
  });
});

function simulation(
  id: string,
  leadId: string,
  conditionCount: number,
): CredereSimulation {
  return {
    conditions: Array.from({ length: conditionCount }, () => ({
      bankCode: "655",
      bankName: "BV",
      downPaymentCents: null,
      firstInstallmentCents: null,
      installments: 36,
      preApprovalStatus: null,
      reason: null,
      reasonIdentifier: null,
      status: "available",
      summary: null,
      totalAmountCents: null,
    })),
    createdAt: "2026-08-13T12:00:00.000Z",
    id,
    leadId,
    leadName: null,
    listingId: "listing_1",
    providerRequestId: null,
    reason: null,
    status: "completed",
    success: true,
    unitId: null,
    vehicleTitle: null,
  };
}

const lead: ProductCrmLead = {
  assignedUserId: null,
  buyerEmail: "ana@example.com",
  buyerName: "Ana",
  buyerPhone: "11999990000",
  createdAt: "2026-08-13T10:00:00.000Z",
  id: "lead_1",
  lastInteractionAt: null,
  listingId: "listing_1",
  metadata: {},
  pipelineId: "sales",
  pipelineStageId: "new",
  source: "manual",
  status: "new",
  storeId: "store_1",
  tenantId: "tenant_1",
  updatedAt: "2026-08-13T10:00:00.000Z",
  vehicleTitle: "Fiat Toro",
};
