import { timingSafeEqual } from "node:crypto";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@lojaveiculosv2/db";
import type {
  ExternalBotActionName,
  ExternalBotActionRecord,
  ExternalBotActionStatus,
  ExternalBotEvent,
} from "../../../domains/crm/bot/externalBotModels.js";

export type ExternalBotDb = PostgresJsDatabase<typeof schema>;
export type ExternalBotRow = Record<string, unknown>;

export function mapExternalBotCommand(
  row: ExternalBotRow,
): ExternalBotActionRecord {
  const input = (row.input ?? {}) as {
    channel?: ExternalBotActionRecord["channel"];
    command?: ExternalBotActionRecord["command"];
    failureCode?: string;
  };
  if (!input.channel) {
    throw new Error("External bot action channel binding is unavailable.");
  }
  return {
    id: String(row.id),
    channel: input.channel,
    tenantId: String(row.tenant_id),
    storeId: String(row.store_id),
    integrationId: String(
      (row.input as { integrationId?: string })?.integrationId ?? "",
    ),
    connectionId: String(row.provider_connection_id),
    threadId: String(row.thread_id),
    provider: row.provider as ExternalBotActionRecord["provider"],
    actionClass:
      row.authorization_class === "proposal_only" ? "proposal" : "effect",
    modelVersion: String(
      (row.input as { modelVersion?: string })?.modelVersion ?? "unknown",
    ),
    command: input.command!,
    expectedAttendanceRevision: Number(row.expected_attendance_revision),
    expectedRevision: Number(row.expected_revision),
    idempotencyKey: String(row.idempotency_key),
    requestDigest: String(row.request_digest),
    status: row.state as ExternalBotActionStatus,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
    ...(input.failureCode ? { failureCode: input.failureCode } : {}),
  };
}

export function mapExternalBotEvent(row: ExternalBotRow): ExternalBotEvent {
  const payload = row.payload as ExternalBotEvent["payload"];
  if (!payload.channel) {
    throw new Error("External bot event channel binding is unavailable.");
  }
  return {
    id: String(row.id),
    channel: payload.channel,
    tenantId: String(row.tenant_id),
    storeId: String(row.store_id),
    integrationId: String(row.integration_id),
    connectionId: String(row.provider_connection_id),
    threadId: String(row.thread_id),
    provider: row.provider as ExternalBotEvent["provider"],
    actionClass: row.action_class as ExternalBotEvent["actionClass"],
    modelVersion: String(row.model_version),
    type: row.event_type as ExternalBotEvent["type"],
    payload,
    grant: row.grant_token == null ? null : String(row.grant_token),
    authorizedRequestDigest: String(row.authorized_request_digest),
    grantExpiresAt: new Date(String(row.grant_expires_at)),
    occurredAt: new Date(String(row.occurred_at)),
  };
}

export function safeDigestEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
