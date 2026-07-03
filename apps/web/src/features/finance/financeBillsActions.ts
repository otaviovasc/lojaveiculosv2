import type { FinanceApi } from "./apiClient";
import { uploadFinanceDocumentObject } from "./financeDocumentUpload";
import { formatFinanceCategory } from "./financeBillsFormat";
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
  if (!api || !window.confirm(`Cancelar ${entry.name}?`)) return;
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
  const rows = [
    ["nome", "categoria", "status", "vencimento", "valor_centavos"],
    ...entries.map((entry) => [
      entry.name,
      formatFinanceCategory(entry.category),
      entry.status,
      entry.dueAt ?? "",
      String(entry.amountCents),
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `financeiro-${activeType}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
