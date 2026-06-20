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

export type CancelFiscalDocumentInput = {
  documentId: string;
  providerDocumentId: string;
  reason: string;
};

export async function cancelFiscalDocument(
  context: ServiceContext,
  input: CancelFiscalDocumentInput,
  ports: FiscalServicePorts,
): Promise<FiscalDocument> {
  assertPermission(context, "fiscal.manage");
  const scope = requireFiscalScope(context);

  context.logger.info(
    "fiscal.document.cancel.started",
    createServiceLogMetadata(context, {
      documentId: input.documentId,
      providerDocumentId: input.providerDocumentId,
    }),
  );

  const providerResult = await ports.fiscalProviderGateway.cancelDocument({
    providerDocumentId: input.providerDocumentId,
    reason: input.reason,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  const document = await ports.fiscalRepository.updateDocumentStatus({
    accessKey: providerResult.accessKey,
    documentId: input.documentId,
    metadata: { cancelReason: input.reason },
    providerDocumentId: providerResult.providerDocumentId,
    status: mapStatus(providerResult.status),
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });

  await context.audit.record({
    action: "fiscal.document.cancel",
    actor: context.actor,
    category: "integration",
    criticality: "critical",
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
    summary: "Cancelled fiscal document through provider",
  });

  return document;
}

function mapStatus(status: "cancelled" | "failed" | "issued" | "processing") {
  return status === "processing" ? "draft" : status;
}
