import { Hono, type Context } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { createHttpServiceContext } from "../../../infrastructure/http/createHttpServiceContext.js";
import {
  cancelFiscalDocumentSchema,
  issueFiscalDocumentSchema,
  syncFiscalDocumentSchema,
} from "./fiscal.controller.schemas.js";
import { registerFiscalCatalogRoutes } from "./fiscal.controller.catalogRoutes.js";
import {
  createUserContext,
  handleFiscal,
  parseJson,
} from "./fiscal.controller.support.js";
import { fiscalServices, type FiscalServices } from "./fiscalServices.js";

export type FiscalContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export type CreateFiscalFeatureOptions = {
  contextFactory?: FiscalContextFactory;
  services?: FiscalServices;
};

export function createFiscalFeature(options: CreateFiscalFeatureOptions = {}) {
  const feature = new Hono();
  const services = options.services ?? fiscalServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));

  feature.get("/overview", async (context) =>
    handleFiscal(context, async () => {
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(await services.getOverview(serviceContext));
    }),
  );

  registerFiscalCatalogRoutes(feature, services, contextFactory);

  feature.post("/documents", async (context) =>
    handleFiscal(context, async () => {
      const input = await parseJson(context, issueFiscalDocumentSchema);
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(
        await services.issueDocument(serviceContext, {
          ...(input.documentKind ? { documentKind: input.documentKind } : {}),
          documentType: input.documentType,
          externalReference: input.externalReference,
          ...(input.metadata ? { metadata: input.metadata } : {}),
          ...(input.recipientId !== undefined
            ? { recipientId: input.recipientId }
            : {}),
          ...(input.templateId !== undefined
            ? { templateId: input.templateId }
            : {}),
          ...(input.templateVariables
            ? { templateVariables: input.templateVariables }
            : {}),
        }),
        201,
      );
    }),
  );

  feature.post("/documents/:documentId/cancel", async (context) =>
    handleFiscal(context, async () => {
      const input = await parseJson(context, cancelFiscalDocumentSchema);
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(
        await services.cancelDocument(serviceContext, {
          documentId: context.req.param("documentId"),
          providerDocumentId: input.providerDocumentId,
          reason: input.reason,
        }),
      );
    }),
  );

  feature.post("/documents/:documentId/repeat", async (context) =>
    handleFiscal(context, async () => {
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(
        await services.repeatDocument(serviceContext, {
          documentId: context.req.param("documentId"),
        }),
        201,
      );
    }),
  );

  feature.post("/documents/:documentId/status-sync", async (context) =>
    handleFiscal(context, async () => {
      const input = await parseJson(context, syncFiscalDocumentSchema);
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(
        await services.syncDocumentStatus(serviceContext, {
          documentId: context.req.param("documentId"),
          providerDocumentId: input.providerDocumentId,
        }),
      );
    }),
  );

  return feature;
}
