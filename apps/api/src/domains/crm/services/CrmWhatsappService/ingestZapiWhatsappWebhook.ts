import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmMediaStorage,
  getCrmRealtimePublisher,
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
import { enqueueCrmMessageExternalBotEvent } from "../../bot/externalBotEventForwarding.js";
import {
  logCrmServiceEvent,
  readZapiConnection,
  recordCrmServiceMutation,
  type CrmServiceAuditInput,
} from "../CrmMessagingService/serviceSupport.js";
import { captureZapiAdNotification } from "../../whatsapp/captureZapiAdNotification.js";
import type {
  IngestZapiWhatsappWebhookInput,
  IngestZapiWhatsappWebhookResult,
} from "../../whatsapp/ingestZapiWhatsappWebhookTypes.js";
import {
  publishZapiWhatsappAttendanceEnded,
  publishZapiWhatsappAttendanceStarted,
} from "../../whatsapp/publishZapiWhatsappAttendance.js";
import { ingestZapiProfilePhoto } from "../../whatsapp/zapiProfilePhotoIngestion.js";
import { persistZapiWhatsappWebhook } from "../../whatsapp/persistZapiWhatsappWebhook.js";

const permission = "crm.messages.ingest" as const;
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
  logCrmServiceEvent(context, "crm.provider.zapi.webhook.received", {
    connectionId: input.connectionId,
  });
  const connection = await readZapiConnection(input.connectionId, ports);
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
    remoteMediaFetcher: ports.crmMediaFetcher ?? null,
    storage: getCrmMediaStorage(ports),
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  const profilePhoto = await ingestZapiProfilePhoto(
    context,
    { connection, message: parsed },
    ports,
  );
  const auditInput: CrmServiceAuditInput = {
    action: "crm.provider.zapi.webhook.received",
    category: "data_change" as const,
    entityId: connection.id,
    entityType: "crm_whatsapp_connection",
    metadata: { externalId: parsed.externalId },
    permission,
    storeId: connection.storeId,
    summary: "Ingested ZAPI WhatsApp webhook",
    tenantId: connection.tenantId,
  };
  const persisted = await recordCrmServiceMutation(context, auditInput, () =>
    persistZapiWhatsappWebhook(
      context,
      { attribution, connection, detectedAt, media, parsed, profilePhoto },
      ports,
    ),
  );

  const { attendanceTransition, result, transition } = persisted;
  const message = result.message;
  const conversationCycle = result.conversationCycle;
  if (result.createdMessage) {
    await getCrmRealtimePublisher(ports).publish({
      connectionId: connection.id,
      message,
      conversationCycle,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
      type: "message",
    });
    await publishZapiWhatsappAttendanceEnded(
      context,
      { connection, result, transition },
      ports,
    );
    await publishZapiWhatsappAttendanceStarted(
      context,
      { attendanceTransition, connection, result },
      ports,
    );
    await enqueueCrmMessageExternalBotEvent(
      context,
      {
        connection,
        message: result.message,
        conversationCycle: result.conversationCycle,
      },
      ports,
    );
  }
  await getCrmRealtimePublisher(ports).publish({
    connectionId: connection.id,
    conversationCycle,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    type: "conversationCycle",
  });

  return {
    message,
    conversationCycle,
    status: result.createdMessage ? "stored" : "duplicate",
  };
}
