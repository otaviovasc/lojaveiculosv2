// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PIPELINES, type Pipeline } from "./crmPipelineStorage";
import type { ProductCrmApi } from "./productCrmApi";
import { useCrmPipelines } from "./useCrmPipelines";

describe("useCrmPipelines", () => {
  it("creates the default pipeline once for concurrent mounts", async () => {
    const creation = createDeferred<Pipeline>();
    const api = createProductCrmApi({
      createPipeline: vi.fn(() => creation.promise),
      listPipelines: vi.fn(async () => []),
    });

    const { result } = renderHook(() => [
      useCrmPipelines("store_1", api),
      useCrmPipelines("store_1", api),
    ]);

    await waitFor(() => expect(api.createPipeline).toHaveBeenCalledTimes(1));
    await act(async () => {
      creation.resolve(DEFAULT_PIPELINES[0]!);
      await creation.promise;
    });
    await waitFor(() =>
      expect(
        result.current.every((state) => state.pipelines.length === 1),
      ).toBe(true),
    );
  });

  it("reloads the pipeline created by a concurrent request", async () => {
    const pipeline = DEFAULT_PIPELINES[0]!;
    const api = createProductCrmApi({
      createPipeline: vi.fn(async () => {
        throw new Error("duplicate pipeline");
      }),
      listPipelines: vi
        .fn<() => Promise<Pipeline[]>>()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([pipeline]),
    });

    const { result } = renderHook(() => useCrmPipelines("store_1", api));

    await waitFor(() => expect(result.current.pipelines).toEqual([pipeline]));
    expect(result.current.error).toBeNull();
    expect(api.listPipelines).toHaveBeenCalledTimes(2);
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
    listLeads: vi.fn(notExpected),
    listPipelines: vi.fn(notExpected),
    moveLeadPipelineStage: vi.fn(notExpected),
    updateLead: vi.fn(notExpected),
    updatePipeline: vi.fn(notExpected),
    ...overrides,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}
