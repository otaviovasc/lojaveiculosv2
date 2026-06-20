import { type ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  LinkedDocument,
  DocumentRepository,
} from "../../ports/documentRepository.js";
import {
  getDocumentRepository,
  requireDocumentWorkspaceScope,
  type DocumentWorkspaceServicePorts,
} from "../DocumentWorkspaceService/serviceSupport.js";

export class DocumentOperationNotFoundError extends Error {
  constructor(documentId: string) {
    super(`Document not found: ${documentId}`);
    this.name = "DocumentOperationNotFoundError";
  }
}

export class DocumentOperationPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentOperationPolicyError";
  }
}

export class DocumentOperationStorageError extends Error {
  constructor() {
    super("Document storage is not configured.");
    this.name = "DocumentOperationStorageError";
  }
}

export async function findScopedDocument(
  context: ServiceContext,
  ports: DocumentWorkspaceServicePorts | undefined,
  documentId: string,
): Promise<{
  document: LinkedDocument;
  repository: DocumentRepository;
  scope: { storeId: string; tenantId: string };
}> {
  const scope = requireDocumentWorkspaceScope(context);
  const repository = getDocumentRepository(ports);
  const document = await repository.findById({
    documentId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  if (!document) throw new DocumentOperationNotFoundError(documentId);
  return { document, repository, scope };
}

export function withOperationHistory(
  document: LinkedDocument,
  operation: { actorId: string; action: string; at: Date; reason?: string },
) {
  return {
    ...document.metadata,
    operationHistory: [...operationHistory(document.metadata), operation],
  };
}

function operationHistory(metadata: Record<string, unknown>) {
  const value = metadata.operationHistory;
  if (!Array.isArray(value)) return [];
  return value.filter(isOperationHistoryItem);
}

function isOperationHistoryItem(
  value: unknown,
): value is { actorId: string; action: string; at: Date; reason?: string } {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.actorId === "string" && typeof item.action === "string";
}
