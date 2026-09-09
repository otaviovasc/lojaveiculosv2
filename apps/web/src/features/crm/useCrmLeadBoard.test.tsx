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
  it.each<Partial<LeadFilters>>([
    { responseState: "responded" },
    { inactiveDays: 7 },
    { humanAttendanceState: "waiting_human" },
    { sortBy: "next_task" },
  ])(
    "does not reuse totals from a different operational filter: %j",
    async (changed) => {
      const pipeline = DEFAULT_PIPELINES[0]!;
      const listLeadBoard = vi
        .fn<ProductCrmApi["listLeadBoard"]>()
        .mockResolvedValueOnce({
          stages: [
            {
              pipelineStageId: pipeline.stages[0]!.id,
              leads: [],
              nextCursor: null,
              total: 7,
            },
          ],
        })
        .mockImplementation(() => new Promise(() => {}));
      const api = createProductCrmApi({ listLeadBoard });
      const first = renderHook(() =>
        useCrmLeadBoard(api, pipeline, DEFAULT_FILTERS, true),
      );
      await waitFor(() => expect(first.result.current.isLoading).toBe(false));
      expect(first.result.current.stageTotals[pipeline.stages[0]!.id]).toBe(7);
      first.unmount();
      const next = renderHook(() =>
        useCrmLeadBoard(
          api,
          pipeline,
          { ...DEFAULT_FILTERS, ...changed },
          true,
        ),
      );
      expect(next.result.current.isLoading).toBe(true);
      expect(next.result.current.stageTotals).toEqual({});
      next.unmount();
    },
  );
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
    importLeads: vi.fn(async () => ({ created: 0, skipped: 0, errors: [] })),
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
