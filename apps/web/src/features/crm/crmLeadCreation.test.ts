import { describe, expect, it, vi } from "vitest";
import { createLeadWithInitialStage } from "./crmLeadCreation";
import type { ProductCrmApi } from "./productCrmApi";
import type { ProductCrmLead } from "./productCrmTypes";

describe("createLeadWithInitialStage", () => {
  it("creates the lead without pipeline fields then moves it via the move endpoint", async () => {
    const lead = buildLead({ id: "lead-1" });
    const movedLead = buildLead({
      id: "lead-1",
      pipelineId: "pipeline-1",
      pipelineStageId: "stage-1",
      status: "won",
    });
    const api = createApi({ lead, movedLead });

    const result = await createLeadWithInitialStage(api, {
      buyerName: "Ana",
      initialPipelineStageId: "stage-1",
      metadata: { priority: "Alta" },
      source: "manual",
    });

    expect(api.createLead).toHaveBeenCalledWith({
      buyerName: "Ana",
      metadata: { priority: "Alta" },
      source: "manual",
    });
    expect(api.moveLeadPipelineStage).toHaveBeenCalledWith("lead-1", {
      pipelineStageId: "stage-1",
    });
    expect(result).toEqual(movedLead);
  });
});

function createApi(input: {
  lead: ProductCrmLead;
  movedLead: ProductCrmLead;
}): ProductCrmApi {
  return {
    createActivity: vi.fn(),
    createLead: vi.fn(async () => input.lead),
    createPipeline: vi.fn(),
    deletePipeline: vi.fn(),
    listActivities: vi.fn(),
    listLeads: vi.fn(),
    listPipelines: vi.fn(),
    moveLeadPipelineStage: vi.fn(async () => input.movedLead),
    updateLead: vi.fn(),
    updatePipeline: vi.fn(),
  };
}

function buildLead(
  override: Partial<ProductCrmLead> & { id: string },
): ProductCrmLead {
  const { id, ...rest } = override;
  return {
    assignedUserId: null,
    buyerEmail: null,
    buyerName: "Ana",
    buyerPhone: null,
    createdAt: "2026-07-06T12:00:00.000Z",
    id,
    lastInteractionAt: null,
    listingId: null,
    metadata: {},
    pipelineId: null,
    pipelineStageId: null,
    source: "manual",
    status: "new",
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: "2026-07-06T12:00:00.000Z",
    vehicleTitle: null,
    ...rest,
  };
}
