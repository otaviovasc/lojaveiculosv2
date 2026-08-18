import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import {
  ExternalBotCanonicalSyncIndeterminateError,
  loadAuthorizedExternalBotEffect,
  synchronizeExternalBotEffectOutcome,
  type AuthorizedExternalBotEffect,
} from "./drizzleExternalBotEffectRuntime.js";

describe("external bot canonical effect runtime", () => {
  it("authorizes the scoped automatic effect through canonical route facts only", async () => {
    const execute = vi.fn().mockResolvedValue([authorizedRow()]);

    const loaded = await loadAuthorizedExternalBotEffect(
      { execute } as never,
      ids.effect,
    );

    expect(loaded).toMatchObject({
      canonicalCycleId: ids.cycle,
      providerAddress: "5511999999999",
      providerConnectionId: ids.connection,
      storeId: ids.store,
      tenantId: ids.tenant,
      threadId: ids.thread,
    });
    const query = render(execute.mock.calls[0]![0] as SQL);
    expect(query).not.toContain("crm_whatsapp_sessions");
    expect(query).not.toContain("crm_whatsapp_messages");
    expect(query).toContain("inner join bot_integration_grants grant");
    expect(query).toContain("grant.state='consumed'");
    expect(query).toContain("inner join crm_channel_routing_policies routing");
    expect(query).toContain("routing.bot_mode<>'disabled'");
    expect(query).toContain("candidate.state='active'");
    expect(query).toContain("attendance.state='bot_active'");
    expect(query).toContain("command.authorization_class='automatic'");
  });

  it("fails readiness closed through the shared canonical resolver", async () => {
    const execute = vi.fn().mockResolvedValue([
      authorizedRow({
        connection_metadata: {
          capabilities: { outbound: true },
          connected: false,
        },
      }),
    ]);

    await expect(
      loadAuthorizedExternalBotEffect({ execute } as never, ids.effect),
    ).resolves.toBeNull();
  });

  it("recovers synchronized provider evidence without another provider call", async () => {
    const occurredAt = new Date("2026-08-18T12:00:00.000Z");
    const execute = vi.fn().mockResolvedValue([
      authorizedRow({
        synchronized_occurred_at: occurredAt,
        synchronized_provider_operation_id: "provider-message-1",
      }),
    ]);

    const loaded = await loadAuthorizedExternalBotEffect(
      { execute } as never,
      ids.effect,
    );

    expect(loaded?.providerOperation).toEqual({
      id: "provider-message-1",
      occurredAt,
    });
    const query = render(execute.mock.calls[0]![0] as SQL);
    expect(query).toContain("from crm_messages message");
    expect(query).toContain("external_bot_idempotency_key");
    expect(query).toContain("synchronized.provider_message_id is not null");
  });

  it("persists and verifies one directly scoped canonical outbound", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: ids.effect }])
      .mockResolvedValueOnce([]);

    await synchronizeExternalBotEffectOutcome({ execute } as never, {
      effect,
      providerOperation,
    });

    expect(execute).toHaveBeenCalledTimes(4);
    const statements = execute.mock.calls.map(([statement]) =>
      render(statement as SQL),
    );
    expect(statements.join(" ")).not.toContain("crm_whatsapp_");
    expect(statements[0]).toContain("insert into crm_messages");
    expect(statements[0]).toContain("on conflict do nothing");
    expect(statements[0]).toContain("::timestamptz");
    expect(statements[1]).toContain("update crm_messages set");
    expect(statements[2]).toContain("metadata->>'external_bot_effect_id'");
    expect(statements[2]).toContain("tenant_id=");
    expect(statements[2]).toContain("store_id=");
    expect(statements[3]).toContain("external_bot_preview_synchronized");
  });

  it("synchronizes takeover canonically and records its replay marker atomically", async () => {
    const execute = vi.fn().mockResolvedValue([{ id: ids.effect }]);

    await synchronizeExternalBotEffectOutcome({ execute } as never, {
      effect: {
        ...effect,
        command: {
          action: "handoff.request",
          payload: { reason: "Customer requested a person" },
        },
      },
    });

    expect(execute).toHaveBeenCalledTimes(2);
    const mutation = render(execute.mock.calls[0]![0] as SQL);
    const verification = render(execute.mock.calls[1]![0] as SQL);
    expect(mutation).toContain(
      "insert into crm_conversation_attendance_events",
    );
    expect(mutation).toContain(
      "on conflict (tenant_id,store_id,cycle_id,idempotency_key) do nothing",
    );
    expect(mutation).toContain(
      "state_version=synchronized_event.state_version::integer",
    );
    expect(mutation).toContain("handoff_requested_at=coalesce");
    expect(mutation).toContain("intervention_id=");
    expect(mutation).toContain("canonicalhandoffsynchronized");
    expect(verification).toContain(
      "inner join crm_conversation_attendance_events event",
    );
    expect(verification).toContain("attendance.state='handoff_requested'");
    expect(`${mutation} ${verification}`).not.toContain("crm_whatsapp_");
  });

  it("reports an indeterminate result when canonical evidence is not exact", async () => {
    const execute = vi.fn().mockResolvedValue([]);

    await expect(
      synchronizeExternalBotEffectOutcome({ execute } as never, {
        effect,
        providerOperation,
      }),
    ).rejects.toBeInstanceOf(ExternalBotCanonicalSyncIndeterminateError);
  });
});

const ids = {
  connection: "00000000-0000-4000-8000-000000000003",
  cycle: "00000000-0000-4000-8000-000000000006",
  effect: "00000000-0000-4000-8000-000000000001",
  integration: "00000000-0000-4000-8000-000000000002",
  store: "00000000-0000-4000-8000-000000000004",
  tenant: "00000000-0000-4000-8000-000000000007",
  thread: "00000000-0000-4000-8000-000000000008",
};

function authorizedRow(overrides: Record<string, unknown> = {}) {
  return {
    action_type: "message.send",
    broker: "direct",
    canonical_cycle_id: ids.cycle,
    channel: "whatsapp",
    connection_metadata: {
      capabilities: { inbound: true, outbound: true },
      connected: true,
      credentialsRef: { env: { instanceId: "ZAPI_INSTANCE_ID" } },
    },
    connection_state: "active",
    display_name: "Canonical Z-API",
    expected_revision: 3,
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

const effect = {
  ...authorizedRow(),
  canonicalCycleId: ids.cycle,
  command: { action: "message.send", payload: { text: "Hello" } },
  connection: {
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
    credentialsRef: {},
    displayName: "Canonical Z-API",
    externalConnectionId: null,
    externalInstanceId: null,
    id: ids.connection,
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "active",
    storeId: ids.store as never,
    tenantId: ids.tenant as never,
    webhookUrl: null,
  },
  effectId: ids.effect,
  expectedRevision: 3,
  idempotencyKey: "bot-effect-key",
  integrationId: ids.integration,
  modelVersion: "v1",
  provider: "zapi",
  providerAddress: "5511999999999",
  providerConnectionId: ids.connection,
  requestDigest: "request-digest-1",
  storeId: ids.store,
  tenantId: ids.tenant,
  threadId: ids.thread,
} satisfies AuthorizedExternalBotEffect;

const providerOperation = {
  id: "provider-message-1",
  occurredAt: new Date("2026-08-18T12:00:00.000Z"),
};

function render(statement: SQL) {
  return new PgDialect()
    .sqlToQuery(statement)
    .sql.toLowerCase()
    .replaceAll(/\s+/g, " ");
}
