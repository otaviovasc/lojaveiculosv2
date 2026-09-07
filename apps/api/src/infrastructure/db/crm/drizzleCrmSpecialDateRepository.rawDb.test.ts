import { randomUUID } from "node:crypto";
import * as schema from "@lojaveiculosv2/db";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { loadLocalEnv } from "../../config/loadLocalEnv.js";
import { createDrizzleCrmSpecialDateRepository } from "./drizzleCrmSpecialDateRepository.js";
import {
  seedRawCrmConversationFixture,
  withRawCrmTransaction,
} from "./drizzleCrmConversationConsistency.rawDbTestSupport.js";
import {
  cleanupConcurrencyFixture,
  specialDateInput,
} from "./drizzleCrmSpecialDateRepository.rawDbTestSupport.js";

loadLocalEnv();
const runRawDb = process.env.RUN_RAW_CRM_DB_TESTS === "true";

describe.skipIf(!runRawDb)("CRM special-date Postgres adapter", () => {
  it("commits execution, canonical cycle, and message together and cancels without resurrection", async () => {
    await withRawCrmTransaction(async (transaction) => {
      const fixture = await seedRawCrmConversationFixture(transaction);
      const repository = createDrizzleCrmSpecialDateRepository(transaction, {
        disableTransactions: true,
      });
      const scope = fixture.primary;
      const [connection] = await transaction
        .select({
          id: schema.crmChannelConnections.id,
          storeId: schema.crmChannelConnections.storeId,
          tenantId: schema.crmChannelConnections.tenantId,
        })
        .from(schema.crmChannelConnections)
        .where(eq(schema.crmChannelConnections.id, scope.connectionId));
      expect(connection).toMatchObject({
        id: scope.connectionId,
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      });
      const [config] = await transaction
        .insert(schema.crmSpecialDateConfigs)
        .values({
          connectionId: scope.connectionId,
          dateType: "birthday",
          enabled: true,
          leadDays: 2,
          messageTemplate: "Parabens, {{name}}",
          sendTime: "09:00",
          storeId: scope.storeId,
          tenantId: scope.tenantId,
        })
        .returning();
      if (!config) throw new Error("Special-date config was not persisted.");
      const input = specialDateInput(config.id, scope);
      const first = await repository.scheduleSpecialDateAtomic(input);
      expect(first.scheduled).toBe(true);
      expect(first.executionId).toBeTruthy();
      expect(first.scheduledMessageId).toBeTruthy();

      const [execution] = await transaction
        .select()
        .from(schema.crmSpecialDateExecutions)
        .where(eq(schema.crmSpecialDateExecutions.id, first.executionId!));
      const [scheduled] = await transaction
        .select()
        .from(schema.crmScheduledMessages)
        .where(eq(schema.crmScheduledMessages.id, first.scheduledMessageId!));
      const [cycle] = await transaction
        .select()
        .from(schema.conversationCycles)
        .where(eq(schema.conversationCycles.id, scheduled?.cycleId ?? ""));
      expect(execution).toMatchObject({
        configRevision: 0,
        recipientKey: "phone:5511999000001",
        status: "scheduled",
      });
      expect(scheduled).toMatchObject({
        cycleId: cycle?.id,
        status: "pending",
        threadId: cycle?.threadId,
      });

      const revisedConfig = await repository.upsertConfig({
        connectionId: scope.connectionId,
        dateType: "birthday",
        enabled: true,
        expectedRevision: config.revision,
        messageTemplate: "Nova mensagem, {{name}}",
        sendTime: "10:00",
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      });
      const replacement = await repository.scheduleSpecialDateAtomic({
        ...input,
        configRevision: revisedConfig.revision,
        content: "Nova mensagem, Cliente",
        scheduledAt: new Date("2026-09-07T13:00:00.000Z"),
      });
      expect(replacement).toEqual({
        executionId: first.executionId,
        scheduled: true,
        scheduledMessageId: first.scheduledMessageId,
      });
      const [revisedExecution] = await transaction
        .select({
          configRevision: schema.crmSpecialDateExecutions.configRevision,
        })
        .from(schema.crmSpecialDateExecutions)
        .where(eq(schema.crmSpecialDateExecutions.id, first.executionId!));
      const [revisedMessage] = await transaction
        .select({
          content: schema.crmScheduledMessages.content,
          scheduledAt: schema.crmScheduledMessages.scheduledAt,
        })
        .from(schema.crmScheduledMessages)
        .where(eq(schema.crmScheduledMessages.id, first.scheduledMessageId!));
      expect(revisedExecution?.configRevision).toBe(1);
      expect(revisedMessage).toMatchObject({
        content: "Nova mensagem, Cliente",
        scheduledAt: new Date("2026-09-07T13:00:00.000Z"),
      });

      const disabled = await repository.upsertConfig({
        connectionId: scope.connectionId,
        dateType: "birthday",
        enabled: false,
        expectedRevision: revisedConfig.revision,
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      });
      expect(disabled.revision).toBe(2);
      const [cancelledExecution] = await transaction
        .select({ status: schema.crmSpecialDateExecutions.status })
        .from(schema.crmSpecialDateExecutions)
        .where(eq(schema.crmSpecialDateExecutions.id, first.executionId!));
      const [cancelledMessage] = await transaction
        .select({ status: schema.crmScheduledMessages.status })
        .from(schema.crmScheduledMessages)
        .where(eq(schema.crmScheduledMessages.id, first.scheduledMessageId!));
      expect(cancelledExecution?.status).toBe("cancelled");
      expect(cancelledMessage?.status).toBe("cancelled");

      await expect(
        repository.scheduleSpecialDateAtomic({
          ...input,
          configRevision: disabled.revision,
        }),
      ).resolves.toEqual({ scheduled: false });
      const [preserved] = await transaction
        .select({ status: schema.crmSpecialDateExecutions.status })
        .from(schema.crmSpecialDateExecutions)
        .where(eq(schema.crmSpecialDateExecutions.id, first.executionId!));
      expect(preserved?.status).toBe("cancelled");

      const rollbackScopeProbe = Symbol("rollback special-date scope probe");
      await expect(
        transaction.transaction(async (nested) => {
          await expect(
            nested.insert(schema.crmSpecialDateConfigs).values({
              connectionId: fixture.sibling.connectionId,
              dateType: "christmas",
              enabled: true,
              storeId: scope.storeId,
              tenantId: scope.tenantId,
            }),
          ).rejects.toThrow();
          throw rollbackScopeProbe;
        }),
      ).rejects.toBe(rollbackScopeProbe);
    });
  });

  it("allows only one concurrent schedule for the scoped canonical contact", async () => {
    expect(process.env.DATABASE_URL).toBeTruthy();
    const sqlClient = postgres(process.env.DATABASE_URL ?? "", { max: 4 });
    const db = drizzle(sqlClient, { schema });
    const connectionId = randomUUID();
    const configId = randomUUID();
    let scope: { storeId: string; tenantId: string } | undefined;
    try {
      const [base] = await db
        .select({ storeId: schema.stores.id, tenantId: schema.stores.tenantId })
        .from(schema.stores)
        .limit(1);
      expect(base).toBeTruthy();
      if (!base) throw new Error("Store scope is missing.");
      scope = base;
      await db.insert(schema.crmChannelConnections).values({
        broker: "direct",
        channel: "whatsapp",
        displayName: "Special date concurrency test",
        id: connectionId,
        provider: "zapi",
        state: "active",
        storeId: base.storeId,
        tenantId: base.tenantId,
      });
      await db.insert(schema.crmSpecialDateConfigs).values({
        connectionId,
        dateType: "birthday",
        enabled: true,
        id: configId,
        storeId: base.storeId,
        tenantId: base.tenantId,
      });

      const input = specialDateInput(configId, {
        connectionId,
        storeId: base.storeId,
        tenantId: base.tenantId,
      });
      const [left, right] = await Promise.all([
        createDrizzleCrmSpecialDateRepository(db).scheduleSpecialDateAtomic(
          input,
        ),
        createDrizzleCrmSpecialDateRepository(db).scheduleSpecialDateAtomic(
          input,
        ),
      ]);
      expect([left.scheduled, right.scheduled].filter(Boolean)).toHaveLength(1);
      const rows = await db
        .select()
        .from(schema.crmSpecialDateExecutions)
        .where(
          and(
            eq(schema.crmSpecialDateExecutions.connectionId, connectionId),
            eq(schema.crmSpecialDateExecutions.targetYear, input.targetYear),
          ),
        );
      expect(rows).toHaveLength(1);
    } finally {
      if (scope)
        await cleanupConcurrencyFixture(db, connectionId, configId, scope);
      await sqlClient.end();
    }
  });
});
