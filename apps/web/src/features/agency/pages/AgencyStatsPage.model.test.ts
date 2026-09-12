import { describe, expect, it } from "vitest";
import type { AgencyStatsReport } from "../apiClient";
import {
  defaultAgencyStatsPeriod,
  periodForDays,
  readAgencyStatsFilters,
  reportHasActivity,
} from "./AgencyStatsPage.model";

describe("AgencyStatsPage model", () => {
  it("creates inclusive local-date presets", () => {
    const now = new Date(2026, 7, 22, 12);
    expect(defaultAgencyStatsPeriod(now)).toEqual({
      from: "2026-07-24",
      to: "2026-08-22",
    });
    expect(periodForDays(7, now)).toEqual({
      from: "2026-08-16",
      to: "2026-08-22",
    });
  });

  it("keeps valid URL scope and replaces invalid periods", () => {
    const valid = new URLSearchParams(
      "from=2026-08-01&to=2026-08-22&storeId=store_1",
    );
    expect(readAgencyStatsFilters(valid)).toEqual({
      period: { from: "2026-08-01", to: "2026-08-22" },
      storeId: "store_1",
    });

    const invalid = new URLSearchParams("from=2026-08-22&to=2026-08-01");
    expect(
      readAgencyStatsFilters(invalid, new Date(2026, 7, 22, 12)).period,
    ).toEqual({ from: "2026-07-24", to: "2026-08-22" });
  });

  it("treats any persisted operational source as real activity", () => {
    const report = emptyReport();
    expect(reportHasActivity(report)).toBe(false);
    expect(
      reportHasActivity({
        ...report,
        totals: {
          ...report.totals,
          inventory: { ...report.totals.inventory, totalListings: 1 },
        },
      }),
    ).toBe(true);
  });
});

function emptyReport(): AgencyStatsReport {
  return {
    availableStores: [],
    generatedAt: "2026-08-22T12:00:00.000Z",
    leadSources: [],
    period: { from: "2026-08-01", to: "2026-08-22" },
    scopeStoreId: null,
    stores: [],
    tenantId: "tenant_1",
    totals: {
      inventory: { availableListings: 0, reservedUnits: 0, totalListings: 0 },
      leads: { activeCount: 0, conversionRate: 0, totalCount: 0, wonCount: 0 },
      sales: {
        averageTicketCents: 0,
        closedCount: 0,
        grossMarginCents: 0,
        revenueCents: 0,
      },
      storeCount: 0,
    },
  };
}
