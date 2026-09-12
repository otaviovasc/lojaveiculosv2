import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInventoryCreateRuntimeApi } from "./InventoryCreatePage";

const runtimeOptions = vi.hoisted(() => vi.fn());

vi.mock("../api/inventoryRuntimeApi", () => ({
  createInventoryApiOptions: runtimeOptions,
}));

describe("createInventoryCreateRuntimeApi", () => {
  beforeEach(() => {
    runtimeOptions.mockReset();
  });

  it("scopes requests to the store selected in the create form", async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => Response.json({}));
    runtimeOptions.mockResolvedValue({
      auth: { storeSlug: "previous-store" },
      fetch: fetchSpy,
    });

    const api = await createInventoryCreateRuntimeApi(
      [
        { id: "store_previous", name: "Anterior", slug: "previous-store" },
        { id: "store_selected", name: "Selecionada", slug: "selected-store" },
      ],
      "store_selected",
    );
    await api.getListing("listing_1");

    const request = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("x-store-slug")).toBe(
      "selected-store",
    );
  });
});
