import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConnectionRepository,
  getCrmWhatsappMediaStorage,
  getCrmRealtimePublisher,
  getCrmRepository,
  getCrmWhatsappRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type { CrmLead } from "../../ports/crmRepository.js";
import { parseZapiInboundMessage } from "../../whatsapp/parseZapiInboundMessage.js";
import { findOrCreateWhatsappLead } from "../../whatsapp/whatsappLeadLinking.js";
import { mirrorZapiWhatsappMedia } from "../../whatsapp/mirrorZapiWhatsappMedia.js";
import type {
  WhatsappMessage,
  WhatsappSession,
} from "../../whatsapp/whatsappModels.js";
import {
  toWhatsappMessage,
  toWhatsappSession,
} from "../../whatsapp/whatsappModels.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
  type WhatsappServiceAuditInput,
} from "./serviceSupport.js";

const permission = "crm.whatsapp.ingest" as const;

export type IngestZapiWhatsappWebhookInput = {
  connectionId: string;
  payload: Record<string, unknown>;
};

export type IngestZapiWhatsappWebhookResult =
  | {
      eventId: string;
      status: "duplicate";
    }
  | {
      reason: "connection_not_found" | "not_processable";
      status: "ignored";
    }
  | {
      message: WhatsappMessage;
      session: WhatsappSession;
      status: "duplicate" | "stored";
    };

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

  const parsed = parseZapiInboundMessage(input.payload);
  if (!parsed) return { reason: "not_processable", status: "ignored" };
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
  const result = await recordWhatsappServiceMutation(context, auditInput, () =>
    runCrmTransaction(ports, async (transactionPorts) => {
      const lead = await findOrCreateWhatsappLead(transactionPorts, {
        buyerName: parsed.buyerName ?? null,
        buyerPhone: parsed.phone,
        connectionId: connection.id,
        direction: parsed.fromMe ? "OUTBOUND" : "INBOUND",
        externalId: parsed.externalId,
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      });
      const result = await getCrmWhatsappRepository(
        transactionPorts,
      ).ingestMessage({
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
        await createWhatsappActivity(transactionPorts, {
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
      }
      return result;
    }),
  );

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

async function createWhatsappActivity(
  ports: CrmServicePorts,
  input: {
    connectionId: string;
    content: string;
    direction: "inbound" | "outbound";
    leadId: string;
    messageExternalId: string;
    occurredAt: Date;
    sessionId: string;
    storeId: CrmLead["storeId"];
    tenantId: CrmLead["tenantId"];
  },
) {
  await getCrmRepository(ports).createActivity({
    activityType: "whatsapp",
    content: input.content,
    createdByUserId: null,
    direction: input.direction,
    leadId: input.leadId,
    metadata: {
      crmWhatsapp: {
        connectionId: input.connectionId,
        messageExternalId: input.messageExternalId,
        sessionId: input.sessionId,
      },
      provider: "zapi",
    },
    occurredAt: input.occurredAt,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
}
