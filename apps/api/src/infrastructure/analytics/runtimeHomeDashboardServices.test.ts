import { leads, vehicleListings } from "@lojaveiculosv2/db";
import { describe, expect, it } from "vitest";
import {
  createServiceContext,
  type StoreScopedServiceContext,
} from "../../shared/serviceContext.js";
import { createRuntimeAnalyticsServices } from "./runtimeAnalyticsServices.js";

const PERIOD = { from: "2026-07-01", to: "2026-07-30" };

describe("runtime home dashboard services", () => {
  it("loads only core inventory and lead counts", async () => {
    const selectedTables: unknown[] = [];
    const services = createRuntimeAnalyticsServices(
      createHomeDashboardDb(selectedTables),
    );

    const dashboard = await services.getHomeDashboard(createContext(), {
      period: PERIOD,
    });

    expect(dashboard).toMatchObject({
      inventory: { availableListings: 3, totalListings: 4 },
      leadSummary: { activeLeads: 6 },
    });
    expect(selectedTables).toEqual([vehicleListings, leads]);
  });
});

function createHomeDashboardDb(selectedTables: unknown[]) {
  return {
    select(selection: Record<string, unknown>) {
      return {
        from(table: unknown) {
          selectedTables.push(table);
          return {
            where() {
              return Promise.resolve(
                table === vehicleListings
                  ? [{ availableListings: 3, totalListings: 4 }]
                  : [{ count: Object.keys(selection).length === 1 ? 6 : 0 }],
              );
            },
          };
        },
      };
    },
  } as never;
}

function createContext(): StoreScopedServiceContext {
  return {
    ...createServiceContext({
      actor: { id: "user_1", kind: "user" },
      permissions: ["dashboard.read"],
      request: { requestId: "req_home" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    entitlements: [],
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}
