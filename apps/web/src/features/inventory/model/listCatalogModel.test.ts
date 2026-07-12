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
import { createInventoryListingSummary } from "./inventoryListingSummary.testSupport";
import type { InventoryListingList } from "./types";

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
        createInventoryListingSummary("listing_1"),
        createInventoryListingSummary("listing_2", {
          unitStatus: "reserved",
        }),
        createInventoryListingSummary("listing_3", { unitStatus: "sold" }),
        createInventoryListingSummary("listing_4", {
          listingStatus: "draft",
          unitStatus: "inactive",
        }),
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
    const item = createInventoryListingSummary("listing_1");

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
});
