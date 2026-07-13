import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConnectionRepository,
  getCrmWhatsappMediaStorage,
  getCrmRealtimePublisher,
  getCrmWhatsappRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  parseZapiContactIdentity,
  parseZapiInboundMessage,
} from "../../whatsapp/parseZapiInboundMessage.js";
import {
  isZapiNotificationPayload,
  parseZapiAdAttribution,
} from "../../whatsapp/zapiAdAttribution.js";
import { mirrorZapiWhatsappMedia } from "../../whatsapp/mirrorZapiWhatsappMedia.js";
import {
  forwardWhatsappMessageToBot,
  notifyWhatsappInterventionChangedToBot,
} from "../../whatsapp/whatsappBotWebhookForwarding.js";
import {
  toWhatsappMessage,
  toWhatsappSession,
} from "../../whatsapp/whatsappModels.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
  type WhatsappServiceAuditInput,
} from "./serviceSupport.js";
import { trackWhatsappCampaignReply } from "./whatsappCampaignReplyTracking.js";
import { captureZapiAdNotification } from "../../whatsapp/captureZapiAdNotification.js";
import { createWhatsappMessageActivity } from "../../whatsapp/createWhatsappMessageActivity.js";
import type {
  IngestZapiWhatsappWebhookInput,
  IngestZapiWhatsappWebhookResult,
} from "../../whatsapp/ingestZapiWhatsappWebhookTypes.js";
import { resolveZapiWhatsappLead } from "../../whatsapp/resolveZapiWhatsappLead.js";
import {
  applyZapiAdSessionTransition,
  unchangedZapiAdSession,
} from "../../whatsapp/zapiAdSessionTransition.js";

const permission = "crm.whatsapp.ingest" as const;
export type {
  IngestZapiWhatsappWebhookInput,
  IngestZapiWhatsappWebhookResult,
} from "../../whatsapp/ingestZapiWhatsappWebhookTypes.js";

export async function ingestZapiWhatsappWebhook(
  context: ServiceContext,
  input: IngestZapiWhatsappWebhookInput,
  ports: CrmServicePorts,
): Promise<IngestZapiWhatsappWebhookResult> {
  assertPermission(context, permission);
  logWhatsappServiceEvent(context, "crm.whatsapp.webhook.zapi.received", {
    connectionId: input.connectionId,
  });
  const connection = await getCrmConnectionRepository(ports).findConnectionById(
    input.connectionId,
  );
  if (!connection) return { reason: "connection_not_found", status: "ignored" };

  const detectedAt = new Date();
  const notification = isZapiNotificationPayload(input.payload);
  const attribution = parseZapiAdAttribution(input.payload, {
    detectedAt,
    notification,
  });
  const parsed = parseZapiInboundMessage(input.payload);
  if (!parsed) {
    const identity = parseZapiContactIdentity(input.payload);
    if (notification && attribution && identity && !identity.fromMe) {
      return captureZapiAdNotification(
        context,
        { attribution, connection, detectedAt, identity },
        ports,
      );
    }
    return { reason: "not_processable", status: "ignored" };
  }
  const media = await mirrorZapiWhatsappMedia({
    connectionId: connection.id,
    externalId: parsed.externalId,
    ...(parsed.mediaType ? { mediaType: parsed.mediaType } : {}),
    ...(parsed.mediaUrl ? { mediaUrl: parsed.mediaUrl } : {}),
    metadata: parsed.metadata,
    storage: getCrmWhatsappMediaStorage(ports),
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  const auditInput: WhatsappServiceAuditInput = {
    action: "crm.whatsapp.webhook.zapi.received",
    category: "data_change" as const,
    entityId: connection.id,
    entityType: "crm_whatsapp_connection",
    metadata: { externalId: parsed.externalId },
    permission,
    storeId: connection.storeId,
    summary: "Ingested ZAPI WhatsApp webhook",
    tenantId: connection.tenantId,
  };
  const persisted = await recordWhatsappServiceMutation(
    context,
    auditInput,
    () =>
      runCrmTransaction(ports, async (transactionPorts) => {
        const repository = getCrmWhatsappRepository(transactionPorts);
        const lead = await resolveZapiWhatsappLead(transactionPorts, {
          connection,
          message: parsed,
        });
        const result = await repository.ingestMessage({
          ...(parsed.chatLid ? { buyerChatLid: parsed.chatLid } : {}),
          ...(parsed.buyerName ? { buyerName: parsed.buyerName } : {}),
          buyerPhone: parsed.phone,
          channel: "WHATSAPP",
          connectionId: connection.id,
          content: parsed.content,
          direction: parsed.fromMe ? "OUTBOUND" : "INBOUND",
          externalId: parsed.externalId,
          firstHandledAt: parsed.fromMe ? parsed.providerTimestamp : null,
          freshLeadAt: parsed.fromMe ? null : parsed.providerTimestamp,
          leadId: lead.id,
          ...(parsed.mediaType ? { mediaType: parsed.mediaType } : {}),
          ...(media.mediaUrl ? { mediaUrl: media.mediaUrl } : {}),
          metadata: media.metadata,
          providerTimestamp: parsed.providerTimestamp,
          senderType: parsed.fromMe ? "HUMAN" : "CUSTOMER",
          status: parsed.fromMe ? "SENT" : "DELIVERED",
          storeId: connection.storeId,
          tenantId: connection.tenantId,
          type: parsed.type,
        });
        if (result.createdMessage) {
          await createWhatsappMessageActivity(transactionPorts, {
            connectionId: connection.id,
            content: parsed.content,
            direction: parsed.fromMe ? "outbound" : "inbound",
            leadId: lead.id,
            messageExternalId: parsed.externalId,
            occurredAt: parsed.providerTimestamp,
            sessionId: result.session.id,
            storeId: connection.storeId,
            tenantId: connection.tenantId,
          });
          if (!parsed.fromMe) {
            await trackWhatsappCampaignReply(
              context,
              {
                message: result.message,
                session: result.session,
              },
              transactionPorts,
            );
          }
        }
        const transition =
          attribution && !parsed.fromMe
            ? await applyZapiAdSessionTransition(repository, {
                actorId: context.actor.id,
                attribution,
                detectedAt,
                session: result.session,
              })
            : unchangedZapiAdSession(result.session);
        return {
          result: { ...result, session: transition.session },
          transition,
        };
      }),
  );

  const { result, transition } = persisted;
  const message = toWhatsappMessage(result.message);
  const session = toWhatsappSession(result.session, connection);
  if (result.createdMessage) {
    await getCrmRealtimePublisher(ports).publish({
      connectionId: connection.id,
      message,
      session,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
      type: "message",
    });
    if (transition.resumedIntervention) {
      await notifyWhatsappInterventionChangedToBot(
        context,
        {
          active: false,
          connection,
          endedAt: transition.endedAt,
          excludedMessageId: result.message.id,
          reason: "ad_initiated_conversation",
          session: result.session,
          startedAt: transition.interventionStartedAt,
          triggeredBy: "system",
        },
        ports,
      );
    }
    await forwardWhatsappMessageToBot(
      context,
      {
        connection,
        message: result.message,
        session: result.session,
      },
      ports,
    );
    if (
      parsed.fromMe &&
      result.session.status === "HUMAN_TAKEOVER" &&
      result.session.humanTakeoverAt?.getTime() ===
        parsed.providerTimestamp.getTime()
    ) {
      await notifyWhatsappInterventionChangedToBot(
        context,
        {
          active: true,
          connection,
          session: result.session,
          triggeredBy: "human",
        },
        ports,
      );
    }
  }
  await getCrmRealtimePublisher(ports).publish({
    connectionId: connection.id,
    session,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    type: "session",
  });

  return {
    message,
    session,
    status: result.createdMessage ? "stored" : "duplicate",
  };
}
