import { createHash } from "node:crypto";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  CrmMessage,
  CrmMessageSenderType,
} from "../ports/crmConversationRepository.js";
import {
  getCrmRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import type { PreparedOutboundCrmMessage } from "./outboundMessageTypes.js";
import {
  CrmMessageActionError,
  CrmOutboundReconciliationPendingError,
} from "./crmMessagingErrors.js";

const terminalLeadStatuses = new Set(["archived", "lost", "won"]);

export function outboundIdempotencyConflictError() {
  return new CrmMessageActionError(
    "CRM WhatsApp idempotency key was reused with different input.",
    409,
  );
}

export function outboundReconciliationPendingError() {
  return new CrmOutboundReconciliationPendingError();
}

export function requireOutboundIdempotencyKey(value: string) {
  const key = value.trim();
  if (!key || key.length > 191)
    throw new Error("A valid idempotency key is required.");
  return key;
}

export function resolveOutboundClientRequestId(
  context: ServiceContext,
  idempotencyKey: string | undefined,
  fingerprint: string,
) {
  return requireOutboundIdempotencyKey(
    idempotencyKey ??
      `${context.correlationId ?? context.requestId}:${fingerprint}`,
  );
}

export function withOutboundClientRequestId(
  metadata: Record<string, unknown>,
  clientRequestId: string,
): Record<string, unknown> {
  const crmMessaging = readRecord(metadata.crmMessaging);
  return {
    ...metadata,
    crmMessaging: {
      ...crmMessaging,
      clientRequestId,
    },
  };
}

export function readOutboundClientRequestId(
  message: Pick<CrmMessage, "direction" | "metadata" | "senderOrigin">,
): string | null {
  if (
    message.direction !== "OUTBOUND" ||
    !["external_bot", "human_crm", "system"].includes(message.senderOrigin)
  ) {
    return null;
  }
  const value = readRecord(message.metadata.crmMessaging).clientRequestId;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= 191 ? normalized : null;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function fingerprintOutboundIntent(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function writePreparedOutboundResult(value: PreparedOutboundCrmMessage) {
  return {
    ...value,
    sent: {
      ...value.sent,
      providerTimestamp: value.sent.providerTimestamp.toISOString(),
    },
  };
}

export function readPreparedOutboundResult(
  value: Record<string, unknown> | null,
): PreparedOutboundCrmMessage {
  if (!value || !value.sent || typeof value.sent !== "object") {
    throw new Error("Outbound provider receipt is unavailable.");
  }
  const sent = value.sent as Record<string, unknown>;
  if (
    typeof sent.externalId !== "string" ||
    typeof sent.providerTimestamp !== "string"
  ) {
    throw new Error("Outbound provider receipt is invalid.");
  }
  return {
    ...(value as Omit<PreparedOutboundCrmMessage, "sent">),
    sent: {
      externalId: sent.externalId,
      providerTimestamp: new Date(sent.providerTimestamp),
    },
  };
}

export function defaultOutboundSenderType(
  context: ServiceContext,
): CrmMessageSenderType {
  if (context.actor.kind === "integration") return "AI";
  if (context.actor.kind === "system") return "SYSTEM";
  return "HUMAN";
}

export async function recordOutboundLeadInteraction(
  context: ServiceContext,
  input: {
    content: string;
    leadId: string;
    messageExternalId: string;
    occurredAt: Date;
    provider: string;
    cycleId: string;
  },
  ports: CrmServicePorts,
) {
  const scope = requireCrmScope(context);
  const repository = getCrmRepository(ports);
  const lead = await repository.findLeadById({
    leadId: input.leadId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!lead) return;
  if (!terminalLeadStatuses.has(lead.status) && lead.status === "new") {
    await repository.updateLead({
      leadId: lead.id,
      status: "contacted",
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
  }
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
}
