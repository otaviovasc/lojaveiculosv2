import type { SafeAuditMetadata } from "@lojaveiculosv2/audit";
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

export type CancelFiscalDocumentInput = {
  documentId: string;
  reason: string;
};

export async function cancelFiscalDocument(
  context: ServiceContext,
  input: CancelFiscalDocumentInput,
  ports: FiscalServicePorts,
): Promise<FiscalDocument> {
  assertPermission(context, "fiscal.manage");
  assertPermission(context, "fiscal.document.cancel");
  const scope = requireFiscalScope(context);

  context.logger.info(
    "fiscal.document.cancel.started",
    createServiceLogMetadata(context, {
      documentId: input.documentId,
    }),
  );
  const persistedDocument = await requireScopedFiscalDocument(
    scope,
    input.documentId,
    ports.fiscalRepository,
  );
  await auditCancel(context, scope, input.documentId, "cancel_attempt", {
    providerDocumentId: persistedDocument.providerDocumentId,
  });

  const providerResult = await ports.fiscalProviderGateway.cancelDocument({
    providerDocumentId: persistedDocument.providerDocumentId,
    reason: input.reason,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  const document = await ports.fiscalRepository.updateDocumentStatus({
    accessKey: providerResult.accessKey,
    documentId: input.documentId,
    metadata: {
      cancelReason: input.reason,
      providerStatus: providerResult.status,
    },
    providerDocumentId: providerResult.providerDocumentId,
    status: mapStatus(providerResult.status),
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  await ports.fiscalRepository.createDocumentSnapshot({
    actorId: context.actor.id,
    fiscalDocumentId: document.id,
    providerResponse: providerResult.rawResponse ?? {},
    snapshotType: "cancel_response",
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });

  await auditCancel(context, scope, document.id, "cancel", {
    providerDocumentId: document.providerDocumentId,
    status: document.status,
  });
  return document;
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

async function auditCancel(
  context: ServiceContext,
  scope: { storeId: string; tenantId: string },
  documentId: string,
  suffix: "cancel" | "cancel_attempt",
  metadata: SafeAuditMetadata,
) {
  await context.audit.record({
    action: `fiscal.document.${suffix}`,
    actor: context.actor,
    category: "integration",
    criticality: "critical",
    entityId: documentId,
    entityType: "fiscal_document",
    metadata,
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Cancelled fiscal document through provider",
  });
}
