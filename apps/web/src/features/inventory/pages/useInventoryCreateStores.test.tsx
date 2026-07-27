// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import type { Dispatch, SetStateAction } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InventoryFormState } from "../model/formModel";
import { useInventoryCreateStores } from "./useInventoryCreateStores";

vi.mock("../api/inventoryRuntimeApi", () => ({
  createInventoryRuntimeHeaders: vi.fn(async () => ({})),
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
});
