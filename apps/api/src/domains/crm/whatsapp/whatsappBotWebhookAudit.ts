import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { CrmBotWebhookEvent } from "../ports/crmBotWebhookDispatcher.js";
import type { CrmWhatsappSession } from "../ports/crmWhatsappRepository.js";

export async function auditBotWebhookDispatch(
  context: ServiceContext,
  input: {
    connection: CrmConnection;
    event: CrmBotWebhookEvent;
    idempotencyKey: string;
    session?: CrmWhatsappSession;
  },
  outcome: "attempted" | "failed" | "succeeded",
  error?: unknown,
) {
  await context.audit.record({
    action: "crm.whatsapp.bot.webhook.dispatch",
    actor: context.actor,
    category: "data_change",
    entityId: input.session?.id ?? input.connection.id,
    entityType: input.session
      ? "crm_whatsapp_session"
      : "crm_whatsapp_connection",
    metadata: {
      connectionId: input.connection.id,
      errorName: error instanceof Error ? error.name : null,
      event: input.event,
      idempotencyKey: input.idempotencyKey,
      sessionId: input.session?.id ?? null,
    },
    outcome,
    requestId: context.requestId,
    storeId: input.connection.storeId,
    summary: "Dispatched CRM WhatsApp bot webhook event",
    tenantId: input.connection.tenantId,
  });
}
