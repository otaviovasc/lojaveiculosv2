import type { CreateFinanceEntryFlowInput, FinanceApi } from "./apiClient";
import {
  entrySourceKey,
  matchesFinanceDateFilter,
  type FinanceDatePreset,
  type FinanceSourceFilter,
} from "./financeCashFlowModel";
import { formatFinanceCategory } from "./financeBillsFormat";
import type {
  CreateFinanceRecurringEntryInput,
  FinanceEntry,
  FinanceEntryStatus,
  FinanceEntryType,
} from "./types";

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

export type FinanceEntryDraft = {
  amount: string;
  category: string;
  documentFile: File | null;
  documentTitle: string;
  dueAt: string;
  name: string;
  notes: string;
  paidAt: string;
  recurrence: "once" | "recurring";
  recurrenceDay: string;
  recurrenceFrequency: "monthly" | "weekly" | "yearly";
  recurrenceOccurrences: string;
  sellerUserId: string;
  status: FinanceEntryStatus;
  type: FinanceEntryType;
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

export const expenseCategories = [
  "Operacional",
  "Aluguel",
  "Despachante",
  "Manutenção",
  "Marketing",
  "Veículo",
  "Impostos",
  "Outros",
];

export const revenueCategories = [
  "Venda",
  "Sinal",
  "Serviço",
  "Consignação",
  "Outros",
];

export function createEntryDraft(type: FinanceEntryType): FinanceEntryDraft {
  const today = new Date().toISOString().slice(0, 10);
  return {
    amount: "",
    category: type === "expense" ? "Operacional" : "Venda",
    documentFile: null,
    documentTitle: "",
    dueAt: today,
    name: "",
    notes: "",
    paidAt: "",
    recurrence: "once",
    recurrenceDay: "",
    recurrenceFrequency: "monthly",
    recurrenceOccurrences: "",
    sellerUserId: "",
    status: "pending",
    type,
  };
}

export function entryToDraft(entry: FinanceEntry): FinanceEntryDraft {
  return {
    ...createEntryDraft(entry.type),
    amount: String(entry.amountCents / 100),
    category: entry.category,
    dueAt: entry.dueAt ? entry.dueAt.slice(0, 10) : "",
    name: entry.name,
    notes:
      typeof entry.metadata?.notes === "string" ? entry.metadata.notes : "",
    paidAt: entry.paidAt ? entry.paidAt.slice(0, 10) : "",
    sellerUserId: entry.sellerUserId ?? "",
    status: entry.status,
  };
}

export function toEntryInput(
  draft: FinanceEntryDraft,
): CreateFinanceEntryFlowInput {
  const input: CreateFinanceEntryFlowInput = {
    amountCents: toCents(draft.amount),
    category: draft.category.trim(),
    documentFile: draft.documentFile,
    documentKind: "finance_receipt",
    dueAt: toIsoDate(draft.dueAt),
    links: [],
    metadata: {
      notes: draft.notes.trim(),
      source: "finance_bills_slice",
    },
    name: draft.name.trim(),
    paidAt:
      draft.status === "paid" ? toIsoDate(draft.paidAt || draft.dueAt) : null,
    sellerUserId: draft.sellerUserId.trim() || null,
    status: draft.status,
    type: draft.type,
  };
  const documentTitle = draft.documentTitle.trim();
  return documentTitle ? { ...input, documentTitle } : input;
}

export function toRecurringInput(
  draft: FinanceEntryDraft,
): CreateFinanceRecurringEntryInput {
  const occurrences = Number(draft.recurrenceOccurrences);
  const validOccurrences = Number.isFinite(occurrences) && occurrences > 0;
  return {
    amountCents: toCents(draft.amount),
    category: draft.category.trim(),
    dayOfMonth: draft.recurrenceDay ? Number(draft.recurrenceDay) : null,
    frequency: draft.recurrenceFrequency,
    metadata: {
      notes: draft.notes.trim(),
      occurrences: validOccurrences ? occurrences : null,
      source: "finance_bills_slice",
    },
    name: draft.name.trim(),
    nextDueAt: toIsoDate(draft.dueAt) ?? new Date().toISOString(),
    sellerUserId: draft.sellerUserId.trim() || null,
    status: draft.status,
    type: draft.type,
  };
}

export async function loadFinanceWorkspace(
  api: FinanceApi,
  activeType: FinanceEntryType,
) {
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
    entries: entriesByType[activeType],
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

function toCents(value: string) {
  return Math.round(Number(value.replace(",", ".")) * 100);
}

function toIsoDate(value: string) {
  return value ? new Date(`${value}T12:00:00`).toISOString() : null;
}
