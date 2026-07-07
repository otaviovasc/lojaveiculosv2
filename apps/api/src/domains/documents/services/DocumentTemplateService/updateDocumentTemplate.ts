import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { DocumentTemplate } from "../../ports/documentRepository.js";
import { defaultTemplate } from "../../templates/documentTemplateDefaults.js";
import { DocumentOperationPolicyError } from "../DocumentOperationService/serviceSupport.js";
import {
  getDocumentRepository,
  requireDocumentWorkspaceScope,
  type DocumentWorkspaceServicePorts,
} from "../DocumentWorkspaceService/serviceSupport.js";

const permission = "documents.template_update";

export type UpdateDocumentTemplateInput = {
  blocks?: readonly Record<string, unknown>[] | undefined;
  clauses: readonly string[];
  templateKey: string;
  title: string;
};

export async function updateDocumentTemplate(
  context: ServiceContext,
  input: UpdateDocumentTemplateInput,
  ports?: DocumentWorkspaceServicePorts,
): Promise<DocumentTemplate> {
  assertPermission(context, permission);
  const scope = requireDocumentWorkspaceScope(context);
  const fallback = defaultTemplate("other", input.templateKey);
  if (!fallback) {
    throw new DocumentOperationPolicyError(
      `Unsupported document template: ${input.templateKey}`,
    );
  }
  if (fallback.mode === "locked") {
    throw new DocumentOperationPolicyError(
      "Generated document renderers cannot be edited as templates.",
    );
  }

  const template = await getDocumentRepository(ports).upsertTemplate({
    blocks: input.blocks,
    clauses: input.clauses,
    kind: fallback.kind,
    storeId: scope.storeId,
    templateKey: input.templateKey,
    tenantId: scope.tenantId,
    title: input.title,
    updatedByUserId: context.actor.kind === "user" ? context.actor.id : null,
  });

  context.logger.info(
    "documents.template.update",
    createServiceLogMetadata(context, {
      clauseCount: template.clauses.length,
      kind: template.kind,
      templateKey: template.templateKey,
    }),
  );
  await context.audit.record({
    action: "documents.template.update",
    actor: context.actor,
    category: "data_change",
    entityId: template.templateKey,
    entityType: "document_template",
    metadata: {
      clauseCount: template.clauses.length,
      kind: template.kind,
      permission,
      templateKey: template.templateKey,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Updated document template clauses",
    tenantId: scope.tenantId,
  });

  return template;
}
