import type { LinkedDocument } from "../../documents/ports/documentRepository.js";

type ReceiptEntry = {
  amountCents: number;
  category: string;
  dueAt: Date | null;
  id: string;
  name: string;
  paidAt: Date | null;
  status: string;
  type: string;
};

export function buildFinanceEntryReceiptMetadata(
  entry: ReceiptEntry,
  template: { clauses: readonly string[]; title: string } | null,
  generatedAt: Date,
  storeName: string,
) {
  return {
    documentNumber: entry.id,
    finance: {
      paidAmountCents: entry.status === "paid" ? entry.amountCents : 0,
      paymentMethod: paymentStatusLabel(entry.status),
      totalAmountCents: entry.amountCents,
    },
    financeEntry: {
      category: entry.category,
      dueAt: entry.dueAt?.toISOString() ?? null,
      id: entry.id,
      name: entry.name,
      paidAt: entry.paidAt?.toISOString() ?? null,
      status: entry.status,
      type: entry.type,
    },
    generatedAt: generatedAt.toISOString(),
    renderer: "metadata-summary-pdf",
    store: { name: storeName },
    template: "finance_entry_receipt",
    templateClauses: (template?.clauses ?? []).map((clause) =>
      resolveReceiptClause(clause, entry, storeName),
    ),
    templateKey: "finance_entry_receipt",
    templateTitle: template?.title ?? "Recibo de lançamento financeiro",
  };
}

export function buildFinanceEntryReceiptPreview(input: {
  entryId: string;
  fileName: string;
  metadata: Record<string, unknown>;
  now: Date;
  scope: { storeId: string; tenantId: string };
}): LinkedDocument {
  return {
    createdAt: input.now,
    fileName: input.fileName,
    fileSizeBytes: null,
    id: `preview-${input.entryId}`,
    kind: "finance_receipt",
    linkRole: "finance_entry_receipt",
    metadata: input.metadata,
    mimeType: "application/pdf",
    status: "issued",
    storageKey: "pending",
    ...input.scope,
    targetId: input.entryId,
    targetType: "finance_entry",
    title: String(
      input.metadata.templateTitle ?? "Recibo de lançamento financeiro",
    ),
    updatedAt: input.now,
    uploadedAt: input.now,
  };
}

function resolveReceiptClause(
  clause: string,
  entry: Pick<ReceiptEntry, "amountCents" | "id" | "status">,
  storeName: string,
) {
  const values: Record<string, string> = {
    "document.number": entry.id,
    "finance.paymentMethod": paymentStatusLabel(entry.status),
    "finance.salePrice": formatCurrency(entry.amountCents),
    "store.name": storeName,
  };
  return clause.replace(/\{\{([^{}]+)\}\}/g, (_match, key: string) => {
    return values[key.trim()] ?? "-";
  });
}

function paymentStatusLabel(status: string) {
  if (status === "paid") return "Quitado";
  if (status === "cancelled") return "Lançamento cancelado";
  return "Pagamento pendente";
}

function formatCurrency(amountCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(amountCents / 100);
}
