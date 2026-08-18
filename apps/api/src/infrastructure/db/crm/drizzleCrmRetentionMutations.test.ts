import { crmMessages, crmRetentionAuditOutbox } from "@lojaveiculosv2/db";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { applyDrizzleCrmRetentionCandidates } from "./drizzleCrmRetentionMutations.js";
import type { DrizzleCrmRetentionMutationInput } from "./drizzleCrmRetentionMutationSupport.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

describe("canonical CRM retention mutations", () => {
  it("anonymizes a scoped canonical message and enqueues idempotent audit evidence", async () => {
    let auditConflictTarget: unknown;
    let auditValues: Record<string, unknown> | undefined;
    let mutationValues: Record<string, unknown> | undefined;
    let whereClause: SQL | undefined;
    const db = {
      insert: (table: unknown) => {
        expect(table).toBe(crmRetentionAuditOutbox);
        return {
          values: (values: Record<string, unknown>) => {
            auditValues = values;
            return {
              onConflictDoNothing: (input: { target: unknown }) => {
                auditConflictTarget = input.target;
                return { returning: async () => [{ auditId: "audit_1" }] };
              },
            };
          },
        };
      },
      update: (table: unknown) => {
        expect(table).toBe(crmMessages);
        return {
          set: (values: Record<string, unknown>) => {
            mutationValues = values;
            return {
              where: (condition: SQL) => {
                whereClause = condition;
                return { returning: async () => [{ id: messageId }] };
              },
            };
          },
        };
      },
    } as unknown as DrizzleCrmClient;

    await expect(
      applyDrizzleCrmRetentionCandidates(db, mutationInput()),
    ).resolves.toEqual({ affected: 1, auditId: "audit_1", verified: true });

    expect(mutationValues).toMatchObject({
      content: "",
      mediaType: null,
      mediaUrl: null,
      updatedAt: now,
    });
    const whereSql = new PgDialect().sqlToQuery(whereClause!).sql.toLowerCase();
    expect(whereSql).toContain('"crm_messages"."tenant_id"');
    expect(whereSql).toContain('"crm_messages"."store_id"');
    expect(whereSql).toContain('"crm_conversation_threads" thread');
    expect(whereSql).toContain('"crm_conversation_cycles" cycle');
    expect(whereSql).toContain('"crm_conversation_attendances" attendance');
    expect(whereSql).toContain('"crm_channel_connections" connection');
    expect(whereSql).toContain("crm_retention_legal_holds");
    expect(whereSql).not.toContain("crm_connections");
    expect(whereSql).not.toContain("crm_whatsapp");
    expect(whereSql).not.toContain("legacy_coverage");
    expect(auditValues).toMatchObject({
      idempotencyKey: "retention_test",
      storeId,
      tenantId,
    });
    expect(auditConflictTarget).toBe(crmRetentionAuditOutbox.idempotencyKey);
  });
});

const messageId = "00000000-0000-4000-8000-000000000003";
const now = new Date("2026-08-12T15:00:00.000Z");
const storeId = "00000000-0000-4000-8000-000000000001";
const tenantId = "00000000-0000-4000-8000-000000000002";

function mutationInput(): DrizzleCrmRetentionMutationInput {
  return {
    auditIntent: {
      actorId: "retention_worker",
      actorKind: "system",
      idempotencyKey: "retention_test",
      requestId: "request_1",
    },
    candidates: [
      {
        category: "canonical_message",
        eligibleAt: new Date("2025-01-01T00:00:00.000Z"),
        held: false,
        resourceId: messageId,
        resourceType: "canonical_message",
      },
    ],
    cutoffs: {
      botInteractionBefore: new Date("2026-07-13T15:00:00.000Z"),
      canonicalMessageBefore: new Date("2025-02-12T15:00:00.000Z"),
      providerRawPayloadBefore: new Date("2026-08-05T15:00:00.000Z"),
    },
    legalHoldSkipped: 0,
    now,
    storeId,
    tenantId,
  };
}
