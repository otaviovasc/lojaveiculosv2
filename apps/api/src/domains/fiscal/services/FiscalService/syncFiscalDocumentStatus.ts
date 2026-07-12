import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { FiscalDocument } from "../../ports/fiscalRepository.js";
import {
  requireFiscalScope,
  requireScopedFiscalDocument,
  type FiscalServicePorts,
} from "./serviceSupport.js";

export type SyncFiscalDocumentStatusInput = {
  documentId: string;
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
    }),
  );

  const persistedDocument = await requireScopedFiscalDocument(
    scope,
    input.documentId,
    ports.fiscalRepository,
  );
  const providerResult = await ports.fiscalProviderGateway.syncDocumentStatus({
    providerDocumentId: persistedDocument.providerDocumentId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  const document = await ports.fiscalRepository.updateDocumentStatus({
    accessKey: providerResult.accessKey,
    documentId: input.documentId,
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
    outcome: document.status === "failed" ? "failed" : "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Synchronized fiscal document status",
  });

  return document;
}
