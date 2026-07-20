import type { CreateFinanceEntryFlowInput } from "./apiClient";
import type {
  CreateFinanceRecurringEntryInput,
  FinanceEntry,
  FinanceEntryStatus,
  FinanceEntryType,
  FinanceRecurringEntry,
  UpdateFinanceRecurringEntryInput,
} from "./types";

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

export const commissionCategories = [
  "Venda",
  "Bônus",
  "Financiamento",
  "Seguro",
  "Documentação",
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

export function recurringEntryToDraft(
  entry: FinanceRecurringEntry,
): FinanceEntryDraft {
  const occurrences = entry.metadata?.occurrences;
  return {
    ...createEntryDraft(entry.type),
    amount: String(entry.amountCents / 100),
    category: entry.category,
    dueAt: entry.nextDueAt ? entry.nextDueAt.slice(0, 10) : "",
    name: entry.name,
    notes:
      typeof entry.metadata?.notes === "string" ? entry.metadata.notes : "",
    recurrence: "recurring",
    recurrenceDay: entry.dayOfMonth ? String(entry.dayOfMonth) : "",
    recurrenceFrequency: entry.frequency,
    recurrenceOccurrences:
      typeof occurrences === "number" && Number.isFinite(occurrences)
        ? String(occurrences)
        : "",
    sellerUserId: entry.sellerUserId ?? "",
  };
}

export function toRecurringUpdateInput(
  draft: FinanceEntryDraft,
  existingMetadata?: Record<string, unknown>,
): UpdateFinanceRecurringEntryInput {
  const input = toRecurringInput(draft);
  return {
    amountCents: input.amountCents,
    category: input.category,
    dayOfMonth: input.dayOfMonth ?? null,
    frequency: input.frequency,
    metadata: {
      ...(existingMetadata ?? {}),
      ...(input.metadata ?? {}),
    },
    name: input.name,
    nextDueAt: input.nextDueAt,
    sellerUserId: input.sellerUserId ?? null,
  };
}

function toCents(value: string) {
  return Math.round(Number(value.replace(",", ".")) * 100);
}

function toIsoDate(value: string) {
  return value ? new Date(`${value}T12:00:00`).toISOString() : null;
}
