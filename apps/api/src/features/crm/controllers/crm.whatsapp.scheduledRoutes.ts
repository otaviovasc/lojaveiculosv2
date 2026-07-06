import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  whatsappCreateScheduledMessageSchema,
  whatsappProcessDueScheduledMessagesSchema,
  whatsappScheduledMessagesQuerySchema,
} from "./crm.controller.schemas.js";
import {
  CrmWhatsappValidationError,
  handleWhatsapp,
} from "./crm.whatsapp.errors.js";
import { parseWhatsappJson } from "./crm.whatsapp.controller.support.js";
import type { CrmServices } from "./crmServices.js";

type RegisterCrmWhatsappScheduledRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmWhatsappScheduledRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmWhatsappScheduledRoutesOptions,
) {
  crmFeature.get("/whatsapp/scheduled-messages", async (context) =>
    handleWhatsapp(context, async () => {
      const input = whatsappScheduledMessagesQuerySchema.safeParse(
        context.req.query(),
      );
      if (!input.success) throw new CrmWhatsappValidationError();
      const serviceContext = await createContext(context);
      const messages = await services.listWhatsappScheduledMessages(
        serviceContext,
        {
          ...(input.data.connectionId
            ? { connectionId: input.data.connectionId }
            : {}),
          limit: input.data.limit,
          ...(input.data.sessionId ? { sessionId: input.data.sessionId } : {}),
          ...(input.data.status ? { status: input.data.status } : {}),
        },
      );
      return context.json(messages);
    }),
  );

  crmFeature.post("/whatsapp/scheduled-messages", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(
        context,
        whatsappCreateScheduledMessageSchema,
      );
      const serviceContext = await createContext(context);
      const message = await services.createWhatsappScheduledMessage(
        serviceContext,
        {
          scheduledAt: new Date(input.scheduledAt),
          sessionId: input.sessionId,
          text: input.text,
        },
      );
      return context.json(message, 201);
    }),
  );

  crmFeature.post("/whatsapp/scheduled-messages/process-due", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(
        context,
        whatsappProcessDueScheduledMessagesSchema,
      );
      const serviceContext = await createContext(context);
      const result = await services.processDueWhatsappScheduledMessages(
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
    "/whatsapp/scheduled-messages/:scheduledMessageId",
    async (context) =>
      handleWhatsapp(context, async () => {
        const scheduledMessageId = context.req.param("scheduledMessageId");
        if (!scheduledMessageId) {
          throw new CrmWhatsappValidationError(
            "Route param scheduledMessageId is invalid.",
          );
        }
        const serviceContext = await createContext(context);
        const message = await services.cancelWhatsappScheduledMessage(
          serviceContext,
          { scheduledMessageId },
        );
        return context.json(message);
      }),
  );
}
