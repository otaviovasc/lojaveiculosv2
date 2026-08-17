import type { FiscalDocumentKind } from "../ports/fiscalRepository.js";

export type ParsedSpedyWebhook = {
  companyId: string;
  documentKind: FiscalDocumentKind;
  eventType: string;
  providerDocumentId: string;
  providerEventId: string;
};

export function parseSpedyWebhook(
  payload: Record<string, unknown>,
): ParsedSpedyWebhook {
  const data = record(payload.data);
  const company = record(payload.company);
  const dataCompany = record(data.company);
  const companyId = firstString(
    payload.companyId,
    company.id,
    data.companyId,
    dataCompany.id,
  );
  // Official Spedy envelope: { id: <eventId>, event, data: { id: <invoiceId>, model, status, company } }
  // Top-level `id` is the EVENT id — never use it as the document id.
  const providerDocumentId = firstString(
    data.id,
    data.invoiceId,
    data.documentId,
    payload.invoiceId,
    payload.documentId,
  );
  const kindValue = firstString(
    data.model,
    payload.model,
    payload.invoiceType,
    payload.documentType,
    payload.type,
    data.invoiceType,
    data.documentType,
    data.type,
  );
  const documentKind = readKind(kindValue);
  if (!companyId || !providerDocumentId || !documentKind) {
    throw new SpedyWebhookValidationError();
  }
  const eventType =
    firstString(payload.event, payload.eventType, data.event, data.eventType) ??
    "invoice.status_changed";
  const status = firstString(payload.status, data.status) ?? "unknown";
  return {
    companyId,
    documentKind,
    eventType,
    providerDocumentId,
    providerEventId:
      firstString(payload.eventId, data.eventId, payload.id) ??
      `${companyId}:${documentKind}:${providerDocumentId}:${status}`.slice(
        0,
        191,
      ),
  };
}

function readKind(value: string | undefined): FiscalDocumentKind | null {
  const normalized = value?.toLowerCase() ?? "";
  if (
    normalized.includes("service") ||
    normalized.includes("nfse") ||
    normalized.includes("nfs-e")
  ) {
    return "nfse";
  }
  if (
    normalized.includes("product") ||
    normalized.includes("nfe") ||
    normalized.includes("nf-e")
  ) {
    return "nfe";
  }
  return null;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export class SpedyWebhookValidationError extends Error {
  constructor() {
    super("Spedy webhook does not identify a company and fiscal document.");
    this.name = "SpedyWebhookValidationError";
  }
}
