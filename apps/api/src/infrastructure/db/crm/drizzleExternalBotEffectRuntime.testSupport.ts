import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { AuthorizedExternalBotEffect } from "./drizzleExternalBotEffectRuntime.js";

export const externalBotEffectIds = {
  connection: "00000000-0000-4000-8000-000000000003",
  cycle: "00000000-0000-4000-8000-000000000006",
  effect: "00000000-0000-4000-8000-000000000001",
  integration: "00000000-0000-4000-8000-000000000002",
  store: "00000000-0000-4000-8000-000000000004",
  tenant: "00000000-0000-4000-8000-000000000007",
  thread: "00000000-0000-4000-8000-000000000008",
};

export function authorizedExternalBotEffectRow(
  overrides: Record<string, unknown> = {},
) {
  const ids = externalBotEffectIds;
  return {
    action_type: "message.send_text",
    broker: "direct",
    canonical_cycle_id: ids.cycle,
    channel: "whatsapp",
    connection_metadata: {
      capabilities: { inbound: true, outbound: true, text: true },
      connected: true,
      credentialsRef: { env: { instanceId: "ZAPI_INSTANCE_ID" } },
    },
    connection_state: "active",
    display_name: "Canonical Z-API",
    expected_revision: 3,
    effect_result: {},
    id: ids.effect,
    idempotency_key: "bot-effect-key",
    input: {
      command: { payload: { text: "Hello" } },
      integrationId: ids.integration,
      modelVersion: "v1",
    },
    provider: "zapi",
    provider_address: "5511999999999",
    provider_connection_id: ids.connection,
    request_digest: "request-digest-1",
    store_id: ids.store,
    tenant_id: ids.tenant,
    thread_id: ids.thread,
    ...overrides,
  };
}

export const externalBotEffect = {
  ...authorizedExternalBotEffectRow(),
  canonicalCycleId: externalBotEffectIds.cycle,
  command: { action: "message.send_text", payload: { text: "Hello" } },
  connection: {
    broker: "direct",
    canonical: {
      broker: "direct",
      capabilities: ["inbound", "outbound"],
      channel: "whatsapp",
      connected: true,
      degraded: false,
      errorCode: null,
      provider: "zapi",
      readiness: { ready: true, reason: null, reasonCode: "ready" },
      state: "active",
    },
    channel: "whatsapp",
    credentialsRef: {},
    displayName: "Canonical Z-API",
    externalConnectionId: null,
    externalInstanceId: null,
    id: externalBotEffectIds.connection,
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "active",
    storeId: externalBotEffectIds.store as never,
    tenantId: externalBotEffectIds.tenant as never,
    webhookUrl: null,
  },
  effectId: externalBotEffectIds.effect,
  expectedRevision: 3,
  idempotencyKey: "bot-effect-key",
  integrationId: externalBotEffectIds.integration,
  modelVersion: "v1",
  provider: "zapi",
  providerAddress: "5511999999999",
  providerConnectionId: externalBotEffectIds.connection,
  requestDigest: "request-digest-1",
  storeId: externalBotEffectIds.store,
  tenantId: externalBotEffectIds.tenant,
  threadId: externalBotEffectIds.thread,
} satisfies AuthorizedExternalBotEffect;

export const externalBotProviderOperation = {
  id: "provider-message-1",
  occurredAt: new Date("2026-08-18T12:00:00.000Z"),
};

export function renderSql(statement: SQL) {
  return new PgDialect()
    .sqlToQuery(statement)
    .sql.toLowerCase()
    .replaceAll(/\s+/g, " ");
}
