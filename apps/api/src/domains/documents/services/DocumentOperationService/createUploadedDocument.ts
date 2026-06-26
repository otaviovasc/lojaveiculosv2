import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  DocumentKind,
  DocumentLinkTarget,
  LinkedDocument,
} from "../../ports/documentRepository.js";
import {
  getDocumentRepository,
  requireDocumentWorkspaceScope,
  type DocumentWorkspaceServicePorts,
} from "../DocumentWorkspaceService/serviceSupport.js";
import {
  createDocumentObjectScope,
  resolveDocumentTarget,
  validateDocumentTarget,
} from "./requestDocumentUpload.js";

const permission = "documents.upload";

export type CreateUploadedDocumentInput = {
  fileName: string;
  fileSizeBytes: number | null;
  kind: DocumentKind;
  mimeType: string | null;
  storageKey: string;
  targetId?: string | undefined;
  targetType?: DocumentLinkTarget | undefined;
  title: string;
};

export async function createUploadedDocument(
  context: ServiceContext,
  input: CreateUploadedDocumentInput,
  ports?: DocumentWorkspaceServicePorts,
): Promise<LinkedDocument> {
  assertPermission(context, permission);
  const scope = requireDocumentWorkspaceScope(context);
  const repository = getDocumentRepository(ports);
  const target = resolveDocumentTarget(scope.storeId, input);
  await validateDocumentTarget(context, scope, target, ports);
  assertStorageKeyInScope(input.storageKey, scope, target);

  const document = await repository.create({
    createdByUserId: context.actor.kind === "user" ? context.actor.id : null,
    fileName: input.fileName,
    fileSizeBytes: input.fileSizeBytes,
    kind: input.kind,
    linkRole: input.kind,
    metadata: {
      manualUpload: true,
      operationHistory: [
        {
          action: "uploaded",
          actorId: context.actor.id,
          at: new Date(),
        },
      ],
    },
    mimeType: input.mimeType,
    status: "issued",
    storageKey: input.storageKey,
    storeId: scope.storeId,
    targetId: target.targetId,
    targetType: target.targetType,
    tenantId: scope.tenantId,
    title: input.title,
  });

  context.logger.info(
    "documents.upload.register",
    createServiceLogMetadata(context, {
      documentId: document.id,
      kind: input.kind,
      targetId: target.targetId,
      targetType: target.targetType,
    }),
  );
  await context.audit.record({
    action: "documents.upload.register",
    actor: context.actor,
    category: "data_change",
    entityId: document.id,
    entityType: "document",
    metadata: {
      kind: input.kind,
      permission,
      storageKey: input.storageKey,
      targetId: target.targetId,
      targetType: target.targetType,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Registered uploaded document",
    tenantId: scope.tenantId,
  });

  return document;
}

function assertStorageKeyInScope(
  storageKey: string,
  scope: { storeId: string; tenantId: string },
  target: { targetId: string; targetType: DocumentLinkTarget },
) {
  const expectedPrefix = `${createDocumentObjectScope(scope, target).join("/")}/`;
  if (!storageKey.startsWith(expectedPrefix)) {
    throw new Error("Document storage key is outside the requested scope.");
  }
}
