import {
  commissions,
  documents,
  financeEntries,
  leadActivities,
  leads,
  sales,
  vehicleChecklists,
  vehicleCosts,
  vehicleListings,
  vehicleUnits,
} from "@lojaveiculosv2/db";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  createServiceContext,
  type StoreScopedServiceContext,
} from "../../shared/serviceContext.js";

export type SelectedQuery = {
  joined?: unknown[];
  selection: Record<string, unknown>;
  selectionKeys: string[];
  table: unknown;
  where?: unknown;
};

export function createAnalyticsDb(selected: SelectedQuery[]) {
  return {
    select(selection: Record<string, unknown>) {
      return {
        from(table: unknown) {
          const query: SelectedQuery = {
            selection,
            selectionKeys: Object.keys(selection),
            table,
          };
          selected.push(query);
          const joinable = {
            innerJoin(joined: unknown) {
              query.joined = [...(query.joined ?? []), joined];
              return joinable;
            },
            leftJoin(joined: unknown) {
              query.joined = [...(query.joined ?? []), joined];
              return joinable;
            },
            where(condition?: unknown) {
              query.where = condition;
              const rows = rowsFor(query);
              const result = Promise.resolve(rows) as Promise<unknown[]> & {
                groupBy: () => Promise<unknown[]>;
              };
              result.groupBy = () => Promise.resolve(rows);
              return result;
            },
          };
          return joinable;
        },
      };
    },
  } as never;
}

export function renderSql(value: unknown) {
  return new PgDialect().sqlToQuery(value as SQL);
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
        availableAskingValueCents: 45000000,
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
  if (table === sales && selectionKeys.includes("saleId")) {
    return [
      {
        acquisitionPriceCents: 12000000,
        closedAt: new Date("2026-07-15T12:00:00.000Z"),
        plate: "ABC1D23",
        saleId: "sale_1",
        salePriceCents: 14650000,
        title: "Sedan 2.0",
        unitId: "unit_1",
      },
    ];
  }
  if (table === sales) return [{ closedSalesCents: 14650000 }];
  if (
    table === financeEntries &&
    selectionKeys.includes("overdueReceivablesCents")
  ) {
    return [{ overdueReceivablesCents: 450000, overdueReceivablesCount: 2 }];
  }
  if (table === financeEntries && selectionKeys.includes("paidOutflowCents")) {
    return [
      {
        paidOutflowCents: 800000,
        pendingOutflowCents: 300000,
        plannedOutflowCents: 1100000,
        plannedRevenueCents: 15000000,
        receivedRevenueCents: 14650000,
      },
    ];
  }
  if (table === financeEntries && selectionKeys.includes("plannedCents")) {
    return [
      {
        count: 2,
        key: "preparation",
        paidCents: 800000,
        plannedCents: 1100000,
      },
    ];
  }
  if (table === financeEntries) {
    return [{ openReceivablesCents: 75990000, paidReceiptsCents: 14650000 }];
  }
  if (table === vehicleChecklists) return [{ pendingChecklistsCount: 4 }];
  if (table === vehicleCosts) {
    return [
      {
        acquisitionCents: 12000000,
        operationalCostsCents: 500000,
        unitId: "unit_1",
      },
    ];
  }
  if (table === commissions) {
    return [{ commissionCents: 150000, saleId: "sale_1" }];
  }
  if (table === leads && selectionKeys.includes("value")) {
    return [{ key: "whatsapp", value: 1 }];
  }
  if (table === leads && selectionKeys.includes("totalLeads")) {
    return [{ lostLeads: 1, totalLeads: 2, wonLeads: 1 }];
  }
  if (table === leads) return [{ count: 1, key: "qualified" }];
  if (table === leadActivities) return [{ interactionCount: 8 }];
  if (table === documents && selectionKeys.includes("total")) {
    return [{ issued: 1, pendingSignature: 1, signed: 2, total: 4 }];
  }
  if (table === documents) return [{ count: 4, key: "other" }];
  throw new Error("Unexpected analytics table.");
}

export function createAnalyticsContext(
  permissions: StoreScopedServiceContext["permissions"] = [
    "analytics.read",
    "crm.pipeline.read",
    "documents.read",
    "finance.read",
  ],
): StoreScopedServiceContext {
  return {
    ...createServiceContext({
      actor: { id: "user_1", kind: "user" },
      permissions,
      request: { requestId: "req_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    entitlements: ["analytics"],
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}
