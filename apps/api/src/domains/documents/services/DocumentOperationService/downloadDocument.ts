import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import {
  StorageObjectNotFoundError,
  type ObjectDownload,
} from "../../../../shared/storage/objectStorage.js";
import type {
  DocumentVersion,
  LinkedDocument,
} from "../../ports/documentRepository.js";
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
  input: {
    disposition?: "attachment" | "inline" | undefined;
    documentId: string;
    versionId?: string | undefined;
  },
  ports?: DocumentWorkspaceServicePorts,
): Promise<DocumentDownloadDescriptor> {
  assertPermission(context, permission);
  const { document, repository, scope } = await findScopedDocument(
    context,
    ports,
    input.documentId,
  );
  if (!ports?.objectStorage) throw new DocumentOperationStorageError();
  const [storedVersion] = await repository.listVersions({
    documentId: document.id,
    ...(input.versionId ? { versionId: input.versionId } : {}),
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  const version = storedVersion ?? currentDocumentVersion(document, input);
  if (!version) throw new DocumentOperationNotFoundError(input.documentId);
  let download: ObjectDownload;
  try {
    download = await ports.objectStorage.createDownload({
      disposition: input.disposition ?? "attachment",
      fileName: version.fileName,
      mimeType: version.mimeType,
      storageKey: version.storageKey,
    });
  } catch (error) {
    if (error instanceof StorageObjectNotFoundError) {
      throw new DocumentOperationNotFoundError(input.documentId);
    }
    throw error;
  }

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
      disposition: input.disposition ?? "attachment",
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

function currentDocumentVersion(
  document: LinkedDocument,
  input: { versionId?: string | undefined },
): DocumentVersion | null {
  if (input.versionId) return null;
  return {
    createdAt: document.uploadedAt,
    createdByUserId: null,
    documentId: document.id,
    fileName: document.fileName,
    fileSizeBytes: document.fileSizeBytes,
    id: document.id,
    metadata: document.metadata,
    mimeType: document.mimeType,
    storageKey: document.storageKey,
    storeId: document.storeId,
    tenantId: document.tenantId,
    versionNumber: 1,
  };
}
