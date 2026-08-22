import type { FinanceApi } from "./apiClient";
import type { FinanceEntry, FinanceEntryDocument } from "./types";

export type OpenFinanceReceiptResult =
  | {
      document: FinanceEntryDocument;
      generated: boolean;
      kind: "opened";
    }
  | { kind: "missing" };

export async function openFinanceEntryReceipt(
  api: FinanceApi,
  entry: FinanceEntry,
  options: { canGenerate: boolean },
): Promise<OpenFinanceReceiptResult> {
  const detail = await api.getEntryDetail(entry.id);
  const existing = detail.documents.find(
    (document) =>
      document.kind === "finance_receipt" &&
      document.status !== "archived" &&
      document.status !== "voided",
  );
  if (!existing && !options.canGenerate) return { kind: "missing" };
  const result = existing
    ? { document: existing, generated: false }
    : await api.generateEntryReceipt(entry.id);

  const blob = await api.openEntryDocument(entry.id, result.document.id);
  openDocumentBlob(blob, result.document);
  return { ...result, kind: "opened" };
}

function openDocumentBlob(blob: Blob, document: FinanceEntryDocument) {
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    const link = window.document.createElement("a");
    link.href = url;
    link.download =
      document.fileName || document.title || "recibo-financeiro.pdf";
    link.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
