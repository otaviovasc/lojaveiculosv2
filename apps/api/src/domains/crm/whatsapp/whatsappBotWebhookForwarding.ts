import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type {
  CrmWhatsappMessage,
  CrmWhatsappSession,
} from "../ports/crmWhatsappRepository.js";
import type {
  CrmBotSenderOrigin,
  CrmBotWebhookEvent,
  CrmBotWebhookPayload,
} from "../ports/crmBotWebhookDispatcher.js";
import {
  getCrmBotIntegrationRepository,
  getCrmBotWebhookDispatcher,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";

export async function forwardWhatsappMessageToBot(
  context: ServiceContext,
  input: {
    connection: CrmConnection;
    message: CrmWhatsappMessage;
    session: CrmWhatsappSession;
  },
  ports: CrmServicePorts,
) {
  if (input.session.status === "HUMAN_TAKEOVER") return;
  if (input.message.type === "STICKER") return;

  await dispatchBotWebhook(context, ports, {
    connection: input.connection,
    event: "message",
    idempotencyKey: [
      input.connection.id,
      input.session.id,
      input.message.id,
      senderOrigin(input.message),
    ].join(":"),
    message: input.message,
    session: input.session,
    timestamp: input.message.providerTimestamp ?? input.message.createdAt,
  });
}

export async function notifyWhatsappInterventionChangedToBot(
  context: ServiceContext,
  input: {
    active: boolean;
    connection: CrmConnection;
    session: CrmWhatsappSession;
    triggeredBy?: "bot" | "human" | "system";
  },
  ports: CrmServicePorts,
) {
  const event: CrmBotWebhookEvent = input.active
    ? "intervention_started"
    : "intervention_ended";
  await dispatchBotWebhook(context, ports, {
    connection: input.connection,
    event,
    idempotencyKey: [
      input.connection.id,
      input.session.id,
      event,
      input.session.updatedAt.toISOString(),
    ].join(":"),
    interventionActive: input.active,
    session: input.session,
    timestamp: input.session.updatedAt,
    triggeredBy: input.triggeredBy ?? interventionActor(context),
  });
}

async function dispatchBotWebhook(
  context: ServiceContext,
  ports: CrmServicePorts,
  input: {
    connection: CrmConnection;
    event: CrmBotWebhookEvent;
    idempotencyKey: string;
    interventionActive?: boolean;
    message?: CrmWhatsappMessage;
    session: CrmWhatsappSession;
    timestamp: Date;
    triggeredBy?: "bot" | "human" | "system";
  },
) {
  const config = await getCrmBotIntegrationRepository(
    ports,
  ).findBotIntegrationDeliveryConfig({
    storeId: input.connection.storeId,
    tenantId: input.connection.tenantId,
  });
  if (!config?.enabled || !config.webhookSecret || !config.webhookUrl) return;

  const dispatcher = getCrmBotWebhookDispatcher(ports);
  try {
    await dispatcher.dispatch({
      idempotencyKey: input.idempotencyKey,
      payload: buildPayload(dispatcher.actionApiBaseUrl, input),
      storeId: input.connection.storeId,
      tenantId: input.connection.tenantId,
      webhookSecret: config.webhookSecret,
      webhookUrl: config.webhookUrl,
    });
  } catch (error) {
    context.logger.warn(
      "crm.whatsapp.bot.webhook.dispatch_failed",
      createServiceLogMetadata(context, {
        connectionId: input.connection.id,
        errorName: error instanceof Error ? error.name : "UnknownError",
        event: input.event,
        sessionId: input.session.id,
      }),
    );
  }
}

function buildPayload(
  actionApiBaseUrl: string,
  input: {
    connection: CrmConnection;
    event: CrmBotWebhookEvent;
    interventionActive?: boolean;
    message?: CrmWhatsappMessage;
    session: CrmWhatsappSession;
    timestamp: Date;
    triggeredBy?: "bot" | "human" | "system";
  },
): CrmBotWebhookPayload {
  return {
    actionsApi: {
      authentication: "X-Webhook-Secret",
      baseUrl: actionApiBaseUrl,
    },
    chat: {
      buyerName: input.session.buyerName,
      phone: input.session.buyerPhone,
      profilePhotoUrl: input.session.profilePhotoUrl,
      whatsappLid: input.session.buyerChatLid,
    },
    connection: {
      id: input.connection.id,
      phone: input.connection.phone,
      provider: input.connection.provider,
      status: input.connection.status,
      uuid: input.connection.id,
    },
    connectionId: input.connection.id,
    connectionPhone: input.connection.phone,
    connectionUuid: input.connection.id,
    event: input.event,
    instanceName: input.connection.displayName,
    ...(input.interventionActive !== undefined
      ? {
          intervention: {
            active: input.interventionActive,
            triggeredBy: input.triggeredBy ?? "system",
          },
        }
      : {}),
    ...(input.message ? { message: botMessage(input.message) } : {}),
    session: {
      assignedUserId: input.session.assignedUserId,
      id: input.session.id,
      isBotActive: isBotActive(input.session.status),
      leadId: input.session.leadId,
      messageCount: input.session.messageCount,
      status: input.session.status,
      tags: (input.session.sessionTags ?? []).map((tag) => ({
        id: tag.id,
        name: tag.name,
      })),
      uuid: input.session.id,
    },
    timestamp: input.timestamp.toISOString(),
  };
}

function botMessage(
  message: CrmWhatsappMessage,
): NonNullable<CrmBotWebhookPayload["message"]> {
  const fromMe = message.direction === "OUTBOUND";
  return {
    content: message.content,
    direction: fromMe ? "outbound" : "inbound",
    fromMe,
    id: message.id,
    mediaType: message.mediaType,
    mediaUrl: message.mediaUrl,
    providerMessageId: message.externalId,
    senderOrigin: senderOrigin(message),
    timestamp: (message.providerTimestamp ?? message.createdAt).toISOString(),
    type: message.type.toLowerCase(),
    uuid: message.id,
    wasSentByApi: wasSentByApi(message),
  };
}

function senderOrigin(message: CrmWhatsappMessage): CrmBotSenderOrigin {
  if (message.direction === "INBOUND") return "customer";
  if (message.senderType === "AI") return "bot_api";
  return wasSentByApi(message) ? "human_crm" : "human_whatsapp";
}

function wasSentByApi(message: CrmWhatsappMessage) {
  return (
    message.senderType === "AI" ||
    typeof message.metadata?.sentByActorId === "string"
  );
}

function isBotActive(status: string) {
  return !["COMPLETED", "EXPIRED", "HUMAN_TAKEOVER"].includes(status);
}

function interventionActor(context: ServiceContext) {
  if (context.actor.kind === "integration") return "bot";
  if (context.actor.kind === "system") return "system";
  return "human";
}
