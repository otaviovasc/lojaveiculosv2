import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { DocumentVersion } from "../../ports/documentRepository.js";
import type { DocumentWorkspaceServicePorts } from "../DocumentWorkspaceService/serviceSupport.js";
import { findScopedDocument } from "./serviceSupport.js";

const permission = "documents.read";

export async function listDocumentVersions(
  context: ServiceContext,
  input: { documentId: string },
  ports?: DocumentWorkspaceServicePorts,
): Promise<readonly DocumentVersion[]> {
  assertPermission(context, permission);
  const { document, repository, scope } = await findScopedDocument(
    context,
    ports,
    input.documentId,
  );
  const versions = await repository.listVersions({
    documentId: document.id,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });

  context.logger.info(
    "documents.versions.list",
    createServiceLogMetadata(context, {
      documentId: document.id,
      versionCount: versions.length,
    }),
  );
  await context.audit.record({
    action: "documents.versions.list",
    actor: context.actor,
    category: "data_access",
    entityId: document.id,
    entityType: "document",
    metadata: { permission, versionCount: versions.length },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Listed document versions",
    tenantId: scope.tenantId,
  });

  return versions;
}
