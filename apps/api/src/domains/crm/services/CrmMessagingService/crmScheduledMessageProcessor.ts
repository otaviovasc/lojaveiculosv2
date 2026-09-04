import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmScheduledMessageScope } from "../../ports/crmConversationRepository.js";
import {
  getCrmConversationRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { sendMessage } from "./sendMessage.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "./serviceSupport.js";
import {
  findProcessableCampaignForSchedule,
  recordCampaignScheduledSendResult,
} from "../../messaging/crmCampaignDeliveryMetrics.js";
import { assertCrmScheduledConnectionBinding } from "../../messaging/assertCrmScheduledConnectionBinding.js";
import { assertSchedulingRoute } from "../../messaging/assertSchedulingRoute.js";

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

async function processDueMessages(
  context: ServiceContext,
  input: {
    dueAt: Date;
    limit: number;
    scope: { storeId: string; tenantId: string };
  },
  ports: CrmServicePorts,
) {
  const repository = getCrmConversationRepository(ports);
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
    const campaignGate = await findProcessableCampaignForSchedule(
      scheduled,
      ports,
    );
    if (campaignGate?.blocked) continue;
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
      await assertSchedulingRoute(scheduled.connectionId, input.scope, ports);
      await assertCrmScheduledConnectionBinding(
        scheduled,
        input.scope,
        repository,
      );
      const message = await sendMessage(
        context,
        {
          idempotencyKey: `scheduled:${scheduled.id}`,
          senderOrigin: "system",
          senderType: "SYSTEM",
          cycleId: scheduled.cycleId,
          text: scheduled.content,
        },
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
      await recordCampaignScheduledSendResult(
        scheduled,
        {
          sentAt: new Date(),
          sentMessageId: String(message.id),
        },
        ports,
      );
      sent += 1;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await repository.updateScheduledMessage({
        errorMessage,
        id: scheduled.id,
        status: "failed",
        storeId: input.scope.storeId as never,
        tenantId: input.scope.tenantId as never,
      });
      await recordCampaignScheduledSendResult(
        scheduled,
        { errorMessage },
        ports,
      );
      failed += 1;
    }
  }
  return { failed, processed, sent };
}
