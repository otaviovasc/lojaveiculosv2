import type { ExternalBotCommand } from "../../../domains/crm/bot/externalBotModels.js";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import {
  projectCanonicalCrmConnectionRow,
  toCanonicalRoutingConnection,
} from "../../../domains/crm/ports/crmChannelConnectionProjection.js";
import { resolveCrmConnectionRoute } from "../../../domains/crm/services/CrmRoutingService/routingResolution.js";
import type { ExternalBotRow } from "./drizzleExternalBotShared.js";

type CanonicalChannel = "instagram" | "olx_chat" | "whatsapp";

export type AuthorizedExternalBotEffect = {
  canonicalCycleId: string;
  command: Extract<
    ExternalBotCommand,
    { action: "handoff.request" | "message.send" }
  >;
  connection: CrmConnection;
  effectId: string;
  expectedRevision: number;
  idempotencyKey: string;
  integrationId: string;
  modelVersion: string;
  provider: "meta_cloud" | "olx" | "zapi";
  providerAddress: string;
  providerConnectionId: string;
  providerOperation?: { id: string; occurredAt: Date };
  requestDigest: string;
  storeId: string;
  tenantId: string;
  threadId: string;
};

export function mapAuthorizedExternalBotEffect(
  row: ExternalBotRow,
): AuthorizedExternalBotEffect | null {
  const input = readRecord(row.input);
  const commandInput = readRecord(input.command);
  const payload = readRecord(commandInput.payload);
  const action = String(row.action_type);
  const command =
    action === "message.send" && typeof payload.text === "string"
      ? ({ action, payload: { text: payload.text } } as const)
      : action === "handoff.request" && typeof payload.reason === "string"
        ? ({ action, payload: { reason: payload.reason } } as const)
        : null;
  const connection = mapConnection(row);
  const providerAddress = readString(row.provider_address);
  if (!command || !connection || !providerAddress) return null;
  const route = resolveCrmConnectionRoute({
    channel: connection.canonical!.channel,
    connection: toCanonicalRoutingConnection(connection),
    connectionId: connection.id,
    requiredCapabilities: ["outbound"],
    scope: { storeId: connection.storeId, tenantId: connection.tenantId },
  });
  if (!route.ready) return null;
  const operationId = readString(row.synchronized_provider_operation_id);
  return {
    canonicalCycleId: String(row.canonical_cycle_id),
    command,
    connection,
    effectId: String(row.id),
    expectedRevision: Number(row.expected_revision),
    idempotencyKey: String(row.idempotency_key),
    integrationId: String(input.integrationId),
    modelVersion: String(input.modelVersion),
    provider: row.provider as AuthorizedExternalBotEffect["provider"],
    providerAddress,
    providerConnectionId: String(row.provider_connection_id),
    ...(operationId
      ? {
          providerOperation: {
            id: operationId,
            occurredAt: new Date(String(row.synchronized_occurred_at)),
          },
        }
      : {}),
    requestDigest: String(row.request_digest),
    storeId: String(row.store_id),
    tenantId: String(row.tenant_id),
    threadId: String(row.thread_id),
  };
}

function mapConnection(row: ExternalBotRow): CrmConnection | null {
  const provider = setupProvider(row);
  const channel = readString(row.channel) as CanonicalChannel | null;
  if (!provider || !channel) return null;
  const metadata = readRecord(row.connection_metadata);
  const state = String(row.connection_state) as CrmConnection["status"];
  return {
    canonical: projectCanonicalCrmConnectionRow({
      broker: String(row.broker) as "composio" | "direct",
      channel,
      metadata,
      provider: row.provider as AuthorizedExternalBotEffect["provider"],
      state,
    }),
    credentialsRef: readRecord(metadata.credentialsRef),
    displayName: String(row.display_name),
    externalConnectionId: readString(row.external_connection_id),
    externalInstanceId: readString(row.external_instance_id),
    id: String(row.provider_connection_id),
    metadata,
    phone: readString(metadata.phone),
    provider,
    status: state,
    storeId: String(row.store_id) as never,
    tenantId: String(row.tenant_id) as never,
    webhookUrl: readString(row.webhook_url),
  };
}

function setupProvider(row: ExternalBotRow): CrmConnection["provider"] | null {
  if (row.provider === "zapi" && row.channel === "whatsapp") return "zapi";
  if (row.provider === "olx" && row.channel === "olx_chat") return "olx_chat";
  if (row.provider === "meta_cloud" && row.broker === "composio") {
    return row.channel === "instagram"
      ? "composio_instagram"
      : row.channel === "whatsapp"
        ? "composio_whatsapp"
        : null;
  }
  return null;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
