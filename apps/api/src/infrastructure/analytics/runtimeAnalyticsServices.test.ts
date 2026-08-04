import {
  financeEntries,
  leads,
  sales,
  vehicleChecklists,
  vehicleListings,
  vehicleUnits,
} from "@lojaveiculosv2/db";
import { describe, expect, it } from "vitest";
import {
  createServiceContext,
  type StoreScopedServiceContext,
} from "../../shared/serviceContext.js";
import { createRuntimeAnalyticsServices } from "./runtimeAnalyticsServices.js";

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
      availableListings: 3,
      reservedListings: 1,
      soldListings: 1,
      totalListings: 4,
    });
    expect(selected).toContainEqual({
      selectionKeys: ["reservedListings"],
      table: vehicleUnits,
    });
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

    expect(selected).toContainEqual({
      joined: [vehicleUnits],
      selectionKeys: ["closedCount", "grossMarginCents", "revenueCents"],
      table: sales,
    });
    expect(selected).toContainEqual({
      joined: [vehicleListings],
      selectionKeys: ["days0to30", "days31to60", "days61to90", "over90"],
      table: vehicleUnits,
    });
    expect(selected).toContainEqual({
      selectionKeys: ["pendingChecklistsCount"],
      table: vehicleChecklists,
    });
  });
});

type SelectedQuery = {
  joined?: unknown[];
  selectionKeys: string[];
  table: unknown;
};

function createAnalyticsDb(selected: SelectedQuery[]) {
  return {
    select(selection: Record<string, unknown>) {
      return {
        from(table: unknown) {
          const query: SelectedQuery = {
            selectionKeys: Object.keys(selection),
            table,
          };
          selected.push(query);

          const joinable = {
            where() {
              const rows = rowsFor(query);
              const result = Promise.resolve(rows) as Promise<unknown[]> & {
                groupBy: () => Promise<unknown[]>;
              };
              result.groupBy = () => Promise.resolve(rows);
              return result;
            },
          };

          return {
            ...joinable,
            innerJoin(joined: unknown) {
              query.joined = [...(query.joined ?? []), joined];
              return joinable;
            },
            leftJoin(joined: unknown) {
              query.joined = [...(query.joined ?? []), joined];
              return joinable;
            },
          };
        },
      };
    },
  } as never;
}

function rowsFor(query: SelectedQuery): unknown[] {
  const { selectionKeys, table } = query;

  if (table === vehicleListings) {
    if (selectionKeys.includes("reservedListings")) {
      throw new Error("Reserved listings must be counted from vehicle_units.");
    }

    return [
      {
        averagePriceCents: 29205000,
        availableListings: 3,
        soldListings: 1,
        totalListings: 4,
      },
    ];
  }

  if (table === vehicleUnits && selectionKeys.includes("reservedListings")) {
    return [{ reservedListings: 1 }];
  }

  if (table === vehicleUnits) {
    return [{ days0to30: 5, days31to60: 3, days61to90: 2, over90: 1 }];
  }

  if (table === sales && selectionKeys.includes("closedCount")) {
    return [
      { closedCount: 2, grossMarginCents: 2650000, revenueCents: 14650000 },
    ];
  }

  if (table === sales) {
    return [{ closedSalesCents: 14650000 }];
  }

  if (
    table === financeEntries &&
    selectionKeys.includes("overdueReceivablesCents")
  ) {
    return [{ overdueReceivablesCents: 450000, overdueReceivablesCount: 2 }];
  }

  if (table === financeEntries) {
    return [{ openReceivablesCents: 75990000, paidReceiptsCents: 14650000 }];
  }

  if (table === vehicleChecklists) {
    return [{ pendingChecklistsCount: 4 }];
  }

  if (table === leads && selectionKeys.includes("value")) {
    return [{ key: "whatsapp", value: 1 }];
  }

  if (table === leads) {
    return [{ count: 1, key: "qualified" }];
  }

  throw new Error("Unexpected analytics table.");
}

function createAnalyticsContext(): StoreScopedServiceContext {
  return {
    ...createServiceContext({
      actor: { id: "user_1", kind: "user" },
      permissions: ["analytics.read"],
      request: { requestId: "req_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    entitlements: ["analytics"],
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}
