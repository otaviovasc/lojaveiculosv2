import {
  financeEntries,
  leads,
  sales,
  vehicleListings,
  vehicleUnits,
} from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import { and, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  createAnalyticsServices,
  type AnalyticsServices,
} from "../../features/analytics/controllers/analyticsServices.js";

export type RuntimeAnalyticsClient = PostgresJsDatabase<typeof schema>;

export function createRuntimeAnalyticsServices(
  db: RuntimeAnalyticsClient,
): AnalyticsServices {
  return createAnalyticsServices({
    analyticsRepository: {
      async getDashboard(input) {
        const [inventory, revenue, funnel, sources] = await Promise.all([
          getInventory(db, input),
          getRevenue(db, input),
          getLeadFunnel(db, input),
          getLeadSources(db, input),
        ]);
        return {
          generatedAt: new Date(),
          inventory,
          kpis: createKpis(inventory, revenue, funnel),
          leadFunnel: funnel,
          leadSources: sources,
          revenue,
          storeId: input.storeId,
          tenantId: input.tenantId,
        };
      },
    },
  });
}

async function getInventory(
  db: RuntimeAnalyticsClient,
  input: { storeId: string; tenantId: string },
) {
  const [listingRow, unitRow] = await Promise.all([
    db
      .select({
        averagePriceCents: sql<number>`coalesce(avg(${vehicleListings.askingPriceCents}), 0)::int`,
        availableListings: sql<number>`count(*) filter (where ${vehicleListings.status} = 'published')::int`,
        soldListings: sql<number>`count(*) filter (where ${vehicleListings.status} = 'sold_out')::int`,
        totalListings: sql<number>`count(*)::int`,
      })
      .from(vehicleListings)
      .where(scoped(vehicleListings, input)),
    db
      .select({
        reservedListings: sql<number>`count(distinct ${vehicleUnits.listingId}) filter (where ${vehicleUnits.status} = 'reserved')::int`,
      })
      .from(vehicleUnits)
      .where(scoped(vehicleUnits, input)),
  ]);
  const listing = listingRow[0];
  const unit = unitRow[0];

  return {
    ...{
      averagePriceCents: 0,
      availableListings: 0,
      soldListings: 0,
      totalListings: 0,
    },
    ...listing,
    reservedListings: unit?.reservedListings ?? 0,
  };
}

async function getRevenue(
  db: RuntimeAnalyticsClient,
  input: { storeId: string; tenantId: string },
) {
  const [salesRow] = await db
    .select({
      closedSalesCents: sql<number>`coalesce(sum(${sales.salePriceCents}) filter (where ${sales.status} = 'closed'), 0)::int`,
    })
    .from(sales)
    .where(scoped(sales, input));
  const [financeRow] = await db
    .select({
      openReceivablesCents: sql<number>`coalesce(sum(${financeEntries.amountCents}) filter (where ${financeEntries.type} = 'revenue' and ${financeEntries.status} = 'pending'), 0)::int`,
      paidReceiptsCents: sql<number>`coalesce(sum(${financeEntries.amountCents}) filter (where ${financeEntries.type} = 'revenue' and ${financeEntries.status} = 'paid'), 0)::int`,
    })
    .from(financeEntries)
    .where(scoped(financeEntries, input));
  return {
    closedSalesCents: salesRow?.closedSalesCents ?? 0,
    grossMarginCents: 0,
    openReceivablesCents: financeRow?.openReceivablesCents ?? 0,
    paidReceiptsCents: financeRow?.paidReceiptsCents ?? 0,
  };
}

async function getLeadFunnel(
  db: RuntimeAnalyticsClient,
  input: { storeId: string; tenantId: string },
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

async function getLeadSources(
  db: RuntimeAnalyticsClient,
  input: { storeId: string; tenantId: string },
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

function createKpis(
  inventory: Awaited<ReturnType<typeof getInventory>>,
  revenue: Awaited<ReturnType<typeof getRevenue>>,
  funnel: Awaited<ReturnType<typeof getLeadFunnel>>,
) {
  return [
    {
      deltaLabel: "periodo atual",
      label: "GMV fechado",
      value: money(revenue.closedSalesCents),
    },
    {
      deltaLabel: "em aberto",
      label: "Recebiveis",
      value: money(revenue.openReceivablesCents),
    },
    {
      deltaLabel: "funil ativo",
      label: "Leads",
      value: String(funnel.reduce((sum, item) => sum + item.count, 0)),
    },
    {
      deltaLabel: "estoque total",
      label: "Disponiveis",
      value: `${inventory.availableListings}/${inventory.totalListings}`,
    },
  ];
}

function scoped(
  table:
    | typeof vehicleListings
    | typeof vehicleUnits
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

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(cents / 100);
}

function label(value: string) {
  return value.replaceAll("_", " ");
}
