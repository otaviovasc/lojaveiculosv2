import type {
  FiscalIssueResult,
  FiscalProviderDocumentStatus,
  FiscalStatusResult,
} from "../../domains/fiscal/ports/fiscalProviderGateway.js";

const accessKeyFields = ["accessKey", "access_key", "chaveAcesso"] as const;
const documentIdFields = ["id", "providerDocumentId", "documentId"] as const;

export class SpedyInvalidResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpedyInvalidResponseError";
  }
}

export function toIssueResult(
  payload: Record<string, unknown>,
): FiscalIssueResult {
  return {
    accessKey: readString(payload, accessKeyFields),
    providerDocumentId: requireProviderDocumentId(payload),
    rawResponse: sanitizeResponse(payload),
    status: mapSpedyStatus(readProviderStatus(payload)),
  };
}

export function toStatusResult(
  payload: Record<string, unknown>,
  expectedProviderDocumentId: string,
): FiscalStatusResult {
  const providerDocumentId =
    readString(payload, documentIdFields) ?? expectedProviderDocumentId;
  if (providerDocumentId !== expectedProviderDocumentId) {
    throw new SpedyInvalidResponseError(
      "Spedy returned a different fiscal document identifier.",
    );
  }
  return {
    accessKey: readString(payload, accessKeyFields),
    providerDocumentId,
    rawResponse: sanitizeResponse(payload),
    status: mapSpedyStatus(readProviderStatus(payload)),
  };
}

export function mapSpedyStatus(status: string): FiscalProviderDocumentStatus {
  const normalized = status.trim().toLowerCase();
  if (["created", "enqueued", "queued", "pending"].includes(normalized)) {
    return "queued";
  }
  if (
    ["received", "processing", "incontingent", "in_contingent"].includes(
      normalized,
    )
  ) {
    return "processing";
  }
  if (["authorized", "issued"].includes(normalized)) return "authorized";
  if (["rejected", "denied"].includes(normalized)) return "rejected";
  if (["canceled", "cancelled", "removed", "disabled"].includes(normalized)) {
    return "cancelled";
  }
  if (["error", "failed"].includes(normalized)) return "error";
  throw new SpedyInvalidResponseError(
    `Spedy returned an unsupported fiscal status: ${status}`,
  );
}

function requireProviderDocumentId(payload: Record<string, unknown>) {
  const id = readString(payload, documentIdFields);
  if (!id) {
    throw new SpedyInvalidResponseError(
      "Spedy did not return a fiscal document identifier.",
    );
  }
  return id;
}

function readProviderStatus(payload: Record<string, unknown>) {
  const direct = payload.status;
  if (typeof direct === "string" && direct.trim()) return direct;
  const processingDetail = toRecord(payload.processingDetail);
  const nested = processingDetail.status;
  if (typeof nested === "string" && nested.trim()) return nested;
  throw new SpedyInvalidResponseError(
    "Spedy did not return a fiscal document status.",
  );
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

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function sanitizeResponse(payload: Record<string, unknown>) {
  return Object.fromEntries(
    [
      "accessKey",
      "authorization",
      "id",
      "integrationId",
      "number",
      "processingDetail",
      "rpsNumber",
      "series",
      "status",
    ]
      .filter((key) => payload[key] !== undefined)
      .map((key) => [key, payload[key]]),
  );
}
