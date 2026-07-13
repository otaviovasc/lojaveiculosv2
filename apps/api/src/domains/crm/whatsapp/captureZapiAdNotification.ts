import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { ParsedZapiContactIdentity } from "./parseZapiInboundMessage.js";
import type { ZapiAdAttribution } from "./zapiAdAttribution.js";
import { notifyWhatsappInterventionChangedToBot } from "./whatsappBotWebhookForwarding.js";
import { toWhatsappSession } from "./whatsappModels.js";
import {
  getCrmRealtimePublisher,
  getCrmWhatsappRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { recordWhatsappServiceMutation } from "../services/CrmWhatsapp/serviceSupport.js";
import { applyZapiAdSessionTransition } from "./zapiAdSessionTransition.js";

export async function captureZapiAdNotification(
  context: ServiceContext,
  input: {
    attribution: ZapiAdAttribution;
    connection: CrmConnection;
    detectedAt: Date;
    identity: ParsedZapiContactIdentity;
  },
  ports: CrmServicePorts,
) {
  const transition = await recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.webhook.zapi.received",
      category: "data_change",
      entityId: input.connection.id,
      entityType: "crm_whatsapp_connection",
      metadata: { webhookKind: "ad_notification" },
      permission: "crm.whatsapp.ingest",
      storeId: input.connection.storeId,
      summary: "Captured ZAPI WhatsApp ad notification context",
      tenantId: input.connection.tenantId,
    },
    () =>
      runCrmTransaction(ports, async (transactionPorts) => {
        const repository = getCrmWhatsappRepository(transactionPorts);
        const session = await repository.upsertSessionContext({
          ...(input.identity.chatLid
            ? { buyerChatLid: input.identity.chatLid }
            : {}),
          ...(input.identity.buyerName
            ? { buyerName: input.identity.buyerName }
            : {}),
          buyerPhone: input.identity.phone,
          channel: "WHATSAPP",
          connectionId: input.connection.id,
          storeId: input.connection.storeId,
          tenantId: input.connection.tenantId,
        });
        return applyZapiAdSessionTransition(repository, {
          actorId: context.actor.id,
          attribution: input.attribution,
          detectedAt: input.detectedAt,
          session,
        });
      }),
  );
  const session = toWhatsappSession(transition.session, input.connection);
  await getCrmRealtimePublisher(ports).publish({
    connectionId: input.connection.id,
    session,
    storeId: input.connection.storeId,
    tenantId: input.connection.tenantId,
    type: "session",
  });
  if (transition.resumedIntervention) {
    await notifyWhatsappInterventionChangedToBot(
      context,
      {
        active: false,
        connection: input.connection,
        endedAt: transition.endedAt,
        reason: "ad_initiated_conversation",
        session: transition.session,
        startedAt: transition.interventionStartedAt,
        triggeredBy: "system",
      },
      ports,
    );
  }
  return { session, status: "captured" as const };
}
