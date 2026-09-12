import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmScheduledMessageScope } from "../../ports/crmConversationRepository.js";
import {
  getCrmConversationRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "./serviceSupport.js";
import { CRM_SCHEDULED_MESSAGE_LEASE_MS } from "../../messaging/crmScheduledMessageScheduling.js";
import { processDueMessages } from "../../messaging/crmScheduledMessageProcessorLoop.js";
import { listEnabledSpecialDateConfigSnapshotsForAllScopes } from "../../messaging/crmScheduledMessageReadiness.js";

const processPermission = "crm.scheduled_messages.process";

export type ProcessDueCrmScheduledMessagesInput = {
  dueAt?: Date;
  limit?: number;
};

export type ListDueCrmScheduledMessageScopesInput = {
  dueAt?: Date;
  limit?: number;
};

export type ProcessDueCrmScheduledMessagesResult = {
  failed: number;
  processed: number;
  sent: number;
};

export async function listDueCrmScheduledMessageScopes(
  context: ServiceContext,
  input: ListDueCrmScheduledMessageScopesInput,
  ports: CrmServicePorts,
): Promise<readonly CrmScheduledMessageScope[]> {
  assertPermission(context, processPermission);
  const dueAt = input.dueAt ?? new Date();
  const limit = input.limit ?? 100;
  const now = new Date();
  const specialDateConfigs =
    await listEnabledSpecialDateConfigSnapshotsForAllScopes(ports);
  logCrmServiceEvent(context, "crm.scheduled_message.scopes_due.started", {
    dueAt: dueAt.toISOString(),
    limit,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.scheduled_message.scopes_due",
      category: "data_access",
      metadata: { dueAt: dueAt.toISOString(), limit },
      permission: processPermission,
      summary: "Listed CRM WhatsApp scheduled message due scopes",
    },
    () =>
      getCrmConversationRepository(ports).findDueScheduledMessageScopes({
        dueAt,
        limit,
        now,
        ...(specialDateConfigs ? { specialDateConfigs } : {}),
        staleBefore: new Date(now.getTime() - CRM_SCHEDULED_MESSAGE_LEASE_MS),
      }),
  );
}

export async function processDueCrmScheduledMessages(
  context: ServiceContext,
  input: ProcessDueCrmScheduledMessagesInput,
  ports: CrmServicePorts,
): Promise<ProcessDueCrmScheduledMessagesResult> {
  assertPermission(context, processPermission);
  assertPermission(context, "crm.messages.send");
  const scope = requireCrmMessagingScope(context);
  const dueAt = input.dueAt ?? new Date();
  const limit = input.limit ?? 25;
  logCrmServiceEvent(context, "crm.scheduled_messages.process_due.started", {
    dueAt: dueAt.toISOString(),
    limit,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.scheduled_messages.process_due",
      category: "data_change",
      metadata: { dueAt: dueAt.toISOString(), limit },
      permission: processPermission,
      summary: "Processed due CRM WhatsApp scheduled messages",
    },
    () => processDueMessages(context, { dueAt, limit, scope }, ports),
  );
}
