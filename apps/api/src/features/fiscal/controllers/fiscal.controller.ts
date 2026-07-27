import { Hono, type Context } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { createHttpServiceContext } from "../../../infrastructure/http/createHttpServiceContext.js";
import { createHttpIntegrationServiceContext } from "../../../infrastructure/http/httpIntegrationServiceContext.js";
import {
  cancelFiscalDocumentSchema,
  confirmFiscalDefaultsSchema,
  issueFiscalDocumentSchema,
  setupFiscalConnectionSchema,
  spedyWebhookSchema,
  syncFiscalDocumentSchema,
} from "./fiscal.controller.schemas.js";
import { registerFiscalCatalogRoutes } from "./fiscal.controller.catalogRoutes.js";
import {
  createUserContext,
  FiscalRequestValidationError,
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
  webhookContextFactory?: FiscalContextFactory;
};

export function createFiscalFeature(options: CreateFiscalFeatureOptions = {}) {
  const feature = new Hono();
  const services = options.services ?? fiscalServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));
  const webhookContextFactory =
    options.webhookContextFactory ??
    ((context) =>
      createHttpIntegrationServiceContext(context, {
        actorId: "spedy",
        displayName: "Spedy",
        permissions: ["fiscal.webhook.ingest"],
      }));

  feature.post("/webhooks/spedy/:token", async (context) =>
    handleFiscal(context, async () => {
      const payload = await parseJson(context, spedyWebhookSchema);
      const serviceContext = await webhookContextFactory(context);
      return context.json(
        await services.processWebhook(serviceContext, {
          payload,
          token: context.req.param("token"),
        }),
      );
    }),
  );

  feature.get("/overview", async (context) =>
    handleFiscal(context, async () => {
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(await services.getOverview(serviceContext));
    }),
  );

  registerFiscalCatalogRoutes(feature, services, contextFactory);

  feature.get("/connection", async (context) =>
    handleFiscal(context, async () => {
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(await services.getConnection(serviceContext));
    }),
  );

  feature.post("/connection/setup", async (context) =>
    handleFiscal(context, async () => {
      const input = await parseJson(context, setupFiscalConnectionSchema);
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(
        await services.setupConnection(serviceContext, {
          issuerProfile: input.issuerProfile,
          ...(input.taxDefaults ? { taxDefaults: input.taxDefaults } : {}),
        }),
      );
    }),
  );

  feature.post("/connection/sync", async (context) =>
    handleFiscal(context, async () => {
      await parseJson(context, syncFiscalDocumentSchema);
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(await services.syncConnection(serviceContext));
    }),
  );

  feature.post("/connection/defaults/confirm", async (context) =>
    handleFiscal(context, async () => {
      const input = await parseJson(context, confirmFiscalDefaultsSchema);
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(
        await services.confirmDefaults(serviceContext, input),
      );
    }),
  );

  feature.post("/connection/certificate", async (context) =>
    handleFiscal(context, async () => {
      const form = await context.req.parseBody();
      const certificate = form.certificate;
      const password = form.password;
      if (!(certificate instanceof File) || certificate.size > 5_000_000) {
        throw new FiscalRequestValidationError(
          "Fiscal certificate must be a PFX file up to 5 MB.",
        );
      }
      if (typeof password !== "string" || !password.trim()) {
        throw new FiscalRequestValidationError(
          "Fiscal certificate password is required.",
        );
      }
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(
        await services.uploadCertificate(serviceContext, {
          certificate,
          password,
        }),
      );
    }),
  );

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
      await parseJson(context, syncFiscalDocumentSchema);
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(
        await services.syncDocumentStatus(serviceContext, {
          documentId: context.req.param("documentId"),
        }),
      );
    }),
  );

  return feature;
}
