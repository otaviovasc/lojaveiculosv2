import {
  commissions,
  financeEntries,
  sales,
  vehicleCosts,
  vehicleListings,
  vehicleUnits,
} from "@lojaveiculosv2/db";
import { and, eq, inArray, ne, or, sql } from "drizzle-orm";
import {
  available,
  emptyFinance,
  emptyOwner,
  restricted,
} from "./runtimeAnalyticsReportAvailability.js";
import {
  dayStart,
  nextDay,
  scoped,
  type DashboardScope,
  type RuntimeAnalyticsClient,
} from "./runtimeAnalyticsSupport.js";

export async function getFinanceReport(
  db: RuntimeAnalyticsClient,
  input: DashboardScope,
  canRead: boolean,
) {
  if (!canRead) return emptyFinance(restricted("finance.read"));
  const from = dayStart(input.period.from);
  const to = nextDay(input.period.to);
  const dueInPeriod = sql`${financeEntries.dueAt} >= ${from} and ${financeEntries.dueAt} < ${to}`;
  const paidInPeriod = sql`${financeEntries.status} = 'paid' and ${financeEntries.paidAt} >= ${from} and ${financeEntries.paidAt} < ${to}`;
  const [totals, categories] = await Promise.all([
    db
      .select({
        paidOutflowCents: sql<number>`coalesce(sum(${financeEntries.amountCents}) filter (where ${financeEntries.type} in ('expense', 'commission') and ${financeEntries.status} = 'paid' and ${financeEntries.paidAt} >= ${from} and ${financeEntries.paidAt} < ${to}), 0)::int`,
        pendingOutflowCents: sql<number>`coalesce(sum(${financeEntries.amountCents}) filter (where ${financeEntries.type} in ('expense', 'commission') and ${financeEntries.status} = 'pending' and ${financeEntries.dueAt} >= ${from} and ${financeEntries.dueAt} < ${to}), 0)::int`,
        plannedOutflowCents: sql<number>`coalesce(sum(${financeEntries.amountCents}) filter (where ${financeEntries.type} in ('expense', 'commission') and ${financeEntries.status} <> 'cancelled' and ${financeEntries.dueAt} >= ${from} and ${financeEntries.dueAt} < ${to}), 0)::int`,
        plannedRevenueCents: sql<number>`coalesce(sum(${financeEntries.amountCents}) filter (where ${financeEntries.type} = 'revenue' and ${financeEntries.status} <> 'cancelled' and ${financeEntries.dueAt} >= ${from} and ${financeEntries.dueAt} < ${to}), 0)::int`,
        receivedRevenueCents: sql<number>`coalesce(sum(${financeEntries.amountCents}) filter (where ${financeEntries.type} = 'revenue' and ${financeEntries.status} = 'paid' and ${financeEntries.paidAt} >= ${from} and ${financeEntries.paidAt} < ${to}), 0)::int`,
      })
      .from(financeEntries)
      .where(scoped(financeEntries, input)),
    db
      .select({
        count: sql<number>`count(*)::int`,
        key: financeEntries.category,
        paidCents: sql<number>`coalesce(sum(${financeEntries.amountCents}) filter (where ${paidInPeriod}), 0)::int`,
        plannedCents: sql<number>`coalesce(sum(${financeEntries.amountCents}) filter (where ${dueInPeriod}), 0)::int`,
      })
      .from(financeEntries)
      .where(
        and(
          scoped(financeEntries, input),
          sql`${financeEntries.type} in ('expense', 'commission')`,
          ne(financeEntries.status, "cancelled"),
          or(dueInPeriod, paidInPeriod),
        ),
      )
      .groupBy(financeEntries.category),
  ]);
  const row = totals[0];
  const receivedRevenueCents = row?.receivedRevenueCents ?? 0;
  const paidOutflowCents = row?.paidOutflowCents ?? 0;
  return {
    availability: available,
    categoryBreakdown: categories,
    paidOutflowCents,
    pendingOutflowCents: row?.pendingOutflowCents ?? 0,
    plannedOutflowCents: row?.plannedOutflowCents ?? 0,
    plannedRevenueCents: row?.plannedRevenueCents ?? 0,
    realizedBalanceCents: receivedRevenueCents - paidOutflowCents,
    receivedRevenueCents,
  };
}

export async function getOwnerReport(
  db: RuntimeAnalyticsClient,
  input: DashboardScope,
  canRead: boolean,
) {
  if (!canRead) return emptyOwner(restricted("finance.read"));
  const from = dayStart(input.period.from);
  const to = nextDay(input.period.to);
  const saleRows = await db
    .select({
      acquisitionPriceCents: vehicleUnits.acquisitionPriceCents,
      closedAt: sales.closedAt,
      plate: vehicleUnits.plate,
      saleId: sales.id,
      salePriceCents: sales.salePriceCents,
      title: vehicleListings.title,
      unitId: sales.unitId,
    })
    .from(sales)
    .leftJoin(vehicleUnits, eq(sales.unitId, vehicleUnits.id))
    .leftJoin(vehicleListings, eq(vehicleUnits.listingId, vehicleListings.id))
    .where(
      and(
        scoped(sales, input),
        eq(sales.status, "closed"),
        eq(sales.isCurrentRevision, true),
        sql`${sales.closedAt} >= ${from}`,
        sql`${sales.closedAt} < ${to}`,
      ),
    );
  const unitIds = saleRows.flatMap((row) => (row.unitId ? [row.unitId] : []));
  const saleIds = saleRows.map((row) => row.saleId);
  const [costRows, commissionRows] = await Promise.all([
    getVehicleCosts(db, input, unitIds),
    getCommissions(db, input, saleIds),
  ]);
  const costsByUnit = new Map(costRows.map((row) => [row.unitId, row]));
  const commissionsBySale = new Map(
    commissionRows.map((row) => [row.saleId, row.commissionCents]),
  );
  const vehicles = saleRows.map((row) => {
    const recorded = row.unitId ? costsByUnit.get(row.unitId) : undefined;
    const acquisitionCents =
      recorded?.acquisitionCents || row.acquisitionPriceCents || 0;
    const operationalCostsCents = recorded?.operationalCostsCents ?? 0;
    const commissionCents = commissionsBySale.get(row.saleId) ?? 0;
    const totalCostCents =
      acquisitionCents + operationalCostsCents + commissionCents;
    const complete = acquisitionCents > 0;
    return {
      acquisitionCents,
      closedAt: row.closedAt ?? new Date(0),
      commissionCents,
      marginCents: complete ? (row.salePriceCents ?? 0) - totalCostCents : null,
      marginStatus: complete
        ? ("complete" as const)
        : ("missing_acquisition" as const),
      operationalCostsCents,
      plate: row.plate,
      saleId: row.saleId,
      salePriceCents: row.salePriceCents ?? 0,
      title: row.title ?? "Veículo vendido sem vínculo atual",
      totalCostCents,
      unitId: row.unitId,
    };
  });
  return {
    availability: available,
    completeSalesCount: vehicles.filter((row) => row.marginCents !== null)
      .length,
    missingAcquisitionCount: vehicles.filter(
      (row) => row.marginStatus === "missing_acquisition",
    ).length,
    officialMarginCents: vehicles.reduce(
      (sum, row) => sum + (row.marginCents ?? 0),
      0,
    ),
    vehicles,
  };
}

function getVehicleCosts(
  db: RuntimeAnalyticsClient,
  input: DashboardScope,
  unitIds: string[],
) {
  if (unitIds.length === 0) return Promise.resolve([]);
  return db
    .select({
      acquisitionCents: sql<number>`coalesce(sum(${vehicleCosts.amountCents}) filter (where ${vehicleCosts.kind} = 'acquisition'), 0)::int`,
      operationalCostsCents: sql<number>`coalesce(sum(${vehicleCosts.amountCents}) filter (where ${vehicleCosts.kind} <> 'acquisition'), 0)::int`,
      unitId: vehicleCosts.unitId,
    })
    .from(vehicleCosts)
    .where(
      and(
        scoped(vehicleCosts, input),
        inArray(vehicleCosts.unitId, unitIds),
        eq(vehicleCosts.status, "active"),
      ),
    )
    .groupBy(vehicleCosts.unitId);
}

function getCommissions(
  db: RuntimeAnalyticsClient,
  input: DashboardScope,
  saleIds: string[],
) {
  if (saleIds.length === 0) return Promise.resolve([]);
  return db
    .select({
      commissionCents: sql<number>`coalesce(sum(${commissions.amountCents}), 0)::int`,
      saleId: commissions.saleId,
    })
    .from(commissions)
    .where(
      and(
        scoped(commissions, input),
        inArray(commissions.saleId, saleIds),
        ne(commissions.status, "cancelled"),
      ),
    )
    .groupBy(commissions.saleId);
}
