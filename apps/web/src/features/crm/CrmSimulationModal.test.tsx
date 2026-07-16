// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmSimulationModal } from "./CrmSimulationModal";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type { FinancingSimulationDraft } from "./crmLeadData";
import type { ProductCrmLead } from "./productCrmTypes";

describe("CrmSimulationModal", () => {
  afterEach(cleanup);

  it("blocks a downpayment greater than the vehicle value", async () => {
    const user = userEvent.setup();
    const onSaveSimulation = vi.fn(async () => undefined);
    renderModal({ onSaveSimulation });

    expect(
      screen.getByRole("dialog", { name: "Simular financiamento" }),
    ).toBeInTheDocument();
    const downpayment = screen.getByLabelText("Valor da Entrada (R$)");
    await user.clear(downpayment);
    await user.type(downpayment, "12000000");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "A entrada não pode ser maior que o valor do veículo.",
    );
    expect(
      screen.getByRole("button", { name: "Salvar no Lead" }),
    ).toBeDisabled();
    expect(onSaveSimulation).not.toHaveBeenCalled();
  });

  it("keeps the modal open and explains a rejected save", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSaveSimulation = vi.fn().mockRejectedValue(undefined);
    renderModal({
      onClose,
      onSaveSimulation,
    });

    await user.click(screen.getByRole("button", { name: "Salvar no Lead" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar a simulação.",
    );
    expect(onSaveSimulation).toHaveBeenCalledWith(
      "lead_1",
      expect.objectContaining({
        downpaymentCents: 3_000_000,
        months: 48,
        vehicleValueCents: 10_000_000,
      }),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close while the simulation is being saved", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let resolveSave: (() => void) | undefined;
    const onSaveSimulation = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    renderModal({ onClose, onSaveSimulation });

    await user.click(screen.getByRole("button", { name: "Salvar no Lead" }));
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();

    resolveSave?.();
    expect(
      await screen.findByRole("button", { name: "Salvar no Lead" }),
    ).toBeEnabled();
    expect(onClose).toHaveBeenCalledOnce();
  });
});

function renderModal({
  onClose = vi.fn(),
  onSaveSimulation,
}: {
  onClose?: () => void;
  onSaveSimulation: (
    leadId: string,
    data: FinancingSimulationDraft,
  ) => Promise<void>;
}) {
  render(
    <CrmSimulationModal
      lead={lead}
      onClose={onClose}
      onSaveSimulation={onSaveSimulation}
      vehicleOptions={[vehicle]}
    />,
  );
}

const lead: ProductCrmLead = {
  assignedUserId: null,
  buyerEmail: null,
  buyerName: "Ana Souza",
  buyerPhone: null,
  createdAt: "2026-07-11T12:00:00.000Z",
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
  updatedAt: "2026-07-11T12:00:00.000Z",
  vehicleTitle: "SUV Premium",
};

const vehicle: LeadVehicleOption = {
  detail: "2026 · automático",
  id: "listing_1",
  label: "SUV Premium",
  priceCents: 10_000_000,
};
