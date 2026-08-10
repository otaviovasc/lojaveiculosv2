import { createHash } from "node:crypto";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmWhatsappMessageSenderType } from "../ports/crmWhatsappRepository.js";
import {
  getCrmRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import type { PreparedOutboundWhatsappMessage } from "./sendWhatsappOutboundTypes.js";
import { WhatsappMessageActionError } from "./whatsappSendErrors.js";

const terminalLeadStatuses = new Set(["archived", "lost", "won"]);

export function outboundIdempotencyConflictError() {
  return new WhatsappMessageActionError(
    "CRM WhatsApp idempotency key was reused with different input.",
    409,
  );
}

export function outboundReconciliationPendingError() {
  return new WhatsappMessageActionError(
    "CRM WhatsApp delivery outcome is pending reconciliation.",
    409,
  );
}

export function requireOutboundIdempotencyKey(value: string) {
  const key = value.trim();
  if (!key || key.length > 191)
    throw new Error("A valid idempotency key is required.");
  return key;
}

export function fingerprintOutboundIntent(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function writePreparedOutboundResult(
  value: PreparedOutboundWhatsappMessage,
) {
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
): PreparedOutboundWhatsappMessage {
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
    ...(value as Omit<PreparedOutboundWhatsappMessage, "sent">),
    sent: {
      externalId: sent.externalId,
      providerTimestamp: new Date(sent.providerTimestamp),
    },
  };
}

export function defaultOutboundSenderType(
  context: ServiceContext,
): CrmWhatsappMessageSenderType {
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
    sessionId: string;
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
      provider: input.provider,
    },
    occurredAt: input.occurredAt,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
}
