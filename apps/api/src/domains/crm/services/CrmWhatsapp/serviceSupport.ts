import type { AuditOutcome, SafeAuditMetadata } from "@lojaveiculosv2/audit";
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
import type { WhatsappSession } from "../../whatsapp/whatsappModels.js";

export type WhatsappServiceAuditInput = {
  action: string;
  category: "data_access" | "data_change";
  entityId?: string;
  entityType?: string;
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

export async function auditWhatsappServiceEvent(
  context: ServiceContext,
  input: WhatsappServiceAuditInput,
  outcome: AuditOutcome = "succeeded",
) {
  await context.audit.record({
    action: input.action,
    actor: context.actor,
    category: input.category,
    entityId: input.entityId ?? input.storeId ?? context.storeId ?? "unknown",
    entityType: input.entityType ?? "store",
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
  connectionId: string,
  ports: CrmServicePorts,
) {
  const connection =
    await getCrmConnectionRepository(ports).findConnectionById(connectionId);
  if (!connection) return null;
  return connection;
}

export async function auditZapiWebhook(
  context: ServiceContext,
  connection: CrmConnection,
  webhookType: string,
  metadata: SafeAuditMetadata = {},
) {
  logWhatsappServiceEvent(context, `crm.whatsapp.webhook.zapi.${webhookType}`, {
    connectionId: connection.id,
    ...metadata,
  });
  await auditWhatsappServiceEvent(context, {
    action: `crm.whatsapp.webhook.zapi.${webhookType}`,
    category: "data_change",
    entityId: connection.id,
    entityType: "crm_whatsapp_connection",
    metadata,
    permission: "crm.whatsapp.ingest",
    storeId: connection.storeId,
    summary: "Processed ZAPI WhatsApp webhook",
    tenantId: connection.tenantId,
  });
}

export function logWhatsappServiceEvent(
  context: ServiceContext,
  event: string,
  metadata: SafeAuditMetadata = {},
) {
  context.logger.info(event, createServiceLogMetadata(context, metadata));
}

export async function recordWhatsappServiceMutation<T>(
  context: ServiceContext,
  input: WhatsappServiceAuditInput,
  action: () => Promise<T>,
): Promise<T> {
  await auditWhatsappServiceEvent(context, input, "attempted");
  try {
    const result = await action();
    await auditWhatsappServiceEvent(context, input, "succeeded");
    return result;
  } catch (error) {
    await auditWhatsappServiceEvent(
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

export async function publishWhatsappSessionUpdate(
  ports: CrmServicePorts,
  session: WhatsappSession,
  scope: { storeId: string; tenantId: string },
) {
  await getCrmRealtimePublisher(ports).publish({
    connectionId: session.connection.id,
    session,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
    type: "session",
  });
}
