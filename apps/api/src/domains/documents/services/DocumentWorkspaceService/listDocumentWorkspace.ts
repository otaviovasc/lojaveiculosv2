import type {
  DocumentKind,
  DocumentLinkTarget,
  DocumentStatus,
  LinkedDocument,
} from "../../ports/documentRepository.js";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import {
  getDocumentRepository,
  requireDocumentWorkspaceScope,
  type DocumentWorkspaceServicePorts,
} from "./serviceSupport.js";

export type ListDocumentWorkspaceInput = {
  kind?: DocumentKind | undefined;
  limit?: number | undefined;
  search?: string | undefined;
  status?: DocumentStatus | undefined;
  targetId?: string | undefined;
  targetType?: DocumentLinkTarget | undefined;
};

export async function listDocumentWorkspace(
  context: ServiceContext,
  input: ListDocumentWorkspaceInput,
  ports?: DocumentWorkspaceServicePorts,
): Promise<readonly LinkedDocument[]> {
  const permission = "documents.read";
  assertPermission(context, permission);
  const scope = requireDocumentWorkspaceScope(context);
  const repository = getDocumentRepository(ports);
  const limit = Math.min(input.limit ?? 100, 200);

  const documents = await repository.list({
    ...scope,
    ...(input.kind ? { kind: input.kind } : {}),
    limit,
    ...(input.search ? { search: input.search } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.targetId ? { targetId: input.targetId } : {}),
    ...(input.targetType ? { targetType: input.targetType } : {}),
  });

  const metadata = {
    documentCount: documents.length,
    filterKind: input.kind ?? null,
    filterStatus: input.status ?? null,
    filterTargetType: input.targetType ?? null,
    hasSearch: Boolean(input.search),
  };

  context.logger.info(
    "documents.workspace.list",
    createServiceLogMetadata(context, metadata),
  );
  await context.audit.record({
    action: "documents.workspace.list",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "document_workspace",
    metadata: {
      ...metadata,
      permission,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Listed shared documents workspace.",
    tenantId: scope.tenantId,
    ...(context.correlationId ? { correlationId: context.correlationId } : {}),
    ...(context.request ? { request: context.request } : {}),
    ...(context.source ? { source: context.source } : {}),
  });

  return documents;
}
