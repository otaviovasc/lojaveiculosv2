import { financeEntries, sales, vehicleUnits } from "@lojaveiculosv2/db";
import { and, eq, sql } from "drizzle-orm";
import {
  dayStart,
  nextDay,
  scoped,
  type DashboardScope,
  type RuntimeAnalyticsClient,
} from "./runtimeAnalyticsSupport.js";

export async function getRevenue(
  db: RuntimeAnalyticsClient,
  input: DashboardScope,
) {
  const toExclusive = nextDay(input.period.to);
  const [salesRow] = await db
    .select({
      closedSalesCents: sql<number>`coalesce(sum(${sales.salePriceCents}), 0)::int`,
    })
    .from(sales)
    .where(
      and(
        scoped(sales, input),
        eq(sales.status, "closed"),
        eq(sales.isCurrentRevision, true),
        sql`${sales.closedAt} >= ${dayStart(input.period.from)}`,
        sql`${sales.closedAt} < ${toExclusive}`,
      ),
    );
  const [financeRow] = await db
    .select({
      // Open receivables mean pending revenue due inside the selected period.
      openReceivablesCents: sql<number>`coalesce(sum(${financeEntries.amountCents}) filter (where ${financeEntries.type} = 'revenue' and ${financeEntries.status} = 'pending' and ${financeEntries.dueAt} >= ${dayStart(input.period.from)} and ${financeEntries.dueAt} < ${toExclusive}), 0)::int`,
      // Paid receipts are period-filtered on the paid_at timestamp.
      paidReceiptsCents: sql<number>`coalesce(sum(${financeEntries.amountCents}) filter (where ${financeEntries.type} = 'revenue' and ${financeEntries.status} = 'paid' and ${financeEntries.paidAt} >= ${dayStart(input.period.from)} and ${financeEntries.paidAt} < ${toExclusive}), 0)::int`,
    })
    .from(financeEntries)
    .where(scoped(financeEntries, input));
  return {
    closedSalesCents: salesRow?.closedSalesCents ?? 0,
    openReceivablesCents: financeRow?.openReceivablesCents ?? 0,
    paidReceiptsCents: financeRow?.paidReceiptsCents ?? 0,
  };
}

export async function getSalesMetrics(
  db: RuntimeAnalyticsClient,
  input: DashboardScope,
) {
  const toExclusive = nextDay(input.period.to);
  // Gross margin is sale price minus the unit acquisition cost
  // (vehicle_units.acquisition_price_cents). Preparation and other vehicle
  // costs are deliberately excluded so margin stays "sale - acquisition".
  // Only the current revision of each sale is counted to avoid double
  // counting corrected sales.
  const [row] = await db
    .select({
      closedCount: sql<number>`count(*)::int`,
      grossMarginCents: sql<number>`coalesce(sum(${sales.salePriceCents} - coalesce(${vehicleUnits.acquisitionPriceCents}, 0)), 0)::int`,
      revenueCents: sql<number>`coalesce(sum(${sales.salePriceCents}), 0)::int`,
    })
    .from(sales)
    .leftJoin(vehicleUnits, eq(sales.unitId, vehicleUnits.id))
    .where(
      and(
        scoped(sales, input),
        eq(sales.status, "closed"),
        eq(sales.isCurrentRevision, true),
        sql`${sales.closedAt} >= ${dayStart(input.period.from)}`,
        sql`${sales.closedAt} < ${toExclusive}`,
      ),
    );
  const closedCount = row?.closedCount ?? 0;
  const revenueCents = row?.revenueCents ?? 0;
  return {
    avgTicketCents:
      closedCount > 0 ? Math.round(revenueCents / closedCount) : 0,
    closedCount,
    grossMarginCents: row?.grossMarginCents ?? 0,
    revenueCents,
  };
}
