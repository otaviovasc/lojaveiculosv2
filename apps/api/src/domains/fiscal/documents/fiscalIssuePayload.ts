import type {
  FiscalDocumentKind,
  FiscalDocumentStatus,
  FiscalServiceInvoiceTemplate,
} from "../ports/fiscalRepository.js";
import type { NfeVehiclePayloadResult } from "./nfeVehiclePayload.js";

type FiscalIssuePayloadInput = {
  documentKind?: FiscalDocumentKind;
  documentType: string;
  externalReference: string;
  metadata?: Record<string, unknown>;
  recipientId?: string | null;
  templateId?: string | null;
};

export function createIssueMetadata(
  input: FiscalIssuePayloadInput,
  template: FiscalServiceInvoiceTemplate | null,
  renderedDescription?: string,
  nfeVehiclePayload?: NfeVehiclePayloadResult | null,
) {
  return {
    ...(input.metadata ?? {}),
    documentKind: input.documentKind ?? inferDocumentKind(input.documentType),
    externalReference: input.externalReference,
    renderedDescription: renderedDescription ?? null,
    templateId: template?.id ?? input.templateId ?? null,
    templateVersion: template?.version ?? null,
    vehicleNfePayload: nfeVehiclePayload?.providerPayload ?? null,
  };
}

export function createProviderPayload(
  input: FiscalIssuePayloadInput,
  documentKind: FiscalDocumentKind,
  template: FiscalServiceInvoiceTemplate | null,
  nfeVehiclePayload?: NfeVehiclePayloadResult | null,
) {
  return {
    documentKind,
    documentType: input.documentType,
    externalReference: input.externalReference,
    metadata: createProviderMetadata(input, nfeVehiclePayload),
    recipientId: input.recipientId ?? template?.recipientId ?? null,
    templateId: template?.id ?? input.templateId ?? null,
    templateVersion: template?.version ?? null,
  };
}

export function createProviderMetadata(
  input: FiscalIssuePayloadInput,
  nfeVehiclePayload?: NfeVehiclePayloadResult | null,
) {
  return {
    ...(input.metadata ?? {}),
    ...(nfeVehiclePayload
      ? { vehicleNfePayload: nfeVehiclePayload.providerPayload }
      : {}),
  };
}

export function inferDocumentKind(documentType: string): FiscalDocumentKind {
  return documentType.toLowerCase().includes("nfse") ? "nfse" : "nfe";
}

export function mapProviderStatus(status: string): FiscalDocumentStatus {
  if (status === "failed") return "failed";
  if (status === "rejected") return "rejected";
  if (status === "processing") return "processing";
  if (status === "queued") return "queued";
  if (status === "cancelled") return "cancelled";
  return status === "issued" ? "issued" : "authorized";
}
