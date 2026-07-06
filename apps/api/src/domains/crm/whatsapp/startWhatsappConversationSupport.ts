import { randomUUID } from "node:crypto";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmLead } from "../ports/crmRepository.js";
import type { WhatsappMessage, WhatsappSession } from "./whatsappModels.js";
import { whatsappPhoneDigits } from "./whatsappPhone.js";
import { WhatsappMessageActionError } from "./whatsappSendErrors.js";
import { findOrCreateWhatsappLead } from "./whatsappLeadLinking.js";
import {
  getCrmRealtimePublisher,
  getCrmRepository,
  getCrmWhatsappRepository,
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
    throw new WhatsappMessageActionError(
      "WhatsApp phone must include a valid area code and number.",
      400,
    );
  }
  return phone;
}

export function createLocalWhatsappExternalId() {
  return `local-start-${randomUUID()}`;
}

export async function findOrCreateLead(
  context: ServiceContext,
  ports: CrmServicePorts,
  input: {
    buyerName?: string;
    connectionId: string;
    externalId: string;
    phone: string;
  },
) {
  const scope = requireCrmScope(context);
  return findOrCreateWhatsappLead(ports, {
    buyerName: input.buyerName ?? null,
    buyerPhone: input.phone,
    connectionId: input.connectionId,
    direction: "OUTBOUND",
    externalId: input.externalId,
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
  const message = await getCrmWhatsappRepository(ports).updateMessage({
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
    raw: unknown;
    sessionId: string;
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
    activityType: "whatsapp",
    content: input.content,
    createdByUserId:
      context.actor.kind === "user" ? (context.actor.id as never) : null,
    direction: "outbound",
    leadId: lead.id,
    metadata: {
      crmWhatsapp: {
        messageExternalId: input.messageExternalId,
        sessionId: input.sessionId,
      },
      provider: "zapi",
      raw: input.raw,
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
  sessionId: string,
) {
  const scope = requireCrmScope(context);
  const [session] = await getCrmWhatsappRepository(ports).listSessions({
    limit: 1,
    offset: 0,
    sessionId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!session) {
    throw new Error("CRM WhatsApp session could not be loaded.");
  }
  return session;
}

export async function publishConversation(
  ports: CrmServicePorts,
  input: {
    connectionId: string;
    message: WhatsappMessage;
    session: WhatsappSession;
    storeId: string;
    tenantId: string;
  },
) {
  await getCrmRealtimePublisher(ports).publish({
    connectionId: input.connectionId,
    message: input.message,
    session: input.session,
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
    type: "message",
  });
  await getCrmRealtimePublisher(ports).publish({
    connectionId: input.connectionId,
    session: input.session,
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
    type: "session",
  });
}

export function sentMessageMetadata(input: {
  pendingExternalId: string;
  provider: string;
  raw: unknown;
  sentByActorId: string;
}) {
  return {
    pendingExternalId: input.pendingExternalId,
    provider: input.provider,
    raw: input.raw,
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
