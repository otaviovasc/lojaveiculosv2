import type { Hono } from "hono";
import {
  createFiscalRecipientSchema,
  createFiscalTemplateSchema,
  listFiscalTemplatesQuerySchema,
  previewFiscalTemplateSchema,
  updateFiscalRecipientSchema,
  updateFiscalTemplateSchema,
} from "./fiscal.controller.schemas.js";
import type { FiscalContextFactory } from "./fiscal.controller.js";
import {
  createUserContext,
  handleFiscal,
  parseJson,
} from "./fiscal.controller.support.js";
import type { FiscalServices } from "./fiscalServices.js";

export function registerFiscalCatalogRoutes(
  feature: Hono,
  services: FiscalServices,
  contextFactory: FiscalContextFactory,
) {
  feature.get("/recipients", async (context) =>
    handleFiscal(context, async () => {
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(await services.listRecipients(serviceContext));
    }),
  );

  feature.post("/recipients", async (context) =>
    handleFiscal(context, async () => {
      const input = await parseJson(context, createFiscalRecipientSchema);
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(
        await services.createRecipient(serviceContext, input),
        201,
      );
    }),
  );

  feature.patch("/recipients/:recipientId", async (context) =>
    handleFiscal(context, async () => {
      const input = await parseJson(context, updateFiscalRecipientSchema);
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(
        await services.updateRecipient(serviceContext, {
          ...input,
          id: context.req.param("recipientId"),
        }),
      );
    }),
  );

  feature.delete("/recipients/:recipientId", async (context) =>
    handleFiscal(context, async () => {
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(
        await services.archiveRecipient(serviceContext, {
          id: context.req.param("recipientId"),
        }),
      );
    }),
  );

  feature.get("/templates", async (context) =>
    handleFiscal(context, async () => {
      const query = listFiscalTemplatesQuerySchema.parse({
        recipientId: context.req.query("recipientId"),
      });
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(await services.listTemplates(serviceContext, query));
    }),
  );

  feature.post("/templates", async (context) =>
    handleFiscal(context, async () => {
      const input = await parseJson(context, createFiscalTemplateSchema);
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(
        await services.createTemplate(serviceContext, input),
        201,
      );
    }),
  );

  feature.patch("/templates/:templateId", async (context) =>
    handleFiscal(context, async () => {
      const input = await parseJson(context, updateFiscalTemplateSchema);
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(
        await services.updateTemplate(serviceContext, {
          ...input,
          id: context.req.param("templateId"),
        }),
      );
    }),
  );

  feature.delete("/templates/:templateId", async (context) =>
    handleFiscal(context, async () => {
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(
        await services.archiveTemplate(serviceContext, {
          id: context.req.param("templateId"),
        }),
      );
    }),
  );

  feature.post("/templates/preview", async (context) =>
    handleFiscal(context, async () => {
      const input = await parseJson(context, previewFiscalTemplateSchema);
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(
        await services.previewTemplate(serviceContext, input),
      );
    }),
  );
}
