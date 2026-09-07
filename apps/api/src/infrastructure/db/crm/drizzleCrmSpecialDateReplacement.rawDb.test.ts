import { randomUUID } from "node:crypto";
import * as schema from "@lojaveiculosv2/db";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { loadLocalEnv } from "../../config/loadLocalEnv.js";
import { createDrizzleCrmSpecialDateRepository } from "./drizzleCrmSpecialDateRepository.js";
import {
  seedRawCrmConversationFixture,
  withRawCrmTransaction,
} from "./drizzleCrmConversationConsistency.rawDbTestSupport.js";
import { specialDateInput } from "./drizzleCrmSpecialDateRepository.rawDbTestSupport.js";

loadLocalEnv();
const runRawDb = process.env.RUN_RAW_CRM_DB_TESTS === "true";

describe.skipIf(!runRawDb)("CRM special-date revision replacement", () => {
  it("uses a new row only for retryable intent and preserves the execution", async () => {
    await withRawCrmTransaction(async (transaction) => {
      const fixture = await seedRawCrmConversationFixture(transaction);
      const repository = createDrizzleCrmSpecialDateRepository(transaction, {
        disableTransactions: true,
      });
      const scope = fixture.primary;
      const configId = randomUUID();
      const [config] = await transaction
        .insert(schema.crmSpecialDateConfigs)
        .values({
          connectionId: scope.connectionId,
          dateType: "birthday",
          enabled: true,
          id: configId,
          leadDays: 30,
          messageTemplate: "Mensagem inicial",
          sendTime: "09:00",
          storeId: scope.storeId,
          tenantId: scope.tenantId,
        })
        .returning();
      if (!config) throw new Error("Special-date config was not persisted.");

      const input = specialDateInput(config.id, scope);
      const first = await repository.scheduleSpecialDateAtomic(input);
      expect(first.scheduled).toBe(true);
      const [scheduled] = await transaction
        .select()
        .from(schema.crmScheduledMessages)
        .where(eq(schema.crmScheduledMessages.id, first.scheduledMessageId!));
      if (!scheduled) throw new Error("Initial schedule was not persisted.");
      await transaction.insert(schema.crmOutboundIntents).values({
        claimToken: randomUUID(),
        connectionId: scope.connectionId,
        cycleId: scheduled.cycleId,
        fingerprint: "a".repeat(64),
        idempotencyKey: `scheduled:${scheduled.id}`,
        providerResult: { code: "provider_unavailable", status: 502 },
        startedAt: new Date(),
        status: "retryable_failed",
        storeId: scope.storeId,
        tenantId: scope.tenantId,
        threadId: scheduled.threadId,
      });

      const revised = await repository.upsertConfig({
        connectionId: scope.connectionId,
        dateType: "birthday",
        enabled: true,
        expectedRevision: config.revision,
        leadDays: 0,
        messageTemplate: "Mensagem revisada",
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      });
      const replacement = await repository.scheduleSpecialDateAtomic({
        ...input,
        configRevision: revised.revision,
        content: "Mensagem revisada, Cliente",
      });
      expect(replacement).toMatchObject({
        executionId: first.executionId,
        scheduled: true,
      });
      expect(replacement.scheduledMessageId).not.toBe(first.scheduledMessageId);
      const [oldMessage, newMessage] = await Promise.all([
        transaction
          .select({ status: schema.crmScheduledMessages.status })
          .from(schema.crmScheduledMessages)
          .where(eq(schema.crmScheduledMessages.id, first.scheduledMessageId!))
          .then(([row]) => row),
        transaction
          .select({
            content: schema.crmScheduledMessages.content,
            status: schema.crmScheduledMessages.status,
          })
          .from(schema.crmScheduledMessages)
          .where(
            eq(schema.crmScheduledMessages.id, replacement.scheduledMessageId!),
          )
          .then(([row]) => row),
      ]);
      expect(oldMessage?.status).toBe("cancelled");
      expect(newMessage).toMatchObject({
        content: "Mensagem revisada, Cliente",
        status: "pending",
      });
      const [execution] = await transaction
        .select({
          configRevision: schema.crmSpecialDateExecutions.configRevision,
          scheduledMessageId:
            schema.crmSpecialDateExecutions.scheduledMessageId,
        })
        .from(schema.crmSpecialDateExecutions)
        .where(
          and(
            eq(schema.crmSpecialDateExecutions.id, first.executionId!),
            eq(schema.crmSpecialDateExecutions.tenantId, scope.tenantId),
            eq(schema.crmSpecialDateExecutions.storeId, scope.storeId),
          ),
        );
      expect(execution).toEqual({
        configRevision: revised.revision,
        scheduledMessageId: replacement.scheduledMessageId,
      });
    });
  });

  it("does not replace schedules backed by unknown or confirmed intents", async () => {
    await withRawCrmTransaction(async (transaction) => {
      const fixture = await seedRawCrmConversationFixture(transaction);
      const repository = createDrizzleCrmSpecialDateRepository(transaction, {
        disableTransactions: true,
      });
      for (const [dateType, status] of [
        ["christmas", "indeterminate"],
        ["easter", "provider_succeeded"],
      ] as const) {
        const configId = randomUUID();
        const [config] = await transaction
          .insert(schema.crmSpecialDateConfigs)
          .values({
            connectionId: fixture.primary.connectionId,
            dateType,
            enabled: true,
            id: configId,
            storeId: fixture.primary.storeId,
            tenantId: fixture.primary.tenantId,
          })
          .returning();
        if (!config) throw new Error("Special-date config was not persisted.");
        const input = {
          ...specialDateInput(config.id, fixture.primary),
          dateType,
        };
        const first = await repository.scheduleSpecialDateAtomic(input);
        const [scheduled] = await transaction
          .select()
          .from(schema.crmScheduledMessages)
          .where(eq(schema.crmScheduledMessages.id, first.scheduledMessageId!));
        if (!scheduled) throw new Error("Initial schedule was not persisted.");
        await transaction.insert(schema.crmOutboundIntents).values({
          claimToken: randomUUID(),
          connectionId: fixture.primary.connectionId,
          cycleId: scheduled.cycleId,
          fingerprint: "b".repeat(64),
          idempotencyKey: `scheduled:${scheduled.id}`,
          providerResult:
            status === "indeterminate"
              ? null
              : {
                  externalId: "provider-1",
                  providerTimestamp: new Date().toISOString(),
                },
          startedAt: new Date(),
          status,
          storeId: fixture.primary.storeId,
          tenantId: fixture.primary.tenantId,
          threadId: scheduled.threadId,
        });
        const revised = await repository.upsertConfig({
          connectionId: fixture.primary.connectionId,
          dateType,
          enabled: true,
          expectedRevision: config.revision,
          messageTemplate: "Mensagem revisada",
          storeId: fixture.primary.storeId,
          tenantId: fixture.primary.tenantId,
        });
        await expect(
          repository.scheduleSpecialDateAtomic({
            ...input,
            configRevision: revised.revision,
            content: "Não substituir",
          }),
        ).resolves.toEqual({ scheduled: false });
        const rows = await transaction
          .select({
            id: schema.crmScheduledMessages.id,
            metadata: schema.crmScheduledMessages.metadata,
          })
          .from(schema.crmScheduledMessages)
          .where(
            and(
              eq(
                schema.crmScheduledMessages.connectionId,
                fixture.primary.connectionId,
              ),
              eq(schema.crmScheduledMessages.cycleId, scheduled.cycleId),
            ),
          );
        expect(
          rows.filter((row) => {
            const specialDate = (row.metadata as Record<string, unknown>)
              .specialDate;
            return (
              specialDate &&
              typeof specialDate === "object" &&
              (specialDate as Record<string, unknown>).configId === config.id
            );
          }),
        ).toHaveLength(1);
      }
    });
  });
});
