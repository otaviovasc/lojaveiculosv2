import type { FinanceApi } from "./apiClient";
import { uploadFinanceDocumentObject } from "./financeDocumentUpload";
import { formatFinanceCategory } from "./financeBillsFormat";
import { entryReference, entrySellerName } from "./commissionEntryMeta";
import {
  toEntryInput,
  type FinanceEntryDraft,
  type FinanceToast,
} from "./financeBillsModel";
import type {
  FinanceEntry,
  FinanceEntryType,
  UpdateFinanceEntryInput,
} from "./types";

export async function updateEntryFromDraft(
  api: FinanceApi,
  entry: FinanceEntry,
  draft: FinanceEntryDraft,
) {
  const input = toEntryInput(draft);
  const update: UpdateFinanceEntryInput = {
    amountCents: input.amountCents,
    category: input.category,
    name: input.name,
    status: input.status,
  };
  if (input.dueAt !== undefined) update.dueAt = input.dueAt;
  if (input.metadata !== undefined) {
    update.metadata = mergeEntryMetadata(entry.metadata, input.metadata);
  }
  if (input.paidAt !== undefined) update.paidAt = input.paidAt;
  if (input.sellerUserId !== undefined)
    update.sellerUserId = input.sellerUserId;
  await api.updateEntry(entry.id, update);
  if (!draft.documentFile) return;
  const documentTitle = draft.documentTitle.trim() || draft.documentFile.name;
  const upload = await api.requestDocumentUpload(entry.id, draft.documentFile);
  await uploadFinanceDocumentObject(upload, draft.documentFile);
  await api.attachDocument(entry.id, {
    fileName: draft.documentFile.name,
    fileSizeBytes: draft.documentFile.size,
    kind: "finance_receipt",
    mimeType: draft.documentFile.type || "application/octet-stream",
    storageKey: upload.storageKey,
    title: documentTitle,
  });
  await api.updateEntry(entry.id, {
    metadata: mergeEntryMetadata(entry.metadata, {
      ...input.metadata,
      receipt: {
        fileName: draft.documentFile.name,
        title: documentTitle,
      },
    }),
  });
}

export function mergeEntryMetadata(
  existing: Record<string, unknown> | undefined,
  incoming: Record<string, unknown>,
) {
  const incomingReceipt = isRecord(incoming.receipt)
    ? incoming.receipt
    : undefined;
  return {
    ...(existing ?? {}),
    notes:
      typeof incoming.notes === "string" ? incoming.notes : existing?.notes,
    receipt: incomingReceipt ?? existing?.receipt,
    source: existing?.source ?? incoming.source,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function cancelEntry(
  api: FinanceApi | null,
  entry: FinanceEntry,
  refresh: () => void,
  setToast: (toast: FinanceToast) => void,
) {
  if (!api) return;
  await api.cancelEntry(entry.id, "Cancelado pela tela de gastos.");
  setToast({
    kind: "success",
    title: "Lançamento cancelado",
    message: entry.name,
  });
  refresh();
}

export function exportFinanceCsv(
  entries: readonly FinanceEntry[],
  activeType: FinanceEntryType,
) {
  const csv = buildFinanceCsv(entries);
  const fileType = {
    commission: "comissoes",
    expense: "gastos",
    revenue: "receitas",
  } satisfies Record<FinanceEntryType, string>;
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `financeiro-${fileType[activeType]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function buildFinanceCsv(entries: readonly FinanceEntry[]) {
  const rows = [
    [
      "tipo",
      "nome",
      "categoria",
      "status",
      "vencimento",
      "valor_reais",
      "vendedor",
      "referencia",
    ],
    ...entries.map((entry) => [
      financeTypeLabels[entry.type],
      entry.name,
      formatFinanceCategory(entry.category),
      financeStatusLabels[entry.status],
      formatCsvDate(entry.dueAt),
      (entry.amountCents / 100).toFixed(2).replace(".", ","),
      entrySellerName(entry),
      entryReference(entry),
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
}

function csvCell(value: string) {
  const protectedValue = /^[\t\r=+\-@]/.test(value) ? `'${value}` : value;
  return `"${protectedValue.replaceAll('"', '""')}"`;
}

function formatCsvDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(value),
  );
}

const financeTypeLabels = {
  commission: "Comissão",
  expense: "Gasto",
  revenue: "Receita",
} satisfies Record<FinanceEntryType, string>;

const financeStatusLabels = {
  cancelled: "Cancelado",
  paid: "Pago",
  pending: "Pendente",
} satisfies Record<FinanceEntry["status"], string>;
