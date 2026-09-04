import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  crmAddConversationCycleTagSchema,
  crmCreateTagSchema,
  crmReorderTagsSchema,
  crmTagsQuerySchema,
  crmUpdateTagSchema,
} from "./crm.controller.schemas.js";
import {
  assertConversationRead,
  assertTagAssign,
  assertTagManage,
  parseCrmMessagingJson,
} from "./crm.messaging.controller.support.js";
import {
  CrmMessagingValidationError,
  handleCrmMessaging,
} from "./crm.messaging.errors.js";
import type { CrmServices } from "./crmServices.js";
import { toConversationCycleDto } from "./crm.conversationCycle.dto.js";

type RegisterCrmTagRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmTagRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmTagRoutesOptions,
) {
  crmFeature.get("/tags", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = crmTagsQuerySchema.safeParse(context.req.query());
      if (!input.success) throw new CrmMessagingValidationError();
      const serviceContext = await createContext(context);
      assertConversationRead(serviceContext);
      const tags = await services.listCrmTags(serviceContext, {
        ...(input.data.connectionId !== undefined
          ? { connectionId: input.data.connectionId }
          : {}),
        limit: input.data.limit,
        ...(input.data.search ? { search: input.data.search } : {}),
      });
      return context.json(tags);
    }),
  );

  crmFeature.post("/tags", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = await parseCrmMessagingJson(context, crmCreateTagSchema);
      const serviceContext = await createContext(context);
      assertTagManage(serviceContext);
      const tag = await services.createCrmTag(serviceContext, {
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

  crmFeature.patch("/tags/reorder", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = await parseCrmMessagingJson(context, crmReorderTagsSchema);
      const serviceContext = await createContext(context);
      assertTagManage(serviceContext);
      const tags = await services.reorderCrmTags(serviceContext, {
        tagIds: input.tagIds,
      });
      return context.json(tags);
    }),
  );

  crmFeature.patch("/tags/:tagId", async (context) =>
    handleCrmMessaging(context, async () => {
      const tagId = context.req.param("tagId");
      if (!tagId) {
        throw new CrmMessagingValidationError("Route param tagId is invalid.");
      }
      const input = await parseCrmMessagingJson(context, crmUpdateTagSchema);
      const serviceContext = await createContext(context);
      assertTagManage(serviceContext);
      const tag = await services.updateCrmTag(serviceContext, {
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

  crmFeature.delete("/tags/:tagId", async (context) =>
    handleCrmMessaging(context, async () => {
      const tagId = context.req.param("tagId");
      if (!tagId) {
        throw new CrmMessagingValidationError("Route param tagId is invalid.");
      }
      const serviceContext = await createContext(context);
      assertTagManage(serviceContext);
      const tag = await services.deleteCrmTag(serviceContext, { tagId });
      return context.json(tag);
    }),
  );

  crmFeature.post("/conversation-cycles/:cycleId/tags", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = await parseCrmMessagingJson(
        context,
        crmAddConversationCycleTagSchema,
      );
      const serviceContext = await createContext(context);
      assertTagAssign(serviceContext);
      const cycle = await services.addConversationCycleTag(serviceContext, {
        ...(input.color ? { color: input.color } : {}),
        ...(input.emoji !== undefined ? { emoji: input.emoji } : {}),
        name: input.name,
        cycleId: context.req.param("cycleId"),
      });
      return context.json(toConversationCycleDto(cycle));
    }),
  );

  crmFeature.delete(
    "/conversation-cycles/:cycleId/tags/:tagId",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const tagId = context.req.param("tagId");
        if (!tagId) {
          throw new CrmMessagingValidationError(
            "Route param tagId is invalid.",
          );
        }
        const serviceContext = await createContext(context);
        assertTagAssign(serviceContext);
        const cycle = await services.removeConversationCycleTag(
          serviceContext,
          {
            cycleId: context.req.param("cycleId"),
            tagId,
          },
        );
        return context.json(toConversationCycleDto(cycle));
      }),
  );
}
