import type {
  financeEntries,
  leads,
  sales,
  vehicleChecklists,
  vehicleListings,
  vehicleUnits,
} from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { AnalyticsPeriod } from "../../domains/analytics/ports/analyticsRepository.js";

export type RuntimeAnalyticsClient = PostgresJsDatabase<typeof schema>;

export type DashboardScope = {
  period: AnalyticsPeriod;
  storeId: string;
  tenantId: string;
};

export function scoped(
  table:
    | typeof vehicleListings
    | typeof vehicleUnits
    | typeof vehicleChecklists
    | typeof sales
    | typeof financeEntries
    | typeof leads,
  input: { storeId: string; tenantId: string },
) {
  return and(
    eq(table.storeId, input.storeId),
    eq(table.tenantId, input.tenantId),
  );
}

// Returned as ISO strings: raw sql template params go through postgres.js
// prepared statements, which reject Date instances (ERR_INVALID_ARG_TYPE).
export function dayStart(day: string): string {
  return `${day}T00:00:00.000Z`;
}

export function nextDay(day: string): string {
  return new Date(
    Date.parse(`${day}T00:00:00.000Z`) + 24 * 60 * 60 * 1000,
  ).toISOString();
}

export function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(cents / 100);
}

export function label(value: string) {
  return value.replaceAll("_", " ");
}
