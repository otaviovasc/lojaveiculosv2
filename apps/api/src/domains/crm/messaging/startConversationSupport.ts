import { randomUUID } from "node:crypto";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmLead } from "../ports/crmRepository.js";
import type { CrmConnectionProvider } from "../ports/crmConnectionRepository.js";
import type {
  CrmMessage,
  CrmConversationCycle,
} from "../ports/crmConversationRepository.js";
import { whatsappPhoneDigits } from "../whatsapp/whatsappPhone.js";
import { CrmMessageActionError } from "./crmMessagingErrors.js";
import { findOrCreateCrmMessagingLead } from "./leadLinking.js";
import {
  getCrmRealtimePublisher,
  getCrmRepository,
  getCrmConversationRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";

export function normalizeWhatsappPhone(value: string) {
  const digits = whatsappPhoneDigits(value);
  const phone =
    digits.length >= 10 && digits.length <= 11 && !digits.startsWith("55")
      ? `55${digits}`
      : digits;
  if (!/^\d{10,15}$/.test(phone)) {
    throw new CrmMessageActionError(
      "WhatsApp phone must include a valid area code and number.",
      400,
    );
  }
  return phone;
}

export function createLocalCrmMessageExternalId() {
  return `local-start-${randomUUID()}`;
}

export async function markStartedConversationMessageFailed(
  context: ServiceContext,
  ports: CrmServicePorts,
  input: {
    connectionProvider: string;
    error: unknown;
    messageId: string;
    pendingExternalId: string;
  },
) {
  await updateStartedConversationMessage(context, ports, {
    messageId: input.messageId,
    metadata: failedMessageMetadata({
      errorName:
        input.error instanceof Error ? input.error.name : "UnknownError",
      pendingExternalId: input.pendingExternalId,
      provider: input.connectionProvider,
      sentByActorId: context.actor.id,
    }),
    status: "FAILED",
  }).catch((updateError) => {
    context.logger.warn("crm.conversation.start.failed_mark_failed", {
      errorName:
        updateError instanceof Error ? updateError.name : "UnknownError",
      messageId: input.messageId,
      requestId: context.requestId,
    });
  });
}

export async function findOrCreateLead(
  context: ServiceContext,
  ports: CrmServicePorts,
  input: {
    customerDisplayName?: string;
    connectionId: string;
    externalId: string;
    phone: string;
  },
) {
  const scope = requireCrmScope(context);
  return findOrCreateCrmMessagingLead(ports, {
    buyerName: input.customerDisplayName ?? null,
    buyerPhone: input.phone,
    channel: "WHATSAPP",
    connectionId: input.connectionId,
    direction: "OUTBOUND",
    externalId: input.externalId,
    source: "whatsapp",
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
}

export async function updateStartedConversationMessage(
  context: ServiceContext,
  ports: CrmServicePorts,
  input: {
    externalId?: string;
    messageId: string;
    metadata: Record<string, unknown>;
    providerTimestamp?: Date;
    status: "FAILED" | "SENT";
  },
) {
  const scope = requireCrmScope(context);
  const message = await getCrmConversationRepository(ports).updateMessage({
    ...(input.externalId ? { externalId: input.externalId } : {}),
    metadata: input.metadata,
    messageId: input.messageId,
    ...(input.providerTimestamp
      ? { providerTimestamp: input.providerTimestamp }
      : {}),
    status: input.status,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!message) {
    throw new Error("CRM WhatsApp message could not be updated.");
  }
  return message;
}

export async function recordLeadInteraction(
  context: ServiceContext,
  ports: CrmServicePorts,
  input: {
    content: string;
    lead: CrmLead;
    messageExternalId: string;
    occurredAt: Date;
    provider: CrmConnectionProvider;
    cycleId: string;
  },
) {
  const scope = requireCrmScope(context);
  const repository = getCrmRepository(ports);
  const lead =
    input.lead.status === "new"
      ? await repository.updateLead({
          leadId: input.lead.id,
          status: "contacted",
          storeId: scope.storeId as never,
          tenantId: scope.tenantId as never,
        })
      : input.lead;
  await repository.createActivity({
    activityType: "message",
    content: input.content,
    createdByUserId:
      context.actor.kind === "user" ? (context.actor.id as never) : null,
    direction: "outbound",
    leadId: lead.id,
    metadata: {
      crmMessaging: {
        messageExternalId: input.messageExternalId,
        cycleId: input.cycleId,
      },
      provider: input.provider,
    },
    occurredAt: input.occurredAt,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  return lead;
}

export async function findConversationSession(
  context: ServiceContext,
  ports: CrmServicePorts,
  cycleId: string,
) {
  const scope = requireCrmScope(context);
  const [conversationCycle] = await getCrmConversationRepository(
    ports,
  ).listConversationCycles({
    limit: 1,
    offset: 0,
    cycleId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!conversationCycle) {
    throw new Error("CRM WhatsApp conversationCycle could not be loaded.");
  }
  return conversationCycle;
}

export async function publishConversation(
  ports: CrmServicePorts,
  input: {
    connectionId: string;
    message: CrmMessage;
    conversationCycle: CrmConversationCycle;
    storeId: string;
    tenantId: string;
  },
) {
  await getCrmRealtimePublisher(ports).publish({
    connectionId: input.connectionId,
    message: input.message,
    conversationCycle: input.conversationCycle,
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
    type: "message",
  });
  await getCrmRealtimePublisher(ports).publish({
    connectionId: input.connectionId,
    conversationCycle: input.conversationCycle,
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
    type: "conversationCycle",
  });
}

export function sentMessageMetadata(input: {
  pendingExternalId: string;
  provider: string;
  sentByActorId: string;
}) {
  return {
    pendingExternalId: input.pendingExternalId,
    provider: input.provider,
    sentByActorId: input.sentByActorId,
    sendState: "SENT",
  };
}

export function failedMessageMetadata(input: {
  errorName: string;
  pendingExternalId: string;
  provider: string;
  sentByActorId: string;
}) {
  return {
    errorName: input.errorName,
    pendingExternalId: input.pendingExternalId,
    provider: input.provider,
    sentByActorId: input.sentByActorId,
    sendState: "FAILED",
  };
}
