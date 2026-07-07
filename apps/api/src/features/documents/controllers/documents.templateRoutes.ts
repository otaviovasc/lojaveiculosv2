import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  DocumentsRequestValidationError,
  handleDocuments,
} from "./documents.controller.http.js";
import {
  documentTemplateKindSchema,
  documentTemplateSuggestionOutcomeSchema,
  suggestDocumentTemplateSchema,
  updateDocumentTemplateSchema,
} from "./documents.controller.schemas.js";
import { toDocumentTemplateDto } from "./documentResponseDtos.js";
import type { DocumentServices } from "./documentServices.js";

type CreateTemplateContext = (context: Context) => Promise<ServiceContext>;

export function mountDocumentTemplateRoutes(
  documentsFeature: Hono,
  services: DocumentServices,
  createContext: CreateTemplateContext,
) {
  documentsFeature.get("/templates", async (context) =>
    handleDocuments(context, async () => {
      const serviceContext = await createContext(context);
      const templates = await services.listTemplates(serviceContext);
      return context.json({
        templates: templates.map(toDocumentTemplateDto),
      });
    }),
  );

  documentsFeature.put("/templates/:templateKey", async (context) =>
    handleDocuments(context, async () => {
      const templateKey = parseTemplateKey(context);
      const input = await parseJson(context, updateDocumentTemplateSchema);
      const serviceContext = await createContext(context);
      const template = await services.updateTemplate(serviceContext, {
        blocks: input.blocks,
        clauses: input.clauses,
        templateKey,
        title: input.title,
      });
      return context.json(toDocumentTemplateDto(template));
    }),
  );

  documentsFeature.post(
    "/templates/:templateKey/suggestions",
    async (context) =>
      handleDocuments(context, async () => {
        const templateKey = parseTemplateKey(context);
        const input = await parseJson(context, suggestDocumentTemplateSchema);
        const serviceContext = await createContext(context);
        const suggestion = await services.suggestTemplateEdit(serviceContext, {
          blocks: input.blocks ?? [],
          clauses: input.clauses,
          instruction: input.instruction,
          templateKey,
          title: input.title,
        });
        return context.json({
          ...suggestion,
          generatedAt: suggestion.generatedAt.toISOString(),
        });
      }),
  );

  documentsFeature.post(
    "/templates/:templateKey/suggestions/outcome",
    async (context) =>
      handleDocuments(context, async () => {
        const templateKey = parseTemplateKey(context);
        const input = await parseJson(
          context,
          documentTemplateSuggestionOutcomeSchema,
        );
        const serviceContext = await createContext(context);
        const result = await services.recordTemplateSuggestionOutcome(
          serviceContext,
          { ...input, templateKey },
        );
        return context.json({ recordedAt: result.recordedAt.toISOString() });
      }),
  );
}

function parseTemplateKey(context: Context) {
  const templateKey = documentTemplateKindSchema.safeParse(
    context.req.param("templateKey"),
  );
  if (!templateKey.success) {
    throw new DocumentsRequestValidationError(
      "Document template key is invalid.",
    );
  }
  return templateKey.data;
}

async function parseJson<Schema extends { parse: (value: unknown) => unknown }>(
  context: Context,
  schema: Schema,
): Promise<ReturnType<Schema["parse"]>> {
  try {
    return schema.parse(await context.req.json()) as ReturnType<
      Schema["parse"]
    >;
  } catch {
    throw new DocumentsRequestValidationError("Request body is invalid.");
  }
}
