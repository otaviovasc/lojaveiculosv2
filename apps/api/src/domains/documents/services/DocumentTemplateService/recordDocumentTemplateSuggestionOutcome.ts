import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import { defaultTemplate } from "../../templates/documentTemplateDefaults.js";
import { DocumentOperationPolicyError } from "../DocumentOperationService/serviceSupport.js";
import {
  requireDocumentWorkspaceScope,
  type DocumentWorkspaceServicePorts,
} from "../DocumentWorkspaceService/serviceSupport.js";

const permission = "documents.template_update";

export type RecordDocumentTemplateSuggestionOutcomeInput = {
  diffCount: number;
  outcome: "accepted" | "rejected";
  templateKey: string;
};

export async function recordDocumentTemplateSuggestionOutcome(
  context: ServiceContext,
  input: RecordDocumentTemplateSuggestionOutcomeInput,
  _ports?: DocumentWorkspaceServicePorts,
): Promise<{ recordedAt: Date }> {
  assertPermission(context, permission);
  const scope = requireDocumentWorkspaceScope(context);
  const fallback = defaultTemplate("other", input.templateKey);
  if (!fallback || fallback.mode === "locked") {
    throw new DocumentOperationPolicyError(
      "Only editable document suggestions can be accepted or rejected.",
    );
  }

  const recordedAt = new Date();
  const action =
    input.outcome === "accepted"
      ? "documents.template.suggestion.accept"
      : "documents.template.suggestion.reject";

  context.logger.info(
    action,
    createServiceLogMetadata(context, {
      diffCount: input.diffCount,
      templateKey: input.templateKey,
    }),
  );
  await context.audit.record({
    action,
    actor: context.actor,
    category: "data_change",
    entityId: input.templateKey,
    entityType: "document_template",
    metadata: {
      diffCount: input.diffCount,
      permission,
      templateKey: input.templateKey,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: `Document template suggestion ${input.outcome}`,
    tenantId: scope.tenantId,
  });

  return { recordedAt };
}
