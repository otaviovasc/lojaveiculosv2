import { describe, expect, it } from "vitest";
import { createInventoryListingSummary } from "./inventoryListingSummary.testSupport";
import {
  DEFAULT_INVENTORY_LIST_SORT,
  getInventoryColumnSortDirection,
  getNextInventoryColumnSort,
  inventoryListSortOptions,
  sortInventoryListItems,
  type InventoryListSortKey,
  type InventorySortableColumn,
} from "./inventoryListSortModel";
import type { InventoryListingSummary } from "./types";

const ASCENDING_IDS = ["listing_low", "listing_middle", "listing_high"];
const DESCENDING_IDS = [...ASCENDING_IDS].reverse();

const EXPECTED_IDS_BY_SORT = {
  leads_asc: ASCENDING_IDS,
  leads_desc: DESCENDING_IDS,
  media_asc: ASCENDING_IDS,
  media_desc: DESCENDING_IDS,
  name_asc: ["listing_low", "listing_high", "listing_middle"],
  name_desc: ["listing_middle", "listing_high", "listing_low"],
  newest: ASCENDING_IDS,
  oldest: DESCENDING_IDS,
  plate_asc: ["listing_high", "listing_low", "listing_middle"],
  plate_desc: ["listing_middle", "listing_low", "listing_high"],
  price_asc: ASCENDING_IDS,
  price_desc: DESCENDING_IDS,
  status_asc: ["listing_low", "listing_high", "listing_middle"],
  status_desc: ["listing_middle", "listing_high", "listing_low"],
  stock_days_asc: ASCENDING_IDS,
  stock_days_desc: DESCENDING_IDS,
  year_asc: ASCENDING_IDS,
  year_desc: DESCENDING_IDS,
} satisfies Record<InventoryListSortKey, readonly string[]>;

const COLUMN_SORTS = {
  anoKm: ["year_asc", "year_desc"],
  dias: ["stock_days_asc", "stock_days_desc"],
  fase: ["status_asc", "status_desc"],
  fotos: ["media_asc", "media_desc"],
  leads: ["leads_asc", "leads_desc"],
  marcaModelo: ["name_asc", "name_desc"],
  placa: ["plate_asc", "plate_desc"],
  preco: ["price_asc", "price_desc"],
} as const satisfies Record<
  InventorySortableColumn,
  readonly [InventoryListSortKey, InventoryListSortKey]
>;

describe("inventory list sort model", () => {
  const items = createDistinctItems();

  it.each(Object.entries(EXPECTED_IDS_BY_SORT))(
    "orders every row deterministically with %s",
    (sortBy, expectedIds) => {
      const originalOrder = [...items];
      const firstPass = sortInventoryListItems(
        items,
        sortBy as InventoryListSortKey,
      );
      const secondPass = sortInventoryListItems(
        firstPass,
        sortBy as InventoryListSortKey,
      );

      expect(ids(firstPass)).toEqual(expectedIds);
      expect(ids(secondPass)).toEqual(expectedIds);
      expect(items).toEqual(originalOrder);
      expect(firstPass).not.toBe(items);
    },
  );

  it("keeps the sort selector exhaustive and free of duplicate values", () => {
    const optionValues = inventoryListSortOptions.map(({ value }) => value);
    const testedValues = Object.keys(EXPECTED_IDS_BY_SORT).sort();

    expect(new Set(optionValues).size).toBe(optionValues.length);
    expect([...optionValues].sort()).toEqual(testedValues);
    expect(optionValues).toContain(DEFAULT_INVENTORY_LIST_SORT);
  });

  it("cycles every sortable column through ascending, descending, and reset", () => {
    for (const [column, [ascending, descending]] of Object.entries(
      COLUMN_SORTS,
    )) {
      const sortableColumn = column as InventorySortableColumn;

      expect(
        getNextInventoryColumnSort(DEFAULT_INVENTORY_LIST_SORT, sortableColumn),
      ).toBe(ascending);
      expect(getNextInventoryColumnSort(ascending, sortableColumn)).toBe(
        descending,
      );
      expect(getNextInventoryColumnSort(descending, sortableColumn)).toBe(
        DEFAULT_INVENTORY_LIST_SORT,
      );
      expect(getInventoryColumnSortDirection(ascending, sortableColumn)).toBe(
        "asc",
      );
      expect(getInventoryColumnSortDirection(descending, sortableColumn)).toBe(
        "desc",
      );
      expect(
        getInventoryColumnSortDirection(
          DEFAULT_INVENTORY_LIST_SORT,
          sortableColumn,
        ),
      ).toBeNull();
    }
  });

  it("uses stable ordering for equal values without mutating the input", () => {
    const tiedItems = [
      createInventoryListingSummary("first", { priceCents: null }),
      createInventoryListingSummary("second", { priceCents: null }),
      createInventoryListingSummary("third", { priceCents: null }),
    ];

    expect(ids(sortInventoryListItems(tiedItems, "price_asc"))).toEqual([
      "first",
      "second",
      "third",
    ]);
    expect(ids(sortInventoryListItems(tiedItems, "price_desc"))).toEqual([
      "first",
      "second",
      "third",
    ]);
    expect(ids(tiedItems)).toEqual(["first", "second", "third"]);
  });

  it("falls back to manufacture year when model year is unavailable", () => {
    const older = createInventoryListingSummary("older", {
      manufactureYear: 2021,
      modelYear: null,
    });
    const newer = createInventoryListingSummary("newer", {
      manufactureYear: 2024,
      modelYear: null,
    });

    expect(ids(sortInventoryListItems([newer, older], "year_asc"))).toEqual([
      "older",
      "newer",
    ]);
    expect(ids(sortInventoryListItems([older, newer], "year_desc"))).toEqual([
      "newer",
      "older",
    ]);
  });

  it("sorts inventory with no known year as the oldest entry", () => {
    const unknownYear = createInventoryListingSummary("unknown", {
      manufactureYear: null,
      modelYear: null,
    });
    const knownYear = createInventoryListingSummary("known", {
      modelYear: 2025,
    });

    expect(
      ids(sortInventoryListItems([knownYear, unknownYear], "year_asc")),
    ).toEqual(["unknown", "known"]);
    expect(
      ids(sortInventoryListItems([unknownYear, knownYear], "year_desc")),
    ).toEqual(["known", "unknown"]);
  });

  it("sorts listings without units by their listing workflow status", () => {
    const draft = withoutUnits(createInventoryListingSummary("draft"), "draft");
    const published = withoutUnits(
      createInventoryListingSummary("published"),
      "published",
    );

    expect(
      ids(sortInventoryListItems([draft, published], "status_asc")),
    ).toEqual(["published", "draft"]);
    expect(
      ids(sortInventoryListItems([published, draft], "status_desc")),
    ).toEqual(["draft", "published"]);
  });
});

function createDistinctItems(): readonly InventoryListingSummary[] {
  return [
    createInventoryListingSummary("listing_low", {
      createdAt: "2026-06-01T00:00:00.000Z",
      mediaCount: 1,
      modelYear: 2022,
      plate: "BBB1B11",
      priceCents: 10_000_000,
      title: "Alpha",
    }),
    createInventoryListingSummary("listing_high", {
      createdAt: "2025-01-01T00:00:00.000Z",
      mediaCount: 5,
      modelYear: 2025,
      plate: "AAA1A11",
      priceCents: 30_000_000,
      title: "Beta",
      unitStatus: "reserved",
    }),
    createInventoryListingSummary("listing_middle", {
      createdAt: "2026-01-01T00:00:00.000Z",
      mediaCount: 3,
      modelYear: 2024,
      plate: "CCC1C11",
      priceCents: 20_000_000,
      title: "Zeta",
      unitStatus: "sold",
    }),
  ];
}

function ids(items: readonly InventoryListingSummary[]) {
  return items.map(({ listing }) => listing.id);
}

function withoutUnits(
  item: InventoryListingSummary,
  status: InventoryListingSummary["listing"]["status"],
): InventoryListingSummary {
  return {
    ...item,
    listing: { ...item.listing, status },
    primaryUnit: null,
    units: [],
  };
}
