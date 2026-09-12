import { describe, expect, it } from "vitest";
import { buildAgencyStatsReport } from "./drizzleAgencyStatsModel.js";

describe("buildAgencyStatsReport", () => {
  it("builds weighted network totals without inventing missing store metrics", () => {
    const report = buildAgencyStatsReport(
      {
        period: { from: "2026-08-01", to: "2026-08-22" },
        tenantId: "tenant_1",
      },
      [store("store_1", "Centro"), store("store_2", "Norte")],
      [store("store_1", "Centro"), store("store_2", "Norte")],
      {
        leadRows: [
          {
            count: 8,
            source: "public_site",
            status: "new",
            storeId: "store_1",
          },
          {
            count: 2,
            source: "public_site",
            status: "won",
            storeId: "store_1",
          },
        ],
        listingRows: [
          { availableListings: 4, storeId: "store_1", totalListings: 6 },
        ],
        saleRows: [
          {
            closedCount: 2,
            grossMarginCents: 4000,
            revenueCents: 20000,
            storeId: "store_1",
          },
          {
            closedCount: 1,
            grossMarginCents: 1000,
            revenueCents: 10000,
            storeId: "store_2",
          },
        ],
        unitRows: [{ reservedUnits: 1, storeId: "store_1" }],
      },
    );

    expect(report.totals.sales).toEqual({
      averageTicketCents: 10000,
      closedCount: 3,
      grossMarginCents: 5000,
      revenueCents: 30000,
    });
    expect(report.totals.leads.conversionRate).toBe(20);
    expect(report.stores[1]).toMatchObject({
      inventory: { availableListings: 0, reservedUnits: 0, totalListings: 0 },
      leads: { totalCount: 0 },
    });
    expect(report.leadSources).toEqual([
      { count: 10, key: "public_site", label: "Site público" },
    ]);
  });
});

function store(storeId: string, storeName: string) {
  return {
    storeId,
    storeName,
    storeSlug: storeName.toLocaleLowerCase("pt-BR"),
  };
}
