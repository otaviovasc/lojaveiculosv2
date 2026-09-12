import type { ServiceContext } from "../../shared/serviceContext.js";
import { FiscalTemplateNotFoundError } from "./domain/fiscalErrors.js";
import type {
  FiscalDocument,
  FiscalDocumentKind,
  FiscalServiceInvoiceTemplate,
} from "./ports/fiscalRepository.js";
import {
  requireFiscalScope,
  type FiscalServicePorts,
} from "./services/FiscalService/serviceSupport.js";

export type IssueFiscalDocumentInput = {
  documentKind?: FiscalDocumentKind;
  documentType: string;
  externalReference: string;
  metadata?: Record<string, unknown>;
  recipientId?: string | null;
  templateId?: string | null;
  templateVariables?: Record<string, unknown>;
};

export class FiscalProviderNotReadyError extends Error {
  constructor(readonly missingConfiguration: readonly string[]) {
    super(`Fiscal provider is not ready: ${missingConfiguration.join(", ")}`);
    this.name = "FiscalProviderNotReadyError";
  }
}

export function isFailureStatus(status: FiscalDocument["status"]) {
  return status === "error" || status === "failed" || status === "rejected";
}

export async function readTemplateIfPresent(
  context: ServiceContext,
  input: IssueFiscalDocumentInput,
  ports: FiscalServicePorts,
): Promise<FiscalServiceInvoiceTemplate | null> {
  if (!input.templateId) return null;
  const scope = requireFiscalScope(context);
  const template = await ports.fiscalRepository.getTemplate({
    id: input.templateId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  if (!template) throw new FiscalTemplateNotFoundError(input.templateId);
  return template;
}
