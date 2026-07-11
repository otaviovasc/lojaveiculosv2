import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { DocumentTemplateSuggestion } from "../../ports/documentTemplateSuggestionProvider.js";
import { createDocumentTemplateSuggestionDiff } from "../../documentTemplateSuggestionDiff.js";
import { defaultTemplate } from "../../templates/documentTemplateDefaults.js";
import { DocumentOperationPolicyError } from "../DocumentOperationService/serviceSupport.js";
import {
  requireDocumentWorkspaceScope,
  type DocumentWorkspaceServicePorts,
} from "../DocumentWorkspaceService/serviceSupport.js";

const permission = "documents.template_update";

export type SuggestDocumentTemplateEditInput = {
  blocks: readonly Record<string, unknown>[];
  clauses: readonly string[];
  instruction: string;
  templateKey: string;
  title: string;
};

export async function suggestDocumentTemplateEdit(
  context: ServiceContext,
  input: SuggestDocumentTemplateEditInput,
  ports?: DocumentWorkspaceServicePorts,
): Promise<DocumentTemplateSuggestion> {
  assertPermission(context, permission);
  const scope = requireDocumentWorkspaceScope(context);
  const fallback = defaultTemplate("other", input.templateKey);
  if (!fallback || fallback.mode === "locked") {
    throw new DocumentOperationPolicyError(
      "Only editable document drafts can receive suggestions.",
    );
  }

  const suggestion = await suggestWithFallback(input, ports);

  context.logger.info(
    "documents.template.suggest",
    createServiceLogMetadata(context, {
      diffCount: suggestion.diff.length,
      templateKey: input.templateKey,
    }),
  );
  await context.audit.record({
    action: "documents.template.suggest",
    actor: context.actor,
    category: "data_change",
    entityId: input.templateKey,
    entityType: "document_template",
    metadata: {
      diffCount: suggestion.diff.length,
      permission,
      templateKey: input.templateKey,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Generated document template suggestion",
    tenantId: scope.tenantId,
  });

  return suggestion;
}

async function suggestWithFallback(
  input: SuggestDocumentTemplateEditInput,
  ports: DocumentWorkspaceServicePorts | undefined,
) {
  if (ports?.templateSuggestionProvider) {
    try {
      return await ports.templateSuggestionProvider.suggest(input);
    } catch {
      return deterministicSuggestion(input);
    }
  }
  return deterministicSuggestion(input);
}

function deterministicSuggestion(
  input: SuggestDocumentTemplateEditInput,
): DocumentTemplateSuggestion {
  const note = input.instruction.trim();
  const suffix = note
    ? ` Revisao solicitada: ${note.slice(0, 220)}.`
    : " Revisao solicitada pelo operador.";
  const appliedClauses =
    input.clauses.length > 0
      ? input.clauses.map((clause, index) =>
          index === input.clauses.length - 1 ? `${clause}${suffix}` : clause,
        )
      : [suffix.trim()];
  const appliedBlocks = updateLastTextBlock(input.blocks, suffix);
  return {
    appliedBlocks,
    appliedClauses,
    appliedTitle: input.title,
    diff: createDocumentTemplateSuggestionDiff(input.clauses, appliedClauses),
    generatedAt: new Date(),
    summary:
      "Sugestao preparada para revisao do operador. Confira o diff antes de aplicar.",
  };
}

function updateLastTextBlock(
  blocks: readonly Record<string, unknown>[],
  suffix: string,
) {
  let changed = false;
  return [...blocks]
    .reverse()
    .map((block) => {
      if (changed || typeof block.body !== "string") return block;
      changed = true;
      return { ...block, body: `${block.body}${suffix}` };
    })
    .reverse();
}
