import { and, eq } from "drizzle-orm";
import {
  conversationCycles,
  crmChannelConnections,
  crmScheduledMessages,
  crmSpecialDateConfigs,
  crmSpecialDateExecutions,
} from "@lojaveiculosv2/db";
import type {
  ScheduleSpecialDateAtomicInput,
  ScheduleSpecialDateAtomicResult,
} from "../../../domains/crm/ports/crmSpecialDateRepository.js";
import type { CrmMessagingChannel } from "../../../domains/crm/ports/crmConversationRepositoryTypes.js";
import { upsertConversationCycleContextInDatabase } from "./drizzleCrmConversationIngest.js";
import {
  replacePendingMessage,
  specialDateMetadata,
} from "./drizzleCrmSpecialDateReplacement.js";
import {
  canonicalRecipientKey,
  withSpecialDateTransaction,
} from "./drizzleCrmSpecialDateSupport.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function scheduleSpecialDateAtomic(
  db: DrizzleCrmClient,
  input: ScheduleSpecialDateAtomicInput,
  disableTransactions: boolean,
): Promise<ScheduleSpecialDateAtomicResult> {
  return withSpecialDateTransaction(db, disableTransactions, async (tx) => {
    const [config] = await tx
      .select({
        enabled: crmSpecialDateConfigs.enabled,
        revision: crmSpecialDateConfigs.revision,
        connectionId: crmSpecialDateConfigs.connectionId,
      })
      .from(crmSpecialDateConfigs)
      .where(
        and(
          eq(crmSpecialDateConfigs.id, input.configId),
          eq(crmSpecialDateConfigs.tenantId, input.tenantId),
          eq(crmSpecialDateConfigs.storeId, input.storeId),
          eq(crmSpecialDateConfigs.connectionId, input.connectionId),
          eq(crmSpecialDateConfigs.dateType, input.dateType),
        ),
      )
      .for("update")
      .limit(1);
    if (!config?.enabled) return { scheduled: false };
    if (input.configRevision !== config.revision) {
      return { scheduled: false };
    }

    const recipientKey = canonicalRecipientKey(
      input.recipientKey,
      input.customerPhone,
    );
    const [execution] = await tx
      .insert(crmSpecialDateExecutions)
      .values({
        configRevision: config.revision,
        connectionId: input.connectionId,
        dateType: input.dateType,
        recipientKey,
        storeId: input.storeId,
        targetYear: input.targetYear,
        tenantId: input.tenantId,
      })
      .onConflictDoNothing({
        target: [
          crmSpecialDateExecutions.tenantId,
          crmSpecialDateExecutions.storeId,
          crmSpecialDateExecutions.connectionId,
          crmSpecialDateExecutions.dateType,
          crmSpecialDateExecutions.targetYear,
          crmSpecialDateExecutions.recipientKey,
        ],
      })
      .returning({ id: crmSpecialDateExecutions.id });
    if (!execution) {
      const [existing] = await tx
        .select()
        .from(crmSpecialDateExecutions)
        .where(
          and(
            eq(crmSpecialDateExecutions.tenantId, input.tenantId),
            eq(crmSpecialDateExecutions.storeId, input.storeId),
            eq(crmSpecialDateExecutions.connectionId, input.connectionId),
            eq(crmSpecialDateExecutions.dateType, input.dateType),
            eq(crmSpecialDateExecutions.targetYear, input.targetYear),
            eq(crmSpecialDateExecutions.recipientKey, recipientKey),
          ),
        )
        .for("update")
        .limit(1);
      if (
        !existing ||
        existing.status !== "scheduled" ||
        existing.configRevision === config.revision
      ) {
        return { scheduled: false };
      }
      const replacement = await replacePendingMessage(
        tx,
        existing,
        input,
        config.revision,
        recipientKey,
      );
      return replacement
        ? {
            executionId: existing.id,
            scheduled: true,
            scheduledMessageId: replacement,
          }
        : { scheduled: false };
    }

    const connection = await tx
      .select({ channel: crmChannelConnections.channel })
      .from(crmChannelConnections)
      .where(
        and(
          eq(crmChannelConnections.id, input.connectionId),
          eq(crmChannelConnections.storeId, input.storeId),
          eq(crmChannelConnections.tenantId, input.tenantId),
        ),
      )
      .limit(1);
    const channel = input.channel ?? toDomainChannel(connection[0]?.channel);
    const cycle = await upsertConversationCycleContextInDatabase(tx, {
      channel,
      connectionId: input.connectionId,
      customerPhone: input.customerPhone,
      storeId: input.storeId,
      tenantId: input.tenantId,
      ...(input.customerDisplayName === undefined
        ? {}
        : { customerDisplayName: input.customerDisplayName }),
    });
    const metadata = specialDateMetadata(
      input,
      config.revision,
      execution.id,
      recipientKey,
    );
    const [scheduled] = await tx
      .insert(crmScheduledMessages)
      .values({
        connectionId: input.connectionId,
        content: input.content,
        cycleId: cycle.id,
        metadata,
        recipientAddress: input.recipientAddress,
        scheduledAt: input.scheduledAt,
        storeId: input.storeId,
        tenantId: input.tenantId,
        threadId:
          cycle.threadId ?? (await threadIdForCycle(tx, cycle.id, input)),
      })
      .returning({ id: crmScheduledMessages.id });
    if (!scheduled)
      throw new Error("CRM special date scheduled message was not persisted.");
    await tx
      .update(crmSpecialDateExecutions)
      .set({ scheduledMessageId: scheduled.id, updatedAt: new Date() })
      .where(
        and(
          eq(crmSpecialDateExecutions.id, execution.id),
          eq(crmSpecialDateExecutions.tenantId, input.tenantId),
          eq(crmSpecialDateExecutions.storeId, input.storeId),
        ),
      );
    return {
      executionId: execution.id,
      scheduled: true,
      scheduledMessageId: scheduled.id,
    };
  });
}

async function threadIdForCycle(
  db: DrizzleCrmClient,
  cycleId: string,
  input: Pick<ScheduleSpecialDateAtomicInput, "storeId" | "tenantId">,
) {
  const [row] = await db
    .select({ threadId: conversationCycles.threadId })
    .from(conversationCycles)
    .where(
      and(
        eq(conversationCycles.id, cycleId),
        eq(conversationCycles.storeId, input.storeId),
        eq(conversationCycles.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!row)
    throw new Error("CRM special date canonical cycle was not persisted.");
  return row.threadId;
}

function toDomainChannel(
  channel: typeof crmChannelConnections.$inferSelect.channel | undefined,
): CrmMessagingChannel {
  switch (channel) {
    case "instagram":
      return "INSTAGRAM";
    case "olx_chat":
      return "OLX_CHAT";
    case "whatsapp":
    case undefined:
    default:
      return "WHATSAPP";
  }
}
