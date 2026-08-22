import type { Context, Hono } from "hono";
import type { ResolveCrmBotEntitlements } from "../../../domains/crm/ports/crmBotEntitlementResolver.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  crmMessageParamSchema,
  crmMessagesQuerySchema,
  conversationCycleCountsQuerySchema,
  whatsappSendReactionSchema,
  crmSendMediaSchema,
  crmSendTextMessageSchema,
  conversationCyclesQuerySchema,
  crmStartConversationSchema,
} from "./crm.controller.schemas.js";
import {
  assertConversationRead,
  assertMessageSend,
  parseCrmMessagingJson,
} from "./crm.messaging.controller.support.js";
import {
  CrmMessagingValidationError,
  handleCrmMessaging,
} from "./crm.messaging.errors.js";
import { registerCrmChannelConnectionRoutes } from "./crm.channelConnections.routes.js";
import { registerCrmCampaignRoutes } from "./crm.campaigns.routes.js";
import { registerCrmMessagingExtraRoutes } from "./crm.messaging.extraRoutes.js";
import {
  cleanConversationCycleCountsQuery,
  cleanCrmConversationCyclesQuery,
} from "./crm.conversationCycle.query.js";
import { registerCrmConversationCycleRoutes } from "./crm.conversationCycle.routes.js";
import { registerCrmScheduledRoutes } from "./crm.scheduledMessages.routes.js";
import { registerCrmProviderEventRoutes } from "./crm.providerEvents.routes.js";
import { registerCrmWhatsappWebhookRoutes } from "./crm.whatsapp.webhookRoutes.js";
import type { CrmServices } from "./crmServices.js";
import { registerCrmWhatsappZapiSupportRoutes } from "./crm.whatsapp.zapiSupportRoutes.js";
import { listCycleDtos, toStartCycleDto } from "./crm.conversationCycle.dto.js";
import { toCrmMessageDto } from "./crm.message.dto.js";
import { registerCrmStatisticsRoutes } from "./crm.statistics.routes.js";

export type RegisterCrmMessagingApiRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  createSupportContext?: (context: Context) => Promise<ServiceContext>;
  createWebhookContext?: (context: Context) => Promise<ServiceContext>;
  resolveBotEntitlements?: ResolveCrmBotEntitlements;
  services: CrmServices;
};

export function registerCrmMessagingApiRoutes(
  crmFeature: Hono,
  {
    createContext,
    createSupportContext,
    createWebhookContext = createContext,
    resolveBotEntitlements,
    services,
  }: RegisterCrmMessagingApiRoutesOptions,
) {
  registerCrmChannelConnectionRoutes(crmFeature, { createContext, services });
  if (createSupportContext) {
    registerCrmWhatsappZapiSupportRoutes(crmFeature, {
      createSupportContext,
      services,
    });
  }

  crmFeature.get("/conversation-cycles", async (context) =>
    handleCrmMessaging(context, async () => {
      const parsed = conversationCyclesQuerySchema.safeParse(
        context.req.query(),
      );
      if (!parsed.success) throw new CrmMessagingValidationError();
      const serviceContext = await createContext(context);
      assertConversationRead(serviceContext);
      const query = cleanCrmConversationCyclesQuery(parsed.data);
      return context.json(await listCycleDtos(serviceContext, query, services));
    }),
  );

  crmFeature.get("/conversation-cycles/counts", async (context) =>
    handleCrmMessaging(context, async () => {
      const parsed = conversationCycleCountsQuerySchema.safeParse(
        context.req.query(),
      );
      if (!parsed.success) throw new CrmMessagingValidationError();
      const serviceContext = await createContext(context);
      assertConversationRead(serviceContext);
      const counts = await services.countConversationCycles(
        serviceContext,
        cleanConversationCycleCountsQuery(parsed.data),
      );
      return context.json(counts);
    }),
  );

  crmFeature.get("/conversation-cycles/:cycleId/messages", async (context) =>
    handleCrmMessaging(context, async () => {
      const parsed = crmMessagesQuerySchema.safeParse(context.req.query());
      if (!parsed.success) throw new CrmMessagingValidationError();
      const serviceContext = await createContext(context);
      assertConversationRead(serviceContext);
      const messages = await services.listMessages(serviceContext, {
        ...parsed.data,
        cycleId: context.req.param("cycleId"),
      });
      return context.json(messages.map(toCrmMessageDto));
    }),
  );

  crmFeature.post("/conversation-cycles/:cycleId/messages", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = await parseCrmMessagingJson(
        context,
        crmSendTextMessageSchema,
      );
      const serviceContext = await createContext(context);
      assertMessageSend(serviceContext);
      const message = await services.sendMessage(serviceContext, {
        action: "message.send_text",
        ...(context.req.header("Idempotency-Key")
          ? { idempotencyKey: context.req.header("Idempotency-Key")! }
          : {}),
        ...(input.replyToMessageId
          ? { replyToMessageId: input.replyToMessageId }
          : {}),
        content: input.content,
        cycleId: context.req.param("cycleId"),
      });
      return context.json(toCrmMessageDto(message), 201);
    }),
  );

  crmFeature.post("/conversation-cycles", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = await parseCrmMessagingJson(
        context,
        crmStartConversationSchema,
      );
      const serviceContext = await createContext(context);
      assertMessageSend(serviceContext);
      const result = await services.startConversation(serviceContext, {
        action: input.template ? "message.send_template" : "message.send_text",
        channel: input.channel,
        ...(input.customerDisplayName
          ? { customerDisplayName: input.customerDisplayName }
          : {}),
        ...(context.req.header("Idempotency-Key")
          ? { idempotencyKey: context.req.header("Idempotency-Key")! }
          : {}),
        ...(input.leadId ? { leadId: input.leadId } : {}),
        ...(input.recipientAddress
          ? { recipientAddress: input.recipientAddress }
          : {}),
        ...(input.template
          ? {
              template: {
                ...(input.template.components
                  ? { components: input.template.components }
                  : {}),
                languageCode: input.template.languageCode,
                name: input.template.name,
              },
            }
          : {}),
        ...(input.text ? { text: input.text } : {}),
      });
      return context.json(toStartCycleDto(result), 201);
    }),
  );

  crmFeature.post("/messages/:messageId/reaction", async (context) =>
    handleCrmMessaging(context, async () => {
      const params = crmMessageParamSchema.safeParse(context.req.param());
      if (!params.success) throw new CrmMessagingValidationError();
      const input = await parseCrmMessagingJson(
        context,
        whatsappSendReactionSchema,
      );
      const serviceContext = await createContext(context);
      assertMessageSend(serviceContext);
      const message = await services.sendCrmReaction(serviceContext, {
        messageId: params.data.messageId,
        reaction: input.reaction,
      });
      return context.json(toCrmMessageDto(message));
    }),
  );

  crmFeature.delete("/messages/:messageId/reaction", async (context) =>
    handleCrmMessaging(context, async () => {
      const params = crmMessageParamSchema.safeParse(context.req.param());
      if (!params.success) throw new CrmMessagingValidationError();
      const serviceContext = await createContext(context);
      assertMessageSend(serviceContext);
      const message = await services.removeCrmReaction(serviceContext, {
        messageId: params.data.messageId,
      });
      return context.json(toCrmMessageDto(message));
    }),
  );

  crmFeature.delete("/messages/:messageId", async (context) =>
    handleCrmMessaging(context, async () => {
      const params = crmMessageParamSchema.safeParse(context.req.param());
      if (!params.success) throw new CrmMessagingValidationError();
      const serviceContext = await createContext(context);
      assertMessageSend(serviceContext);
      const message = await services.deleteMessage(serviceContext, {
        messageId: params.data.messageId,
      });
      return context.json(toCrmMessageDto(message));
    }),
  );

  crmFeature.post(
    "/conversation-cycles/:cycleId/messages/media",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const input = await parseCrmMessagingJson(context, crmSendMediaSchema);
        const serviceContext = await createContext(context);
        assertMessageSend(serviceContext);
        const message = await services.sendMedia(serviceContext, {
          base64: input.base64,
          ...(input.caption ? { caption: input.caption } : {}),
          ...(input.fileName ? { fileName: input.fileName } : {}),
          ...(context.req.header("Idempotency-Key")
            ? { idempotencyKey: context.req.header("Idempotency-Key")! }
            : {}),
          mediaType: input.mediaType,
          ...(input.mimeType ? { mimeType: input.mimeType } : {}),
          cycleId: context.req.param("cycleId"),
        });
        return context.json(toCrmMessageDto(message), 201);
      }),
  );

  registerCrmConversationCycleRoutes(crmFeature, { createContext, services });
  registerCrmStatisticsRoutes(crmFeature, { createContext, services });
  registerCrmCampaignRoutes(crmFeature, { createContext, services });
  registerCrmScheduledRoutes(crmFeature, { createContext, services });
  registerCrmMessagingExtraRoutes(crmFeature, { createContext, services });
  registerCrmProviderEventRoutes(crmFeature, { createContext, services });
  registerCrmWhatsappWebhookRoutes(crmFeature, {
    createWebhookContext,
    resolveEntitlements: resolveBotEntitlements ?? (async () => [] as const),
    services,
  });
}
