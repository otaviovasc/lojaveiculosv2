import type { SQL } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
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
        "bot_action_commands",
        "canonical_messages",
        "conversation_cycles",
        "crm_connections",
        "crm_external_bot_event_outbox",
        "crm_external_bot_proposals",
        "crm_retention_audit_outbox",
        "crm_retention_legal_holds",
        "crm_retention_scopes",
        "integration_events",
        "crm_retention_legacy_coverage",
        "crm_whatsapp_messages",
        "crm_whatsapp_sessions",
        "provider_effects",
        "provider_events",
      ]),
    );
    expect(readiness.unavailableRelations).toHaveLength(15);
    expect(readiness.legacyCoverageGaps).toBe(0);
    expect(execute).toHaveBeenCalledTimes(15);
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
        includeLegacyWindow: true,
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

  it("covers legacy Z-API and OLX rows and honors canonical message holds", async () => {
    const execute = vi.fn<(statement: SQL) => Promise<unknown[]>>(async () =>
      Promise.resolve([]),
    );
    await listDrizzleCrmRetentionCandidates(
      { execute } as unknown as DrizzleCrmClient,
      {
        botCutoff: new Date("2026-07-13T15:00:00.000Z"),
        canonicalCutoff: new Date("2025-02-12T15:00:00.000Z"),
        cursor: null,
        includeLegacyWindow: true,
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

    expect(query).toContain("'legacy_message'::text");
    expect(query).toContain("'legacy_session'::text");
    expect(query).toContain("connection.provider = 'zapi'");
    expect(query).toContain("connection.provider = 'olx_chat'");
    expect(query).toContain("hold.resource_type = 'canonical_message'");
    expect(query).toContain("session.status in ('completed', 'expired')");
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
        includeLegacyWindow: true,
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

  it("reports the continuous legacy-to-canonical reconciliation gap", async () => {
    let calls = 0;
    const execute = vi.fn<(statement: SQL) => Promise<unknown[]>>(async () => {
      calls += 1;
      return calls <= 15 ? [{ relation: "present" }] : [{ gaps: 3 }];
    });
    const repository = createDrizzleCrmRetentionRepository({
      execute,
    } as unknown as DrizzleCrmClient);

    await expect(
      repository.inspectReadiness({
        storeId: "00000000-0000-4000-8000-000000000001",
        tenantId: "00000000-0000-4000-8000-000000000002",
      }),
    ).resolves.toEqual({
      legacyCoverageGaps: 3,
      unavailableRelations: [],
    });
    const coverageQuery = new PgDialect().sqlToQuery(
      execute.mock.calls[15]![0],
    );
    expect(coverageQuery.sql.toLowerCase()).toContain(
      "where tenant_id = $1::uuid\n          and store_id = $2::uuid",
    );
    expect(coverageQuery.params).toEqual([
      "00000000-0000-4000-8000-000000000002",
      "00000000-0000-4000-8000-000000000001",
    ]);
  });

  it("rechecks scoped legacy gaps after acquiring the retention transaction lock", async () => {
    let calls = 0;
    const execute = vi.fn<(statement: SQL) => Promise<unknown[]>>(async () => {
      calls += 1;
      if (calls === 2) return [{ gaps: 4 }];
      return [];
    });
    const transaction = vi.fn(
      async (callback: (tx: DrizzleCrmClient) => Promise<unknown>) =>
        callback({ execute } as unknown as DrizzleCrmClient),
    );

    const result = await processDrizzleCrmRetentionBatch(
      { transaction } as unknown as DrizzleCrmClient,
      retentionBatchInput(false),
    );

    expect(transaction).toHaveBeenCalledOnce();
    expect(result.legacyCoverageGaps).toBe(4);
    expect(execute).toHaveBeenCalledTimes(3);
    expect(
      new PgDialect().sqlToQuery(execute.mock.calls[0]![0]).sql.toLowerCase(),
    ).toContain("pg_advisory_xact_lock");
    expect(
      new PgDialect().sqlToQuery(execute.mock.calls[1]![0]).sql.toLowerCase(),
    ).toContain("from crm_retention_legacy_coverage");
  });

  it("keeps sealed receipt cleanup eligible while a scoped legacy gap is open", async () => {
    let calls = 0;
    const execute = vi.fn<(statement: SQL) => Promise<unknown[]>>(async () => {
      calls += 1;
      if (calls === 1) return [{ gaps: 2 }];
      return [
        {
          category: "provider_raw_payload",
          eligible_at: "2026-08-01T00:00:00.000Z",
          held: false,
          resource_id: "receipt_1",
          resource_type: "olx_lead_receipt",
        },
      ];
    });

    const result = await processDrizzleCrmRetentionBatch(
      { execute } as unknown as DrizzleCrmClient,
      retentionBatchInput(true),
    );

    expect(result.legacyCoverageGaps).toBe(2);
    expect(
      result.categories.find(
        ({ category }) => category === "provider_raw_payload",
      ),
    ).toMatchObject({ eligible: 1 });
    const candidateQuery = new PgDialect().sqlToQuery(
      execute.mock.calls[1]![0],
    );
    expect(
      candidateQuery.params.filter((value) => value === false),
    ).toHaveLength(2);
  });
});
