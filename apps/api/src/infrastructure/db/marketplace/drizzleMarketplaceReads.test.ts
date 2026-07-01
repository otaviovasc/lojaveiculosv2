import { describe, expect, it } from "vitest";
import {
  vehicleListings,
  vehicleMedia,
  vehicleUnits,
} from "@lojaveiculosv2/db";
import { findListingProjection } from "./drizzleMarketplaceReads.js";
import type { DrizzleMarketplaceClient } from "./drizzleMarketplaceRepository.js";

describe("drizzle marketplace reads", () => {
  it("selects media from the deterministic first unit with public photos", async () => {
    const db = createFakeMarketplaceDb();

    const projection = await findListingProjection(db, {
      listingId: "listing_m3",
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    expect(projection?.mediaUrls).toEqual([
      "https://cdn.local/m3-black-front.jpg",
      "https://cdn.local/m3-black-side.jpg",
    ]);
    expect(db.orderedTables).toContain(vehicleMedia);
  });
});

function createFakeMarketplaceDb() {
  const orderedTables: unknown[] = [];
  const db = {
    orderedTables,
    select() {
      return {
        from(table: unknown) {
          const tableRows = rowsFor(table);
          return {
            where() {
              return {
                async limit(count: number) {
                  return tableRows.slice(0, count);
                },
                orderBy() {
                  orderedTables.push(table);
                  return Promise.resolve(tableRows);
                },
              };
            },
          };
        },
      };
    },
  };

  return db as typeof db & DrizzleMarketplaceClient;
}

function rowsFor(table: unknown) {
  if (table === vehicleListings) {
    return [
      {
        askingPriceCents: 75990000,
        description: "BMW M3 Competition M.",
        id: "listing_m3",
        isVisibleOnPublicSite: true,
        modelYear: 2025,
        status: "published",
        title: "BMW M3 Competition M 2025",
      },
    ];
  }
  if (table === vehicleUnits) {
    return [
      {
        id: "unit_green",
        status: "available",
        stockNumber: "M3-GREEN",
      },
      {
        id: "unit_black",
        status: "available",
        stockNumber: "M3-BLACK",
      },
    ];
  }
  if (table === vehicleMedia) {
    return [
      {
        displayOrder: 0,
        kind: "photo",
        unitId: "unit_green",
        url: "https://cdn.local/m3-green-front.jpg",
      },
      {
        displayOrder: 0,
        kind: "photo",
        unitId: "unit_black",
        url: "https://cdn.local/m3-black-front.jpg",
      },
      {
        displayOrder: 1,
        kind: "photo",
        unitId: "unit_black",
        url: "https://cdn.local/m3-black-side.jpg",
      },
    ];
  }
  throw new Error(`Unhandled marketplace table: ${String(table)}`);
}
