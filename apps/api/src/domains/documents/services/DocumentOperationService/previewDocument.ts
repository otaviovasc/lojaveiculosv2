import { assertPermission } from "../../../../shared/authorization.js";
import type { DocumentPreview } from "../../preview/documentPreview.js";
import { buildDocumentPreview } from "../../preview/documentPreview.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { DocumentWorkspaceServicePorts } from "../DocumentWorkspaceService/serviceSupport.js";
import { findScopedDocument } from "./serviceSupport.js";

const permission = "documents.preview";

export async function previewDocument(
  context: ServiceContext,
  input: { documentId: string },
  ports?: DocumentWorkspaceServicePorts,
): Promise<DocumentPreview> {
  assertPermission(context, permission);
  const { document, scope } = await findScopedDocument(
    context,
    ports,
    input.documentId,
  );
  const preview = buildDocumentPreview(document);

  context.logger.info(
    "documents.preview",
    createServiceLogMetadata(context, {
      documentId: document.id,
      status: document.status,
    }),
  );
  await context.audit.record({
    action: "documents.preview",
    actor: context.actor,
    category: "data_access",
    entityId: document.id,
    entityType: "document",
    metadata: { permission, status: document.status },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Previewed document",
    tenantId: scope.tenantId,
  });

  return preview;
}
