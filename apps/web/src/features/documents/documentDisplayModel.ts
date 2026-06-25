import { kindLabel, statusLabel, targetLabel } from "./documentLabels";
import {
  readMetadataArray,
  readMetadataNumber,
  readMetadataString,
} from "./documentMetadataReaders";
import type {
  DocumentKind,
  DocumentLinkTarget,
  DocumentStatus,
  WorkspaceDocument,
} from "./types";
import { isVehicleDocumentTargetType } from "./documentVehicleInfoModel";

export {
  documentVehicleInfo,
  isVehicleDocumentTargetType,
  type DocumentVehicleInfo,
  type DocumentVehicleOption,
} from "./documentVehicleInfoModel";
import { documentVehicleInfo } from "./documentVehicleInfoModel";
import type { DocumentVehicleInfo } from "./documentVehicleInfoModel";

export type DocumentOrigin = "automatic" | "manual";
export type DocumentScope = "general" | "multiple_vehicles" | "vehicle";

export type DocumentsWorkspaceFilters = {
  dateFrom: string;
  dateTo: string;
  kind: DocumentKind | "";
  origin: DocumentOrigin | "all";
  scope: "all" | "general" | "vehicle";
  search: string;
  status: DocumentStatus | "";
  vehicleId: string;
};

export function documentOrigin(document: WorkspaceDocument): DocumentOrigin {
  // TODO(documents-api): replace this inference with a backend origin/source enum.
  return document.metadata.manualUpload === true ? "manual" : "automatic";
}

export function documentOriginLabel(document: WorkspaceDocument) {
  return documentOrigin(document) === "manual" ? "Envio manual" : "Automático";
}

export function documentScope(document: WorkspaceDocument): DocumentScope {
  const vehicleCount = readMetadataNumber(document, ["vehicleCount"]);
  if (vehicleCount && vehicleCount > 1) return "multiple_vehicles";

  const vehicleIds = readMetadataArray(document, ["vehicleIds", "vehicles"]);
  if (vehicleIds.length > 1) return "multiple_vehicles";

  return isVehicleDocumentTargetType(document.context.targetType)
    ? "vehicle"
    : "general";
}

export function documentScopeLabel(document: WorkspaceDocument) {
  const scope = documentScope(document);
  if (scope === "multiple_vehicles") return "Várias unidades";
  if (scope === "vehicle") return "Unidade";
  return "Geral";
}

export function documentActorLabel(document: WorkspaceDocument) {
  if (documentOrigin(document) === "manual") {
    return (
      readMetadataString(document, [
        "uploadedByName",
        "createdByName",
        "actorName",
        "uploaderName",
      ]) ?? "Envio de usuário"
    );
  }

  return (
    readMetadataString(document, [
      "generatedBy",
      "systemProcess",
      "workflowName",
      "sourceProcess",
    ]) ?? "Fluxo do sistema"
  );
}

export function summarizeWorkspaceDocuments(
  documents: readonly WorkspaceDocument[],
) {
  return {
    automatic: documents.filter(
      (document) => documentOrigin(document) === "automatic",
    ).length,
    general: documents.filter(
      (document) => documentScope(document) === "general",
    ).length,
    linkedToVehicles: documents.filter(
      (document) => documentScope(document) !== "general",
    ).length,
    manual: documents.filter(
      (document) => documentOrigin(document) === "manual",
    ).length,
    pending: documents.filter((document) =>
      ["draft", "pending_signature"].includes(document.status),
    ).length,
    ready: documents.filter((document) =>
      ["issued", "signed"].includes(document.status),
    ).length,
    total: documents.length,
    voided: documents.filter((document) => document.status === "voided").length,
  };
}

export function buildDocumentVehicleOptions(
  documents: readonly WorkspaceDocument[],
): DocumentVehicleInfo[] {
  const options = new Map<string, DocumentVehicleInfo>();
  for (const document of documents) {
    const vehicle = documentUnitFolderInfo(document);
    if (vehicle) options.set(vehicle.id, vehicle);
  }
  return Array.from(options.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

export function documentUnitFolderInfo(
  document: WorkspaceDocument,
): DocumentVehicleInfo | null {
  const vehicle = documentVehicleInfo(document);
  if (!vehicle) return null;
  if (vehicle.unitId) return { ...vehicle, id: vehicle.unitId };
  if (vehicle.targetType === "vehicle_unit") return vehicle;
  return null;
}

export function filterDocumentsForFolder(
  documents: readonly WorkspaceDocument[],
  folderKey: DocumentsFolderKey | null,
) {
  if (!folderKey) return [];
  if (folderKey === "general") {
    return documents.filter((document) => !documentUnitFolderInfo(document));
  }
  const unitId = folderKey.replace("unit:", "");
  return documents.filter(
    (document) => documentUnitFolderInfo(document)?.id === unitId,
  );
}

export type DocumentsFolderKey = "general" | `unit:${string}`;

export function filterDocumentsForWorkspace(
  documents: readonly WorkspaceDocument[],
  filters: DocumentsWorkspaceFilters,
) {
  const search = normalizeSearch(filters.search);
  const from = parseDateBoundary(filters.dateFrom, "start");
  const to = parseDateBoundary(filters.dateTo, "end");

  return documents.filter((document) => {
    if (
      filters.origin !== "all" &&
      documentOrigin(document) !== filters.origin
    ) {
      return false;
    }
    if (filters.scope !== "all") {
      const scope = documentScope(document);
      if (filters.scope === "general" && scope !== "general") return false;
      if (filters.scope === "vehicle" && scope === "general") return false;
    }
    if (filters.kind && document.kind !== filters.kind) return false;
    if (filters.status && document.status !== filters.status) return false;
    if (filters.vehicleId) {
      const vehicle = documentVehicleInfo(document);
      if (vehicle?.id !== filters.vehicleId) return false;
    }
    const uploadedAt = new Date(document.uploadedAt);
    if (from && uploadedAt < from) return false;
    if (to && uploadedAt > to) return false;
    if (search && !documentSearchText(document).includes(search)) return false;
    return true;
  });
}

export function hasActiveDocumentFilters(filters: DocumentsWorkspaceFilters) {
  return Boolean(
    filters.search.trim() ||
    filters.origin !== "all" ||
    filters.scope !== "all" ||
    filters.vehicleId ||
    filters.kind ||
    filters.status ||
    filters.dateFrom ||
    filters.dateTo,
  );
}

export function formatFileSizeLabel(value: number | null) {
  if (value == null) return "Tamanho indisponível";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function documentSearchText(document: WorkspaceDocument) {
  const vehicle = documentVehicleInfo(document);
  return normalizeSearch(
    [
      document.title,
      document.file.fileName,
      document.file.mimeType,
      kindLabel(document.kind),
      statusLabel(document.status),
      documentOriginLabel(document),
      documentScopeLabel(document),
      documentActorLabel(document),
      document.context.targetId,
      targetLabel(document.context.targetType),
      vehicle?.label,
      vehicle?.plate,
      vehicle?.stockNumber,
      vehicle?.vin,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function parseDateBoundary(value: string, boundary: "end" | "start") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }
  const date = new Date(
    year,
    month - 1,
    day,
    boundary === "start" ? 0 : 23,
    boundary === "start" ? 0 : 59,
    boundary === "start" ? 0 : 59,
    boundary === "start" ? 0 : 999,
  );
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}
