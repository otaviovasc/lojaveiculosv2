import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { LinkedDocument } from "../../ports/documentRepository.js";
import type { DocumentWorkspaceServicePorts } from "../DocumentWorkspaceService/serviceSupport.js";
import {
  DocumentOperationNotFoundError,
  DocumentOperationStorageError,
  findScopedDocument,
} from "./serviceSupport.js";

const permission = "documents.download";

export type DocumentDownloadDescriptor = {
  document: LinkedDocument;
  downloadMethod: "GET";
  downloadUrl: string;
  expiresAt: Date;
  fileName: string;
  mimeType: string | null;
  versionId: string;
  versionNumber: number;
};

export async function downloadDocument(
  context: ServiceContext,
  input: { documentId: string; versionId?: string | undefined },
  ports?: DocumentWorkspaceServicePorts,
): Promise<DocumentDownloadDescriptor> {
  assertPermission(context, permission);
  const { document, repository, scope } = await findScopedDocument(
    context,
    ports,
    input.documentId,
  );
  if (!ports?.objectStorage) throw new DocumentOperationStorageError();
  const [version] = await repository.listVersions({
    documentId: document.id,
    ...(input.versionId ? { versionId: input.versionId } : {}),
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  if (!version) throw new DocumentOperationNotFoundError(input.documentId);
  const download = await ports.objectStorage.createDownload({
    fileName: version.fileName,
    mimeType: version.mimeType,
    storageKey: version.storageKey,
  });

  context.logger.info(
    "documents.download",
    createServiceLogMetadata(context, {
      documentId: document.id,
      versionNumber: version.versionNumber,
    }),
  );
  await context.audit.record({
    action: "documents.download",
    actor: context.actor,
    category: "data_access",
    entityId: document.id,
    entityType: "document",
    metadata: {
      fileName: version.fileName,
      permission,
      versionId: version.id,
      versionNumber: version.versionNumber,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Generated document download descriptor",
    tenantId: scope.tenantId,
  });

  return {
    document,
    downloadMethod: download.downloadMethod,
    downloadUrl: download.downloadUrl,
    expiresAt: download.expiresAt,
    fileName: version.fileName,
    mimeType: version.mimeType,
    versionId: version.id,
    versionNumber: version.versionNumber,
  };
}
