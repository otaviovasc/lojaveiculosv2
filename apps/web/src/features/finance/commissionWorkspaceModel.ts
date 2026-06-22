import type { FinanceEntry, FinanceEntryStatus } from "./types";
import { entrySellerName, metadataString, originLabel } from "./commissionEntryMeta";

export type CommissionPeriodPreset = "custom" | "lastMonth" | "thisMonth" | "thisWeek";
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

export type CommissionSellerGroup = {
  count: number;
  entries: FinanceEntry[];
  origins: CommissionOriginGroup[];
  paidCents: number;
  pendingCents: number;
  rank: number;
  sellerId: string;
  sellerName: string;
  totalCents: number;
};

export type CommissionSummary = {
  count: number;
  paidCents: number;
  pendingCents: number;
  sellersWithPending: number;
  totalCents: number;
};

export type CommissionWorkspaceData = {
  filteredEntries: FinanceEntry[];
  originOptions: Array<{ label: string; value: string }>;
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
  entries: readonly FinanceEntry[],
  filters: CommissionFilters,
): CommissionWorkspaceData {
  const filteredEntries = entries.filter((entry) => entryMatches(entry, filters));
  const sellers = groupBySeller(filteredEntries);
  const originOptions = uniqueOrigins(entries).map((origin) => ({
    label: originLabel(origin),
    value: origin,
  }));
  const sellerOptions = groupBySeller(entries).map((seller) => ({
    label: seller.sellerName,
    value: seller.sellerId,
  }));

  return {
    filteredEntries,
    originOptions,
    sellerOptions,
    sellers,
    summary: summarize(filteredEntries, sellers),
  };
}

export function pendingSellerEntries(
  seller: CommissionSellerGroup,
  filters: CommissionFilters,
) {
  return seller.entries.filter(
    (entry) =>
      entry.status === "pending" &&
      (filters.origin === "all" || originKey(entry) === filters.origin),
  );
}

export function isValidCommissionRange(filters: CommissionFilters) {
  const from = new Date(`${filters.from}T00:00:00`);
  const to = new Date(`${filters.to}T00:00:00`);
  return Boolean(filters.from && filters.to) && from <= to;
}

function groupBySeller(entries: readonly FinanceEntry[]) {
  const groups = new Map<string, FinanceEntry[]>();
  for (const entry of entries) {
    const sellerId = entry.sellerUserId ?? "unassigned";
    groups.set(sellerId, [...(groups.get(sellerId) ?? []), entry]);
  }

  return Array.from(groups.entries())
    .map(([sellerId, sellerEntries]) => sellerGroup(sellerId, sellerEntries))
    .sort((left, right) => right.pendingCents - left.pendingCents)
    .map((seller, index) => ({ ...seller, rank: index + 1 }));
}

function sellerGroup(
  sellerId: string,
  entries: FinanceEntry[],
): CommissionSellerGroup {
  const origins = Array.from(groupByOrigin(entries).entries()).map(
    ([origin, originEntries]) => ({
    count: originEntries.length,
    entries: originEntries,
    label: originLabel(origin),
    origin,
    ...sumEntries(originEntries),
  }));
  return {
    count: entries.length,
    entries,
    origins,
    rank: 0,
    sellerId,
    sellerName: entries[0] ? entrySellerName(entries[0]) : "Sem vendedor vinculado",
    ...sumEntries(entries),
  };
}

function summarize(
  entries: readonly FinanceEntry[],
  sellers: readonly CommissionSellerGroup[],
): CommissionSummary {
  return {
    count: entries.length,
    sellersWithPending: sellers.filter((seller) => seller.pendingCents > 0).length,
    ...sumEntries(entries),
  };
}

function sumEntries(entries: readonly FinanceEntry[]) {
  return entries.reduce(
    (summary, entry) => ({
      paidCents:
        summary.paidCents + (entry.status === "paid" ? entry.amountCents : 0),
      pendingCents:
        summary.pendingCents +
        (entry.status === "pending" ? entry.amountCents : 0),
      totalCents: summary.totalCents + entry.amountCents,
    }),
    { paidCents: 0, pendingCents: 0, totalCents: 0 },
  );
}

function entryMatches(entry: FinanceEntry, filters: CommissionFilters) {
  if (filters.status !== "all" && entry.status !== filters.status) return false;
  if (filters.sellerId && (entry.sellerUserId ?? "unassigned") !== filters.sellerId) {
    return false;
  }
  if (filters.origin !== "all" && originKey(entry) !== filters.origin) return false;
  const periodAt = entry.createdAt ?? entry.dueAt;
  if (!periodAt || !isValidCommissionRange(filters)) return false;
  const periodDate = new Date(periodAt);
  return (
    periodDate >= new Date(`${filters.from}T00:00:00`) &&
    periodDate <= new Date(`${filters.to}T23:59:59`)
  );
}

function uniqueOrigins(entries: readonly FinanceEntry[]) {
  return Array.from(new Set(entries.map((entry) => originKey(entry)))).sort();
}

function groupByOrigin(entries: readonly FinanceEntry[]) {
  const groups = new Map<string, FinanceEntry[]>();
  for (const entry of entries) {
    const origin = originKey(entry);
    groups.set(origin, [...(groups.get(origin) ?? []), entry]);
  }
  return groups;
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
