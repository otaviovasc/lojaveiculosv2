// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PIPELINES } from "./crmPipelineStorage";
import type { ProductCrmApi } from "./productCrmApi";
import type { LeadFilters } from "./crmPipelineModels";
import { useCrmLeadBoard } from "./useCrmLeadBoard";

const DEFAULT_FILTERS: LeadFilters = {
  search: "",
  source: "all",
  status: "all",
};

describe("useCrmLeadBoard", () => {
  it("restores cached pages on remount and refreshes without loading state", async () => {
    const pipeline = DEFAULT_PIPELINES[0]!;
    const api = createProductCrmApi({
      listLeadBoard: vi.fn(async () => ({
        stages: pipeline.stages.map((stage) => ({
          pipelineStageId: stage.id,
          leads: [],
          nextCursor: null,
          total: 0,
        })),
      })),
    });
    const useBoard = () =>
      useCrmLeadBoard(api, pipeline, DEFAULT_FILTERS, true);

    const first = renderHook(useBoard);
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    expect(
      Object.keys(first.result.current.stageTotals).length,
    ).toBeGreaterThan(0);
    first.unmount();

    const remounted = renderHook(useBoard);
    expect(remounted.result.current.isLoading).toBe(false);
    expect(Object.keys(remounted.result.current.stageTotals).length).toBe(
      pipeline.stages.length,
    );
    await waitFor(() => expect(api.listLeadBoard).toHaveBeenCalledTimes(2));
  });
});

function createProductCrmApi(overrides: Partial<ProductCrmApi>): ProductCrmApi {
  const notExpected = async () => {
    throw new Error("Unexpected CRM API call");
  };
  return {
    createActivity: vi.fn(notExpected),
    createFinancialProduct: vi.fn(notExpected),
    createLead: vi.fn(notExpected),
    createPipeline: vi.fn(notExpected),
    deletePipeline: vi.fn(notExpected),
    listActivities: vi.fn(notExpected),
    listLeadBoard: vi.fn(notExpected),
    listLeadPage: vi.fn(notExpected),
    listLeads: vi.fn(notExpected),
    listPipelines: vi.fn(notExpected),
    moveLeadPipelineStage: vi.fn(notExpected),
    updateLead: vi.fn(notExpected),
    updatePipeline: vi.fn(notExpected),
    ...overrides,
  };
}
