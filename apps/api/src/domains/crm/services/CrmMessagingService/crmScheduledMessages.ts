import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmScheduledMessage,
  CrmScheduledMessageStatus,
} from "../../ports/crmConversationRepository.js";
import {
  CrmMessageActionError,
  CrmScheduledMessageNotFoundError,
} from "../../messaging/crmMessagingErrors.js";
import {
  getCrmConversationRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "./serviceSupport.js";
import {
  findScopedConversationCycle,
  resolveScopedConversationCycle,
} from "./conversationCycleMutationSupport.js";
import { resolveCrmQueueVisibility } from "../../messaging/crmQueueVisibility.js";
import { assertSchedulingRoute } from "../../messaging/assertSchedulingRoute.js";

export {
  listDueCrmScheduledMessageScopes,
  processDueCrmScheduledMessages,
} from "./crmScheduledMessageProcessor.js";
export type {
  ListDueCrmScheduledMessageScopesInput,
  ProcessDueCrmScheduledMessagesInput,
  ProcessDueCrmScheduledMessagesResult,
} from "./crmScheduledMessageProcessor.js";

const readPermission = "crm.scheduled_messages.read";
const createPermission = "crm.scheduled_messages.create";
const cancelPermission = "crm.scheduled_messages.cancel";

export type CreateCrmScheduledMessageInput = {
  scheduledAt: Date;
  cycleId: string;
  content: string;
};

export type ListCrmScheduledMessagesInput = {
  connectionId?: string;
  limit?: number;
  cycleId?: string;
  status?: CrmScheduledMessageStatus;
};

export type CancelCrmScheduledMessageInput = {
  scheduledMessageId: string;
};

export async function listCrmScheduledMessages(
  context: ServiceContext,
  input: ListCrmScheduledMessagesInput,
  ports: CrmServicePorts,
): Promise<readonly CrmScheduledMessage[]> {
  assertPermission(context, readPermission);
  const scope = requireCrmMessagingScope(context);
  if (input.cycleId) {
    await findScopedConversationCycle(
      context,
      { cycleId: input.cycleId },
      ports,
    );
  }
  const messages = await getCrmConversationRepository(
    ports,
  ).listScheduledMessages({
    ...(input.connectionId ? { connectionId: input.connectionId } : {}),
    limit: input.limit ?? 50,
    ...(input.cycleId ? { cycleId: input.cycleId } : {}),
    ...(input.status ? { status: input.status } : {}),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (resolveCrmQueueVisibility(context).kind === "global") return messages;
  const visibleSessionIds = new Set<string>();
  await Promise.all(
    [...new Set(messages.map((message) => message.cycleId))].map(
      async (cycleId) => {
        const { conversationCycle } = await resolveScopedConversationCycle(
          context,
          { cycleId },
          ports,
        );
        if (conversationCycle) visibleSessionIds.add(cycleId);
      },
    ),
  );
  return messages.filter((message) => visibleSessionIds.has(message.cycleId));
}

export async function createCrmScheduledMessage(
  context: ServiceContext,
  input: CreateCrmScheduledMessageInput,
  ports: CrmServicePorts,
): Promise<CrmScheduledMessage> {
  assertPermission(context, createPermission);
  const content = input.content.trim();
  if (!content) throw new CrmMessageActionError("Message content is required.");
  if (input.scheduledAt <= new Date()) {
    throw new CrmMessageActionError(
      "Scheduled message time must be in the future.",
    );
  }
  logCrmServiceEvent(context, "crm.scheduled_messages.create.started", {
    cycleId: input.cycleId,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.scheduled_messages.create",
      category: "data_change",
      entityId: input.cycleId,
      entityType: "crm_conversation_cycle",
      metadata: {
        scheduledAt: input.scheduledAt.toISOString(),
        contentLength: content.length,
      },
      permission: createPermission,
      summary: "Scheduled CRM WhatsApp message",
    },
    async () => {
      const scope = requireCrmMessagingScope(context);
      const { conversationCycle } = await findScopedConversationCycle(
        context,
        { cycleId: input.cycleId },
        ports,
      );
      if (
        conversationCycle.channel !== "WHATSAPP" ||
        !conversationCycle.customerPhone
      ) {
        throw new CrmMessageActionError(
          "Scheduled messages require a WhatsApp conversation with a valid phone.",
        );
      }
      await assertSchedulingRoute(conversationCycle.connectionId, scope, ports);
      return getCrmConversationRepository(ports).createScheduledMessage({
        connectionId: conversationCycle.connectionId,
        createdByUserId: context.actor.id as never,
        recipientAddress: conversationCycle.customerPhone,
        scheduledAt: input.scheduledAt,
        cycleId: conversationCycle.id,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
        content,
      });
    },
  );
}

export async function cancelCrmScheduledMessage(
  context: ServiceContext,
  input: CancelCrmScheduledMessageInput,
  ports: CrmServicePorts,
): Promise<CrmScheduledMessage> {
  assertPermission(context, cancelPermission);
  const scope = requireCrmMessagingScope(context);
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.scheduled_messages.cancel",
      category: "data_change",
      entityId: input.scheduledMessageId,
      entityType: "crm_scheduled_message",
      permission: cancelPermission,
      summary: "Cancelled CRM WhatsApp scheduled message",
    },
    async () => {
      const [scheduled] = await getCrmConversationRepository(
        ports,
      ).listScheduledMessages({
        limit: 1,
        scheduledMessageId: input.scheduledMessageId,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (!scheduled) {
        throw new CrmScheduledMessageNotFoundError(input.scheduledMessageId);
      }
      const { conversationCycle } = await resolveScopedConversationCycle(
        context,
        { cycleId: scheduled.cycleId },
        ports,
      );
      if (!conversationCycle) {
        throw new CrmScheduledMessageNotFoundError(input.scheduledMessageId);
      }
      const updated = await getCrmConversationRepository(
        ports,
      ).updateScheduledMessage({
        cancelledAt: new Date(),
        expectedStatus: "pending",
        id: input.scheduledMessageId,
        status: "cancelled",
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (!updated) {
        throw new CrmScheduledMessageNotFoundError(input.scheduledMessageId);
      }
      return updated;
    },
  );
}
