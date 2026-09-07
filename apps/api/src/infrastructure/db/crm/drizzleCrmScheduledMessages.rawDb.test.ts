import { randomUUID } from "node:crypto";
import * as schema from "@lojaveiculosv2/db";
import { describe, expect, it } from "vitest";
import { loadLocalEnv } from "../../config/loadLocalEnv.js";
import {
  seedRawCrmConversationFixture,
  seedRawCrmMessage,
  withRawCrmTransaction,
} from "./drizzleCrmConversationConsistency.rawDbTestSupport.js";
import { createDrizzleCrmConversationRepository } from "./drizzleCrmConversationRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

loadLocalEnv();
const runRawDb = process.env.RUN_RAW_CRM_DB_TESTS === "true";

describe.skipIf(!runRawDb)("CRM scheduled-message Postgres reliability", () => {
  it("uses wall-clock lease age and fences an expired owner completion", async () => {
    await withRawCrmTransaction(async (transaction) => {
      const fixture = await seedRawCrmConversationFixture(transaction);
      await transaction
        .insert(schema.storeEntitlements)
        .values({
          featureKey: "crm",
          source: "synthetic-validation",
          status: "active",
          storeId: fixture.primary.storeId,
          tenantId: fixture.primary.tenantId,
        })
        .onConflictDoUpdate({
          target: [
            schema.storeEntitlements.storeId,
            schema.storeEntitlements.featureKey,
          ],
          set: { endsAt: null, startsAt: null, status: "active" },
        });
      const repository = createDrizzleCrmConversationRepository(transaction, {
        disableTransactions: true,
      });
      const seeded = await seedRawCrmMessage(repository, fixture.primary, {
        customerPhone: "5511999000091",
      });
      const threadId = seeded.conversationCycle.threadId;
      if (!threadId) throw new Error("Raw CRM scheduled thread is missing.");

      const staleId = await insertScheduled(transaction, {
        content: "Stale scheduled message",
        cycleId: seeded.conversationCycle.id,
        scheduledAt: new Date("2030-01-01T10:00:00.000Z"),
        status: "sending",
        threadId,
        ...fixture.primary,
      });
      const [defaultTimestampRow] = await repository.listScheduledMessages({
        limit: 1,
        scheduledMessageId: staleId,
        storeId: fixture.primary.storeId,
        tenantId: fixture.primary.tenantId,
      });
      if (!defaultTimestampRow) {
        throw new Error(
          "Expected the scheduled row with DB default timestamp.",
        );
      }
      // The inserted row deliberately uses PostgreSQL's default now(), which
      // has microseconds that are not represented by a JS Date.
      const now = new Date(defaultTimestampRow.updatedAt.getTime() + 300_000);
      const staleBefore = new Date(now.getTime() - 120_000);
      const freshId = await insertScheduled(transaction, {
        content: "Fresh scheduled message",
        cycleId: seeded.conversationCycle.id,
        scheduledAt: new Date("2030-01-01T10:01:00.000Z"),
        status: "sending",
        threadId,
        updatedAt: new Date(defaultTimestampRow.updatedAt.getTime() + 270_000),
        ...fixture.primary,
      });

      const due = await repository.findDueScheduledMessages({
        dueAt: new Date("2030-01-01T11:00:00.000Z"),
        limit: 10,
        now,
        staleBefore,
        storeId: fixture.primary.storeId,
        tenantId: fixture.primary.tenantId,
      });
      expect(due.map((message) => message.id)).toEqual([staleId]);
      expect(due.map((message) => message.id)).not.toContain(freshId);

      const first = due[0];
      if (!first) throw new Error("Expected stale scheduled message.");
      const claimed = await repository.updateScheduledMessage({
        dueAt: new Date("2030-01-01T11:00:00.000Z"),
        expectedStatuses: ["sending"],
        expectedUpdatedAt: first.updatedAt,
        id: first.id,
        metadata: { scheduledClaimToken: "raw-owner-1" },
        now,
        staleBefore,
        status: "sending",
        storeId: fixture.primary.storeId,
        tenantId: fixture.primary.tenantId,
        updatedAt: now,
      });
      if (!claimed) throw new Error("Expected stale scheduled claim.");

      expect(
        await repository.updateScheduledMessage({
          expectedUpdatedAt: first.updatedAt,
          expectedClaimToken: "stale-owner",
          id: first.id,
          sentMessageId: seeded.message.id,
          status: "sent",
          storeId: fixture.primary.storeId,
          tenantId: fixture.primary.tenantId,
        }),
      ).toBeNull();
      const completed = await repository.updateScheduledMessage({
        expectedUpdatedAt: claimed.updatedAt,
        expectedClaimToken: "raw-owner-1",
        id: first.id,
        sentMessageId: seeded.message.id,
        status: "sent",
        storeId: fixture.primary.storeId,
        tenantId: fixture.primary.tenantId,
      });
      expect(completed?.status).toBe("sent");
    });
  });

  it("filters pending bookkeeping before LIMIT and discovers its scope", async () => {
    await withRawCrmTransaction(async (transaction) => {
      const fixture = await seedRawCrmConversationFixture(transaction);
      await transaction
        .insert(schema.storeEntitlements)
        .values({
          featureKey: "crm",
          source: "synthetic-validation",
          status: "active",
          storeId: fixture.primary.storeId,
          tenantId: fixture.primary.tenantId,
        })
        .onConflictDoUpdate({
          target: [
            schema.storeEntitlements.storeId,
            schema.storeEntitlements.featureKey,
          ],
          set: { endsAt: null, startsAt: null, status: "active" },
        });
      const repository = createDrizzleCrmConversationRepository(transaction, {
        disableTransactions: true,
      });
      const seeded = await seedRawCrmMessage(repository, fixture.primary, {
        customerPhone: "5511999000092",
      });
      const threadId = seeded.conversationCycle.threadId;
      if (!threadId) throw new Error("Raw CRM scheduled thread is missing.");
      await insertScheduled(transaction, {
        content: "Newer non-bookkeeping row",
        cycleId: seeded.conversationCycle.id,
        metadata: {},
        scheduledAt: new Date("2030-01-01T10:02:00.000Z"),
        status: "sent",
        threadId,
        ...fixture.primary,
      });
      const pendingId = await insertScheduled(transaction, {
        content: "Older pending bookkeeping row",
        cycleId: seeded.conversationCycle.id,
        metadata: { campaignBookkeepingPending: true },
        scheduledAt: new Date("2030-01-01T10:01:00.000Z"),
        status: "sent",
        threadId,
        ...fixture.primary,
      });

      const pending = await repository.listScheduledMessages({
        campaignBookkeepingPending: true,
        limit: 1,
        storeId: fixture.primary.storeId,
        tenantId: fixture.primary.tenantId,
      });
      expect(pending.map((message) => message.id)).toEqual([pendingId]);
      await expect(
        repository.findDueScheduledMessageScopes({
          dueAt: new Date("2026-09-07T15:00:00.000Z"),
          limit: 10,
        }),
      ).resolves.toEqual([
        {
          storeId: fixture.primary.storeId,
          tenantId: fixture.primary.tenantId,
        },
      ]);
    });
  });
});

async function insertScheduled(
  transaction: DrizzleCrmClient,
  input: {
    content: string;
    cycleId: string;
    connectionId: string;
    metadata?: Record<string, unknown>;
    scheduledAt: Date;
    status: "sending" | "sent";
    storeId: string;
    tenantId: string;
    threadId: string;
    updatedAt?: Date;
  },
) {
  const id = randomUUID();
  await transaction.insert(schema.crmScheduledMessages).values({
    content: input.content,
    connectionId: input.connectionId,
    cycleId: input.cycleId,
    id,
    metadata: input.metadata ?? {},
    recipientAddress: "5511999000090",
    scheduledAt: input.scheduledAt,
    status: input.status,
    storeId: input.storeId,
    tenantId: input.tenantId,
    threadId: input.threadId,
    ...(input.updatedAt ? { updatedAt: input.updatedAt } : {}),
  });
  return id;
}
