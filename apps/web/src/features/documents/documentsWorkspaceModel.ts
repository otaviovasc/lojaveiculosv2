import { kindLabel, statusLabel, targetLabel } from "./documentLabels";
import { isVehicleDocumentTargetType } from "./documentDisplayModel";
import type { WorkspaceDocument } from "./types";

// Two structural top-level groups covering all DocumentLinkTarget types:
// - "geral": store-linked documents (NOT tied to any vehicle)
// - "veiculos": vehicle unit-linked documents
// All non-vehicle target types (lead, sale, sale_payment, finance_entry,
// financing_inquiry, fiscal_document, store) map to "geral".
export type DocumentTopGroup = {
  count: number;
  issued: number;
  key: "geral" | "veiculos";
  latestAt: string;
  pendingSignature: number;
  subtitle: string;
  title: string;
};

export function buildDocumentTopLevelGroups(
  documents: readonly WorkspaceDocument[],
): DocumentTopGroup[] {
  const geralDocs = documents.filter(
    (d) => !isVehicleDocumentTargetType(d.context.targetType),
  );
  const unitDocs = documents.filter((d) =>
    isVehicleDocumentTargetType(d.context.targetType),
  );

  const groups: DocumentTopGroup[] = [];

  if (geralDocs.length > 0 || documents.length === 0) {
    groups.push(buildGroup("geral", geralDocs));
  }
  if (unitDocs.length > 0 || documents.length === 0) {
    groups.push(buildGroup("veiculos", unitDocs));
  }

  return groups;
}

function buildGroup(
  key: "geral" | "veiculos",
  docs: readonly WorkspaceDocument[],
): DocumentTopGroup {
  const latest = docs.reduce<WorkspaceDocument | undefined>(
    (current, document) =>
      !current || new Date(document.uploadedAt) > new Date(current.uploadedAt)
        ? document
        : current,
    undefined,
  );

  return {
    count: docs.length,
    issued: docs.filter((d) => d.status === "issued").length,
    key,
    latestAt: latest?.uploadedAt ?? new Date().toISOString(),
    pendingSignature: docs.filter((d) => d.status === "pending_signature")
      .length,
    subtitle: groupSubtitle(key),
    title: groupTitle(key),
  };
}

function groupTitle(key: "geral" | "veiculos"): string {
  return key === "geral" ? "Documentos gerais" : "Unidades";
}

function groupSubtitle(key: "geral" | "veiculos"): string {
  return key === "geral"
    ? "Documentos da loja sem vínculo com unidade"
    : "Recibos, contratos e termos vinculados a unidades";
}

export function filterDocumentsByGroup(
  documents: readonly WorkspaceDocument[],
  groupKey: string | null,
) {
  if (!groupKey) return documents;
  if (groupKey === "geral") {
    return documents.filter(
      (d) => !isVehicleDocumentTargetType(d.context.targetType),
    );
  }
  if (groupKey === "veiculos") {
    return documents.filter((d) =>
      isVehicleDocumentTargetType(d.context.targetType),
    );
  }
  return documents;
}

export function createFolderKey(document: WorkspaceDocument) {
  return `${document.context.targetType}:${document.context.targetId}`;
}

export function documentPrimaryParty(document: WorkspaceDocument) {
  return (
    readMetadataString(document, [
      "buyerName",
      "buyerDisplayName",
      "customerName",
      "leadName",
      "sellerName",
      "createdByName",
    ]) ?? "Sem cliente informado"
  );
}

export function documentContextLabel(document: WorkspaceDocument) {
  return `${targetLabel(document.context.targetType)} #${document.context.targetId}`;
}

export function documentFileLabel(document: WorkspaceDocument) {
  const fileSize = formatFileSize(document.file.fileSizeBytes);
  const mime = document.file.mimeType ?? "arquivo";
  return fileSize ? `${mime} · ${fileSize}` : mime;
}

export function documentKindBadge(document: WorkspaceDocument) {
  return kindLabel(document.kind);
}

export function documentStatusBadge(document: WorkspaceDocument) {
  return statusLabel(document.status);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
}

function readMetadataString(
  document: WorkspaceDocument,
  keys: readonly string[],
) {
  for (const key of keys) {
    const value = document.metadata[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function formatFileSize(value: number | null) {
  if (value == null) return null;
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
