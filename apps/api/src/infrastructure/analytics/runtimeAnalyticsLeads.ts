import { leads } from "@lojaveiculosv2/db";
import { and, notInArray, sql } from "drizzle-orm";
import {
  dayStart,
  label,
  nextDay,
  scoped,
  type DashboardScope,
  type RuntimeAnalyticsClient,
} from "./runtimeAnalyticsSupport.js";

export async function getLeadFunnel(
  db: RuntimeAnalyticsClient,
  input: DashboardScope,
) {
  const toExclusive = nextDay(input.period.to);
  const rows = await db
    .select({ count: sql<number>`count(*)::int`, key: leads.status })
    .from(leads)
    .where(
      and(
        scoped(leads, input),
        sql`${leads.createdAt} >= ${dayStart(input.period.from)}`,
        sql`${leads.createdAt} < ${toExclusive}`,
        sql`${leads.isDeleted} = false`,
      ),
    )
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
  const toExclusive = nextDay(input.period.to);
  const rows = await db
    .select({ key: leads.source, value: sql<number>`count(*)::int` })
    .from(leads)
    .where(
      and(
        scoped(leads, input),
        sql`${leads.createdAt} >= ${dayStart(input.period.from)}`,
        sql`${leads.createdAt} < ${toExclusive}`,
        sql`${leads.isDeleted} = false`,
      ),
    )
    .groupBy(leads.source);
  return rows.map((row) => ({
    key: row.key,
    label: label(row.key),
    value: row.value,
  }));
}

export async function getActiveLeadCount(
  db: RuntimeAnalyticsClient,
  input: DashboardScope,
) {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leads)
    .where(
      and(scoped(leads, input), notInArray(leads.status, ["lost", "won"])),
    );
  return rows[0]?.count ?? 0;
}
