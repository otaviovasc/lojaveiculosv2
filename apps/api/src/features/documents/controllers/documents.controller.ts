import { Hono, type Context } from "hono";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  DocumentsRequestValidationError,
  handleDocuments,
} from "./documents.controller.http.js";
import {
  createUploadedDocumentSchema,
  documentTemplateKindSchema,
  listDocumentsQuerySchema,
  requestDocumentUploadSchema,
  updateDocumentMetadataSchema,
  updateDocumentTemplateSchema,
  voidDocumentSchema,
} from "./documents.controller.schemas.js";
import {
  toDocumentDownloadDto,
  toDocumentPreviewDto,
  toDocumentTemplateDto,
  toDocumentUploadDto,
  toDocumentVersionDto,
  toDocumentWorkspaceDto,
} from "./documentResponseDtos.js";
import { documentServices, type DocumentServices } from "./documentServices.js";

export type DocumentsContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export type CreateDocumentsFeatureOptions = {
  contextFactory?: DocumentsContextFactory;
  services?: DocumentServices;
};

export function createDocumentsFeature(
  options: CreateDocumentsFeatureOptions = {},
) {
  const documentsFeature = new Hono();
  const services = options.services ?? documentServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));
  const createContext = (context: Context) =>
    createProtectedServiceContext(context, contextFactory);

  documentsFeature.get("/", async (context) =>
    handleDocuments(context, async () => {
      const parsed = listDocumentsQuerySchema.safeParse(context.req.query());
      if (!parsed.success) {
        throw new DocumentsRequestValidationError("Request query is invalid.");
      }

      const serviceContext = await createContext(context);
      const documents = await services.listWorkspace(
        serviceContext,
        parsed.data,
      );

      return context.json({
        documents: documents.map(toDocumentWorkspaceDto),
      });
    }),
  );

  documentsFeature.post("/", async (context) =>
    handleDocuments(context, async () => {
      const input = await parseJson(context, createUploadedDocumentSchema);
      const serviceContext = await createContext(context);
      const document = await services.createUploaded(serviceContext, input);
      return context.json(toDocumentWorkspaceDto(document), 201);
    }),
  );

  documentsFeature.post("/uploads", async (context) =>
    handleDocuments(context, async () => {
      const input = await parseJson(context, requestDocumentUploadSchema);
      const serviceContext = await createContext(context);
      const upload = await services.requestUpload(serviceContext, input);
      return context.json(toDocumentUploadDto(upload), 201);
    }),
  );

  documentsFeature.get("/templates", async (context) =>
    handleDocuments(context, async () => {
      const serviceContext = await createContext(context);
      const templates = await services.listTemplates(serviceContext);
      return context.json({
        templates: templates.map(toDocumentTemplateDto),
      });
    }),
  );

  documentsFeature.get("/:documentId/preview", async (context) =>
    handleDocuments(context, async () => {
      const serviceContext = await createContext(context);
      const preview = await services.preview(serviceContext, {
        documentId: context.req.param("documentId"),
      });
      return context.json(toDocumentPreviewDto(preview));
    }),
  );

  documentsFeature.get("/:documentId/download", async (context) =>
    handleDocuments(context, async () => {
      const serviceContext = await createContext(context);
      const download = await services.download(serviceContext, {
        disposition:
          context.req.query("disposition") === "inline" ? "inline" : undefined,
        documentId: context.req.param("documentId"),
        versionId: context.req.query("versionId") || undefined,
      });
      return context.json(toDocumentDownloadDto(download));
    }),
  );

  documentsFeature.get("/:documentId/versions", async (context) =>
    handleDocuments(context, async () => {
      const serviceContext = await createContext(context);
      const versions = await services.listVersions(serviceContext, {
        documentId: context.req.param("documentId"),
      });
      return context.json({
        versions: versions.map(toDocumentVersionDto),
      });
    }),
  );

  documentsFeature.patch("/:documentId", async (context) =>
    handleDocuments(context, async () => {
      const input = await parseJson(context, updateDocumentMetadataSchema);
      const serviceContext = await createContext(context);
      const document = await services.updateDocument(serviceContext, {
        documentId: context.req.param("documentId"),
        ...input,
      });
      return context.json(toDocumentWorkspaceDto(document));
    }),
  );

  documentsFeature.delete("/:documentId", async (context) =>
    handleDocuments(context, async () => {
      const serviceContext = await createContext(context);
      const document = await services.void(serviceContext, {
        documentId: context.req.param("documentId"),
        reason: "Documento excluido pelo operador.",
      });
      return context.json(toDocumentWorkspaceDto(document));
    }),
  );

  documentsFeature.post("/:documentId/regenerate", async (context) =>
    handleDocuments(context, async () => {
      const serviceContext = await createContext(context);
      const document = await services.regenerate(serviceContext, {
        documentId: context.req.param("documentId"),
      });
      return context.json(toDocumentWorkspaceDto(document));
    }),
  );

  documentsFeature.post("/:documentId/void", async (context) =>
    handleDocuments(context, async () => {
      const input = await parseJson(context, voidDocumentSchema);
      const serviceContext = await createContext(context);
      const document = await services.void(serviceContext, {
        documentId: context.req.param("documentId"),
        reason: input.reason,
      });
      return context.json(toDocumentWorkspaceDto(document));
    }),
  );

  documentsFeature.put("/templates/:kind", async (context) =>
    handleDocuments(context, async () => {
      const kind = documentTemplateKindSchema.safeParse(
        context.req.param("kind"),
      );
      if (!kind.success) {
        throw new DocumentsRequestValidationError(
          "Document template kind is invalid.",
        );
      }
      const input = await parseJson(context, updateDocumentTemplateSchema);
      const serviceContext = await createContext(context);
      const template = await services.updateTemplate(serviceContext, {
        clauses: input.clauses,
        kind: kind.data,
        title: input.title,
      });
      return context.json(toDocumentTemplateDto(template));
    }),
  );

  return documentsFeature;
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

async function createProtectedServiceContext(
  context: Context,
  contextFactory: DocumentsContextFactory,
): Promise<ServiceContext> {
  const serviceContext = await contextFactory(context);

  if (!["integration", "user"].includes(serviceContext.actor.kind)) {
    throw new HttpContextAuthenticationError(
      "Documents routes require authenticated user or integration context.",
    );
  }

  return serviceContext;
}
