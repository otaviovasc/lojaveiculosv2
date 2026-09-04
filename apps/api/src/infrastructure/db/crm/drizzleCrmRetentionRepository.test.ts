import type { SQL } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { claimDrizzleCrmRetentionAuditOutbox } from "./drizzleCrmRetentionAuditOutbox.js";
import { listDrizzleCrmRetentionCandidates } from "./drizzleCrmRetentionCandidates.js";
import { processDrizzleCrmRetentionBatch } from "./drizzleCrmRetentionBatch.js";
import { createDrizzleCrmRetentionRepository } from "./drizzleCrmRetentionRepository.js";
import {
  decodeCrmRetentionCursor,
  encodeCrmRetentionCursor,
} from "./drizzleCrmRetentionCursor.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { retentionBatchInput } from "./drizzleCrmRetentionRepository.testSupport.js";

describe("Drizzle CRM retention adapter", () => {
  it("serializes raw audit-outbox timestamps before postgres-js binds them", async () => {
    const execute = vi.fn<(statement: SQL) => Promise<unknown[]>>(async () =>
      Promise.resolve([]),
    );
    await claimDrizzleCrmRetentionAuditOutbox(
      { execute } as unknown as DrizzleCrmClient,
      {
        leaseExpiresAt: new Date("2026-08-12T15:15:00.000Z"),
        leaseOwner: "retention_worker",
        limit: 100,
        now: new Date("2026-08-12T15:00:00.000Z"),
      },
    );

    const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
    expect(query.params).not.toEqual(
      expect.arrayContaining([expect.any(Date)]),
    );
    expect(query.params).toEqual(
      expect.arrayContaining([
        "2026-08-12T15:00:00.000Z",
        "2026-08-12T15:15:00.000Z",
      ]),
    );
  });

  it("fails readiness closed for every unavailable required relation", async () => {
    const execute = vi.fn<(statement: SQL) => Promise<unknown[]>>(async () => [
      { relation: null },
    ]);
    const repository = createDrizzleCrmRetentionRepository({
      execute,
    } as unknown as DrizzleCrmClient);

    const readiness = await repository.inspectReadiness({
      storeId: "00000000-0000-4000-8000-000000000001",
      tenantId: "00000000-0000-4000-8000-000000000002",
    });
    expect(readiness.unavailableRelations).toEqual(
      expect.arrayContaining([
        "crm_external_bot_action_commands",
        "crm_messages",
        "crm_channel_connections",
        "crm_conversation_attendances",
        "crm_conversation_cycles",
        "crm_conversation_threads",
        "crm_external_bot_event_outbox",
        "crm_external_bot_proposals",
        "crm_retention_audit_outbox",
        "crm_retention_legal_holds",
        "crm_retention_scopes",
        "integration_events",
        "crm_external_bot_provider_effects",
        "provider_events",
      ]),
    );
    expect(readiness.unavailableRelations).toHaveLength(14);
    expect(execute).toHaveBeenCalledTimes(14);
  });

  it("round-trips opaque cursor state and rejects malformed cursors", () => {
    const value = {
      category: "canonical_message" as const,
      eligibleAt: new Date("2025-02-12T15:00:00.000Z"),
      resourceId: "message_1",
      resourceType: "canonical_message",
    };
    const encoded = encodeCrmRetentionCursor(value);

    expect(encoded).not.toContain("message_1");
    expect(decodeCrmRetentionCursor(encoded)).toEqual(value);
    expect(decodeCrmRetentionCursor("not-a-cursor")).toBeNull();
  });

  it("includes external bot grants, terminal payloads and proposals", async () => {
    const execute = vi.fn<(statement: SQL) => Promise<unknown[]>>(async () =>
      Promise.resolve([]),
    );
    await listDrizzleCrmRetentionCandidates(
      { execute } as unknown as DrizzleCrmClient,
      {
        botCutoff: new Date("2026-07-13T15:00:00.000Z"),
        canonicalCutoff: new Date("2025-02-12T15:00:00.000Z"),
        cursor: null,
        limit: 100,
        now: new Date("2026-08-12T15:00:00.000Z"),
        providerCutoff: new Date("2026-08-05T15:00:00.000Z"),
        storeId: "00000000-0000-4000-8000-000000000001",
        tenantId: "00000000-0000-4000-8000-000000000002",
      },
    );
    const query = new PgDialect()
      .sqlToQuery(execute.mock.calls[0]![0])
      .sql.toLowerCase();
    expect(query).toContain("'external_bot_grant'");
    expect(query).toContain("crm_external_bot_event_outbox");
    expect(query).toContain("state in ('delivered', 'dead_letter')");
    expect(query).toContain("crm_external_bot_proposals");
    expect(query).toContain("resource_type = 'external_bot_grant' then false");
  });

  it("discovers held candidates only through the scoped canonical conversation chain", async () => {
    const execute = vi.fn<(statement: SQL) => Promise<unknown[]>>(async () =>
      Promise.resolve([]),
    );
    await listDrizzleCrmRetentionCandidates(
      { execute } as unknown as DrizzleCrmClient,
      {
        botCutoff: new Date("2026-07-13T15:00:00.000Z"),
        canonicalCutoff: new Date("2025-02-12T15:00:00.000Z"),
        cursor: null,
        limit: 100,
        now: new Date("2026-08-12T15:00:00.000Z"),
        providerCutoff: new Date("2026-08-05T15:00:00.000Z"),
        storeId: "00000000-0000-4000-8000-000000000001",
        tenantId: "00000000-0000-4000-8000-000000000002",
      },
    );
    const query = new PgDialect()
      .sqlToQuery(execute.mock.calls[0]![0])
      .sql.toLowerCase();

    expect(query).toContain("from crm_messages message");
    expect(query).toContain("inner join crm_conversation_cycles cycle");
    expect(query).toContain("inner join crm_conversation_threads thread");
    expect(query).toContain(
      "inner join crm_conversation_attendances attendance",
    );
    expect(query).toContain("inner join crm_channel_connections connection");
    expect(query).toContain("cycle.thread_id = message.thread_id");
    expect(query).toContain(
      "thread.provider_connection_id = message.provider_connection_id",
    );
    expect(query).toContain("connection.provider = message.provider");
    expect(query).toContain("connection.channel = thread.channel");
    expect(query).toContain("hold.tenant_id =");
    expect(query).toContain("hold.store_id =");
    expect(query).toContain("attendance.changed_at");
    expect(query).toContain("thread.last_message_at");
    expect(query).not.toContain("crm_connections");
    expect(query).not.toContain("crm_whatsapp_sessions");
    expect(query).not.toContain("crm_whatsapp_messages");
    expect(query).not.toContain("crm_retention_legacy_coverage");
  });

  it("expires retryable sealed OLX lead receipts after seven days", async () => {
    const execute = vi.fn<(statement: SQL) => Promise<unknown[]>>(async () =>
      Promise.resolve([]),
    );
    await listDrizzleCrmRetentionCandidates(
      { execute } as unknown as DrizzleCrmClient,
      {
        botCutoff: new Date("2026-07-13T15:00:00.000Z"),
        canonicalCutoff: new Date("2025-02-12T15:00:00.000Z"),
        cursor: null,
        limit: 100,
        now: new Date("2026-08-12T15:00:00.000Z"),
        providerCutoff: new Date("2026-08-05T15:00:00.000Z"),
        storeId: "00000000-0000-4000-8000-000000000001",
        tenantId: "00000000-0000-4000-8000-000000000002",
      },
    );
    const query = new PgDialect()
      .sqlToQuery(execute.mock.calls[0]![0])
      .sql.toLowerCase();

    expect(query).toContain("'olx_lead_receipt'");
    expect(query).toContain("event.provider = 'olx_chat'");
    expect(query).toContain(
      "event.status in ('received', 'processing', 'failed')",
    );
    expect(query).toContain("interval '7 days'");
    expect(query).toContain("event.payload ? 'sealedreceipt'");
  });

  it("checks canonical readiness without consulting legacy coverage", async () => {
    const execute = vi.fn<(statement: SQL) => Promise<unknown[]>>(async () => [
      { relation: "present" },
    ]);
    const repository = createDrizzleCrmRetentionRepository({
      execute,
    } as unknown as DrizzleCrmClient);

    await expect(
      repository.inspectReadiness({
        storeId: "00000000-0000-4000-8000-000000000001",
        tenantId: "00000000-0000-4000-8000-000000000002",
      }),
    ).resolves.toEqual({ unavailableRelations: [] });
    expect(execute).toHaveBeenCalledTimes(14);
    const readinessSql = execute.mock.calls
      .map(([statement]) => new PgDialect().sqlToQuery(statement).sql)
      .join("\n")
      .toLowerCase();
    expect(readinessSql).not.toContain("legacy_coverage");
    expect(readinessSql).not.toContain("crm_whatsapp");
  });

  it("dry-runs canonical candidates and skips active legal holds without mutations", async () => {
    const execute = vi.fn<(statement: SQL) => Promise<unknown[]>>(async () => [
      {
        category: "canonical_message",
        eligible_at: "2025-01-01T00:00:00.000Z",
        held: true,
        resource_id: "00000000-0000-4000-8000-000000000003",
        resource_type: "canonical_message",
      },
    ]);

    const result = await processDrizzleCrmRetentionBatch(
      { execute } as unknown as DrizzleCrmClient,
      retentionBatchInput(true),
    );

    expect(result).toMatchObject({
      legalHoldSkipped: 1,
      verified: true,
    });
    expect(result.categories[0]).toMatchObject({ affected: 0, eligible: 0 });
    expect(execute).toHaveBeenCalledOnce();
    const query = new PgDialect()
      .sqlToQuery(execute.mock.calls[0]![0])
      .sql.toLowerCase();
    expect(query).toContain("crm_retention_legal_holds");
    expect(query).not.toContain("legacy_coverage");
  });
});
