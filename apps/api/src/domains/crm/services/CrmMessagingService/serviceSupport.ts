import type {
  AuditFailureTier,
  AuditOutcome,
  SafeAuditMetadata,
} from "@lojaveiculosv2/audit";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import {
  getCrmConnectionRepository,
  getCrmRealtimePublisher,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type { CrmConversationCycle } from "../../ports/crmConversationRepository.js";

export type CrmServiceAuditInput = {
  action: string;
  auditId?: string;
  category: "data_access" | "data_change";
  entityId?: string;
  entityType?: string;
  failureTier?: AuditFailureTier;
  metadata?: SafeAuditMetadata;
  permission: PermissionKey;
  storeId?: string;
  summary: string;
  tenantId?: string;
};

export type ZapiWebhookInput = {
  connectionId: string;
  payload: Record<string, unknown>;
};

export type ZapiWebhookResult =
  | { eventId: string; status: "duplicate" }
  | { reason: string; status: "ignored" }
  | { processed?: number; status: "accepted" };

export async function auditCrmServiceEvent(
  context: ServiceContext,
  input: CrmServiceAuditInput,
  outcome: AuditOutcome = "succeeded",
) {
  await context.audit.record({
    action: input.action,
    actor: context.actor,
    category: input.category,
    entityId: input.entityId ?? input.storeId ?? context.storeId ?? "unknown",
    entityType: input.entityType ?? "store",
    ...(input.auditId ? { id: input.auditId } : {}),
    ...(input.failureTier ? { failureTier: input.failureTier } : {}),
    metadata: {
      permission: input.permission,
      ...(input.metadata ?? {}),
    },
    outcome,
    requestId: context.requestId,
    storeId: input.storeId ?? context.storeId,
    summary: input.summary,
    tenantId: input.tenantId ?? context.tenantId,
  });
}

export async function readZapiConnection(
  context: ServiceContext,
  connectionId: string,
  ports: CrmServicePorts,
) {
  const connection =
    await getCrmConnectionRepository(ports).findConnectionById(connectionId);
  if (
    !connection ||
    connection.provider !== "zapi" ||
    connection.status === "archived" ||
    !context.storeId ||
    !context.tenantId ||
    connection.storeId !== context.storeId ||
    connection.tenantId !== context.tenantId
  ) {
    return null;
  }
  return connection;
}

export async function auditZapiWebhook(
  context: ServiceContext,
  connection: CrmConnection,
  webhookType: string,
  metadata: SafeAuditMetadata = {},
) {
  logCrmServiceEvent(context, `crm.provider.zapi.webhook.${webhookType}`, {
    connectionId: connection.id,
    ...metadata,
  });
  await auditCrmServiceEvent(context, {
    action: `crm.provider.zapi.webhook.${webhookType}`,
    category: "data_change",
    entityId: connection.id,
    entityType: "crm_whatsapp_connection",
    metadata,
    permission: "crm.messages.ingest",
    storeId: connection.storeId,
    summary: "Processed ZAPI WhatsApp webhook",
    tenantId: connection.tenantId,
  });
}

export function logCrmServiceEvent(
  context: ServiceContext,
  event: string,
  metadata: SafeAuditMetadata = {},
) {
  context.logger.info(event, createServiceLogMetadata(context, metadata));
}

export async function recordCrmServiceMutation<T>(
  context: ServiceContext,
  input: CrmServiceAuditInput,
  action: () => Promise<T>,
  resultMetadata?: (result: T) => SafeAuditMetadata,
): Promise<T> {
  await auditCrmServiceEvent(context, input, "attempted");
  try {
    const result = await action();
    await auditCrmServiceEvent(
      context,
      {
        ...input,
        metadata: {
          ...(input.metadata ?? {}),
          ...(resultMetadata ? resultMetadata(result) : {}),
        },
      },
      "succeeded",
    );
    return result;
  } catch (error) {
    await auditCrmServiceEvent(
      context,
      {
        ...input,
        metadata: {
          ...(input.metadata ?? {}),
          errorName: error instanceof Error ? error.name : "UnknownError",
        },
      },
      "failed",
    );
    throw error;
  }
}

export async function publishConversationCycleUpdate(
  ports: CrmServicePorts,
  conversationCycle: CrmConversationCycle,
  scope: { storeId: string; tenantId: string },
  options: { revokedUserId?: string } = {},
) {
  await getCrmRealtimePublisher(ports).publish({
    connectionId: conversationCycle.connectionId,
    ...(options.revokedUserId
      ? { revokedUserId: options.revokedUserId as never }
      : {}),
    conversationCycle,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
    type: "conversationCycle",
  });
}
