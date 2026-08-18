import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmWhatsappScheduledMessage,
  CrmWhatsappScheduledMessageStatus,
} from "../../ports/crmWhatsappRepository.js";
import {
  WhatsappMessageActionError,
  WhatsappScheduledMessageNotFoundError,
} from "../../whatsapp/whatsappSendErrors.js";
import {
  getCrmWhatsappRepository,
  getCrmRoutingConnectionRepository,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  findScopedWhatsappSession,
  resolveScopedWhatsappSession,
} from "./whatsappSessionMutationSupport.js";
import { resolveWhatsappQueueVisibility } from "../../whatsapp/whatsappQueueVisibility.js";

export {
  listDueWhatsappScheduledMessageScopes,
  processDueWhatsappScheduledMessages,
} from "./whatsappScheduledMessageProcessor.js";
export type {
  ListDueWhatsappScheduledMessageScopesInput,
  ProcessDueWhatsappScheduledMessagesInput,
  ProcessDueWhatsappScheduledMessagesResult,
} from "./whatsappScheduledMessageProcessor.js";

const readPermission = "crm.whatsapp.schedules.read";
const createPermission = "crm.whatsapp.schedules.create";
const cancelPermission = "crm.whatsapp.schedules.cancel";

export type CreateWhatsappScheduledMessageInput = {
  scheduledAt: Date;
  sessionId: string;
  text: string;
};

export type ListWhatsappScheduledMessagesInput = {
  connectionId?: string;
  limit?: number;
  sessionId?: string;
  status?: CrmWhatsappScheduledMessageStatus;
};

export type CancelWhatsappScheduledMessageInput = {
  scheduledMessageId: string;
};

export async function listWhatsappScheduledMessages(
  context: ServiceContext,
  input: ListWhatsappScheduledMessagesInput,
  ports: CrmServicePorts,
): Promise<readonly CrmWhatsappScheduledMessage[]> {
  assertPermission(context, readPermission);
  const scope = requireCrmWhatsappScope(context);
  if (input.sessionId) {
    await findScopedWhatsappSession(
      context,
      { sessionId: input.sessionId },
      ports,
    );
  }
  const messages = await getCrmWhatsappRepository(ports).listScheduledMessages({
    ...(input.connectionId ? { connectionId: input.connectionId } : {}),
    limit: input.limit ?? 50,
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    ...(input.status ? { status: input.status } : {}),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (resolveWhatsappQueueVisibility(context).kind === "global")
    return messages;
  const visibleSessionIds = new Set<string>();
  await Promise.all(
    [...new Set(messages.map((message) => message.sessionId))].map(
      async (sessionId) => {
        const { session } = await resolveScopedWhatsappSession(
          context,
          { sessionId },
          ports,
        );
        if (session) visibleSessionIds.add(sessionId);
      },
    ),
  );
  return messages.filter((message) => visibleSessionIds.has(message.sessionId));
}

export async function createWhatsappScheduledMessage(
  context: ServiceContext,
  input: CreateWhatsappScheduledMessageInput,
  ports: CrmServicePorts,
): Promise<CrmWhatsappScheduledMessage> {
  assertPermission(context, createPermission);
  const text = input.text.trim();
  if (!text) throw new WhatsappMessageActionError("Message text is required.");
  if (input.scheduledAt <= new Date()) {
    throw new WhatsappMessageActionError(
      "Scheduled message time must be in the future.",
    );
  }
  logWhatsappServiceEvent(context, "crm.whatsapp.schedules.create.started", {
    sessionId: input.sessionId,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.schedules.create",
      category: "data_change",
      entityId: input.sessionId,
      entityType: "crm_whatsapp_session",
      metadata: {
        scheduledAt: input.scheduledAt.toISOString(),
        textLength: text.length,
      },
      permission: createPermission,
      summary: "Scheduled CRM WhatsApp message",
    },
    async () => {
      const scope = requireCrmWhatsappScope(context);
      const { session } = await findScopedWhatsappSession(
        context,
        { sessionId: input.sessionId },
        ports,
      );
      if (session.channel !== "WHATSAPP" || !session.buyerPhone) {
        throw new WhatsappMessageActionError(
          "Scheduled messages require a WhatsApp conversation with a valid phone.",
        );
      }
      await assertSchedulingCapability(session.connectionId, scope, ports);
      return getCrmWhatsappRepository(ports).createScheduledMessage({
        connectionId: session.connectionId,
        createdByUserId: context.actor.id as never,
        phone: session.buyerPhone,
        scheduledAt: input.scheduledAt,
        sessionId: session.id,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
        text,
      });
    },
  );
}

async function assertSchedulingCapability(
  connectionId: string,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
) {
  if (!ports.crmRoutingConnectionRepository) return;
  const connection = (
    await getCrmRoutingConnectionRepository(ports).listConnections(
      scope as never,
    )
  ).find((item) => item.id === connectionId);
  if (!connection || connection.state !== "active" || !connection.connected) {
    throw new WhatsappMessageActionError(
      "The conversation connection is not ready for scheduled messages.",
    );
  }
  if (connection.capabilities.scheduling !== true) {
    throw new WhatsappMessageActionError(
      "This channel connection does not support scheduled messages.",
    );
  }
}

export async function cancelWhatsappScheduledMessage(
  context: ServiceContext,
  input: CancelWhatsappScheduledMessageInput,
  ports: CrmServicePorts,
): Promise<CrmWhatsappScheduledMessage> {
  assertPermission(context, cancelPermission);
  const scope = requireCrmWhatsappScope(context);
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.schedules.cancel",
      category: "data_change",
      entityId: input.scheduledMessageId,
      entityType: "crm_whatsapp_scheduled_message",
      permission: cancelPermission,
      summary: "Cancelled CRM WhatsApp scheduled message",
    },
    async () => {
      const [scheduled] = await getCrmWhatsappRepository(
        ports,
      ).listScheduledMessages({
        limit: 1,
        scheduledMessageId: input.scheduledMessageId,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (!scheduled) {
        throw new WhatsappScheduledMessageNotFoundError(
          input.scheduledMessageId,
        );
      }
      const { session } = await resolveScopedWhatsappSession(
        context,
        { sessionId: scheduled.sessionId },
        ports,
      );
      if (!session) {
        throw new WhatsappScheduledMessageNotFoundError(
          input.scheduledMessageId,
        );
      }
      const updated = await getCrmWhatsappRepository(
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
        throw new WhatsappScheduledMessageNotFoundError(
          input.scheduledMessageId,
        );
      }
      return updated;
    },
  );
}
