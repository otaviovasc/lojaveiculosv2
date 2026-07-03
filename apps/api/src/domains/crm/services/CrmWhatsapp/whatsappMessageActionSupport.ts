import type { SafeAuditMetadata } from "@lojaveiculosv2/audit";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmWhatsappMessage } from "../../ports/crmWhatsappRepository.js";
import {
  toWhatsappMessage,
  toWhatsappSession,
} from "../../whatsapp/whatsappModels.js";
import {
  WhatsappConnectionNotFoundError,
  WhatsappMessageActionError,
  WhatsappMessageNotFoundError,
  WhatsappUnsupportedProviderError,
} from "../../whatsapp/whatsappSendErrors.js";
import {
  getCrmConnectionRepository,
  getCrmRealtimePublisher,
  getCrmWhatsappRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type { WhatsappServiceAuditInput } from "./serviceSupport.js";

const permission = "crm.whatsapp.send";

export async function loadMessageActionTarget(
  context: ServiceContext,
  input: { messageId: string },
  ports: CrmServicePorts,
) {
  const scope = requireCrmScope(context);
  const repository = getCrmWhatsappRepository(ports);
  const message = await repository.findMessageById({
    messageId: input.messageId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!message) throw new WhatsappMessageNotFoundError(input.messageId);
  if (!message.externalId) {
    throw new WhatsappMessageActionError(
      "Message is not available in the WhatsApp provider yet.",
      409,
    );
  }
  const [session] = await repository.listSessions({
    limit: 1,
    offset: 0,
    sessionId: message.sessionId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!session) {
    throw new WhatsappMessageActionError(
      "Message session is not available for this action.",
    );
  }
  const connection = await getCrmConnectionRepository(ports).findConnectionById(
    message.connectionId,
  );
  if (!connection) {
    throw new WhatsappConnectionNotFoundError(message.connectionId);
  }
  if (connection.provider !== "zapi") {
    throw new WhatsappUnsupportedProviderError(connection.provider);
  }
  return {
    connection,
    message,
    phone: session.buyerPhone,
    providerMessageId: message.externalId,
    session,
  };
}

export async function updateTargetMessage(
  context: ServiceContext,
  ports: CrmServicePorts,
  target: Awaited<ReturnType<typeof loadMessageActionTarget>>,
  input: {
    action: string;
    deletedAt?: Date;
    metadata: Record<string, unknown>;
  },
) {
  const scope = requireCrmScope(context);
  const repository = getCrmWhatsappRepository(ports);
  const updated = await repository.updateMessage({
    ...(input.deletedAt ? { deletedAt: input.deletedAt } : {}),
    messageId: target.message.id,
    metadata: {
      ...input.metadata,
      messageAction: input.action,
    },
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!updated) throw new WhatsappMessageNotFoundError(target.message.id);
  const view = toWhatsappMessage(updated);
  await getCrmRealtimePublisher(ports).publish({
    connectionId: updated.connectionId,
    message: view,
    session: toWhatsappSession(target.session, target.connection),
    storeId: updated.storeId,
    tenantId: updated.tenantId,
    type: "message",
  });
  return view;
}

export function messageActionAudit(
  action: string,
  messageId: string,
  metadata: SafeAuditMetadata = {},
): WhatsappServiceAuditInput {
  return {
    action,
    category: "data_change",
    entityId: messageId,
    entityType: "crm_whatsapp_message",
    metadata,
    permission,
    summary: "Changed CRM WhatsApp message",
  };
}

export function withoutReactionMetadata(message: CrmWhatsappMessage) {
  const { reaction: _reaction, ...metadata } = message.metadata;
  return metadata;
}
