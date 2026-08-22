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
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  kind?: DocumentKind | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
  origin?: "automatic" | "manual" | undefined;
  search?: string | undefined;
  scope?: "general" | "vehicle" | undefined;
  status?: DocumentStatus | undefined;
  targetId?: string | undefined;
  targetType?: DocumentLinkTarget | undefined;
};

export type ListDocumentWorkspaceResult = {
  documents: readonly LinkedDocument[];
  limit: number;
  offset: number;
  total: number;
};

export async function listDocumentWorkspace(
  context: ServiceContext,
  input: ListDocumentWorkspaceInput,
  ports?: DocumentWorkspaceServicePorts,
): Promise<ListDocumentWorkspaceResult> {
  const permission = "documents.read";
  assertPermission(context, permission);
  const scope = requireDocumentWorkspaceScope(context);
  const repository = getDocumentRepository(ports);
  const limit = Math.min(input.limit ?? 100, 200);
  const offset = Math.max(input.offset ?? 0, 0);

  const page = await repository.list({
    ...scope,
    ...(input.kind ? { kind: input.kind } : {}),
    limit,
    offset,
    ...(input.origin ? { origin: input.origin } : {}),
    ...(input.search ? { search: input.search } : {}),
    ...(input.scope ? { scope: input.scope } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.targetId ? { targetId: input.targetId } : {}),
    ...(input.targetType ? { targetType: input.targetType } : {}),
    ...(input.dateFrom
      ? { uploadedFrom: new Date(`${input.dateFrom}T00:00:00.000Z`) }
      : {}),
    ...(input.dateTo
      ? { uploadedTo: new Date(`${input.dateTo}T23:59:59.999Z`) }
      : {}),
  });

  const metadata = {
    documentCount: page.documents.length,
    filterKind: input.kind ?? null,
    filterOrigin: input.origin ?? null,
    filterScope: input.scope ?? null,
    filterStatus: input.status ?? null,
    filterTargetType: input.targetType ?? null,
    hasSearch: Boolean(input.search),
    limit,
    offset,
    totalDocumentCount: page.total,
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

  return {
    documents: page.documents,
    limit,
    offset,
    total: page.total,
  };
}
