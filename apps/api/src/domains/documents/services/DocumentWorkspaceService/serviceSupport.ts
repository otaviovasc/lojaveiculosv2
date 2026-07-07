import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { DocumentRepository } from "../../ports/documentRepository.js";
import type { DocumentLinkTargetValidator } from "../../ports/documentLinkTargetValidator.js";
import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";
import type { DocumentTemplateSuggestionProvider } from "../../ports/documentTemplateSuggestionProvider.js";

export type DocumentWorkspaceServicePorts = {
  documentRepository: DocumentRepository;
  linkTargetValidator?: DocumentLinkTargetValidator | undefined;
  objectStorage?: ObjectStorage | undefined;
  templateSuggestionProvider?: DocumentTemplateSuggestionProvider | undefined;
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
