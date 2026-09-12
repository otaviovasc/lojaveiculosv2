import { financeEntries, vehicleChecklists } from "@lojaveiculosv2/db";
import { and, sql } from "drizzle-orm";
import {
  scoped,
  type DashboardScope,
  type RuntimeAnalyticsClient,
} from "./runtimeAnalyticsSupport.js";

export async function getAttention(
  db: RuntimeAnalyticsClient,
  input: DashboardScope,
) {
  const [[financeRow], [checklistRow]] = await Promise.all([
    db
      .select({
        overdueReceivablesCents: sql<number>`coalesce(sum(${financeEntries.amountCents}) filter (where ${financeEntries.type} = 'revenue' and ${financeEntries.status} = 'pending' and ${financeEntries.dueAt} < now()), 0)::int`,
        overdueReceivablesCount: sql<number>`count(*) filter (where ${financeEntries.type} = 'revenue' and ${financeEntries.status} = 'pending' and ${financeEntries.dueAt} < now())::int`,
      })
      .from(financeEntries)
      .where(scoped(financeEntries, input)),
    db
      .select({
        pendingChecklistsCount: sql<number>`count(*)::int`,
      })
      .from(vehicleChecklists)
      .where(
        and(
          scoped(vehicleChecklists, input),
          sql`${vehicleChecklists.status} in ('pending', 'in_progress')`,
        ),
      ),
  ]);
  return {
    overdueReceivablesCents: financeRow?.overdueReceivablesCents ?? 0,
    overdueReceivablesCount: financeRow?.overdueReceivablesCount ?? 0,
    pendingChecklistsCount: checklistRow?.pendingChecklistsCount ?? 0,
  };
}
