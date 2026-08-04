import { leads } from "@lojaveiculosv2/db";
import { sql } from "drizzle-orm";
import {
  label,
  scoped,
  type DashboardScope,
  type RuntimeAnalyticsClient,
} from "./runtimeAnalyticsSupport.js";

export async function getLeadFunnel(
  db: RuntimeAnalyticsClient,
  input: DashboardScope,
) {
  const rows = await db
    .select({ count: sql<number>`count(*)::int`, key: leads.status })
    .from(leads)
    .where(scoped(leads, input))
    .groupBy(leads.status);
  return rows.map((row) => ({
    count: row.count,
    key: row.key,
    label: label(row.key),
  }));
}

export async function getLeadSources(
  db: RuntimeAnalyticsClient,
  input: DashboardScope,
) {
  const rows = await db
    .select({ key: leads.source, value: sql<number>`count(*)::int` })
    .from(leads)
    .where(scoped(leads, input))
    .groupBy(leads.source);
  return rows.map((row) => ({
    key: row.key,
    label: label(row.key),
    value: row.value,
  }));
}
