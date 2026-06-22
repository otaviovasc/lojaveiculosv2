import type {
  CreateFinanceEntryFlowInput,
  FinanceApi,
} from "./apiClient";
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
  | { kind: "error"; message: string }
  | { kind: "loading" }
  | { kind: "ready" };

export type FinanceFilters = {
  query: string;
  status: "all" | FinanceEntryStatus;
  window: "all" | "overdue" | "next30";
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
  query: "",
  status: "all",
  window: "next30",
};

export const expenseCategories = [
  "Operacional",
  "Aluguel",
  "Despachante",
  "Manutencao",
  "Marketing",
  "Veiculo",
  "Impostos",
  "Outros",
];

export const revenueCategories = [
  "Venda",
  "Sinal",
  "Servico",
  "Consignacao",
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
    notes: typeof entry.metadata?.notes === "string" ? entry.metadata.notes : "",
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
    paidAt: draft.status === "paid" ? toIsoDate(draft.paidAt || draft.dueAt) : null,
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
  const [entries, summary, recurringEntries, commissionRules] = await Promise.all([
    api.listEntries(activeType),
    api.getSummary(),
    api.listRecurringEntries(),
    api.listCommissionRules(),
  ]);

  return { commissionRules, entries, recurringEntries, summary };
}

export function filterEntries(
  entries: readonly FinanceEntry[],
  filters: FinanceFilters,
) {
  const query = filters.query.trim().toLowerCase();
  const now = startOfDay(new Date());
  const inThirtyDays = new Date(now);
  inThirtyDays.setDate(inThirtyDays.getDate() + 30);

  return entries.filter((entry) => {
    if (filters.status !== "all" && entry.status !== filters.status) return false;
    if (query && !`${entry.name} ${entry.category}`.toLowerCase().includes(query)) {
      return false;
    }
    if (filters.window === "all") return true;
    if (!entry.dueAt) return false;

    const dueAt = startOfDay(new Date(entry.dueAt));
    if (filters.window === "overdue") {
      return entry.status === "pending" && dueAt < now;
    }

    return dueAt >= now && dueAt <= inThirtyDays;
  });
}

export function summarizeEntries(entries: readonly FinanceEntry[]) {
  return entries.reduce(
    (summary, entry) => ({
      overdueCents:
        summary.overdueCents +
        (isOverdue(entry) ? entry.amountCents : 0),
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
    .sort((left, right) => Number(new Date(left.dueAt ?? 0)) - Number(new Date(right.dueAt ?? 0)))
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

function toCents(value: string) {
  return Math.round(Number(value.replace(",", ".")) * 100);
}

function toIsoDate(value: string) {
  return value ? new Date(`${value}T12:00:00`).toISOString() : null;
}
