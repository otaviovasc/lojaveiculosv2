import { describe, expect, it } from "vitest";
import {
  createListQuery,
  formatInventoryPrice,
  getInventoryCatalogLine,
  getInventoryLeadInterestLevel,
  getInventoryPlate,
  getInventoryStockLabel,
  getInventoryYearLine,
  summarizeInventoryList,
} from "./listCatalogModel";
import {
  DEFAULT_INVENTORY_LIST_SORT,
  getInventoryColumnSortDirection,
  getNextInventoryColumnSort,
  sortInventoryListItems,
  type InventorySortableColumn,
} from "./inventoryListSortModel";
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

  it("summarizes loaded inventory by unit workflow status", () => {
    const result: InventoryListingList = {
      hasMore: false,
      items: [
        summary("listing_1", "available"),
        summary("listing_2", "reserved"),
        summary("listing_3", "sold"),
        summary("listing_4", "inactive"),
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

  it("classifies lead interest thresholds", () => {
    expect(getInventoryLeadInterestLevel(0)).toBe("none");
    expect(getInventoryLeadInterestLevel(1)).toBe("healthy");
    expect(getInventoryLeadInterestLevel(2)).toBe("healthy");
    expect(getInventoryLeadInterestLevel(3)).toBe("hot");
    expect(getInventoryLeadInterestLevel(5)).toBe("hot");
    expect(getInventoryLeadInterestLevel(6)).toBe("very_hot");
    expect(getInventoryLeadInterestLevel(9)).toBe("very_hot");
  });

  it("toggles table column sort keys", () => {
    const columns: InventorySortableColumn[] = [
      "fotos",
      "placa",
      "marcaModelo",
      "anoKm",
      "preco",
      "dias",
      "fase",
      "leads",
    ];

    for (const column of columns) {
      const ascending = getNextInventoryColumnSort(
        DEFAULT_INVENTORY_LIST_SORT,
        column,
      );
      const descending = getNextInventoryColumnSort(ascending, column);
      const reset = getNextInventoryColumnSort(descending, column);

      expect(getInventoryColumnSortDirection(ascending, column)).toBe("asc");
      expect(getInventoryColumnSortDirection(descending, column)).toBe("desc");
      expect(reset).toBe(DEFAULT_INVENTORY_LIST_SORT);
      expect(
        getInventoryColumnSortDirection(DEFAULT_INVENTORY_LIST_SORT, column),
      ).toBeNull();
    }
  });

  it("sorts loaded inventory by table columns", () => {
    const low = summary("listing_low", "available", {
      createdAt: "2026-06-01T00:00:00.000Z",
      mediaCount: 1,
      modelYear: 2022,
      plate: "BBB1B11",
      priceCents: 10000000,
      title: "Alpha",
    });
    const high = summary("listing_high", "reserved", {
      createdAt: "2025-01-01T00:00:00.000Z",
      mediaCount: 5,
      modelYear: 2025,
      plate: "AAA1A11",
      priceCents: 30000000,
      title: "Beta",
    });
    const middle = summary("listing_middle", "sold", {
      createdAt: "2026-01-01T00:00:00.000Z",
      mediaCount: 3,
      modelYear: 2024,
      plate: "CCC1C11",
      priceCents: 20000000,
      title: "Zeta",
    });

    const items = [low, high, middle];

    expect(sortIds(items, "price_desc")).toEqual([
      "listing_high",
      "listing_middle",
      "listing_low",
    ]);
    expect(sortIds(items, "name_desc")).toEqual([
      "listing_middle",
      "listing_high",
      "listing_low",
    ]);
    expect(sortIds(items, "plate_asc")).toEqual([
      "listing_high",
      "listing_low",
      "listing_middle",
    ]);
    expect(sortIds(items, "year_desc")).toEqual([
      "listing_high",
      "listing_middle",
      "listing_low",
    ]);
    expect(sortIds(items, "media_desc")).toEqual([
      "listing_high",
      "listing_middle",
      "listing_low",
    ]);
    expect(sortIds(items, "stock_days_desc")).toEqual([
      "listing_high",
      "listing_middle",
      "listing_low",
    ]);
  });
});

function summary(
  id: string,
  unitStatus: InventoryListingSummary["units"][number]["status"],
  overrides: {
    createdAt?: string;
    mediaCount?: number;
    modelYear?: number;
    plate?: string;
    priceCents?: number;
    title?: string;
  } = {},
): InventoryListingSummary {
  const listingStatus =
    unitStatus === "sold"
      ? "sold_out"
      : id.endsWith("_4")
        ? "draft"
        : "published";

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
      createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
      description: null,
      doors: null,
      engineAspiration: null,
      engineDisplacement: null,
      fuelType: null,
      id,
      internalNotes: null,
      manufactureYear: overrides.modelYear ? overrides.modelYear - 1 : 2024,
      mileageKm: null,
      modelYear: overrides.modelYear ?? 2025,
      plate: null,
      priceCents: overrides.priceCents ?? 12345678,
      status: listingStatus,
      storeId: "store_1",
      tenantId: "tenant_1",
      title: overrides.title ?? "Toyota Corolla XEI",
      transmission: null,
      trimName: "XEI",
      unitIds: ["unit_1"],
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    mediaCount: overrides.mediaCount ?? 2,
    primaryMediaUrl: "https://cdn.local/corolla.jpg",
    primaryUnit: {
      colorName: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "unit_1",
      listingId: id,
      plate: overrides.plate ?? "ABC1D23",
      status: unitStatus,
      stockNumber: "STK-1",
      storeId: "store_1",
      tenantId: "tenant_1",
      updatedAt: "2026-01-01T00:00:00.000Z",
      vin: null,
    },
    units: [
      {
        colorName: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        id: "unit_1",
        listingId: id,
        plate: overrides.plate ?? "ABC1D23",
        status: unitStatus,
        stockNumber: "STK-1",
        storeId: "store_1",
        tenantId: "tenant_1",
        updatedAt: "2026-01-01T00:00:00.000Z",
        vin: null,
      },
    ],
  };
}

function sortIds(
  items: readonly InventoryListingSummary[],
  sortBy: Parameters<typeof sortInventoryListItems>[1],
) {
  return sortInventoryListItems(items, sortBy).map((item) => item.listing.id);
}
