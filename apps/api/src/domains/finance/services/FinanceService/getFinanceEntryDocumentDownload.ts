import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { StorageObjectNotFoundError } from "../../../../shared/storage/objectStorage.js";
import type {
  DocumentRepository,
  DocumentVersion,
  LinkedDocument,
} from "../../../documents/ports/documentRepository.js";
import {
  auditFinanceServiceEvent,
  FinanceEntryDocumentNotFoundError,
  findScopedFinanceEntry,
  getDocumentRepository,
  getFinanceRepository,
  logFinanceServiceEvent,
  requireFinanceScope,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.read";

export type GetFinanceEntryDocumentDownloadInput = {
  disposition?: "attachment" | "inline";
  documentId: string;
  entryId: string;
};

export type FinanceEntryDocumentDownload = {
  documentId: string;
  downloadMethod: "GET";
  downloadUrl: string;
  expiresAt: Date;
  fileName: string;
  mimeType: string | null;
};

export async function getFinanceEntryDocumentDownload(
  context: ServiceContext,
  input: GetFinanceEntryDocumentDownloadInput,
  ports?: FinanceServicePorts,
): Promise<FinanceEntryDocumentDownload> {
  assertPermission(context, permission);
  const scope = requireFinanceScope(context);
  const bundle = await findScopedFinanceEntry(
    context,
    getFinanceRepository(ports),
    input.entryId,
  );
  const documentRepository = getDocumentRepository(ports);
  const documents = await documentRepository.listByTarget({
    ...scope,
    targetId: bundle.entry.id,
    targetType: "finance_entry",
  });
  const document = documents.find((item) => item.id === input.documentId);
  if (!document) throw new FinanceEntryDocumentNotFoundError(input.documentId);
  if (!ports?.objectStorage) throw new FinanceDocumentStorageUnavailableError();
  const version = await resolveCurrentVersion(
    documentRepository,
    document,
    scope,
  );

  let download;
  try {
    download = await ports.objectStorage.createDownload({
      disposition: input.disposition ?? "attachment",
      fileName: version.fileName,
      mimeType: version.mimeType,
      storageKey: version.storageKey,
    });
  } catch (error) {
    if (error instanceof StorageObjectNotFoundError) {
      throw new FinanceEntryDocumentNotFoundError(input.documentId);
    }
    throw error;
  }

  logFinanceServiceEvent(context, "finance_entry.document.download", {
    documentId: document.id,
    entryId: bundle.entry.id,
  });
  await auditFinanceServiceEvent(context, {
    action: "finance_entry.document.download",
    category: "data_access",
    entityId: document.id,
    entityType: "finance_document",
    metadata: {
      disposition: input.disposition ?? "attachment",
      entryId: bundle.entry.id,
      fileName: version.fileName,
    },
    permission,
    relatedEntities: [{ id: bundle.entry.id, type: "finance_entry" }],
    summary: "Generated finance entry document download descriptor",
  });

  return {
    documentId: document.id,
    downloadMethod: download.downloadMethod,
    downloadUrl: download.downloadUrl,
    expiresAt: download.expiresAt,
    fileName: version.fileName,
    mimeType: version.mimeType,
  };
}

async function resolveCurrentVersion(
  repository: DocumentRepository,
  document: LinkedDocument,
  scope: { storeId: string; tenantId: string },
): Promise<Pick<DocumentVersion, "fileName" | "mimeType" | "storageKey">> {
  const [version] = await repository.listVersions({
    documentId: document.id,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  return {
    fileName: version?.fileName ?? document.fileName,
    mimeType: version?.mimeType ?? document.mimeType,
    storageKey: version?.storageKey ?? document.storageKey,
  };
}

export class FinanceDocumentStorageUnavailableError extends Error {
  constructor() {
    super("Finance document storage is not configured.");
    this.name = "FinanceDocumentStorageUnavailableError";
  }
}
