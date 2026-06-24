import { describe, expect, it } from "vitest";
import {
  createListQuery,
  formatInventoryPrice,
  getInventoryCatalogLine,
  getInventoryPlate,
  getInventoryStockLabel,
  getInventoryYearLine,
  summarizeInventoryList,
} from "./listCatalogModel";
import type { InventoryListingList, InventoryListingSummary } from "./types";

describe("inventory list catalog model", () => {
  it("builds canonical list query params", () => {
    expect(
      createListQuery({ offset: 200, search: "  toro  ", status: "" }),
    ).toEqual({
      limit: 100,
      offset: 200,
      search: "toro",
    });
    expect(createListQuery({ search: "", status: "available" })).toEqual({
      limit: 100,
      status: "available",
    });
  });

  it("summarizes loaded inventory by workflow status", () => {
    const result: InventoryListingList = {
      hasMore: false,
      items: [
        summary("listing_1", "available"),
        summary("listing_2", "reserved"),
        summary("listing_3", "sold"),
        summary("listing_4", "draft"),
      ],
      nextOffset: null,
      total: 4,
    };

    expect(summarizeInventoryList(result)).toEqual({
      available: 1,
      reserved: 1,
      sold: 1,
      total: 4,
    });
  });

  it("formats card metadata with V2 listing and unit split", () => {
    const item = summary("listing_1", "available");

    expect(formatInventoryPrice(12345678).replace(/\s/g, " ")).toBe(
      "R$ 123.457",
    );
    expect(formatInventoryPrice(null)).toBe("Preco sob consulta");
    expect(getInventoryCatalogLine(item.listing.catalog, item.listing)).toBe(
      "Toyota - Corolla - XEI",
    );
    expect(getInventoryYearLine(item.listing)).toBe("2024/2025");
    expect(getInventoryPlate(item)).toBe("ABC1D23");
    expect(getInventoryStockLabel(item)).toBe("Estoque STK-1");
  });
});

function summary(
  id: string,
  status: InventoryListingSummary["listing"]["status"],
): InventoryListingSummary {
  return {
    listing: {
      catalog: {
        brandCode: "59",
        brandName: "Toyota",
        fipeCode: "002000-0",
        fuel: "Flex",
        modelCode: "123",
        modelName: "Corolla",
        modelYear: 2025,
        priceCents: 12345678,
        referenceMonth: "junho/2026",
        source: "fipe",
        vehicleType: "cars",
        yearCode: "2025-1",
        yearName: "2025 Flex",
      },
      createdAt: "2026-01-01T00:00:00.000Z",
      description: null,
      id,
      manufactureYear: 2024,
      modelYear: 2025,
      plate: null,
      priceCents: 12345678,
      status,
      storeId: "store_1",
      tenantId: "tenant_1",
      title: "Toyota Corolla XEI",
      trimName: "XEI",
      unitIds: ["unit_1"],
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    mediaCount: 2,
    primaryMediaUrl: "https://cdn.local/corolla.jpg",
    primaryUnit: {
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "unit_1",
      listingId: id,
      plate: "ABC1D23",
      status: "available",
      stockNumber: "STK-1",
      storeId: "store_1",
      tenantId: "tenant_1",
      updatedAt: "2026-01-01T00:00:00.000Z",
      vin: null,
    },
  };
}
