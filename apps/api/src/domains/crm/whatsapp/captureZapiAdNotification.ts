import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { ParsedZapiContactIdentity } from "./parseZapiInboundMessage.js";
import type { ZapiAdAttribution } from "./zapiAdAttribution.js";
import { enqueueCrmAttendanceExternalBotEvent } from "../bot/externalBotEventForwarding.js";
import {
  getCrmRealtimePublisher,
  getCrmConversationRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { recordCrmServiceMutation } from "../services/CrmMessagingService/serviceSupport.js";
import { applyZapiAdSessionTransition } from "./zapiAdSessionTransition.js";
import { humanAttendanceSource } from "../messaging/humanAttendanceTransition.js";
import { findOrCreateCrmMessagingLead } from "../messaging/leadLinking.js";

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
  const transition = await recordCrmServiceMutation(
    context,
    {
      action: "crm.provider.zapi.webhook.received",
      category: "data_change",
      entityId: input.connection.id,
      entityType: "crm_whatsapp_connection",
      metadata: { webhookKind: "ad_notification" },
      permission: "crm.messages.ingest",
      storeId: input.connection.storeId,
      summary: "Captured ZAPI WhatsApp ad notification context",
      tenantId: input.connection.tenantId,
    },
    () =>
      runCrmTransaction(ports, async (transactionPorts) => {
        const repository = getCrmConversationRepository(transactionPorts);
        const sessionContext = await repository.upsertConversationCycleContext({
          ...(input.identity.chatLid
            ? { customerChatId: input.identity.chatLid }
            : {}),
          ...(input.identity.customerDisplayName
            ? { customerDisplayName: input.identity.customerDisplayName }
            : {}),
          customerPhone: input.identity.phone,
          channel: "WHATSAPP",
          connectionId: input.connection.id,
          storeId: input.connection.storeId,
          tenantId: input.connection.tenantId,
        });
        const lead = await findOrCreateCrmMessagingLead(transactionPorts, {
          buyerName: input.identity.customerDisplayName ?? null,
          buyerPhone: input.identity.phone,
          channel: "WHATSAPP",
          connectionId: input.connection.id,
          direction: "INBOUND",
          externalId:
            input.attribution.adSourceId ??
            input.attribution.ctwaClid ??
            `ad-notification:${input.detectedAt.toISOString()}`,
          preferredLeadId: sessionContext.leadId,
          source: "whatsapp",
          storeId: input.connection.storeId,
          tenantId: input.connection.tenantId,
        });
        const conversationCycle =
          sessionContext.leadId === lead.id
            ? sessionContext
            : await repository.updateConversationCycle({
                leadId: lead.id,
                cycleId: sessionContext.id,
                storeId: input.connection.storeId,
                tenantId: input.connection.tenantId,
              });
        if (!conversationCycle) {
          throw new Error(
            "CRM WhatsApp ad conversationCycle was not linked to its lead.",
          );
        }
        return applyZapiAdSessionTransition(repository, {
          actorId: context.actor.id,
          actorKind: "provider",
          attribution: input.attribution,
          detectedAt: input.detectedAt,
          conversationCycle,
        });
      }),
  );
  const conversationCycle = transition.conversationCycle;
  await getCrmRealtimePublisher(ports).publish({
    connectionId: input.connection.id,
    conversationCycle,
    storeId: input.connection.storeId,
    tenantId: input.connection.tenantId,
    type: "conversationCycle",
  });
  if (transition.resumedIntervention) {
    await enqueueCrmAttendanceExternalBotEvent(
      context,
      {
        active: false,
        connection: input.connection,
        endedAt: transition.endedAt,
        attendanceChangedAt:
          transition.conversationCycle.humanAttendanceChangedAt,
        attendanceState: transition.conversationCycle.humanAttendanceState,
        attendanceStateVersion:
          transition.conversationCycle.humanAttendanceStateVersion,
        interventionId: transition.previousSession.interventionId,
        reason: "ad_initiated_conversation",
        conversationCycle: transition.conversationCycle,
        source: humanAttendanceSource(transition.previousSession),
        startedAt: transition.interventionStartedAt,
        triggeredBy: "auto",
      },
      ports,
    );
  }
  return { conversationCycle, status: "captured" as const };
}
