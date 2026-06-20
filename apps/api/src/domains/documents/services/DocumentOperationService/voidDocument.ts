import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { LinkedDocument } from "../../ports/documentRepository.js";
import type { DocumentWorkspaceServicePorts } from "../DocumentWorkspaceService/serviceSupport.js";
import {
  DocumentOperationPolicyError,
  findScopedDocument,
  withOperationHistory,
} from "./serviceSupport.js";

const permission = "documents.void";

export async function voidDocument(
  context: ServiceContext,
  input: { documentId: string; reason?: string | undefined },
  ports?: DocumentWorkspaceServicePorts,
): Promise<LinkedDocument> {
  assertPermission(context, permission);
  const { document, repository, scope } = await findScopedDocument(
    context,
    ports,
    input.documentId,
  );
  if (document.status === "voided") {
    throw new DocumentOperationPolicyError("Document is already voided.");
  }
  const voided = await repository.update({
    documentId: document.id,
    metadata: withOperationHistory(document, {
      action: "voided",
      actorId: context.actor.id,
      at: new Date(),
      ...(input.reason ? { reason: input.reason } : {}),
    }),
    status: "voided",
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });

  context.logger.info(
    "documents.void",
    createServiceLogMetadata(context, { documentId: document.id }),
  );
  await context.audit.record({
    action: "documents.void",
    actor: context.actor,
    category: "data_change",
    criticality: "high",
    entityId: document.id,
    entityType: "document",
    metadata: {
      hasReason: Boolean(input.reason),
      permission,
      previousStatus: document.status,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Voided document",
    tenantId: scope.tenantId,
  });

  return voided;
}
