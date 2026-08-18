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
    {
      action:
        | "message.send_media"
        | "message.send_template"
        | "message.send_text"
        | "handoff.request";
    }
  >;
  connection: CrmConnection;
  effectId: string;
  expectedAttendanceRevision?: number;
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
    action === "message.send_text" && typeof payload.text === "string"
      ? ({ action, payload: { text: payload.text } } as const)
      : action === "message.send_media" &&
          typeof payload.mediaType === "string" &&
          typeof payload.mediaUrl === "string"
        ? ({
            action,
            payload: {
              ...(typeof payload.caption === "string"
                ? { caption: payload.caption }
                : {}),
              mediaType: payload.mediaType,
              mediaUrl: payload.mediaUrl,
            },
          } as const)
        : action === "message.send_template" &&
            typeof payload.templateName === "string" &&
            payload.variables !== null &&
            typeof payload.variables === "object" &&
            !Array.isArray(payload.variables)
          ? ({
              action,
              payload: {
                language:
                  payload.language === "pt_BR" ? payload.language : "pt_BR",
                templateName: payload.templateName,
                variables: payload.variables as Record<string, string>,
              },
            } as const)
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
    requiredCapabilities: [
      "outbound",
      command.action === "message.send_text" ||
      command.action === "handoff.request"
        ? "text"
        : command.action === "message.send_media"
          ? "media"
          : "templates",
    ],
    scope: { storeId: connection.storeId, tenantId: connection.tenantId },
  });
  if (!route.ready) return null;
  const operationId = readString(row.synchronized_provider_operation_id);
  return {
    canonicalCycleId: String(row.canonical_cycle_id),
    command,
    connection,
    effectId: String(row.id),
    expectedAttendanceRevision: Number(row.expected_attendance_revision),
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
  const channel = readString(row.channel) as CanonicalChannel | null;
  if (!channel || !isCanonicalConnectionIdentity(row, channel)) return null;
  const metadata = readRecord(row.connection_metadata);
  const state = String(row.connection_state) as CrmConnection["status"];
  return {
    broker: String(row.broker) as "composio" | "direct",
    canonical: projectCanonicalCrmConnectionRow({
      broker: String(row.broker) as "composio" | "direct",
      channel,
      metadata,
      provider: row.provider as AuthorizedExternalBotEffect["provider"],
      state,
    }),
    channel,
    credentialsRef: readRecord(metadata.credentialsRef),
    displayName: String(row.display_name),
    externalConnectionId: readString(row.external_connection_id),
    externalInstanceId: readString(row.external_instance_id),
    id: String(row.provider_connection_id),
    metadata,
    phone: readString(metadata.phone),
    provider: row.provider as AuthorizedExternalBotEffect["provider"],
    status: state,
    storeId: String(row.store_id) as never,
    tenantId: String(row.tenant_id) as never,
    webhookUrl: readString(row.webhook_url),
  };
}

function isCanonicalConnectionIdentity(
  row: ExternalBotRow,
  channel: CanonicalChannel,
) {
  if (row.provider === "zapi")
    return channel === "whatsapp" && row.broker === "direct";
  if (row.provider === "olx")
    return channel === "olx_chat" && row.broker === "direct";
  return (
    row.provider === "meta_cloud" &&
    row.broker === "composio" &&
    (channel === "instagram" || channel === "whatsapp")
  );
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
