import type { InventoryDocument } from "../model/types";

export type ContractDocumentListItem = {
  date: string;
  id: string;
  status: "Arquivado" | "Assinado" | "Emitido" | "Minuta" | "Pendente";
  title: string;
};

export function createContractDocumentItems(
  documents: readonly InventoryDocument[],
): readonly ContractDocumentListItem[] {
  const stored = documents.flatMap((document): ContractDocumentListItem[] => {
    if (!isContractDocument(document)) return [];

    return [
      {
        date: formatDocumentDate(document.uploadedAt || document.createdAt),
        id: document.id,
        status: statusLabel(document.status),
        title: document.title || document.fileName,
      },
    ];
  });

  return stored;
}

function isContractDocument(document: InventoryDocument) {
  return (
    document.kind === "sale_contract" ||
    document.kind === "sale_receipt" ||
    document.kind === "reservation_receipt"
  );
}

function statusLabel(status: InventoryDocument["status"]) {
  if (status === "signed") return "Assinado";
  if (status === "issued") return "Emitido";
  if (status === "archived" || status === "voided") return "Arquivado";
  if (status === "draft") return "Minuta";
  return "Pendente";
}

function formatDocumentDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("pt-BR");
}
