import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmScheduledMessage } from "../../ports/crmConversationRepository.js";
import {
  CrmMessageActionError,
  CrmScheduledMessageNotFoundError,
} from "../../messaging/crmMessagingErrors.js";
import {
  getCrmConversationRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { resolveScopedConversationCycle } from "./conversationCycleMutationSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "./serviceSupport.js";

const createPermission = "crm.scheduled_messages.create";
const cancelPermission = "crm.scheduled_messages.cancel";

export type CancelCrmScheduledMessageInput = {
  scheduledMessageId: string;
};

export type UpdateCrmScheduledMessageInput = {
  content?: string;
  scheduledAt?: Date;
  scheduledMessageId: string;
};

export async function updateCrmScheduledMessage(
  context: ServiceContext,
  input: UpdateCrmScheduledMessageInput,
  ports: CrmServicePorts,
): Promise<CrmScheduledMessage> {
  assertPermission(context, createPermission);
  const content = input.content?.trim();
  if (input.content !== undefined && !content) {
    throw new CrmMessageActionError("Message content is required.");
  }
  if (input.scheduledAt && input.scheduledAt <= new Date()) {
    throw new CrmMessageActionError(
      "Scheduled message time must be in the future.",
    );
  }
  const scope = requireCrmMessagingScope(context);
  logCrmServiceEvent(context, "crm.scheduled_messages.update.started", {
    scheduledMessageId: input.scheduledMessageId,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.scheduled_messages.update",
      category: "data_change",
      entityId: input.scheduledMessageId,
      entityType: "crm_scheduled_message",
      metadata: {
        ...(content !== undefined ? { contentLength: content.length } : {}),
        ...(input.scheduledAt
          ? { scheduledAt: input.scheduledAt.toISOString() }
          : {}),
      },
      permission: createPermission,
      summary: "Updated CRM WhatsApp scheduled message",
    },
    async () => {
      const scheduled = await findScopedScheduledMessage(
        context,
        input.scheduledMessageId,
        scope,
        ports,
      );
      if (scheduled.status !== "pending") {
        throw new CrmMessageActionError(
          "Only pending scheduled messages can be updated.",
          409,
        );
      }
      const updated = await getCrmConversationRepository(
        ports,
      ).updateScheduledMessage({
        ...(content !== undefined ? { content } : {}),
        expectedStatus: "pending",
        id: input.scheduledMessageId,
        ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
        status: "pending",
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

export async function cancelCrmScheduledMessage(
  context: ServiceContext,
  input: CancelCrmScheduledMessageInput,
  ports: CrmServicePorts,
): Promise<CrmScheduledMessage> {
  assertPermission(context, cancelPermission);
  const scope = requireCrmMessagingScope(context);
  logCrmServiceEvent(context, "crm.scheduled_messages.cancel.started", {
    scheduledMessageId: input.scheduledMessageId,
  });
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
      await findScopedScheduledMessage(
        context,
        input.scheduledMessageId,
        scope,
        ports,
      );
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

async function findScopedScheduledMessage(
  context: ServiceContext,
  scheduledMessageId: string,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
) {
  const [scheduled] = await getCrmConversationRepository(
    ports,
  ).listScheduledMessages({
    limit: 1,
    scheduledMessageId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!scheduled) {
    throw new CrmScheduledMessageNotFoundError(scheduledMessageId);
  }
  const { conversationCycle } = await resolveScopedConversationCycle(
    context,
    { cycleId: scheduled.cycleId },
    ports,
  );
  if (!conversationCycle) {
    throw new CrmScheduledMessageNotFoundError(scheduledMessageId);
  }
  return scheduled;
}
