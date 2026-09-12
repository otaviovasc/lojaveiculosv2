import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInventoryApi } from "../inventory/api/apiClient";
import { loadFinanceVehicleOptions } from "./financeVehicleOptions";

const listListings = vi.fn();

vi.mock("../inventory/api/apiClient", () => ({
  createInventoryApi: vi.fn(),
}));

vi.mock("../inventory/api/inventoryRuntimeApi", () => ({
  createInventoryApiOptions: vi.fn(async () => ({ fetch: vi.fn() })),
}));

describe("finance vehicle options", () => {
  beforeEach(() => {
    listListings.mockReset();
    vi.mocked(createInventoryApi).mockReturnValue({
      listListings,
    } as unknown as ReturnType<typeof createInventoryApi>);
  });

  it("loads every inventory page within the API limit", async () => {
    listListings
      .mockResolvedValueOnce({
        hasMore: true,
        items: [listing("listing_b", "Volkswagen T-Cross", "unit_b", "EST-2")],
        nextOffset: 100,
      })
      .mockResolvedValueOnce({
        hasMore: false,
        items: [listing("listing_a", "Audi A4", "unit_a", "EST-1")],
        nextOffset: null,
      });

    await expect(loadFinanceVehicleOptions()).resolves.toEqual([
      expect.objectContaining({ id: "unit_a", label: "Audi A4 · EST-1" }),
      expect.objectContaining({
        id: "unit_b",
        label: "Volkswagen T-Cross · EST-2",
      }),
    ]);
    expect(listListings).toHaveBeenNthCalledWith(1, {
      limit: 100,
      offset: 0,
    });
    expect(listListings).toHaveBeenNthCalledWith(2, {
      limit: 100,
      offset: 100,
    });
  });
});

function listing(
  listingId: string,
  title: string,
  unitId: string,
  stockNumber: string,
) {
  return {
    listing: { id: listingId, title },
    primaryUnit: null,
    units: [
      {
        id: unitId,
        plate: null,
        status: "available",
        stockNumber,
      },
    ],
  };
}
