import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmWhatsappScheduledMessageScope } from "../../ports/crmWhatsappRepository.js";
import {
  getCrmWhatsappRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { sendWhatsappText } from "./sendWhatsappText.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";

const processPermission = "crm.whatsapp.schedule.process";

export type ProcessDueWhatsappScheduledMessagesInput = {
  dueAt?: Date;
  limit?: number;
};

export type ListDueWhatsappScheduledMessageScopesInput = {
  dueAt?: Date;
  limit?: number;
};

export type ProcessDueWhatsappScheduledMessagesResult = {
  failed: number;
  processed: number;
  sent: number;
};

export async function listDueWhatsappScheduledMessageScopes(
  context: ServiceContext,
  input: ListDueWhatsappScheduledMessageScopesInput,
  ports: CrmServicePorts,
): Promise<readonly CrmWhatsappScheduledMessageScope[]> {
  assertPermission(context, processPermission);
  const dueAt = input.dueAt ?? new Date();
  const limit = input.limit ?? 100;
  logWhatsappServiceEvent(context, "crm.whatsapp.schedule.scopes_due.started", {
    dueAt: dueAt.toISOString(),
    limit,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.schedule.scopes_due",
      category: "data_access",
      metadata: { dueAt: dueAt.toISOString(), limit },
      permission: processPermission,
      summary: "Listed CRM WhatsApp scheduled message due scopes",
    },
    () =>
      getCrmWhatsappRepository(ports).findDueScheduledMessageScopes({
        dueAt,
        limit,
      }),
  );
}

export async function processDueWhatsappScheduledMessages(
  context: ServiceContext,
  input: ProcessDueWhatsappScheduledMessagesInput,
  ports: CrmServicePorts,
): Promise<ProcessDueWhatsappScheduledMessagesResult> {
  assertPermission(context, processPermission);
  assertPermission(context, "crm.whatsapp.send");
  const scope = requireCrmScope(context);
  const dueAt = input.dueAt ?? new Date();
  const limit = input.limit ?? 25;
  logWhatsappServiceEvent(
    context,
    "crm.whatsapp.schedule.process_due.started",
    {
      dueAt: dueAt.toISOString(),
      limit,
    },
  );
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.schedule.process_due",
      category: "data_change",
      metadata: { dueAt: dueAt.toISOString(), limit },
      permission: processPermission,
      summary: "Processed due CRM WhatsApp scheduled messages",
    },
    () => processDueMessages(context, { dueAt, limit, scope }, ports),
  );
}

async function processDueMessages(
  context: ServiceContext,
  input: {
    dueAt: Date;
    limit: number;
    scope: { storeId: string; tenantId: string };
  },
  ports: CrmServicePorts,
) {
  const repository = getCrmWhatsappRepository(ports);
  const dueMessages = await repository.findDueScheduledMessages({
    dueAt: input.dueAt,
    limit: input.limit,
    storeId: input.scope.storeId as never,
    tenantId: input.scope.tenantId as never,
  });
  let processed = 0;
  let sent = 0;
  let failed = 0;
  for (const scheduled of dueMessages) {
    const claimed = await repository.updateScheduledMessage({
      expectedStatus: "pending",
      id: scheduled.id,
      status: "sending",
      storeId: input.scope.storeId as never,
      tenantId: input.scope.tenantId as never,
    });
    if (!claimed) continue;
    processed += 1;
    try {
      const message = await sendWhatsappText(
        context,
        { sessionId: scheduled.sessionId, text: scheduled.text },
        ports,
      );
      await repository.updateScheduledMessage({
        id: scheduled.id,
        sentAt: new Date(),
        sentMessageId: String(message.id),
        status: "sent",
        storeId: input.scope.storeId as never,
        tenantId: input.scope.tenantId as never,
      });
      sent += 1;
    } catch (error) {
      await repository.updateScheduledMessage({
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        id: scheduled.id,
        status: "failed",
        storeId: input.scope.storeId as never,
        tenantId: input.scope.tenantId as never,
      });
      failed += 1;
    }
  }
  return { failed, processed, sent };
}
