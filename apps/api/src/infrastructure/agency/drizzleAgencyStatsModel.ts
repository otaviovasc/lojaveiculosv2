import type {
  AgencyStatsReport,
  AgencyStatsRepository,
  AgencyStatsStoreOption,
  AgencyStatsStoreRow,
} from "../../domains/agency/ports/agencyStatsRepository.js";

export type AgencyStatsQueryRows = {
  leadRows: readonly {
    count: number;
    source: string;
    status: string;
    storeId: string;
  }[];
  listingRows: readonly {
    availableListings: number;
    storeId: string;
    totalListings: number;
  }[];
  saleRows: readonly {
    closedCount: number;
    grossMarginCents: number;
    revenueCents: number;
    storeId: string;
  }[];
  unitRows: readonly { reservedUnits: number; storeId: string }[];
};

export function buildAgencyStatsReport(
  input: Parameters<AgencyStatsRepository["getStats"]>[0],
  availableStores: readonly AgencyStatsStoreOption[],
  scopedStores: readonly AgencyStatsStoreOption[],
  rows: AgencyStatsQueryRows,
): AgencyStatsReport {
  const reportStores = scopedStores.map((store) => buildStoreRow(store, rows));
  const salesTotals = reportStores.reduce(
    (totals, store) => ({
      closedCount: totals.closedCount + store.sales.closedCount,
      grossMarginCents: totals.grossMarginCents + store.sales.grossMarginCents,
      revenueCents: totals.revenueCents + store.sales.revenueCents,
    }),
    { closedCount: 0, grossMarginCents: 0, revenueCents: 0 },
  );
  const totalLeads = sum(reportStores.map((store) => store.leads.totalCount));
  const wonLeads = sum(reportStores.map((store) => store.leads.wonCount));
  const allowedStoreIds = new Set(reportStores.map((store) => store.storeId));
  return {
    availableStores,
    generatedAt: new Date(),
    leadSources: aggregateLeadSources(
      rows.leadRows.filter((row) => allowedStoreIds.has(row.storeId)),
    ),
    period: input.period,
    scopeStoreId: input.storeId ?? null,
    stores: reportStores,
    tenantId: input.tenantId,
    totals: {
      inventory: {
        availableListings: sum(
          reportStores.map((store) => store.inventory.availableListings),
        ),
        reservedUnits: sum(
          reportStores.map((store) => store.inventory.reservedUnits),
        ),
        totalListings: sum(
          reportStores.map((store) => store.inventory.totalListings),
        ),
      },
      leads: {
        activeCount: sum(reportStores.map((store) => store.leads.activeCount)),
        conversionRate:
          totalLeads > 0 ? roundPercent(wonLeads / totalLeads) : 0,
        totalCount: totalLeads,
        wonCount: wonLeads,
      },
      sales: {
        averageTicketCents:
          salesTotals.closedCount > 0
            ? Math.round(salesTotals.revenueCents / salesTotals.closedCount)
            : 0,
        ...salesTotals,
      },
      storeCount: reportStores.length,
    },
  };
}

function buildStoreRow(
  store: AgencyStatsStoreOption,
  rows: AgencyStatsQueryRows,
): AgencyStatsStoreRow {
  const listing = rows.listingRows.find((row) => row.storeId === store.storeId);
  const units = rows.unitRows.find((row) => row.storeId === store.storeId);
  const sales = rows.saleRows.find((row) => row.storeId === store.storeId);
  const storeLeads = rows.leadRows.filter(
    (row) => row.storeId === store.storeId,
  );
  const totalCount = sum(storeLeads.map((row) => row.count));
  const wonCount = sum(
    storeLeads.filter((row) => row.status === "won").map((row) => row.count),
  );
  const closedCount = sales?.closedCount ?? 0;
  const revenueCents = sales?.revenueCents ?? 0;
  return {
    ...store,
    inventory: {
      availableListings: listing?.availableListings ?? 0,
      reservedUnits: units?.reservedUnits ?? 0,
      totalListings: listing?.totalListings ?? 0,
    },
    leads: {
      activeCount: sum(
        storeLeads
          .filter((row) => row.status !== "won" && row.status !== "lost")
          .map((row) => row.count),
      ),
      conversionRate: totalCount > 0 ? roundPercent(wonCount / totalCount) : 0,
      totalCount,
      wonCount,
    },
    sales: {
      averageTicketCents:
        closedCount > 0 ? Math.round(revenueCents / closedCount) : 0,
      closedCount,
      grossMarginCents: sales?.grossMarginCents ?? 0,
      revenueCents,
    },
  };
}

function aggregateLeadSources(rows: AgencyStatsQueryRows["leadRows"]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.source, (counts.get(row.source) ?? 0) + row.count);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ count, key, label: sourceLabel(key) }))
    .sort(
      (left, right) =>
        right.count - left.count || left.label.localeCompare(right.label),
    );
}

const roundPercent = (ratio: number) => Math.round(ratio * 1000) / 10;
const sum = (values: readonly number[]) =>
  values.reduce((total, value) => total + value, 0);

function sourceLabel(source: string) {
  const labels: Record<string, string> = {
    crm: "CRM",
    external_api: "API externa",
    instagram: "Instagram",
    manual: "Cadastro manual",
    olx: "OLX",
    other: "Outros",
    public_site: "Site público",
    whatsapp: "WhatsApp",
  };
  return labels[source] ?? source.replaceAll("_", " ");
}
