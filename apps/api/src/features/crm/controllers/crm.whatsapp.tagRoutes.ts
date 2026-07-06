import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  whatsappAddSessionTagSchema,
  whatsappCreateTagSchema,
  whatsappReorderTagsSchema,
  whatsappTagsQuerySchema,
  whatsappUpdateTagSchema,
} from "./crm.controller.schemas.js";
import {
  assertWhatsappRead,
  assertWhatsappTagAssign,
  assertWhatsappTagManage,
  parseWhatsappJson,
} from "./crm.whatsapp.controller.support.js";
import {
  CrmWhatsappValidationError,
  handleWhatsapp,
} from "./crm.whatsapp.errors.js";
import type { CrmServices } from "./crmServices.js";

type RegisterCrmWhatsappTagRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmWhatsappTagRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmWhatsappTagRoutesOptions,
) {
  crmFeature.get("/whatsapp/tags", async (context) =>
    handleWhatsapp(context, async () => {
      const input = whatsappTagsQuerySchema.safeParse(context.req.query());
      if (!input.success) throw new CrmWhatsappValidationError();
      const serviceContext = await createContext(context);
      assertWhatsappRead(serviceContext);
      const tags = await services.listWhatsappTags(serviceContext, {
        ...(input.data.connectionId !== undefined
          ? { connectionId: input.data.connectionId }
          : {}),
        limit: input.data.limit,
        ...(input.data.search ? { search: input.data.search } : {}),
      });
      return context.json(tags);
    }),
  );

  crmFeature.post("/whatsapp/tags", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(context, whatsappCreateTagSchema);
      const serviceContext = await createContext(context);
      assertWhatsappTagManage(serviceContext);
      const tag = await services.createWhatsappTag(serviceContext, {
        ...(input.color ? { color: input.color } : {}),
        ...(input.connectionId !== undefined
          ? { connectionId: input.connectionId }
          : {}),
        ...(input.emoji !== undefined ? { emoji: input.emoji } : {}),
        name: input.name,
      });
      return context.json(tag, 201);
    }),
  );

  crmFeature.patch("/whatsapp/tags/reorder", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(context, whatsappReorderTagsSchema);
      const serviceContext = await createContext(context);
      assertWhatsappTagManage(serviceContext);
      const tags = await services.reorderWhatsappTags(serviceContext, {
        tagIds: input.tagIds,
      });
      return context.json(tags);
    }),
  );

  crmFeature.patch("/whatsapp/tags/:tagId", async (context) =>
    handleWhatsapp(context, async () => {
      const tagId = context.req.param("tagId");
      if (!tagId) {
        throw new CrmWhatsappValidationError("Route param tagId is invalid.");
      }
      const input = await parseWhatsappJson(context, whatsappUpdateTagSchema);
      const serviceContext = await createContext(context);
      assertWhatsappTagManage(serviceContext);
      const tag = await services.updateWhatsappTag(serviceContext, {
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.emoji !== undefined ? { emoji: input.emoji } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.sortOrder !== undefined
          ? { sortOrder: input.sortOrder }
          : {}),
        tagId,
      });
      return context.json(tag);
    }),
  );

  crmFeature.delete("/whatsapp/tags/:tagId", async (context) =>
    handleWhatsapp(context, async () => {
      const tagId = context.req.param("tagId");
      if (!tagId) {
        throw new CrmWhatsappValidationError("Route param tagId is invalid.");
      }
      const serviceContext = await createContext(context);
      assertWhatsappTagManage(serviceContext);
      const tag = await services.deleteWhatsappTag(serviceContext, { tagId });
      return context.json(tag);
    }),
  );

  crmFeature.post("/whatsapp/sessions/:sessionId/tags", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(
        context,
        whatsappAddSessionTagSchema,
      );
      const serviceContext = await createContext(context);
      assertWhatsappTagAssign(serviceContext);
      const session = await services.addWhatsappSessionTag(serviceContext, {
        ...(input.color ? { color: input.color } : {}),
        ...(input.emoji !== undefined ? { emoji: input.emoji } : {}),
        name: input.name,
        sessionId: context.req.param("sessionId"),
      });
      return context.json(session);
    }),
  );

  crmFeature.delete(
    "/whatsapp/sessions/:sessionId/tags/:tagId",
    async (context) =>
      handleWhatsapp(context, async () => {
        const tagId = context.req.param("tagId");
        if (!tagId) {
          throw new CrmWhatsappValidationError("Route param tagId is invalid.");
        }
        const serviceContext = await createContext(context);
        assertWhatsappTagAssign(serviceContext);
        const session = await services.removeWhatsappSessionTag(
          serviceContext,
          {
            sessionId: context.req.param("sessionId"),
            tagId,
          },
        );
        return context.json(session);
      }),
  );
}
