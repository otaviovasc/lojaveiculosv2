import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { ObjectUpload } from "../../../../shared/storage/objectStorage.js";
import type { DocumentLinkTarget } from "../../ports/documentRepository.js";
import {
  requireDocumentWorkspaceScope,
  type DocumentWorkspaceServicePorts,
} from "../DocumentWorkspaceService/serviceSupport.js";
import {
  DocumentOperationPolicyError,
  DocumentOperationStorageError,
} from "./serviceSupport.js";

const permission = "documents.upload";

export type RequestDocumentUploadInput = {
  contentType: string;
  fileName: string;
  sizeBytes: number;
  targetId?: string | undefined;
  targetType?: DocumentLinkTarget | undefined;
};

export async function requestDocumentUpload(
  context: ServiceContext,
  input: RequestDocumentUploadInput,
  ports?: DocumentWorkspaceServicePorts,
): Promise<ObjectUpload> {
  assertPermission(context, permission);
  const scope = requireDocumentWorkspaceScope(context);
  if (!ports?.objectStorage) throw new DocumentOperationStorageError();

  const target = resolveDocumentTarget(scope.storeId, input);
  await validateDocumentTarget(context, scope, target, ports);
  const upload = await ports.objectStorage.createUpload({
    contentType: input.contentType,
    fileName: input.fileName,
    scopeSegments: createDocumentObjectScope(scope, target),
    sizeBytes: input.sizeBytes,
  });

  context.logger.info(
    "documents.upload.request",
    createServiceLogMetadata(context, {
      contentType: input.contentType,
      fileName: input.fileName,
      sizeBytes: input.sizeBytes,
      targetId: target.targetId,
      targetType: target.targetType,
    }),
  );
  await context.audit.record({
    action: "documents.upload.request",
    actor: context.actor,
    category: "data_change",
    entityId: target.targetId,
    entityType: target.targetType,
    metadata: {
      contentType: input.contentType,
      fileName: input.fileName,
      permission,
      sizeBytes: input.sizeBytes,
      storageKey: upload.storageKey,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Requested document upload URL",
    tenantId: scope.tenantId,
  });

  return upload;
}

export function resolveDocumentTarget(
  storeId: string,
  input: {
    targetId?: string | undefined;
    targetType?: DocumentLinkTarget | undefined;
  },
): { targetId: string; targetType: DocumentLinkTarget } {
  const targetType = input.targetType ?? "store";
  const requestedTargetId = input.targetId?.trim();
  const targetId =
    targetType === "store" ? requestedTargetId || storeId : requestedTargetId;
  if (!targetId) {
    throw new DocumentOperationPolicyError("Document link target is required.");
  }
  if (targetType === "store" && targetId !== storeId) {
    throw new DocumentOperationPolicyError(
      "Store document links must target the current store.",
    );
  }
  return { targetId, targetType };
}

export async function validateDocumentTarget(
  context: ServiceContext,
  scope: { storeId: string; tenantId: string },
  target: { targetId: string; targetType: DocumentLinkTarget },
  ports?: DocumentWorkspaceServicePorts,
): Promise<void> {
  if (target.targetType === "store") return;
  const exists = await ports?.linkTargetValidator?.existsInScope({
    storeId: scope.storeId,
    targetId: target.targetId,
    targetType: target.targetType,
    tenantId: scope.tenantId,
  });
  if (!exists) {
    context.logger.warn(
      "documents.link.invalid_target",
      createServiceLogMetadata(context, {
        targetId: target.targetId,
        targetType: target.targetType,
      }),
    );
    throw new DocumentOperationPolicyError(
      "Document link target was not found in the current store.",
    );
  }
}

export function createDocumentObjectScope(
  scope: { storeId: string; tenantId: string },
  target: { targetId: string; targetType: DocumentLinkTarget },
) {
  return [
    "tenants",
    scope.tenantId,
    "stores",
    scope.storeId,
    "documents",
    target.targetType,
    target.targetId,
  ];
}
