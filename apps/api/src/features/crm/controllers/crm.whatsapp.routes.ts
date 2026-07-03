import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  whatsappMessageParamSchema,
  whatsappMessagesQuerySchema,
  whatsappSessionCountsQuerySchema,
  whatsappSendReactionSchema,
  whatsappSendMediaSchema,
  whatsappSendTextSchema,
  whatsappSessionsQuerySchema,
  whatsappStartConversationSchema,
} from "./crm.controller.schemas.js";
import {
  assertWhatsappList,
  assertWhatsappRead,
  assertWhatsappSend,
  parseWhatsappJson,
} from "./crm.whatsapp.controller.support.js";
import {
  CrmWhatsappValidationError,
  handleWhatsapp,
} from "./crm.whatsapp.errors.js";
import { registerCrmWhatsappExtrasRoutes } from "./crm.whatsapp.extrasRoutes.js";
import {
  cleanWhatsappSessionCountsQuery,
  cleanWhatsappSessionsQuery,
} from "./crm.whatsapp.query.js";
import { registerCrmWhatsappSessionRoutes } from "./crm.whatsapp.sessionRoutes.js";
import { registerCrmWhatsappWebhookEventRoutes } from "./crm.whatsapp.webhookEventRoutes.js";
import { registerCrmWhatsappWebhookRoutes } from "./crm.whatsapp.webhookRoutes.js";
import type { CrmServices } from "./crmServices.js";

export type RegisterCrmWhatsappApiRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  createWebhookContext?: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmWhatsappApiRoutes(
  crmFeature: Hono,
  {
    createContext,
    createWebhookContext = createContext,
    services,
  }: RegisterCrmWhatsappApiRoutesOptions,
) {
  crmFeature.get("/whatsapp/connections", async (context) =>
    handleWhatsapp(context, async () => {
      const serviceContext = await createContext(context);
      assertWhatsappList(serviceContext);
      const connections =
        await services.listWhatsappConnections(serviceContext);

      return context.json({ connections });
    }),
  );

  crmFeature.get("/whatsapp/sessions", async (context) =>
    handleWhatsapp(context, async () => {
      const parsed = whatsappSessionsQuerySchema.safeParse(context.req.query());
      if (!parsed.success) throw new CrmWhatsappValidationError();
      const serviceContext = await createContext(context);
      assertWhatsappList(serviceContext);
      const input = cleanWhatsappSessionsQuery(parsed.data);
      const sessions = await services.listWhatsappSessions(
        serviceContext,
        input,
      );
      return context.json(sessions);
    }),
  );

  crmFeature.get("/whatsapp/session-counts", async (context) =>
    handleWhatsapp(context, async () => {
      const parsed = whatsappSessionCountsQuerySchema.safeParse(
        context.req.query(),
      );
      if (!parsed.success) throw new CrmWhatsappValidationError();
      const serviceContext = await createContext(context);
      assertWhatsappList(serviceContext);
      const counts = await services.countWhatsappSessions(
        serviceContext,
        cleanWhatsappSessionCountsQuery(parsed.data),
      );
      return context.json(counts);
    }),
  );

  crmFeature.get("/whatsapp/messages/:sessionId", async (context) =>
    handleWhatsapp(context, async () => {
      const parsed = whatsappMessagesQuerySchema.safeParse(context.req.query());
      if (!parsed.success) throw new CrmWhatsappValidationError();
      const serviceContext = await createContext(context);
      assertWhatsappRead(serviceContext);
      const sessionId = context.req.param("sessionId");
      const messages = await services.listWhatsappMessages(serviceContext, {
        ...parsed.data,
        sessionId,
      });
      return context.json(messages);
    }),
  );

  crmFeature.post("/whatsapp/send/text", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(context, whatsappSendTextSchema);
      const serviceContext = await createContext(context);
      assertWhatsappSend(serviceContext);
      const message = await services.sendWhatsappText(serviceContext, {
        ...(input.replyToMessageId
          ? { replyToMessageId: input.replyToMessageId }
          : {}),
        sessionId: input.sessionId,
        text: input.text,
      });
      return context.json(message, 201);
    }),
  );

  crmFeature.post("/whatsapp/conversations/start", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(
        context,
        whatsappStartConversationSchema,
      );
      const serviceContext = await createContext(context);
      assertWhatsappSend(serviceContext);
      const result = await services.startWhatsappConversation(serviceContext, {
        ...(input.buyerName ? { buyerName: input.buyerName } : {}),
        connectionId: input.connectionId,
        phone: input.phone,
        text: input.text,
      });
      return context.json(result, 201);
    }),
  );

  crmFeature.post("/whatsapp/messages/:messageId/reaction", async (context) =>
    handleWhatsapp(context, async () => {
      const params = whatsappMessageParamSchema.safeParse(context.req.param());
      if (!params.success) throw new CrmWhatsappValidationError();
      const input = await parseWhatsappJson(
        context,
        whatsappSendReactionSchema,
      );
      const serviceContext = await createContext(context);
      assertWhatsappSend(serviceContext);
      const message = await services.sendWhatsappReaction(serviceContext, {
        messageId: params.data.messageId,
        reaction: input.reaction,
      });
      return context.json(message);
    }),
  );

  crmFeature.delete("/whatsapp/messages/:messageId/reaction", async (context) =>
    handleWhatsapp(context, async () => {
      const params = whatsappMessageParamSchema.safeParse(context.req.param());
      if (!params.success) throw new CrmWhatsappValidationError();
      const serviceContext = await createContext(context);
      assertWhatsappSend(serviceContext);
      const message = await services.removeWhatsappReaction(serviceContext, {
        messageId: params.data.messageId,
      });
      return context.json(message);
    }),
  );

  crmFeature.delete("/whatsapp/messages/:messageId", async (context) =>
    handleWhatsapp(context, async () => {
      const params = whatsappMessageParamSchema.safeParse(context.req.param());
      if (!params.success) throw new CrmWhatsappValidationError();
      const serviceContext = await createContext(context);
      assertWhatsappSend(serviceContext);
      const message = await services.deleteWhatsappMessage(serviceContext, {
        messageId: params.data.messageId,
      });
      return context.json(message);
    }),
  );

  crmFeature.post("/whatsapp/send/media", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(context, whatsappSendMediaSchema);
      const serviceContext = await createContext(context);
      assertWhatsappSend(serviceContext);
      const message = await services.sendWhatsappMedia(serviceContext, {
        base64: input.base64,
        ...(input.caption ? { caption: input.caption } : {}),
        ...(input.fileName ? { fileName: input.fileName } : {}),
        mediaType: input.mediaType,
        ...(input.mimeType ? { mimeType: input.mimeType } : {}),
        sessionId: input.sessionId,
      });
      return context.json(message, 201);
    }),
  );

  registerCrmWhatsappSessionRoutes(crmFeature, { createContext, services });
  registerCrmWhatsappExtrasRoutes(crmFeature, { createContext, services });
  registerCrmWhatsappWebhookEventRoutes(crmFeature, {
    createContext,
    services,
  });

  registerCrmWhatsappWebhookRoutes(crmFeature, {
    createWebhookContext,
    services,
  });
}
