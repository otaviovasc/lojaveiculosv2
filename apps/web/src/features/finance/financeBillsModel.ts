import type { FinanceApi } from "./apiClient";
import {
  entrySourceKey,
  matchesFinanceDateFilter,
  type FinanceDatePreset,
  type FinanceSourceFilter,
} from "./financeCashFlowModel";
import { formatFinanceCategory } from "./financeBillsFormat";
import type {
  FinanceEntry,
  FinanceEntryStatus,
  FinanceEntryType,
} from "./types";

export {
  commissionCategories,
  createEntryDraft,
  entryToDraft,
  expenseCategories,
  revenueCategories,
  toEntryInput,
  toRecurringInput,
} from "./financeEntryDraftModel";
export type { FinanceEntryDraft } from "./financeEntryDraftModel";

export type FinanceToast =
  | { kind: "error"; message: string; title: string }
  | { kind: "success"; message: string; title: string };

export type FinanceListState =
  { kind: "error"; message: string } | { kind: "loading" } | { kind: "ready" };

export type FinanceFilters = {
  dateFrom: string;
  datePreset: FinanceDatePreset;
  dateTo: string;
  query: string;
  sellerUserId: "all" | string;
  source: FinanceSourceFilter;
  status: "all" | FinanceEntryStatus;
  window?: FinanceDatePreset;
};

export const initialFinanceFilters: FinanceFilters = {
  dateFrom: "",
  datePreset: "next30",
  dateTo: "",
  query: "",
  sellerUserId: "all",
  source: "all",
  status: "all",
  window: "next30",
};

export async function loadFinanceWorkspace(api: FinanceApi) {
  const [
    expenseEntries,
    revenueEntries,
    commissionEntries,
    summary,
    recurringEntries,
    commissionRules,
  ] = await Promise.all([
    api.listAllEntries("expense"),
    api.listAllEntries("revenue"),
    api.listAllEntries("commission"),
    api.getSummary(),
    api.listRecurringEntries(),
    api.listCommissionRules(),
  ]);
  const entriesByType = {
    commission: commissionEntries,
    expense: expenseEntries,
    revenue: revenueEntries,
  } satisfies Record<FinanceEntryType, FinanceEntry[]>;

  return {
    allEntries: [...expenseEntries, ...revenueEntries, ...commissionEntries],
    commissionRules,
    entriesByType,
    recurringEntries,
    summary,
  };
}

export function filterEntries(
  entries: readonly FinanceEntry[],
  filters: FinanceFilters,
) {
  const query = filters.query.trim().toLowerCase();

  return entries.filter((entry) => {
    if (filters.status !== "all" && entry.status !== filters.status)
      return false;
    if (
      filters.sellerUserId !== "all" &&
      entry.sellerUserId !== filters.sellerUserId
    ) {
      return false;
    }
    if (filters.source !== "all" && entrySourceKey(entry) !== filters.source) {
      return false;
    }
    const searchableText =
      `${entry.name} ${entry.category} ${formatFinanceCategory(entry.category)} ${entrySourceKey(entry)} ${metadataText(entry.metadata)}`.toLowerCase();
    if (query && !searchableText.includes(query)) {
      return false;
    }
    return matchesFinanceDateFilter(entry, {
      dateFrom: filters.dateFrom,
      datePreset: filters.datePreset ?? filters.window ?? "next30",
      dateTo: filters.dateTo,
    });
  });
}

export function summarizeEntries(entries: readonly FinanceEntry[]) {
  return entries.reduce(
    (summary, entry) => ({
      overdueCents:
        summary.overdueCents + (isOverdue(entry) ? entry.amountCents : 0),
      paidCents:
        summary.paidCents + (entry.status === "paid" ? entry.amountCents : 0),
      pendingCents:
        summary.pendingCents +
        (entry.status === "pending" ? entry.amountCents : 0),
      totalCents: summary.totalCents + entry.amountCents,
    }),
    { overdueCents: 0, paidCents: 0, pendingCents: 0, totalCents: 0 },
  );
}

export function upcomingEntries(entries: readonly FinanceEntry[]) {
  return entries
    .filter((entry) => entry.status === "pending" && entry.dueAt)
    .sort(
      (left, right) =>
        Number(new Date(left.dueAt ?? 0)) - Number(new Date(right.dueAt ?? 0)),
    )
    .slice(0, 3);
}

function isOverdue(entry: FinanceEntry) {
  return (
    entry.status === "pending" &&
    Boolean(entry.dueAt) &&
    startOfDay(new Date(entry.dueAt ?? "")) < startOfDay(new Date())
  );
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function metadataText(metadata: FinanceEntry["metadata"]) {
  if (!metadata) return "";
  return Object.values(metadata)
    .filter((value) => typeof value === "string")
    .join(" ");
}
