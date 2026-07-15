import type {
  CommissionReconciliationIssue,
  CommissionWorkspaceSale,
  CommissionWorkspaceSnapshot,
  FinanceEntry,
  FinanceEntryStatus,
} from "./types";
import {
  entrySellerName,
  metadataString,
  originLabel,
} from "./commissionEntryMeta";

export type CommissionPeriodPreset =
  "custom" | "lastMonth" | "thisMonth" | "thisWeek";
export type CommissionStatusFilter = "all" | FinanceEntryStatus;
export type CommissionOriginFilter = "all" | string;

export type CommissionFilters = {
  from: string;
  origin: CommissionOriginFilter;
  period: CommissionPeriodPreset;
  sellerId: string;
  status: CommissionStatusFilter;
  to: string;
};

export type CommissionOriginGroup = {
  count: number;
  entries: FinanceEntry[];
  label: string;
  origin: string;
  paidCents: number;
  pendingCents: number;
  totalCents: number;
};

export type CommissionSaleGroup = {
  entries: FinanceEntry[];
  origins: CommissionOriginGroup[];
  paidCents: number;
  pendingCents: number;
  sale: CommissionWorkspaceSale;
  totalCents: number;
};

export type CommissionSellerGroup = {
  adjustments: FinanceEntry[];
  blockedCount: number;
  count: number;
  entries: FinanceEntry[];
  origins: CommissionOriginGroup[];
  paidCents: number;
  pendingCents: number;
  rank: number;
  sales: CommissionSaleGroup[];
  salesCount: number;
  salesValueCents: number;
  sellerId: string;
  sellerName: string;
  totalCents: number;
};

export type CommissionSummary = {
  count: number;
  paidCents: number;
  pendingCents: number;
  reconciliationCount: number;
  salesCount: number;
  salesValueCents: number;
  sellersWithPending: number;
  totalCents: number;
};

export type CommissionWorkspaceData = {
  filteredEntries: FinanceEntry[];
  originOptions: Array<{ label: string; value: string }>;
  reconciliation: readonly CommissionReconciliationIssue[];
  sellerOptions: Array<{ label: string; value: string }>;
  sellers: CommissionSellerGroup[];
  summary: CommissionSummary;
};

export function initialCommissionFilters(): CommissionFilters {
  return {
    ...getPresetRange("thisMonth"),
    origin: "all",
    period: "thisMonth",
    sellerId: "",
    status: "all",
  };
}

export function getPresetRange(
  preset: Exclude<CommissionPeriodPreset, "custom">,
) {
  const now = new Date();
  const from = new Date(now);
  const to = new Date(now);
  if (preset === "thisWeek") {
    const dayOfWeek = (from.getDay() + 6) % 7;
    from.setDate(from.getDate() - dayOfWeek);
    to.setTime(from.getTime());
    to.setDate(from.getDate() + 6);
  } else if (preset === "lastMonth") {
    from.setMonth(now.getMonth() - 1, 1);
    to.setFullYear(from.getFullYear(), from.getMonth() + 1, 0);
  } else {
    from.setDate(1);
    to.setFullYear(now.getFullYear(), now.getMonth() + 1, 0);
  }
  return { from: toDateInput(from), to: toDateInput(to) };
}

export function buildCommissionWorkspace(
  source: readonly FinanceEntry[] | CommissionWorkspaceSnapshot,
  filters: CommissionFilters,
  sellerLabels: ReadonlyMap<string, string> = new Map(),
): CommissionWorkspaceData {
  const snapshot = normalizeSnapshot(source, filters);
  const resolvedSellerLabels = new Map([
    ...Object.entries(snapshot.sellerNames),
    ...sellerLabels,
  ]);
  const allEntries = uniqueEntries([
    ...snapshot.sales.flatMap((sale) => sale.entries),
    ...snapshot.adjustments,
  ]);
  const blockedEntryIds = reconciliationBlockedEntryIds(
    snapshot.reconciliation,
    allEntries,
  );
  const filteredSales = snapshot.sales
    .filter(
      (sale) =>
        !filters.sellerId ||
        saleSellerId(sale) === filters.sellerId ||
        sale.entries.some(
          (entry) => (entry.sellerUserId ?? "unassigned") === filters.sellerId,
        ),
    )
    .map((sale) => saleGroup(sale, filters))
    .filter((group) =>
      filters.origin === "all" && filters.status === "all"
        ? true
        : group.entries.length > 0,
    );
  const filteredAdjustments = snapshot.adjustments.filter((entry) =>
    entryMatchesNonPeriodFilters(entry, filters),
  );
  const sellers = groupBySeller(
    filteredSales,
    filteredAdjustments,
    resolvedSellerLabels,
    blockedEntryIds,
  ).filter(
    (seller) => !filters.sellerId || seller.sellerId === filters.sellerId,
  );
  const filteredEntries = uniqueEntries([
    ...filteredSales.flatMap((sale) => sale.entries),
    ...filteredAdjustments,
  ]);
  const eligibleEntries = filteredEntries.filter(
    (entry) => entry.status !== "cancelled" && !blockedEntryIds.has(entry.id),
  );
  const salesValueCents = filteredSales.reduce(
    (total, group) => total + (group.sale.salePriceCents ?? 0),
    0,
  );
  return {
    filteredEntries,
    originOptions: uniqueOrigins(allEntries).map((origin) => ({
      label: originLabel(origin),
      value: origin,
    })),
    reconciliation: snapshot.reconciliation,
    sellerOptions: sellerOptions(snapshot, allEntries, resolvedSellerLabels),
    sellers,
    summary: {
      count: eligibleEntries.length,
      reconciliationCount: snapshot.reconciliation.length,
      salesCount: filteredSales.length,
      salesValueCents,
      sellersWithPending: sellers.filter((seller) => seller.pendingCents > 0)
        .length,
      ...sumEntries(eligibleEntries),
    },
  };
}

export function pendingSellerEntries(
  seller: CommissionSellerGroup,
  filters: CommissionFilters,
) {
  return seller.entries.filter(
    (entry) =>
      entry.status === "pending" &&
      entry.sellerUserId === seller.sellerId &&
      (filters.origin === "all" || originKey(entry) === filters.origin),
  );
}

export function isValidCommissionRange(filters: CommissionFilters) {
  const from = new Date(`${filters.from}T00:00:00`);
  const to = new Date(`${filters.to}T00:00:00`);
  return Boolean(filters.from && filters.to) && from <= to;
}

function groupBySeller(
  sales: readonly CommissionSaleGroup[],
  adjustments: readonly FinanceEntry[],
  labels: ReadonlyMap<string, string>,
  blockedEntryIds: ReadonlySet<string>,
) {
  const sellerIds = new Set([
    ...sales.map((group) => saleSellerId(group.sale)),
    ...sales.flatMap((group) =>
      group.entries.map((entry) => entry.sellerUserId ?? "unassigned"),
    ),
    ...adjustments.map((entry) => entry.sellerUserId ?? "unassigned"),
  ]);
  return [...sellerIds]
    .map((sellerId): CommissionSellerGroup => {
      const sellerOwnedSales = sales.filter(
        (group) => saleSellerId(group.sale) === sellerId,
      );
      const sellerSales = uniqueSaleGroups([
        ...sellerOwnedSales,
        ...sales.filter((group) =>
          group.entries.some(
            (entry) => (entry.sellerUserId ?? "unassigned") === sellerId,
          ),
        ),
      ]).map((group) => saleGroupForSeller(group, sellerId));
      const sellerAdjustments = adjustments.filter(
        (entry) => (entry.sellerUserId ?? "unassigned") === sellerId,
      );
      const attributedEntries = uniqueEntries([
        ...sellerSales.flatMap((sale) => sale.entries),
        ...sellerAdjustments,
      ]);
      const entries = attributedEntries.filter(
        (entry) =>
          entry.status !== "cancelled" && !blockedEntryIds.has(entry.id),
      );
      return {
        adjustments: sellerAdjustments,
        blockedCount: attributedEntries.filter((entry) =>
          blockedEntryIds.has(entry.id),
        ).length,
        count: entries.length,
        entries,
        origins: originGroups(entries),
        rank: 0,
        sales: sellerSales,
        salesCount: sellerOwnedSales.length,
        salesValueCents: sellerOwnedSales.reduce(
          (total, sale) => total + (sale.sale.salePriceCents ?? 0),
          0,
        ),
        sellerId,
        sellerName: resolveSellerName(sellerId, entries, labels),
        ...sumEntries(entries),
      };
    })
    .sort(
      (left, right) =>
        right.pendingCents - left.pendingCents ||
        right.salesValueCents - left.salesValueCents,
    )
    .map((seller, index) => ({ ...seller, rank: index + 1 }));
}

function uniqueSaleGroups(groups: readonly CommissionSaleGroup[]) {
  return [...new Map(groups.map((group) => [group.sale.id, group])).values()];
}

function saleGroupForSeller(
  group: CommissionSaleGroup,
  sellerId: string,
): CommissionSaleGroup {
  const entries = group.entries.filter(
    (entry) => (entry.sellerUserId ?? "unassigned") === sellerId,
  );
  return {
    ...group,
    entries,
    origins: originGroups(entries),
    ...sumEntries(entries),
  };
}

function saleGroup(
  sale: CommissionWorkspaceSale,
  filters: CommissionFilters,
): CommissionSaleGroup {
  const entries = sale.entries.filter((entry) =>
    entryMatchesCommissionFilters(entry, filters),
  );
  return {
    entries,
    origins: originGroups(entries),
    sale,
    ...sumEntries(entries),
  };
}

function originGroups(entries: readonly FinanceEntry[]) {
  const groups = new Map<string, FinanceEntry[]>();
  for (const entry of entries) {
    const origin = originKey(entry);
    groups.set(origin, [...(groups.get(origin) ?? []), entry]);
  }
  return [...groups.entries()].map(([origin, originEntries]) => ({
    count: originEntries.length,
    entries: originEntries,
    label: originLabel(origin),
    origin,
    ...sumEntries(originEntries),
  }));
}

function entryMatchesNonPeriodFilters(
  entry: FinanceEntry,
  filters: CommissionFilters,
) {
  return entryMatchesCommissionFilters(entry, filters);
}

function entryMatchesCommissionFilters(
  entry: FinanceEntry,
  filters: CommissionFilters,
) {
  if (
    filters.sellerId &&
    (entry.sellerUserId ?? "unassigned") !== filters.sellerId
  ) {
    return false;
  }
  if (filters.status !== "all" && entry.status !== filters.status) return false;
  return filters.origin === "all" || originKey(entry) === filters.origin;
}

function normalizeSnapshot(
  source: readonly FinanceEntry[] | CommissionWorkspaceSnapshot,
  filters: CommissionFilters,
): CommissionWorkspaceSnapshot {
  if (!Array.isArray(source)) return source as CommissionWorkspaceSnapshot;
  const entries = (source as readonly FinanceEntry[]).filter((entry) =>
    entryMatchesPeriod(entry, filters),
  );
  const sales = new Map<string, FinanceEntry[]>();
  const adjustments: FinanceEntry[] = [];
  for (const entry of entries) {
    const saleId = entrySaleId(entry);
    if (saleId) sales.set(saleId, [...(sales.get(saleId) ?? []), entry]);
    else adjustments.push(entry);
  }
  return {
    adjustments,
    generatedAt: new Date().toISOString(),
    reconciliation: [],
    sales: [...sales.entries()].map(([id, saleEntries]) => ({
      closedAt: saleEntries[0]?.createdAt ?? null,
      createdAt: saleEntries[0]?.createdAt ?? new Date().toISOString(),
      entries: saleEntries,
      id,
      isCurrentRevision: true,
      listingSnapshot: {},
      salePriceCents: null,
      sellerUserId: saleEntries[0]?.sellerUserId ?? null,
      standardCommissionEnabled: true,
      status: "closed",
      unitId: null,
      updatedAt: saleEntries[0]?.updatedAt ?? new Date().toISOString(),
    })),
    sellerNames: legacySellerNames(entries),
  };
}

function entryMatchesPeriod(entry: FinanceEntry, filters: CommissionFilters) {
  const periodDate = entry.createdAt ?? entry.dueAt;
  if (!periodDate || !isValidCommissionRange(filters)) return false;
  const date = new Date(periodDate);
  return (
    date >= new Date(`${filters.from}T00:00:00`) &&
    date <= new Date(`${filters.to}T23:59:59`)
  );
}

function sellerOptions(
  snapshot: CommissionWorkspaceSnapshot,
  entries: readonly FinanceEntry[],
  labels: ReadonlyMap<string, string>,
) {
  const ids = new Set([
    ...snapshot.sales.map(saleSellerId),
    ...entries.map((entry) => entry.sellerUserId ?? "unassigned"),
  ]);
  return [...ids].map((value) => ({
    label: resolveSellerName(
      value,
      entries.filter((entry) => (entry.sellerUserId ?? "unassigned") === value),
      labels,
    ),
    value,
  }));
}

function resolveSellerName(
  sellerId: string,
  entries: readonly FinanceEntry[],
  labels: ReadonlyMap<string, string>,
) {
  if (sellerId === "unassigned") return "Sem vendedor vinculado";
  return (
    labels.get(sellerId) ??
    (entries[0] ? entrySellerName(entries[0]) : sellerId)
  );
}

function legacySellerNames(entries: readonly FinanceEntry[]) {
  const names: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.sellerUserId) {
      names[entry.sellerUserId] = entrySellerName(entry);
    }
  }
  return names;
}

function saleSellerId(sale: CommissionWorkspaceSale) {
  return sale.sellerUserId ?? "unassigned";
}

function entrySaleId(entry: FinanceEntry) {
  return (
    entry.links?.find((link) => link.targetType === "sale")?.targetId ??
    metadataString(entry.metadata, "saleId")
  );
}

function uniqueEntries(entries: readonly FinanceEntry[]) {
  return [...new Map(entries.map((entry) => [entry.id, entry])).values()];
}

function reconciliationBlockedEntryIds(
  issues: readonly CommissionReconciliationIssue[],
  entries: readonly FinanceEntry[],
) {
  const criticalIssues = issues.filter(
    (issue) => issue.severity === "critical",
  );
  const ids = new Set(
    criticalIssues.flatMap((issue) => (issue.entryId ? [issue.entryId] : [])),
  );
  const saleIds = new Set(
    criticalIssues.flatMap((issue) =>
      !issue.entryId && issue.saleId ? [issue.saleId] : [],
    ),
  );
  for (const entry of entries) {
    const saleId = entrySaleId(entry);
    if (saleId && saleIds.has(saleId)) ids.add(entry.id);
  }
  return ids;
}

function sumEntries(entries: readonly FinanceEntry[]) {
  return entries.reduce(
    (summary, entry) => ({
      paidCents:
        summary.paidCents + (entry.status === "paid" ? entry.amountCents : 0),
      pendingCents:
        summary.pendingCents +
        (entry.status === "pending" ? entry.amountCents : 0),
      totalCents:
        summary.totalCents +
        (entry.status === "cancelled" ? 0 : entry.amountCents),
    }),
    { paidCents: 0, pendingCents: 0, totalCents: 0 },
  );
}

function uniqueOrigins(entries: readonly FinanceEntry[]) {
  return [...new Set(entries.map(originKey))].sort();
}

function originKey(entry: FinanceEntry) {
  return metadataString(entry.metadata, "origin") ?? entry.category;
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
