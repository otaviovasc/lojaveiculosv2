import {
  sales,
  vehicleChecklists,
  vehicleListings,
  vehicleUnits,
} from "@lojaveiculosv2/db";
import { describe, expect, it } from "vitest";
import { createRuntimeAnalyticsServices } from "./runtimeAnalyticsServices.js";
import {
  createAnalyticsContext,
  createAnalyticsDb,
  type SelectedQuery,
} from "./testSupportRuntimeAnalytics.js";

const PERIOD = { from: "2026-07-01", to: "2026-07-30" };

describe("createRuntimeAnalyticsServices", () => {
  it("counts reserved inventory from vehicle units instead of listing status", async () => {
    const selected: SelectedQuery[] = [];
    const services = createRuntimeAnalyticsServices(
      createAnalyticsDb(selected),
    );

    const dashboard = await services.getDashboard(createAnalyticsContext(), {
      period: PERIOD,
    });

    expect(dashboard.inventory).toMatchObject({
      availableAskingValueCents: 45000000,
      availableListings: 3,
      reservedListings: 1,
      soldListings: 1,
      totalListings: 4,
    });
    expect(selected).toContainEqual(
      expect.objectContaining({
        selectionKeys: ["reservedListings"],
        table: vehicleUnits,
      }),
    );
    expect(
      selected.some(
        (query) =>
          query.table === vehicleListings &&
          query.selectionKeys.includes("reservedListings"),
      ),
    ).toBe(false);
  });

  it("echoes the requested period and maps sales metrics with margin and aging", async () => {
    const services = createRuntimeAnalyticsServices(createAnalyticsDb([]));

    const dashboard = await services.getDashboard(createAnalyticsContext(), {
      period: PERIOD,
    });

    expect(dashboard.period).toEqual(PERIOD);
    expect(dashboard.sales).toEqual({
      avgTicketCents: 7325000,
      closedCount: 2,
      grossMarginCents: 2650000,
      revenueCents: 14650000,
    });
    expect(dashboard.inventory.ageBuckets).toEqual({
      days0to30: 5,
      days31to60: 3,
      days61to90: 2,
      over90: 1,
    });
    expect(dashboard.attention).toEqual({
      overdueReceivablesCents: 450000,
      overdueReceivablesCount: 2,
      pendingChecklistsCount: 4,
    });
    expect(dashboard.revenue).toEqual({
      closedSalesCents: 14650000,
      openReceivablesCents: 75990000,
      paidReceiptsCents: 14650000,
    });
    expect(dashboard.revenue).not.toHaveProperty("grossMarginCents");
  });

  it("queries margin from the sold unit acquisition cost and aging from units joined to listings", async () => {
    const selected: SelectedQuery[] = [];
    const services = createRuntimeAnalyticsServices(
      createAnalyticsDb(selected),
    );

    await services.getDashboard(createAnalyticsContext(), { period: PERIOD });

    expect(selected).toContainEqual(
      expect.objectContaining({
        joined: [vehicleUnits],
        selectionKeys: ["closedCount", "grossMarginCents", "revenueCents"],
        table: sales,
      }),
    );
    expect(selected).toContainEqual(
      expect.objectContaining({
        joined: [vehicleListings],
        selectionKeys: ["days0to30", "days31to60", "days61to90", "over90"],
        table: vehicleUnits,
      }),
    );
    expect(selected).toContainEqual(
      expect.objectContaining({
        selectionKeys: ["pendingChecklistsCount"],
        table: vehicleChecklists,
      }),
    );
  });
});
