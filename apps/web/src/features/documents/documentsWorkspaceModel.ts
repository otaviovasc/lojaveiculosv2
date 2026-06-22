import { kindLabel, statusLabel, targetLabel } from "./documentLabels";
import type { WorkspaceDocument } from "./types";

export type DocumentFolder = {
  count: number;
  issued: number;
  key: string;
  latestAt: string;
  pendingSignature: number;
  subtitle: string;
  targetId: string;
  targetType: WorkspaceDocument["context"]["targetType"];
  title: string;
};

export function buildDocumentFolders(
  documents: readonly WorkspaceDocument[],
): DocumentFolder[] {
  const groups = new Map<string, WorkspaceDocument[]>();

  for (const document of documents) {
    const key = createFolderKey(document);
    groups.set(key, [...(groups.get(key) ?? []), document]);
  }

  return [...groups.values()]
    .map((folderDocuments) => {
      const [first] = folderDocuments;
      if (!first) throw new Error("Document folder cannot be empty.");
      const latest = folderDocuments.reduce((current, document) =>
        new Date(document.uploadedAt) > new Date(current.uploadedAt)
          ? document
          : current,
      );
      return {
        count: folderDocuments.length,
        issued: folderDocuments.filter((document) => document.status === "issued")
          .length,
        key: createFolderKey(first),
        latestAt: latest.uploadedAt,
        pendingSignature: folderDocuments.filter(
          (document) => document.status === "pending_signature",
        ).length,
        subtitle: folderSubtitle(first),
        targetId: first.context.targetId,
        targetType: first.context.targetType,
        title: folderTitle(first),
      };
    })
    .sort((left, right) => {
      const vehiclePriority =
        Number(isVehicleFolder(right)) - Number(isVehicleFolder(left));
      if (vehiclePriority !== 0) return vehiclePriority;
      return new Date(right.latestAt).getTime() - new Date(left.latestAt).getTime();
    });
}

export function createFolderKey(document: WorkspaceDocument) {
  return `${document.context.targetType}:${document.context.targetId}`;
}

export function filterDocumentsByFolder(
  documents: readonly WorkspaceDocument[],
  folderKey: string | null,
) {
  if (!folderKey) return documents;
  return documents.filter((document) => createFolderKey(document) === folderKey);
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

function folderTitle(document: WorkspaceDocument) {
  if (document.context.targetType === "store") return "Documentos gerais";
  return (
    readMetadataString(document, [
      "vehicleTitle",
      "vehicleName",
      "listingTitle",
      "unitTitle",
      "targetTitle",
      "targetName",
      "saleTitle",
      "leadName",
      "buyerName",
    ]) ?? documentContextLabel(document)
  );
}

function folderSubtitle(document: WorkspaceDocument) {
  const plate = readMetadataString(document, [
    "plate",
    "licensePlate",
    "plateFinal",
    "vehiclePlate",
  ]);
  const party = documentPrimaryParty(document);
  const context = targetLabel(document.context.targetType);

  return plate ? `${context} · ${plate}` : `${context} · ${party}`;
}

function isVehicleFolder(folder: DocumentFolder) {
  return (
    folder.targetType === "vehicle_listing" || folder.targetType === "vehicle_unit"
  );
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
