import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmWhatsappScheduledMessage,
  CrmWhatsappScheduledMessageStatus,
} from "../../ports/crmWhatsappRepository.js";
import {
  WhatsappMessageActionError,
  WhatsappScheduledMessageNotFoundError,
  WhatsappSessionNotFoundError,
} from "../../whatsapp/whatsappSendErrors.js";
import {
  getCrmWhatsappRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";

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
  const scope = requireCrmScope(context);
  return getCrmWhatsappRepository(ports).listScheduledMessages({
    ...(input.connectionId ? { connectionId: input.connectionId } : {}),
    limit: input.limit ?? 50,
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    ...(input.status ? { status: input.status } : {}),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
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
      const scope = requireCrmScope(context);
      const session = await findScopedSession(input.sessionId, scope, ports);
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

export async function cancelWhatsappScheduledMessage(
  context: ServiceContext,
  input: CancelWhatsappScheduledMessageInput,
  ports: CrmServicePorts,
): Promise<CrmWhatsappScheduledMessage> {
  assertPermission(context, cancelPermission);
  const scope = requireCrmScope(context);
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

async function findScopedSession(
  sessionId: string,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
) {
  const [session] = await getCrmWhatsappRepository(ports).listSessions({
    limit: 1,
    offset: 0,
    sessionId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!session) throw new WhatsappSessionNotFoundError(sessionId);
  return session;
}
