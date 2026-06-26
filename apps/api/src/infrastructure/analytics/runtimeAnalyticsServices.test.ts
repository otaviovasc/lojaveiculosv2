import {
  financeEntries,
  leads,
  sales,
  vehicleListings,
  vehicleUnits,
} from "@lojaveiculosv2/db";
import { describe, expect, it } from "vitest";
import {
  createServiceContext,
  type StoreScopedServiceContext,
} from "../../shared/serviceContext.js";
import { createRuntimeAnalyticsServices } from "./runtimeAnalyticsServices.js";

describe("createRuntimeAnalyticsServices", () => {
  it("counts reserved inventory from vehicle units instead of listing status", async () => {
    const selected: SelectedQuery[] = [];
    const services = createRuntimeAnalyticsServices(
      createAnalyticsDb(selected),
    );

    const dashboard = await services.getDashboard(createAnalyticsContext());

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
});

type SelectedQuery = {
  selectionKeys: string[];
  table: unknown;
};

function createAnalyticsDb(selected: SelectedQuery[]) {
  return {
    select(selection: Record<string, unknown>) {
      return {
        from(table: unknown) {
          const selectionKeys = Object.keys(selection);
          selected.push({ selectionKeys, table });

          return {
            where() {
              const rows = rowsFor(table, selectionKeys);
              const result = Promise.resolve(rows) as Promise<unknown[]> & {
                groupBy: () => Promise<unknown[]>;
              };
              result.groupBy = () => Promise.resolve(rows);
              return result;
            },
          };
        },
      };
    },
  } as never;
}

function rowsFor(table: unknown, selectionKeys: string[]): unknown[] {
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

  if (table === vehicleUnits) {
    return [{ reservedListings: 1 }];
  }

  if (table === sales) {
    return [{ closedSalesCents: 14650000 }];
  }

  if (table === financeEntries) {
    return [{ openReceivablesCents: 75990000, paidReceiptsCents: 14650000 }];
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
