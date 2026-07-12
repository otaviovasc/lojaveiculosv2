// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmListView } from "./CrmListView";
import type { ProductCrmLead } from "./productCrmTypes";
import type { PipelineStage } from "./crmPipelineStorage";

describe("CrmListView", () => {
  afterEach(cleanup);

  it("constrains long mobile customer and stage content", () => {
    render(
      <CrmListView
        leads={[lead]}
        onMoveLeadPipelineStage={vi.fn(async () => undefined)}
        onSelectLead={vi.fn()}
        stages={[stage]}
        vehicleOptions={[]}
      />,
    );

    expect(screen.getByRole("article")).toHaveClass("overflow-hidden");
    expect(screen.getAllByText(stage.name)[0]).toHaveClass(
      "max-w-[45%]",
      "truncate",
    );
    expect(screen.getAllByText(lead.buyerPhone ?? "")[0]).toHaveClass(
      "truncate",
    );
  });
});

const stage: PipelineStage = {
  color: "var(--color-accent)",
  id: "negotiating",
  isSystem: false,
  leadStatus: "negotiating",
  name: "Negociação aguardando documentação complementar",
  slaDays: 3,
  status: "open",
};

const lead: ProductCrmLead = {
  assignedUserId: null,
  buyerEmail: "ana@example.com",
  buyerName: "Ana Maria de Souza com um nome operacional muito extenso",
  buyerPhone: "+55 (11) 99999-9999",
  createdAt: "2026-07-11T12:00:00.000Z",
  id: "lead_1",
  lastInteractionAt: null,
  listingId: null,
  metadata: {},
  pipelineId: "sales",
  pipelineStageId: "negotiating",
  source: "manual",
  status: "negotiating",
  storeId: "store_1",
  tenantId: "tenant_1",
  updatedAt: "2026-07-11T12:00:00.000Z",
  vehicleTitle: null,
};
