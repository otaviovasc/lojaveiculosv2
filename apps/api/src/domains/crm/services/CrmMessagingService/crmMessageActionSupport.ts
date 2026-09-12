import type { SafeAuditMetadata } from "@lojaveiculosv2/audit";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmMessage } from "../../ports/crmConversationRepository.js";
import {
  CrmMessageActionError,
  CrmMessageDtoNotFoundError,
} from "../../messaging/crmMessagingErrors.js";
import {
  getCrmRealtimePublisher,
  getCrmConversationRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type { CrmServiceAuditInput } from "./serviceSupport.js";
import { resolveScopedConversationCycle } from "./conversationCycleMutationSupport.js";
import { resolveCrmProviderOperation } from "../CrmRoutingService/resolveCrmProviderOperation.js";
import type { CrmRoutingCapability } from "../CrmRoutingService/routingReadModels.js";

const permission = "crm.messages.send";

export async function loadMessageActionTarget(
  context: ServiceContext,
  input: { messageId: string },
  ports: CrmServicePorts,
  requiredCapability: Extract<CrmRoutingCapability, "delete" | "reactions">,
) {
  const scope = requireCrmMessagingScope(context);
  const repository = getCrmConversationRepository(ports);
  const message = await repository.findMessageById({
    messageId: input.messageId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!message) throw new CrmMessageDtoNotFoundError(input.messageId);
  if (!message.externalId) {
    throw new CrmMessageActionError(
      "Message is not available in the WhatsApp provider yet.",
      409,
    );
  }
  const { conversationCycle } = await resolveScopedConversationCycle(
    context,
    { cycleId: message.cycleId },
    ports,
  );
  if (!conversationCycle) {
    throw new CrmMessageDtoNotFoundError(input.messageId);
  }
  if (message.connectionId !== conversationCycle.connectionId) {
    throw new CrmMessageActionError(
      "Message connection does not match its bound conversation route.",
      409,
    );
  }
  const connection = await resolveCrmProviderOperation({
    channel: "whatsapp",
    connectionId: conversationCycle.connectionId,
    ports,
    requiredCapabilities: [requiredCapability],
    scope: {
      storeId: scope.storeId,
      tenantId: scope.tenantId,
    },
  });
  return {
    connection,
    message,
    phone: conversationCycle.customerPhone,
    providerMessageId: message.externalId,
    conversationCycle,
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
  const scope = requireCrmMessagingScope(context);
  const repository = getCrmConversationRepository(ports);
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
  if (!updated) throw new CrmMessageDtoNotFoundError(target.message.id);
  const view = updated;
  await getCrmRealtimePublisher(ports).publish({
    connectionId: updated.connectionId,
    message: view,
    conversationCycle: target.conversationCycle,
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
): CrmServiceAuditInput {
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

export function withoutReactionMetadata(message: CrmMessage) {
  const { reaction: _reaction, ...metadata } = message.metadata;
  return metadata;
}
