import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { DocumentRepository } from "../../ports/documentRepository.js";
import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";

export type DocumentWorkspaceServicePorts = {
  documentRepository: DocumentRepository;
  objectStorage?: ObjectStorage | undefined;
};

export class DocumentWorkspacePortError extends Error {
  constructor(portName: string) {
    super(`Document workspace service port is not configured: ${portName}`);
    this.name = "DocumentWorkspacePortError";
  }
}

export function getDocumentRepository(
  ports: DocumentWorkspaceServicePorts | undefined,
): DocumentRepository {
  if (ports?.documentRepository) return ports.documentRepository;
  throw new DocumentWorkspacePortError("documentRepository");
}

export function requireDocumentWorkspaceScope(context: ServiceContext): {
  storeId: string;
  tenantId: string;
} {
  if (!context.storeId || !context.tenantId) {
    throw new Error("Document workspace requires tenant and store scope.");
  }

  return { storeId: context.storeId, tenantId: context.tenantId };
}
