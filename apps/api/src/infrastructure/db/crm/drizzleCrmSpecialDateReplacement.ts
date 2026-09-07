import { and, eq } from "drizzle-orm";
import {
  crmOutboundIntents,
  crmScheduledMessages,
  crmSpecialDateExecutions,
} from "@lojaveiculosv2/db";
import type { ScheduleSpecialDateAtomicInput } from "../../../domains/crm/ports/crmSpecialDateRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function replacePendingMessage(
  db: DrizzleCrmClient,
  execution: typeof crmSpecialDateExecutions.$inferSelect,
  input: ScheduleSpecialDateAtomicInput,
  configRevision: number,
  recipientKey: string,
) {
  if (!execution.scheduledMessageId) return null;
  const [scheduled] = await db
    .select()
    .from(crmScheduledMessages)
    .where(
      and(
        eq(crmScheduledMessages.id, execution.scheduledMessageId),
        eq(crmScheduledMessages.tenantId, input.tenantId),
        eq(crmScheduledMessages.storeId, input.storeId),
      ),
    )
    .for("update")
    .limit(1);
  if (!scheduled) return null;

  const [intent] = await db
    .select({ status: crmOutboundIntents.status })
    .from(crmOutboundIntents)
    .where(
      and(
        eq(crmOutboundIntents.idempotencyKey, `scheduled:${scheduled.id}`),
        eq(crmOutboundIntents.connectionId, input.connectionId),
        eq(crmOutboundIntents.tenantId, input.tenantId),
        eq(crmOutboundIntents.storeId, input.storeId),
      ),
    )
    .for("update")
    .limit(1);

  if (intent?.status === "retryable_failed" && scheduled.status === "pending") {
    return replaceRetryableMessage(
      db,
      scheduled,
      execution,
      input,
      configRevision,
      recipientKey,
    );
  }
  if (intent || scheduled.status !== "pending") return null;

  const [updated] = await db
    .update(crmScheduledMessages)
    .set({
      content: input.content,
      metadata: specialDateMetadata(
        input,
        configRevision,
        execution.id,
        recipientKey,
      ),
      recipientAddress: input.recipientAddress,
      scheduledAt: input.scheduledAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(crmScheduledMessages.id, execution.scheduledMessageId),
        eq(crmScheduledMessages.tenantId, input.tenantId),
        eq(crmScheduledMessages.storeId, input.storeId),
        eq(crmScheduledMessages.status, "pending"),
      ),
    )
    .returning({ id: crmScheduledMessages.id });
  if (!updated) return null;
  await db
    .update(crmSpecialDateExecutions)
    .set({ configRevision, updatedAt: new Date() })
    .where(
      and(
        eq(crmSpecialDateExecutions.id, execution.id),
        eq(crmSpecialDateExecutions.tenantId, input.tenantId),
        eq(crmSpecialDateExecutions.storeId, input.storeId),
      ),
    );
  return updated.id;
}

async function replaceRetryableMessage(
  db: DrizzleCrmClient,
  scheduled: typeof crmScheduledMessages.$inferSelect,
  execution: typeof crmSpecialDateExecutions.$inferSelect,
  input: ScheduleSpecialDateAtomicInput,
  configRevision: number,
  recipientKey: string,
) {
  const [replacement] = await db
    .insert(crmScheduledMessages)
    .values({
      campaignId: scheduled.campaignId,
      campaignMessageType: scheduled.campaignMessageType,
      campaignRecipientKey: scheduled.campaignRecipientKey,
      campaignSequence: scheduled.campaignSequence,
      connectionId: input.connectionId,
      content: input.content,
      createdByUserId: scheduled.createdByUserId,
      cycleId: scheduled.cycleId,
      metadata: specialDateMetadata(
        input,
        configRevision,
        execution.id,
        recipientKey,
      ),
      recipientAddress: input.recipientAddress,
      scheduledAt: input.scheduledAt,
      storeId: input.storeId,
      tenantId: input.tenantId,
      threadId: scheduled.threadId,
    })
    .returning({ id: crmScheduledMessages.id });
  if (!replacement)
    throw new Error("CRM special date replacement was not persisted.");

  const [cancelled] = await db
    .update(crmScheduledMessages)
    .set({
      cancelledAt: new Date(),
      errorMessage: "Superseded by a retryable special-date revision.",
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(crmScheduledMessages.id, scheduled.id),
        eq(crmScheduledMessages.tenantId, input.tenantId),
        eq(crmScheduledMessages.storeId, input.storeId),
        eq(crmScheduledMessages.status, scheduled.status),
      ),
    )
    .returning({ id: crmScheduledMessages.id });
  if (!cancelled)
    throw new Error("CRM special date replacement lost its schedule fence.");

  await db
    .update(crmSpecialDateExecutions)
    .set({
      configRevision,
      scheduledMessageId: replacement.id,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(crmSpecialDateExecutions.id, execution.id),
        eq(crmSpecialDateExecutions.tenantId, input.tenantId),
        eq(crmSpecialDateExecutions.storeId, input.storeId),
        eq(crmSpecialDateExecutions.status, "scheduled"),
      ),
    );
  return replacement.id;
}

export function specialDateMetadata(
  input: ScheduleSpecialDateAtomicInput,
  configRevision: number,
  executionId: string,
  recipientKey: string,
) {
  return {
    ...(input.metadata ?? {}),
    specialDate: {
      configId: input.configId,
      configRevision,
      dateType: input.dateType,
      executionId,
      recipientKey,
      targetYear: input.targetYear,
    },
  };
}
