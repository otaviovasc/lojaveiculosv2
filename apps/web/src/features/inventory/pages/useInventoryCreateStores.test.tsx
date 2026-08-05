// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import type { Dispatch, SetStateAction } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InventoryFormState } from "../model/formModel";
import { useInventoryCreateStores } from "./useInventoryCreateStores";

vi.mock("../api/inventoryRuntimeApi", () => ({
  createInventoryRuntimeHeaders: vi.fn(async () => ({})),
}));
vi.mock("../../account/currentStore", () => ({
  readRuntimeStoreSlug: vi.fn(() => "loja-atual"),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useInventoryCreateStores", () => {
  it("keeps the selector empty when billing has no real stores", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          allocations: [],
        }),
      ),
    );
    const setForm = vi.fn();

    const { result } = renderHook(() =>
      useInventoryCreateStores(
        setForm as Dispatch<SetStateAction<InventoryFormState>>,
      ),
    );

    await waitFor(() => expect(setForm).toHaveBeenCalledOnce());
    expect(result.current).toEqual([]);
  });

  it("keeps the selector empty when billing cannot be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network");
      }),
    );
    const setForm = vi.fn();

    const { result } = renderHook(() =>
      useInventoryCreateStores(
        setForm as Dispatch<SetStateAction<InventoryFormState>>,
      ),
    );

    await waitFor(() => expect(setForm).toHaveBeenCalledOnce());
    expect(result.current).toEqual([]);
  });

  it("ignores incomplete allocations instead of inventing store data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          allocations: [
            { storeId: "store_real", storeName: "Loja Real", storeSlug: "" },
          ],
        }),
      ),
    );
    const setForm = vi.fn();

    const { result } = renderHook(() =>
      useInventoryCreateStores(
        setForm as Dispatch<SetStateAction<InventoryFormState>>,
      ),
    );

    await waitFor(() => expect(setForm).toHaveBeenCalledOnce());
    expect(result.current).toEqual([]);
  });

  it("uses only complete store allocations returned by billing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          allocations: [
            {
              storeId: "store_real",
              storeName: "Loja Real",
              storeSlug: "loja-real",
            },
          ],
        }),
      ),
    );
    const setForm = vi.fn();

    const { result } = renderHook(() =>
      useInventoryCreateStores(
        setForm as Dispatch<SetStateAction<InventoryFormState>>,
      ),
    );

    await waitFor(() =>
      expect(result.current).toEqual([
        { id: "store_real", name: "Loja Real", slug: "loja-real" },
      ]),
    );
  });

  it("defaults to the current store instead of the first billing allocation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          allocations: [
            {
              storeId: "store_other",
              storeName: "Outra Loja",
              storeSlug: "outra-loja",
            },
            {
              storeId: "store_current",
              storeName: "Loja Atual",
              storeSlug: "loja-atual",
            },
          ],
        }),
      ),
    );
    const setForm = vi.fn();

    renderHook(() =>
      useInventoryCreateStores(
        setForm as Dispatch<SetStateAction<InventoryFormState>>,
      ),
    );

    await waitFor(() => expect(setForm).toHaveBeenCalledOnce());
    const updater = setForm.mock.calls[0]?.[0] as (
      form: InventoryFormState,
    ) => InventoryFormState;

    expect(updater({ storeId: "" } as InventoryFormState).storeId).toBe(
      "store_current",
    );
    expect(
      updater({ storeId: "store_draft" } as InventoryFormState).storeId,
    ).toBe("store_draft");
  });
});
