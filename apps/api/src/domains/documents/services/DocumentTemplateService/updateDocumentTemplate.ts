import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  DocumentKind,
  DocumentTemplate,
} from "../../ports/documentRepository.js";
import {
  getDocumentRepository,
  requireDocumentWorkspaceScope,
  type DocumentWorkspaceServicePorts,
} from "../DocumentWorkspaceService/serviceSupport.js";

const permission = "documents.template_update";

export type UpdateDocumentTemplateInput = {
  clauses: readonly string[];
  kind: DocumentKind;
  title: string;
};

export async function updateDocumentTemplate(
  context: ServiceContext,
  input: UpdateDocumentTemplateInput,
  ports?: DocumentWorkspaceServicePorts,
): Promise<DocumentTemplate> {
  assertPermission(context, permission);
  const scope = requireDocumentWorkspaceScope(context);
  const template = await getDocumentRepository(ports).upsertTemplate({
    clauses: input.clauses,
    kind: input.kind,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    title: input.title,
    updatedByUserId: context.actor.kind === "user" ? context.actor.id : null,
  });

  context.logger.info(
    "documents.template.update",
    createServiceLogMetadata(context, {
      clauseCount: template.clauses.length,
      kind: template.kind,
    }),
  );
  await context.audit.record({
    action: "documents.template.update",
    actor: context.actor,
    category: "data_change",
    entityId: template.kind,
    entityType: "document_template",
    metadata: {
      clauseCount: template.clauses.length,
      kind: template.kind,
      permission,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Updated document template clauses",
    tenantId: scope.tenantId,
  });

  return template;
}
