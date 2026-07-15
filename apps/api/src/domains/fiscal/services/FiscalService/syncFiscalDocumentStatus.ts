import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  FiscalDocument,
  FiscalDocumentStatus,
} from "../../ports/fiscalRepository.js";
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
    metadata: { providerStatus: providerResult.status },
    providerDocumentId: providerResult.providerDocumentId,
    status: mapStatus(providerResult.status),
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  await ports.fiscalRepository.createDocumentSnapshot({
    actorId: context.actor.id,
    fiscalDocumentId: document.id,
    providerResponse: providerResult.rawResponse ?? {},
    snapshotType: "status_sync_response",
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
    outcome: isFailureStatus(document.status) ? "failed" : "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Synchronized fiscal document status",
  });

  return document;
}

function isFailureStatus(status: FiscalDocumentStatus) {
  return status === "error" || status === "failed" || status === "rejected";
}

function mapStatus(status: string): FiscalDocumentStatus {
  if (status === "processing") return "processing";
  if (status === "queued") return "queued";
  if (status === "authorized") return "authorized";
  if (status === "issued") return "issued";
  if (status === "cancelled") return "cancelled";
  if (status === "rejected") return "rejected";
  return status === "error" ? "error" : "failed";
}
