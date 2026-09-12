// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PIPELINES } from "./crmPipelineStorage";
import type { ProductCrmApi } from "./productCrmApi";
import type { LeadFilters } from "./crmPipelineModels";
import { leadBoardCacheKey, useCrmLeadBoard } from "./useCrmLeadBoard";

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
    { sources: ["whatsapp", "instagram"] },
    { assignee: "me" },
    { assignee: "assigned" },
    { assignee: "user-123" },
    { listingId: "car-456" },
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
      const changedFilters = { ...DEFAULT_FILTERS, ...changed };
      const next = renderHook(() =>
        useCrmLeadBoard(api, pipeline, changedFilters, true),
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

  it("leadBoardCacheKey produces distinct keys for sources, assignee, and listingId", () => {
    const pipeline = DEFAULT_PIPELINES[0]!;
    const baseKey = leadBoardCacheKey(pipeline, DEFAULT_FILTERS);

    const sourcesKey = leadBoardCacheKey(pipeline, {
      ...DEFAULT_FILTERS,
      sources: ["manual", "whatsapp"],
    });
    const assigneeKey = leadBoardCacheKey(pipeline, {
      ...DEFAULT_FILTERS,
      assignee: "me",
    });
    const listingKey = leadBoardCacheKey(pipeline, {
      ...DEFAULT_FILTERS,
      listingId: "vehicle-123",
    });

    expect(sourcesKey).not.toBe(baseKey);
    expect(assigneeKey).not.toBe(baseKey);
    expect(listingKey).not.toBe(baseKey);
    expect(sourcesKey).not.toBe(assigneeKey);
  });

  it("clears stale pages immediately when changing to an uncached filter to avoid stale cards", async () => {
    const pipeline = DEFAULT_PIPELINES[0]!;
    let resolveFirstBoard: (
      val: Awaited<ReturnType<ProductCrmApi["listLeadBoard"]>>,
    ) => void = () => {};
    let resolveSecondBoard: (
      val: Awaited<ReturnType<ProductCrmApi["listLeadBoard"]>>,
    ) => void = () => {};

    const listLeadBoard = vi
      .fn<ProductCrmApi["listLeadBoard"]>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstBoard = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecondBoard = resolve;
          }),
      );

    const api = createProductCrmApi({ listLeadBoard });
    let filters: LeadFilters = DEFAULT_FILTERS;
    const { rerender, result } = renderHook(() =>
      useCrmLeadBoard(api, pipeline, filters, true),
    );

    expect(result.current.isLoading).toBe(true);

    // Resolve first board
    resolveFirstBoard({
      stages: [
        {
          pipelineStageId: pipeline.stages[0]!.id,
          leads: [
            {
              id: "lead-old",
              buyerName: "Old Lead",
              buyerEmail: null,
              buyerPhone: null,
              status: "new",
              source: "manual",
              assignedUserId: null,
              createdAt: "2026-01-01",
              updatedAt: "2026-01-01",
              lastInteractionAt: null,
              listingId: null,
              metadata: {},
              pipelineId: pipeline.id,
              pipelineStageId: pipeline.stages[0]!.id,
              storeId: "store-1",
              tenantId: "tenant-1",
              vehicleTitle: null,
            },
          ],
          nextCursor: null,
          total: 1,
        },
      ],
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.leads).toHaveLength(1);
    expect(result.current.leads[0]?.id).toBe("lead-old");

    // Change filter to an uncached filter (e.g. assignee: "me")
    filters = { ...DEFAULT_FILTERS, assignee: "me" };
    rerender();

    // Must immediately be loading and have cleared leads/pages to avoid showing stale cards!
    expect(result.current.isLoading).toBe(true);
    expect(result.current.leads).toHaveLength(0);

    // Resolve second board
    resolveSecondBoard({
      stages: [
        {
          pipelineStageId: pipeline.stages[0]!.id,
          leads: [
            {
              id: "lead-new",
              buyerName: "New Lead",
              buyerEmail: null,
              buyerPhone: null,
              status: "new",
              source: "whatsapp",
              assignedUserId: "user-current",
              createdAt: "2026-01-02",
              updatedAt: "2026-01-02",
              lastInteractionAt: null,
              listingId: null,
              metadata: {},
              pipelineId: pipeline.id,
              pipelineStageId: pipeline.stages[0]!.id,
              storeId: "store-1",
              tenantId: "tenant-1",
              vehicleTitle: null,
            },
          ],
          nextCursor: null,
          total: 1,
        },
      ],
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.leads).toHaveLength(1);
    expect(result.current.leads[0]?.id).toBe("lead-new");
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
