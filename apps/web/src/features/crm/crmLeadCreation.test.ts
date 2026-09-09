import { describe, expect, it, vi } from "vitest";
import { createLeadWithInitialStage } from "./crmLeadCreation";
import type { ProductCrmApi } from "./productCrmApi";
import type { ProductCrmLead } from "./productCrmTypes";

describe("createLeadWithInitialStage", () => {
  it("creates the lead with the initial pipeline stage in a single call", async () => {
    const lead = buildLead({
      id: "lead-1",
      pipelineId: "pipeline-1",
      pipelineStageId: "stage-1",
    });
    const api = createApi({ lead });

    const result = await createLeadWithInitialStage(api, {
      birthDate: "1990-05-10",
      buyerName: "Ana",
      initialPipelineStageId: "stage-1",
      metadata: { priority: "Alta" },
      source: "manual",
    });

    expect(api.createLead).toHaveBeenCalledWith({
      birthDate: "1990-05-10",
      buyerName: "Ana",
      metadata: { priority: "Alta" },
      pipelineStageId: "stage-1",
      source: "manual",
    });
    expect(result).toEqual(lead);
  });
});

function createApi(input: { lead: ProductCrmLead }): ProductCrmApi {
  return {
    importLeads: vi.fn(async () => ({ created: 0, skipped: 0, errors: [] })),
    createActivity: vi.fn(),
    createFinancialProduct: vi.fn(),
    createLead: vi.fn(async () => input.lead),
    createPipeline: vi.fn(),
    deletePipeline: vi.fn(),
    listActivities: vi.fn(),
    listLeadBoard: vi.fn(),
    listLeadPage: vi.fn(),
    listLeads: vi.fn(),
    listPipelines: vi.fn(),
    moveLeadPipelineStage: vi.fn(),
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
