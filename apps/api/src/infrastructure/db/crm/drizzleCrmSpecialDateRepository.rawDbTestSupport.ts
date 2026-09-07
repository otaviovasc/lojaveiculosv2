import * as schema from "@lojaveiculosv2/db";
import { and, eq, inArray } from "drizzle-orm";
import type { ScheduleSpecialDateAtomicInput } from "../../../domains/crm/ports/crmSpecialDateRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export function specialDateInput(
  configId: string,
  scope: { connectionId: string; storeId: string; tenantId: string },
): ScheduleSpecialDateAtomicInput {
  return {
    channel: "WHATSAPP",
    configId,
    configRevision: 0,
    connectionId: scope.connectionId,
    content: "Parabens, Cliente",
    customerDisplayName: "Cliente",
    customerPhone: "5511999000001",
    dateType: "birthday",
    recipientAddress: "5511999000001",
    recipientKey: "lead:duplicate-row",
    scheduledAt: new Date("2026-09-07T12:00:00.000Z"),
    storeId: scope.storeId as never,
    targetYear: 2026,
    tenantId: scope.tenantId as never,
  };
}

export async function cleanupConcurrencyFixture(
  db: DrizzleCrmClient,
  connectionId: string,
  configId: string,
  scope: { storeId: string; tenantId: string },
) {
  const scheduled = await db
    .select({
      cycleId: schema.crmScheduledMessages.cycleId,
      threadId: schema.crmScheduledMessages.threadId,
    })
    .from(schema.crmScheduledMessages)
    .where(eq(schema.crmScheduledMessages.connectionId, connectionId));
  const cycleIds = scheduled.map(({ cycleId }) => cycleId);
  const threadIds = scheduled.map(({ threadId }) => threadId);
  await db
    .delete(schema.crmSpecialDateExecutions)
    .where(eq(schema.crmSpecialDateExecutions.connectionId, connectionId));
  await db
    .delete(schema.crmScheduledMessages)
    .where(eq(schema.crmScheduledMessages.connectionId, connectionId));
  if (cycleIds.length) {
    await db
      .delete(schema.conversationAttendances)
      .where(inArray(schema.conversationAttendances.cycleId, cycleIds));
    await db
      .delete(schema.conversationCycles)
      .where(inArray(schema.conversationCycles.id, cycleIds));
  }
  if (threadIds.length) {
    await db
      .delete(schema.conversationThreads)
      .where(inArray(schema.conversationThreads.id, threadIds));
  }
  await db
    .delete(schema.crmSpecialDateConfigs)
    .where(eq(schema.crmSpecialDateConfigs.id, configId));
  await db
    .delete(schema.crmChannelConnections)
    .where(
      and(
        eq(schema.crmChannelConnections.id, connectionId),
        eq(schema.crmChannelConnections.storeId, scope.storeId),
        eq(schema.crmChannelConnections.tenantId, scope.tenantId),
      ),
    );
}
