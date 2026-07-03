import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProductCrmApi } from "../crm/productCrmApi";
import { createInventoryApi } from "../inventory/api/apiClient";
import { createSettingsApi } from "../settings/apiClient";
import { loadSaleContextOptions } from "./saleContextOptions";

const listLeads = vi.fn();
const listListings = vi.fn();
const getRoleManagement = vi.fn();

vi.mock("../crm/productCrmApi", () => ({
  createProductCrmApi: vi.fn(),
}));

vi.mock("../crm/runtimeApi", () => ({
  createProductCrmApiOptions: vi.fn(async () => ({ fetch: vi.fn() })),
}));

vi.mock("../inventory/api/apiClient", () => ({
  createInventoryApi: vi.fn(),
}));

vi.mock("../inventory/api/inventoryRuntimeApi", () => ({
  createInventoryApiOptions: vi.fn(async () => ({ fetch: vi.fn() })),
}));

vi.mock("../settings/apiClient", () => ({
  createSettingsApi: vi.fn(),
}));

vi.mock("../settings/runtimeApi", () => ({
  createSettingsApiOptions: vi.fn(async () => ({ fetch: vi.fn() })),
}));

describe("sale context options", () => {
  beforeEach(() => {
    vi.mocked(createProductCrmApi).mockReturnValue({
      listLeads,
    } as unknown as ReturnType<typeof createProductCrmApi>);
    vi.mocked(createInventoryApi).mockReturnValue({
      listListings,
    } as unknown as ReturnType<typeof createInventoryApi>);
    vi.mocked(createSettingsApi).mockReturnValue({
      getRoleManagement,
    } as unknown as ReturnType<typeof createSettingsApi>);
    listLeads.mockResolvedValue([]);
    listListings.mockResolvedValue({ items: [] });
    getRoleManagement.mockReset();
  });

  it("keeps the current seller available when role management is forbidden", async () => {
    getRoleManagement.mockRejectedValue(new Error("forbidden"));

    const state = await loadSaleContextOptions({
      email: "seller@example.test",
      id: "user_1",
      name: "Seller One",
      role: "salesman",
    });

    expect(state.kind).toBe("ready");
    expect(state.options.sellers).toEqual([
      {
        detail: "Vendedor · seller@example.test",
        id: "user_1",
        label: "Seller One",
        role: "salesman",
      },
    ]);
  });

  it("loads only available inventory units for sale selection", async () => {
    getRoleManagement.mockResolvedValue({ memberships: [] });
    listListings.mockResolvedValue({
      items: [
        {
          listing: {
            id: "listing_1",
            priceCents: 1000000,
            title: "Carro demo",
          },
          primaryUnit: null,
          units: [
            {
              id: "unit_available",
              plate: "ABC1D23",
              status: "available",
              stockNumber: "EST-1",
            },
            {
              id: "unit_sold",
              plate: "ZZZ9Z99",
              status: "sold",
              stockNumber: "EST-2",
            },
          ],
        },
      ],
    });

    const state = await loadSaleContextOptions();

    expect(listListings).toHaveBeenCalledWith({
      limit: 100,
      status: "available",
    });
    expect(state.options.units).toEqual([
      expect.objectContaining({
        id: "unit_available",
        label: "Carro demo · EST-1",
      }),
    ]);
  });
});
