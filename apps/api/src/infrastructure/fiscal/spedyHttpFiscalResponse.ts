import type {
  FiscalIssueResult,
  FiscalStatusResult,
} from "../../domains/fiscal/ports/fiscalProviderGateway.js";

const accessKeyFields = ["accessKey", "access_key", "chaveAcesso"] as const;
const documentIdFields = [
  "providerDocumentId",
  "documentId",
  "id",
  "uuid",
] as const;

export function toIssueResult(
  payload: Record<string, unknown>,
): FiscalIssueResult {
  return {
    accessKey: readString(payload, accessKeyFields),
    providerDocumentId:
      readString(payload, documentIdFields) ?? crypto.randomUUID(),
    rawResponse: payload,
    status: mapIssueStatus(payload.status),
  };
}

export function toStatusResult(
  payload: Record<string, unknown>,
  fallbackProviderDocumentId: string,
): FiscalStatusResult {
  return {
    accessKey: readString(payload, accessKeyFields),
    providerDocumentId:
      readString(payload, documentIdFields) ?? fallbackProviderDocumentId,
    rawResponse: payload,
    status: mapStatus(payload.status),
  };
}

function mapIssueStatus(status: unknown): FiscalIssueResult["status"] {
  const normalized = normalizeStatus(status);
  return normalized === "failed" || normalized === "rejected"
    ? normalized
    : normalized === "processing" || normalized === "queued"
      ? normalized
      : "authorized";
}

function mapStatus(status: unknown): FiscalStatusResult["status"] {
  const normalized = normalizeStatus(status);
  if (normalized === "cancelled") return "cancelled";
  if (normalized === "failed") return "failed";
  if (normalized === "rejected") return "rejected";
  if (normalized === "processing") return "processing";
  if (normalized === "queued") return "queued";
  return "authorized";
}

function normalizeStatus(status: unknown) {
  if (typeof status !== "string") return "authorized";
  const normalized = status.toLowerCase();
  if (["cancelled", "canceled", "cancelada", "cancelado"].includes(normalized))
    return "cancelled";
  if (["failed", "error", "erro"].includes(normalized)) return "failed";
  if (["rejected", "rejeitada", "rejeitado"].includes(normalized))
    return "rejected";
  if (["processing", "processando"].includes(normalized)) return "processing";
  if (["queued", "pending", "draft", "enqueued"].includes(normalized))
    return "queued";
  return "authorized";
}

function readString(
  payload: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}
