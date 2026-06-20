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

export type SyncFiscalDocumentStatusInput = {
  documentId: string;
  providerDocumentId: string;
};

export async function syncFiscalDocumentStatus(
  context: ServiceContext,
  input: SyncFiscalDocumentStatusInput,
  ports: FiscalServicePorts,
): Promise<FiscalDocument> {
  assertPermission(context, "fiscal.manage");
  const scope = requireFiscalScope(context);

  context.logger.info(
    "fiscal.document.status_sync.started",
    createServiceLogMetadata(context, {
      documentId: input.documentId,
      providerDocumentId: input.providerDocumentId,
    }),
  );

  const providerResult = await ports.fiscalProviderGateway.syncDocumentStatus({
    providerDocumentId: input.providerDocumentId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  const document = await ports.fiscalRepository.updateDocumentStatus({
    accessKey: providerResult.accessKey,
    documentId: input.documentId,
    providerDocumentId: providerResult.providerDocumentId,
    status:
      providerResult.status === "processing" ? "draft" : providerResult.status,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });

  await context.audit.record({
    action: "fiscal.document.status_sync",
    actor: context.actor,
    category: "integration",
    entityId: document.id,
    entityType: "fiscal_document",
    metadata: {
      providerDocumentId: document.providerDocumentId,
      status: document.status,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Synchronized fiscal document status",
  });

  return document;
}
