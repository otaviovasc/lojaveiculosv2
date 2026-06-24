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
import type { DocumentWorkspaceServicePorts } from "../DocumentWorkspaceService/serviceSupport.js";
import {
  DocumentOperationPolicyError,
  findScopedDocument,
  withOperationHistory,
} from "./serviceSupport.js";

const metadataPermission = "documents.update_metadata";
const linksPermission = "documents.update_links";

type LinkUpdate = {
  linkRole?: string | undefined;
  targetId?: string | undefined;
  targetType?: DocumentLinkTarget | undefined;
};

export type UpdateDocumentMetadataInput = {
  documentId: string;
  kind?: DocumentKind | undefined;
  linkRole?: string | undefined;
  targetId?: string | undefined;
  targetType?: DocumentLinkTarget | undefined;
  title?: string | undefined;
};

export async function updateDocumentMetadata(
  context: ServiceContext,
  input: UpdateDocumentMetadataInput,
  ports?: DocumentWorkspaceServicePorts,
): Promise<LinkedDocument> {
  const hasMetadataChanges = Boolean(input.kind || input.title);
  const hasLinkChanges = Boolean(
    input.linkRole || input.targetId || input.targetType,
  );
  if (!hasMetadataChanges && !hasLinkChanges) {
    throw new DocumentOperationPolicyError(
      "At least one document field is required.",
    );
  }
  if (hasMetadataChanges) assertPermission(context, metadataPermission);
  if (hasLinkChanges) assertPermission(context, linksPermission);

  const { document, repository, scope } = await findScopedDocument(
    context,
    ports,
    input.documentId,
  );
  if (document.status === "voided") {
    throw new DocumentOperationPolicyError(
      "Voided documents cannot be edited.",
    );
  }
  const linkUpdate = await resolveLinkUpdate(context, input, document, ports);
  const operationAction =
    hasMetadataChanges && hasLinkChanges
      ? "documents.metadata_and_link.update"
      : hasLinkChanges
        ? "documents.link.update"
        : "documents.metadata.update";

  const updated = await repository.update({
    documentId: document.id,
    ...(input.kind ? { kind: input.kind } : {}),
    ...(linkUpdate.linkRole ? { linkRole: linkUpdate.linkRole } : {}),
    metadata: withOperationHistory(document, {
      action: hasLinkChanges ? "links_updated" : "metadata_updated",
      actorId: context.actor.id,
      at: new Date(),
    }),
    storeId: scope.storeId,
    ...(linkUpdate.targetId ? { targetId: linkUpdate.targetId } : {}),
    ...(linkUpdate.targetType ? { targetType: linkUpdate.targetType } : {}),
    tenantId: scope.tenantId,
    ...(input.title ? { title: input.title } : {}),
  });

  context.logger.info(
    operationAction,
    createServiceLogMetadata(context, {
      documentId: document.id,
      kindChanged: Boolean(input.kind && input.kind !== document.kind),
      linkChanged: hasLinkChanges,
      titleChanged: Boolean(input.title && input.title !== document.title),
    }),
  );
  await context.audit.record({
    action: operationAction,
    actor: context.actor,
    category: "data_change",
    entityId: document.id,
    entityType: "document",
    metadata: {
      kindChanged: Boolean(input.kind && input.kind !== document.kind),
      linkChanged: hasLinkChanges,
      permission: hasLinkChanges ? linksPermission : metadataPermission,
      targetIdChanged: Boolean(
        linkUpdate.targetId && linkUpdate.targetId !== document.targetId,
      ),
      targetTypeChanged: Boolean(
        linkUpdate.targetType && linkUpdate.targetType !== document.targetType,
      ),
      titleChanged: Boolean(input.title && input.title !== document.title),
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: hasLinkChanges
      ? "Updated document links"
      : "Updated document metadata",
    tenantId: scope.tenantId,
  });

  return updated;
}

async function resolveLinkUpdate(
  context: ServiceContext,
  input: UpdateDocumentMetadataInput,
  document: LinkedDocument,
  ports: DocumentWorkspaceServicePorts | undefined,
): Promise<LinkUpdate> {
  if (!input.linkRole && !input.targetId && !input.targetType) return {};
  const scope = {
    storeId: document.storeId,
    tenantId: document.tenantId,
  };
  const targetType = input.targetType ?? document.targetType;
  const requestedTargetId = input.targetId?.trim();
  const targetId =
    targetType === "store"
      ? requestedTargetId || scope.storeId
      : requestedTargetId ||
        (input.targetType && input.targetType !== document.targetType
          ? ""
          : document.targetId);
  if (!targetId) {
    throw new DocumentOperationPolicyError("Document link target is required.");
  }
  if (targetType === "store" && targetId !== scope.storeId) {
    throw new DocumentOperationPolicyError(
      "Store document links must target the current store.",
    );
  }
  if (!["store", "vehicle_listing", "vehicle_unit"].includes(targetType)) {
    throw new DocumentOperationPolicyError(
      "Document link editing supports only store and vehicle targets.",
    );
  }
  if (targetType !== "store") {
    const exists = await ports?.linkTargetValidator?.existsInScope({
      storeId: scope.storeId,
      targetId,
      targetType,
      tenantId: scope.tenantId,
    });
    if (!exists) {
      context.logger.warn(
        "documents.link.invalid_target",
        createServiceLogMetadata(context, {
          documentId: document.id,
          targetId,
          targetType,
        }),
      );
      throw new DocumentOperationPolicyError(
        "Document link target was not found in the current store.",
      );
    }
  }

  return {
    ...(input.linkRole?.trim() ? { linkRole: input.linkRole.trim() } : {}),
    targetId,
    targetType,
  };
}
