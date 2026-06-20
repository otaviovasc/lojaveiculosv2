import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { LinkedDocument } from "../../ports/documentRepository.js";
import { buildDocumentPreview } from "../../preview/documentPreview.js";
import { renderDocumentPreviewPdf } from "../../render/documentPreviewPdf.js";
import type { DocumentWorkspaceServicePorts } from "../DocumentWorkspaceService/serviceSupport.js";
import {
  DocumentOperationPolicyError,
  DocumentOperationStorageError,
  findScopedDocument,
  withOperationHistory,
} from "./serviceSupport.js";

const permission = "documents.regenerate";

export async function regenerateDocument(
  context: ServiceContext,
  input: { documentId: string },
  ports?: DocumentWorkspaceServicePorts,
): Promise<LinkedDocument> {
  assertPermission(context, permission);
  const { document, repository, scope } = await findScopedDocument(
    context,
    ports,
    input.documentId,
  );
  if (document.status === "voided" || document.status === "archived") {
    throw new DocumentOperationPolicyError(
      "Voided or archived documents cannot be regenerated.",
    );
  }
  if (!ports?.objectStorage) throw new DocumentOperationStorageError();
  const metadata = withOperationHistory(document, {
    action: "regenerated",
    actorId: context.actor.id,
    at: new Date(),
  });
  const updated = await repository.update({
    documentId: document.id,
    metadata,
    status: "issued",
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  const body = await renderDocumentPreviewPdf(buildDocumentPreview(updated));
  const object = await ports.objectStorage.putObject({
    body,
    contentType: updated.mimeType ?? "application/pdf",
    fileName: updated.fileName,
    scopeSegments: [
      "tenants",
      scope.tenantId,
      "stores",
      scope.storeId,
      "documents",
      document.id,
      "versions",
    ],
  });
  await repository.createVersion({
    createdByUserId: context.actor.kind === "user" ? context.actor.id : null,
    documentId: document.id,
    fileName: updated.fileName,
    fileSizeBytes: body.byteLength,
    metadata,
    mimeType: updated.mimeType ?? "application/pdf",
    storageKey: object.storageKey,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  const regenerated = await repository.findById({
    documentId: document.id,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  if (!regenerated)
    throw new DocumentOperationPolicyError("Document vanished.");

  context.logger.info(
    "documents.regenerate",
    createServiceLogMetadata(context, { documentId: document.id }),
  );
  await context.audit.record({
    action: "documents.regenerate",
    actor: context.actor,
    category: "data_change",
    entityId: document.id,
    entityType: "document",
    metadata: { permission, previousStatus: document.status },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Regenerated document",
    tenantId: scope.tenantId,
  });

  return regenerated;
}
