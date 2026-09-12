import type { SQL } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import {
  ExternalBotCanonicalSyncIndeterminateError,
  loadAuthorizedExternalBotEffect,
  synchronizeExternalBotEffectOutcome,
  wasExternalBotProviderAttempted,
} from "./drizzleExternalBotEffectRuntime.js";
import {
  authorizedExternalBotEffectRow as authorizedRow,
  externalBotEffect as effect,
  externalBotEffectIds as ids,
  externalBotProviderOperation as providerOperation,
  renderSql as render,
} from "./drizzleExternalBotEffectRuntime.testSupport.js";

describe("external bot canonical effect runtime", () => {
  it("keeps authorization prechecks read-only", async () => {
    const execute = vi.fn().mockResolvedValue([authorizedRow()]);

    await expect(
      loadAuthorizedExternalBotEffect({ execute } as never, ids.effect, {
        markProviderAttempt: false,
      }),
    ).resolves.toMatchObject({ effectId: ids.effect });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(render(execute.mock.calls[0]![0] as SQL)).not.toContain(
      "set provider_attempted_at=now()",
    );
  });

  it("detects a previous provider attempt without changing it", async () => {
    const execute = vi.fn().mockResolvedValue([{ id: ids.effect }]);

    await expect(
      wasExternalBotProviderAttempted({ execute } as never, ids.effect),
    ).resolves.toBe(true);

    const query = render(execute.mock.calls[0]![0] as SQL);
    expect(query).toContain("provider_attempted_at is not null");
    expect(query).not.toContain("update crm_external_bot_provider_effects");
  });

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
    const query = render(execute.mock.calls[1]![0] as SQL);
    expect(query).not.toContain("crm_whatsapp_sessions");
    expect(query).not.toContain("crm_whatsapp_messages");
    expect(query).toContain("inner join crm_external_bot_grants grant");
    expect(query).toContain("grant.state='consumed'");
    expect(query).toContain("inner join crm_channel_routing_policies routing");
    expect(query).toContain("routing.external_bot_mode<>'disabled'");
    expect(query).toContain("candidate.state='active'");
    expect(query).toContain("attendance.state='bot_active'");
    expect(query).toContain(
      "command.authorization_class in ('automatic','human_approved')",
    );
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
    expect(execute).toHaveBeenCalledTimes(3);
    expect(render(execute.mock.calls[2]![0] as SQL)).toContain(
      "set provider_attempted_at=null",
    );
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
    const query = render(execute.mock.calls[1]![0] as SQL);
    expect(query).toContain("from crm_messages message");
    expect(query).toContain("external_bot_idempotency_key");
    expect(query).toContain("synchronized.provider_message_id is not null");
  });

  it("loads a prepared durable media URL instead of the external source", async () => {
    const originalUrl = "https://provider.example/audio.mp3?expires=1";
    const publicUrl = "https://cdn.example/crm/bot/audio.mp3";
    const execute = vi.fn().mockResolvedValue([
      authorizedRow({
        action_type: "message.send_media",
        connection_metadata: {
          capabilities: { inbound: true, media: true, outbound: true },
          connected: true,
          credentialsRef: { env: { instanceId: "ZAPI_INSTANCE_ID" } },
        },
        effect_result: {
          preparedMedia: {
            contentType: "audio/mpeg",
            originalUrl,
            publicUrl,
            sizeBytes: 3,
            storageKey: "staging/crm/bot/audio.mp3",
          },
        },
        input: {
          command: { payload: { mediaType: "audio", mediaUrl: originalUrl } },
          integrationId: ids.integration,
          modelVersion: "v1",
        },
      }),
    ]);

    await expect(
      loadAuthorizedExternalBotEffect({ execute } as never, ids.effect, {
        markProviderAttempt: false,
      }),
    ).resolves.toMatchObject({
      command: { payload: { mediaType: "audio", mediaUrl: publicUrl } },
      preparedMedia: {
        originalUrl,
        publicUrl,
        storageKey: "staging/crm/bot/audio.mp3",
      },
    });

    expect(render(execute.mock.calls[0]![0] as SQL)).toContain(
      "effect.result as effect_result",
    );
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
