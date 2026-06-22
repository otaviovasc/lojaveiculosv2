import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  DocumentKind,
  LinkedDocument,
} from "../../ports/documentRepository.js";
import type { DocumentWorkspaceServicePorts } from "../DocumentWorkspaceService/serviceSupport.js";
import {
  DocumentOperationPolicyError,
  findScopedDocument,
  withOperationHistory,
} from "./serviceSupport.js";

const permission = "documents.update_metadata";

export type UpdateDocumentMetadataInput = {
  documentId: string;
  kind?: DocumentKind | undefined;
  title?: string | undefined;
};

export async function updateDocumentMetadata(
  context: ServiceContext,
  input: UpdateDocumentMetadataInput,
  ports?: DocumentWorkspaceServicePorts,
): Promise<LinkedDocument> {
  assertPermission(context, permission);
  const { document, repository, scope } = await findScopedDocument(
    context,
    ports,
    input.documentId,
  );
  if (document.status === "voided") {
    throw new DocumentOperationPolicyError(
      "Voided documents cannot be edited.",
    );
  }

  const updated = await repository.update({
    documentId: document.id,
    ...(input.kind ? { kind: input.kind } : {}),
    metadata: withOperationHistory(document, {
      action: "metadata_updated",
      actorId: context.actor.id,
      at: new Date(),
    }),
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    ...(input.title ? { title: input.title } : {}),
  });

  context.logger.info(
    "documents.metadata.update",
    createServiceLogMetadata(context, {
      documentId: document.id,
      kindChanged: Boolean(input.kind && input.kind !== document.kind),
      titleChanged: Boolean(input.title && input.title !== document.title),
    }),
  );
  await context.audit.record({
    action: "documents.metadata.update",
    actor: context.actor,
    category: "data_change",
    entityId: document.id,
    entityType: "document",
    metadata: {
      kindChanged: Boolean(input.kind && input.kind !== document.kind),
      permission,
      titleChanged: Boolean(input.title && input.title !== document.title),
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Updated document metadata",
    tenantId: scope.tenantId,
  });

  return updated;
}
