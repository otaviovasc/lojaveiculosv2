import { entrySellerName, metadataString } from "./commissionEntryMeta";
import { formatFinanceCategory } from "./financeBillsFormat";
import type { FinanceEntry, FinanceEntryType } from "./types";

export type FinanceDatePreset =
  "all" | "custom" | "next7" | "next30" | "overdue" | "thisMonth";

export type FinanceSourceFilter =
  "all" | "commission" | "document" | "general" | "lead" | "sale" | "vehicle";

export type FinanceDateFilter = {
  dateFrom: string;
  datePreset: FinanceDatePreset;
  dateTo: string;
};

export type FinanceCashFlowSummary = {
  cancelledCents: number;
  outflowCents: number;
  overdueCents: number;
  paidOutflowCents: number;
  paidRevenueCents: number;
  pendingCents: number;
  plannedBalanceCents: number;
  realizedBalanceCents: number;
  revenueCents: number;
};

export function summarizeCashFlow(
  entries: readonly FinanceEntry[],
): FinanceCashFlowSummary {
  return entries.reduce(
    (summary, entry) => {
      const isCancelled = entry.status === "cancelled";
      const signedAmount = isCancelled ? 0 : signedCashAmount(entry);
      return {
        cancelledCents:
          summary.cancelledCents + (isCancelled ? entry.amountCents : 0),
        outflowCents:
          summary.outflowCents + (signedAmount < 0 ? entry.amountCents : 0),
        overdueCents:
          summary.overdueCents +
          (isEntryOverdue(entry) ? entry.amountCents : 0),
        paidOutflowCents:
          summary.paidOutflowCents +
          (entry.status === "paid" && signedAmount < 0 ? entry.amountCents : 0),
        paidRevenueCents:
          summary.paidRevenueCents +
          (entry.status === "paid" && signedAmount > 0 ? entry.amountCents : 0),
        pendingCents:
          summary.pendingCents +
          (entry.status === "pending" ? entry.amountCents : 0),
        plannedBalanceCents: summary.plannedBalanceCents + signedAmount,
        realizedBalanceCents:
          summary.realizedBalanceCents +
          (entry.status === "paid" ? signedAmount : 0),
        revenueCents:
          summary.revenueCents + (signedAmount > 0 ? entry.amountCents : 0),
      };
    },
    {
      cancelledCents: 0,
      outflowCents: 0,
      overdueCents: 0,
      paidOutflowCents: 0,
      paidRevenueCents: 0,
      pendingCents: 0,
      plannedBalanceCents: 0,
      realizedBalanceCents: 0,
      revenueCents: 0,
    },
  );
}

export function commissionDueSummary(entries: readonly FinanceEntry[]) {
  const today = startOfDay(new Date());
  const weekEnd = addDays(today, 7);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const pending = entries.filter(
    (entry) =>
      entry.type === "commission" &&
      entry.status === "pending" &&
      dueDate(entry) !== null,
  );
  const sum = (list: readonly FinanceEntry[]) =>
    list.reduce((total, entry) => total + entry.amountCents, 0);
  const topSeller = (list: readonly FinanceEntry[]) => {
    const totals = new Map<string, number>();
    for (const entry of list) {
      const name = entrySellerName(entry);
      totals.set(name, (totals.get(name) ?? 0) + entry.amountCents);
    }
    return [...totals.entries()].sort(
      (left, right) => right[1] - left[1],
    )[0]?.[0];
  };
  const within = (limit: Date) =>
    pending.filter((entry) => {
      const dueAt = dueDate(entry);
      return dueAt !== null && dueAt <= limit;
    });
  const week = within(weekEnd);
  const month = within(monthEnd);
  return {
    monthCents: sum(month),
    monthTopSeller: topSeller(month),
    pendingCount: pending.length,
    weekCents: sum(week),
    weekTopSeller: topSeller(week),
  };
}

export function urgentFinanceEntries(entries: readonly FinanceEntry[]) {
  const today = startOfDay(new Date());
  const nextWeek = addDays(today, 7);
  const urgent = entries
    .filter((entry) => {
      if (entry.type === "revenue" || entry.status !== "pending") return false;
      const dueAt = dueDate(entry);
      if (!dueAt) return false;
      return dueAt < today || dueAt <= nextWeek;
    })
    .sort(
      (left, right) => Number(dueDate(left) ?? 0) - Number(dueDate(right) ?? 0),
    );

  return {
    overdue: urgent.filter((entry) => isEntryOverdue(entry)),
    top: urgent.slice(0, 4),
    upcoming: urgent.filter((entry) => !isEntryOverdue(entry)),
  };
}

export function categoryBreakdown(
  entries: readonly FinanceEntry[],
  type: FinanceEntryType | "outflow",
  limit = 5,
) {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (entry.status === "cancelled") continue;
    const include =
      type === "outflow" ? signedCashAmount(entry) < 0 : entry.type === type;
    if (!include) continue;
    totals.set(
      entry.category,
      (totals.get(entry.category) ?? 0) + entry.amountCents,
    );
  }
  return [...totals.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([category, amountCents]) => ({
      amountCents,
      label: formatFinanceCategory(category),
    }));
}

export function sourceBreakdown(entries: readonly FinanceEntry[]) {
  const totals = new Map<FinanceSourceFilter, number>();
  for (const entry of entries) {
    if (entry.status === "cancelled") continue;
    const source = entrySourceKey(entry);
    totals.set(source, (totals.get(source) ?? 0) + entry.amountCents);
  }
  return [...totals.entries()].map(([source, amountCents]) => ({
    amountCents,
    label: sourceLabel(source),
    source,
  }));
}

export function sellerFilterOptions(entries: readonly FinanceEntry[]) {
  const sellers = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.sellerUserId) continue;
    sellers.set(entry.sellerUserId, entrySellerName(entry));
  }
  return [...sellers.entries()]
    .sort((left, right) => left[1].localeCompare(right[1], "pt-BR"))
    .map(([value, label]) => ({ label, value }));
}

export function matchesFinanceDateFilter(
  entry: FinanceEntry,
  filter: FinanceDateFilter,
) {
  if (filter.datePreset === "all") return true;
  const dueAt = dueDate(entry);
  if (!dueAt) return false;
  const today = startOfDay(new Date());
  if (filter.datePreset === "overdue") {
    return entry.status === "pending" && dueAt < today;
  }
  if (filter.datePreset === "next7")
    return dueAt >= today && dueAt <= addDays(today, 7);
  if (filter.datePreset === "next30")
    return dueAt >= today && dueAt <= addDays(today, 30);
  if (filter.datePreset === "thisMonth") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return dueAt >= first && dueAt <= last;
  }
  const from = parseDateInput(filter.dateFrom);
  const to = parseDateInput(filter.dateTo);
  if (from && dueAt < from) return false;
  if (to && dueAt > to) return false;
  return Boolean(from || to);
}

export function entrySourceKey(entry: FinanceEntry): FinanceSourceFilter {
  const targetTypes = new Set(
    entry.links?.map((link) => link.targetType) ?? [],
  );
  const source = metadataString(entry.metadata, "source");
  if (entry.type === "commission") return "commission";
  if (targetTypes.has("vehicle_cost") || targetTypes.has("vehicle_unit")) {
    return "vehicle";
  }
  if (targetTypes.has("sale") || targetTypes.has("sale_payment")) return "sale";
  if (targetTypes.has("lead")) return "lead";
  if (targetTypes.has("document")) return "document";
  if (source === "vehicle_cost" || entry.category.startsWith("vehicle_")) {
    return "vehicle";
  }
  return "general";
}

export function isEntryOverdue(entry: FinanceEntry) {
  const dueAt = dueDate(entry);
  return (
    entry.status === "pending" &&
    dueAt !== null &&
    dueAt < startOfDay(new Date())
  );
}

export function sourceLabel(source: FinanceSourceFilter) {
  const labels = {
    all: "Todas as origens",
    commission: "Comissões",
    document: "Documentos",
    general: "Geral",
    lead: "Leads",
    sale: "Vendas",
    vehicle: "Veículos",
  } satisfies Record<FinanceSourceFilter, string>;
  return labels[source];
}

function signedCashAmount(entry: FinanceEntry) {
  return entry.type === "revenue" ? entry.amountCents : -entry.amountCents;
}

function dueDate(entry: FinanceEntry) {
  if (!entry.dueAt) return null;
  const date = startOfDay(new Date(entry.dueAt));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateInput(value: string) {
  if (!value) return null;
  return startOfDay(new Date(`${value}T12:00:00`));
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}
