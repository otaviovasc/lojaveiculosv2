import type { FiscalDocument, FiscalDocumentStatus } from "./types";

export type FiscalStatusFilter =
  "all" | "cancelled" | "failed" | "issued" | "pending" | "rejected";

export type FiscalTypeFilter = "all" | "nfe" | "nfse";

export const fiscalStatusFilterOptions: ReadonlyArray<{
  label: string;
  value: FiscalStatusFilter;
}> = [
  { label: "Todos os status", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Emitidas", value: "issued" },
  { label: "Rejeitadas", value: "rejected" },
  { label: "Com falha", value: "failed" },
  { label: "Canceladas", value: "cancelled" },
];

export const fiscalTypeFilterOptions: ReadonlyArray<{
  label: string;
  value: FiscalTypeFilter;
}> = [
  { label: "Todos os tipos", value: "all" },
  { label: "NF-e", value: "nfe" },
  { label: "NFS-e", value: "nfse" },
];

/**
 * Mirrors the summary buckets computed by the API in
 * `apps/api/src/features/fiscal/adapters/memory/fiscalRepository.ts`.
 */
export function matchesStatusFilter(
  status: FiscalDocumentStatus,
  filter: FiscalStatusFilter,
) {
  if (filter === "all") return true;
  if (filter === "pending") {
    return status === "draft" || status === "processing" || status === "queued";
  }
  if (filter === "issued")
    return status === "authorized" || status === "issued";
  if (filter === "failed") {
    return status === "error" || status === "failed" || status === "rejected";
  }
  return status === filter;
}

export function matchesDocumentSearch(document: FiscalDocument, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [
    document.id,
    document.accessKey,
    readExternalReference(document),
    readDocumentRecipientName(document),
    readDocumentRecipientDocument(document),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalized);
}

/** Statuses that still expect a provider update and should be polled. */
export function isPendingSyncStatus(status: FiscalDocumentStatus) {
  return status === "processing" || status === "queued";
}

/** Statuses that represent a failed emission the store may correct. */
export function isRejectedLikeStatus(status: FiscalDocumentStatus) {
  return status === "error" || status === "failed" || status === "rejected";
}

/** Statuses whose document can still be cancelled at the provider. */
export function isCancellableStatus(status: FiscalDocumentStatus) {
  return status === "authorized" || status === "issued";
}

export function readExternalReference(document: FiscalDocument) {
  return stringValue(asRecord(document.metadata).externalReference);
}

export function readDocumentRecipientName(document: FiscalDocument) {
  const metadata = asRecord(document.metadata);
  return (
    stringValue(asRecord(metadata.recipient).name) ??
    stringValue(asRecord(asRecord(metadata.vehicleNfe).buyer).name) ??
    stringValue(asRecord(metadata.buyer).name)
  );
}

export function readDocumentRecipientDocument(document: FiscalDocument) {
  const metadata = asRecord(document.metadata);
  return (
    stringValue(asRecord(metadata.recipient).document) ??
    stringValue(asRecord(asRecord(metadata.vehicleNfe).buyer).document)
  );
}

export function readDocumentTotal(document: FiscalDocument) {
  const metadata = asRecord(document.metadata);
  const vehicleNfe = asRecord(metadata.vehicleNfe);
  return (
    numberValue(asRecord(vehicleNfe.sale).price) ??
    numberValue(asRecord(metadata.sale).price) ??
    numberValue(metadata.grossAmount) ??
    null
  );
}

export function readDocumentDescription(document: FiscalDocument) {
  const metadata = asRecord(document.metadata);
  const rendered = stringValue(metadata.renderedDescription);
  if (rendered) return rendered;
  const vehicle = asRecord(asRecord(metadata.vehicleNfe).vehicle);
  const vehicleLabel = [vehicle.brand, vehicle.model]
    .map(stringValue)
    .filter(Boolean)
    .join(" ");
  return vehicleLabel || null;
}

/**
 * Extracts a human-readable rejection/failure reason from the document
 * metadata, tolerating the shapes written by the issue, sync and webhook
 * paths (`message`, `error`, `processingDetail`, `providerErrorName`).
 */
export function readDocumentError(document: FiscalDocument) {
  const metadata = asRecord(document.metadata);
  const detail = metadata.processingDetail;
  const detailRecord = asRecord(detail);
  const code =
    stringValue(metadata.code) ?? stringValue(detailRecord.code) ?? null;
  const message =
    stringValue(metadata.message) ??
    stringValue(metadata.error) ??
    (typeof detail === "string" ? stringValue(detail) : undefined) ??
    stringValue(detailRecord.message) ??
    stringValue(metadata.providerErrorName) ??
    null;
  if (!message) return null;
  return code ? `[Ref: ${code}] ${message}` : message;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function stringValue(value: unknown) {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

export function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.includes(",")
      ? value.replace(/\./g, "").replace(",", ".")
      : value;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
