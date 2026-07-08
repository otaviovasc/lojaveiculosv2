import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type {
  CrmWhatsappMessage,
  CrmWhatsappSession,
} from "../ports/crmWhatsappRepository.js";
import type { CrmBotWebhookEvent } from "../ports/crmBotWebhookDispatcher.js";
import {
  getCrmBotIntegrationRepository,
  getCrmBotWebhookDispatcher,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { buildInterventionDetails } from "./whatsappBotInterventionDetails.js";
import type { InterventionEventDetails } from "./whatsappBotInterventionDetails.js";
import { auditBotWebhookDispatch } from "./whatsappBotWebhookAudit.js";
import {
  botSenderOrigin,
  buildCrmBotConnectionStatusPayload,
  buildCrmBotWebhookPayload,
} from "./whatsappBotWebhookPayload.js";

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
      botSenderOrigin(input.message),
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
    endedAt?: Date | null;
    reason?: string | null;
    session: CrmWhatsappSession;
    startedAt?: Date | null;
    triggeredBy?: "bot" | "human" | "system";
  },
  ports: CrmServicePorts,
) {
  const event: CrmBotWebhookEvent = input.active
    ? "intervention_started"
    : "intervention_ended";
  const intervention = await buildInterventionDetails(input, ports);
  await dispatchBotWebhook(context, ports, {
    connection: input.connection,
    event,
    idempotencyKey: [
      input.connection.id,
      input.session.id,
      event,
      input.session.updatedAt.toISOString(),
    ].join(":"),
    intervention,
    session: input.session,
    timestamp: input.session.updatedAt,
    triggeredBy: input.triggeredBy ?? interventionActor(context),
  });
}

export async function notifyWhatsappConnectionStatusChangedToBot(
  context: ServiceContext,
  input: {
    connection: CrmConnection;
    previousStatus: string | null;
    reason: string | null;
    status: string;
  },
  ports: CrmServicePorts,
) {
  const timestamp = new Date();
  await dispatchBotWebhook(context, ports, {
    connection: input.connection,
    event: "connection_status_changed",
    idempotencyKey: [
      input.connection.id,
      "connection_status_changed",
      input.status,
      timestamp.toISOString(),
    ].join(":"),
    payload: (actionApiBaseUrl) =>
      buildCrmBotConnectionStatusPayload(actionApiBaseUrl, {
        connection: input.connection,
        previousStatus: input.previousStatus,
        reason: input.reason,
        status: input.status,
        timestamp,
      }),
    timestamp,
  });
}

async function dispatchBotWebhook(
  context: ServiceContext,
  ports: CrmServicePorts,
  input: {
    connection: CrmConnection;
    event: CrmBotWebhookEvent;
    idempotencyKey: string;
    intervention?: InterventionEventDetails;
    message?: CrmWhatsappMessage;
    payload?: (
      actionApiBaseUrl: string,
    ) => ReturnType<typeof buildCrmBotWebhookPayload>;
    session?: CrmWhatsappSession;
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
  await auditBotWebhookDispatch(context, input, "attempted");
  try {
    await dispatcher.dispatch({
      idempotencyKey: input.idempotencyKey,
      payload: input.payload
        ? input.payload(dispatcher.actionApiBaseUrl)
        : buildSessionBotPayload(dispatcher.actionApiBaseUrl, input),
      storeId: input.connection.storeId,
      tenantId: input.connection.tenantId,
      webhookSecret: config.webhookSecret,
      webhookUrl: config.webhookUrl,
    });
    await auditBotWebhookDispatch(context, input, "succeeded");
  } catch (error) {
    context.logger.warn(
      "crm.whatsapp.bot.webhook.dispatch_failed",
      createServiceLogMetadata(context, {
        connectionId: input.connection.id,
        errorName: error instanceof Error ? error.name : "UnknownError",
        event: input.event,
        sessionId: input.session?.id ?? null,
      }),
    );
    await auditBotWebhookDispatch(context, input, "failed", error);
  }
}

function buildSessionBotPayload(
  actionApiBaseUrl: string,
  input: {
    connection: CrmConnection;
    event: CrmBotWebhookEvent;
    intervention?: InterventionEventDetails;
    message?: CrmWhatsappMessage;
    session?: CrmWhatsappSession;
    timestamp: Date;
    triggeredBy?: "bot" | "human" | "system";
  },
) {
  if (!input.session) {
    throw new Error("CRM bot session payload requires a session.");
  }
  return buildCrmBotWebhookPayload(actionApiBaseUrl, {
    connection: input.connection,
    event: input.event,
    ...(input.intervention ? { intervention: input.intervention } : {}),
    ...(input.message ? { message: input.message } : {}),
    session: input.session,
    timestamp: input.timestamp,
    ...(input.triggeredBy ? { triggeredBy: input.triggeredBy } : {}),
  });
}

function interventionActor(context: ServiceContext) {
  if (context.actor.kind === "integration") return "bot";
  if (context.actor.kind === "system") return "system";
  return "human";
}
