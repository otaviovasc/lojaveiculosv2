import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProductCrmApi } from "../crm/productCrmApi";
import { createInventoryApi } from "../inventory/api/apiClient";
import { createSettingsApi } from "../settings/apiClient";
import { createSaleLead, loadSaleContextOptions } from "./saleContextOptions";

const createLead = vi.fn();
const listLeads = vi.fn();
const listListings = vi.fn();
const getStoreMemberOptions = vi.fn();

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
      createLead,
      listLeads,
    } as unknown as ReturnType<typeof createProductCrmApi>);
    vi.mocked(createInventoryApi).mockReturnValue({
      listListings,
    } as unknown as ReturnType<typeof createInventoryApi>);
    vi.mocked(createSettingsApi).mockReturnValue({
      getStoreMemberOptions,
    } as unknown as ReturnType<typeof createSettingsApi>);
    listLeads.mockResolvedValue([]);
    createLead.mockReset();
    listListings.mockResolvedValue({ items: [] });
    getStoreMemberOptions.mockReset();
  });

  it("keeps the current seller available when member options cannot load", async () => {
    getStoreMemberOptions.mockRejectedValue(new Error("forbidden"));

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

  it("loads sellers from the workflow-scoped member options endpoint", async () => {
    getStoreMemberOptions.mockResolvedValue({
      members: [
        {
          email: "seller@example.test",
          name: "Seller One",
          role: "salesman",
          userId: "user_1",
        },
      ],
    });

    const state = await loadSaleContextOptions();

    expect(getStoreMemberOptions).toHaveBeenCalledOnce();
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
    getStoreMemberOptions.mockResolvedValue({ members: [] });
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
              colorName: "white",
              plate: "ABC1D23",
              renavam: "12345678901",
              status: "available",
              stockNumber: "EST-1",
              vin: "9BWZZZ377VT004251",
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
        colorName: "white",
        id: "unit_available",
        label: "Carro demo · EST-1",
        renavam: "12345678901",
        vin: "9BWZZZ377VT004251",
      }),
    ]);
  });

  it("creates a CRM lead with sale provenance and maps it for selection", async () => {
    createLead.mockResolvedValue({
      buyerEmail: "cliente@example.test",
      buyerName: "Cliente QA",
      buyerPhone: "(11) 99999-9999",
      id: "lead_new",
      listingId: "listing_1",
      vehicleTitle: "Carro demo",
    });

    const option = await createSaleLead({
      buyerEmail: "cliente@example.test",
      buyerName: "Cliente QA",
      buyerPhone: "(11) 99999-9999",
      listingId: "listing_1",
      saleId: "sale_1",
    });

    expect(createLead).toHaveBeenCalledWith({
      buyerEmail: "cliente@example.test",
      buyerName: "Cliente QA",
      buyerPhone: "(11) 99999-9999",
      listingId: "listing_1",
      metadata: { origin: "sale_workspace", saleId: "sale_1" },
      source: "manual",
    });
    expect(option).toMatchObject({
      id: "lead_new",
      label: "Cliente QA",
      listingId: "listing_1",
    });
  });
});
