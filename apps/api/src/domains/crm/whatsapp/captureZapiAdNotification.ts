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
import { humanAttendanceSource } from "./humanAttendanceTransition.js";
import { findOrCreateWhatsappLead } from "./whatsappLeadLinking.js";

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
        const sessionContext = await repository.upsertSessionContext({
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
        const lead = await findOrCreateWhatsappLead(transactionPorts, {
          buyerName: input.identity.buyerName ?? null,
          buyerPhone: input.identity.phone,
          connectionId: input.connection.id,
          direction: "INBOUND",
          externalId:
            input.attribution.adSourceId ??
            input.attribution.ctwaClid ??
            `ad-notification:${input.detectedAt.toISOString()}`,
          preferredLeadId: sessionContext.leadId,
          storeId: input.connection.storeId,
          tenantId: input.connection.tenantId,
        });
        const session =
          sessionContext.leadId === lead.id
            ? sessionContext
            : await repository.updateSession({
                leadId: lead.id,
                sessionId: sessionContext.id,
                storeId: input.connection.storeId,
                tenantId: input.connection.tenantId,
              });
        if (!session) {
          throw new Error(
            "CRM WhatsApp ad session was not linked to its lead.",
          );
        }
        return applyZapiAdSessionTransition(repository, {
          actorId: context.actor.id,
          actorKind: "provider",
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
        attendanceChangedAt: transition.session.humanAttendanceChangedAt,
        attendanceState: transition.session.humanAttendanceState,
        attendanceStateVersion: transition.session.humanAttendanceStateVersion,
        interventionId: transition.previousSession.interventionId,
        reason: "ad_initiated_conversation",
        session: transition.session,
        source: humanAttendanceSource(transition.previousSession),
        startedAt: transition.interventionStartedAt,
        triggeredBy: "auto",
      },
      ports,
    );
  }
  return { session, status: "captured" as const };
}
