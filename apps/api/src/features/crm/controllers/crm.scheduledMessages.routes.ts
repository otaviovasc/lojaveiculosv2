import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  crmCreateScheduledMessageSchema,
  crmProcessDueScheduledMessagesSchema,
  crmScheduledMessagesQuerySchema,
  crmUpdateScheduledMessageSchema,
} from "./crm.controller.schemas.js";
import {
  CrmMessagingValidationError,
  handleCrmMessaging,
} from "./crm.messaging.errors.js";
import { parseCrmMessagingJson } from "./crm.messaging.controller.support.js";
import type { CrmServices } from "./crmServices.js";

type RegisterCrmScheduledRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmScheduledRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmScheduledRoutesOptions,
) {
  crmFeature.get("/scheduled-messages", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = crmScheduledMessagesQuerySchema.safeParse(
        context.req.query(),
      );
      if (!input.success) throw new CrmMessagingValidationError();
      const serviceContext = await createContext(context);
      const messages = await services.listCrmScheduledMessages(serviceContext, {
        ...(input.data.connectionId
          ? { connectionId: input.data.connectionId }
          : {}),
        limit: input.data.limit,
        ...(input.data.cycleId ? { cycleId: input.data.cycleId } : {}),
        ...(input.data.status ? { status: input.data.status } : {}),
      });
      return context.json(messages);
    }),
  );

  crmFeature.post("/scheduled-messages", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = await parseCrmMessagingJson(
        context,
        crmCreateScheduledMessageSchema,
      );
      const serviceContext = await createContext(context);
      const message = await services.createCrmScheduledMessage(
        serviceContext,
        "cycleId" in input
          ? {
              scheduledAt: new Date(input.scheduledAt),
              content: input.content,
              cycleId: input.cycleId,
            }
          : {
              scheduledAt: new Date(input.scheduledAt),
              content: input.content,
              connectionId: input.connectionId,
              ...(input.customerDisplayName
                ? { customerDisplayName: input.customerDisplayName }
                : {}),
              phone: input.phone,
            },
      );
      return context.json(message, 201);
    }),
  );

  crmFeature.patch("/scheduled-messages/:scheduledMessageId", async (context) =>
    handleCrmMessaging(context, async () => {
      const scheduledMessageId = context.req.param("scheduledMessageId");
      if (!scheduledMessageId) {
        throw new CrmMessagingValidationError(
          "Route param scheduledMessageId is invalid.",
        );
      }
      const input = await parseCrmMessagingJson(
        context,
        crmUpdateScheduledMessageSchema,
      );
      const serviceContext = await createContext(context);
      const message = await services.updateCrmScheduledMessage(serviceContext, {
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.scheduledAt
          ? { scheduledAt: new Date(input.scheduledAt) }
          : {}),
        scheduledMessageId,
      });
      return context.json(message);
    }),
  );

  crmFeature.post("/scheduled-messages/process-due", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = await parseCrmMessagingJson(
        context,
        crmProcessDueScheduledMessagesSchema,
      );
      const serviceContext = await createContext(context);
      const result = await services.processDueCrmScheduledMessages(
        serviceContext,
        {
          ...(input.dueAt ? { dueAt: new Date(input.dueAt) } : {}),
          ...(input.limit ? { limit: input.limit } : {}),
        },
      );
      return context.json(result);
    }),
  );

  crmFeature.delete(
    "/scheduled-messages/:scheduledMessageId",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const scheduledMessageId = context.req.param("scheduledMessageId");
        if (!scheduledMessageId) {
          throw new CrmMessagingValidationError(
            "Route param scheduledMessageId is invalid.",
          );
        }
        const serviceContext = await createContext(context);
        const message = await services.cancelCrmScheduledMessage(
          serviceContext,
          { scheduledMessageId },
        );
        return context.json(message);
      }),
  );
}
