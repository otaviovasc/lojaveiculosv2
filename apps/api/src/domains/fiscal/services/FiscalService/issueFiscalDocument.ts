import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { FiscalDocument } from "../../ports/fiscalRepository.js";
import {
  requireFiscalScope,
  type FiscalServicePorts,
} from "./serviceSupport.js";

export type IssueFiscalDocumentInput = {
  documentType: string;
  externalReference: string;
  metadata?: Record<string, unknown>;
};

export async function issueFiscalDocument(
  context: ServiceContext,
  input: IssueFiscalDocumentInput,
  ports: FiscalServicePorts,
): Promise<FiscalDocument> {
  assertPermission(context, "fiscal.manage");
  const scope = requireFiscalScope(context);

  context.logger.info(
    "fiscal.document.issue.started",
    createServiceLogMetadata(context, {
      documentType: input.documentType,
      externalReference: input.externalReference,
    }),
  );

  const providerResult = await ports.fiscalProviderGateway.issueDocument({
    documentType: input.documentType,
    externalReference: input.externalReference,
    metadata: input.metadata ?? {},
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  const document = await ports.fiscalRepository.createDocument({
    accessKey: providerResult.accessKey,
    documentType: input.documentType,
    metadata: {
      ...(input.metadata ?? {}),
      externalReference: input.externalReference,
    },
    providerDocumentId: providerResult.providerDocumentId,
    status: providerResult.status,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });

  await context.audit.record({
    action: "fiscal.document.issue",
    actor: context.actor,
    category: "integration",
    criticality: "critical",
    entityId: document.id,
    entityType: "fiscal_document",
    metadata: {
      documentType: document.documentType,
      provider: document.provider,
      providerDocumentId: document.providerDocumentId,
      status: document.status,
    },
    outcome: document.status === "failed" ? "failed" : "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Issued fiscal document through provider",
  });

  return document;
}
