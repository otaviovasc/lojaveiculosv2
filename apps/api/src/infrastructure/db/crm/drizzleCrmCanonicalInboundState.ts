import {
  conversationAttendances,
  conversationCycles,
  conversationThreads,
} from "@lojaveiculosv2/db";
import { and, eq, sql } from "drizzle-orm";
import type { CanonicalInboundMessageInput } from "../../../domains/crm/ports/crmCanonicalInboundRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  readCanonicalThreadMetadata,
  readCanonicalUnreadCount,
  scopedCanonicalInboundThread,
} from "./drizzleCrmCanonicalInboundSupport.js";

export async function updateCanonicalInboundState(
  db: DrizzleCrmClient,
  input: CanonicalInboundMessageInput,
  thread: typeof conversationThreads.$inferSelect,
  cycle: typeof conversationCycles.$inferSelect,
) {
  const threadMetadata = readCanonicalThreadMetadata(thread.metadata);
  const cycleMetadata = readCanonicalThreadMetadata(cycle.metadata);
  const occurredAt = input.occurredAt.toISOString();
  const occurredAtSql = sql`${occurredAt}::timestamptz`;
  const newerThreadPreview = sql`${conversationThreads.lastMessageAt} is null or ${occurredAtSql} > ${conversationThreads.lastMessageAt}`;
  const newerCyclePreview = sql`${conversationCycles.lastMessageAt} is null or ${occurredAtSql} > ${conversationCycles.lastMessageAt}`;
  await Promise.all([
    db
      .update(conversationThreads)
      .set({
        customerChatId: input.customerChatId ?? thread.customerChatId,
        customerDisplayName:
          input.contactDisplayName ?? thread.customerDisplayName,
        customerPhone:
          input.identity.kind === "phone"
            ? input.identity.normalizedValue
            : (input.secondaryPhone ?? thread.customerPhone),
        lastMessageAt: sql`case when ${newerThreadPreview} then ${occurredAtSql} else ${conversationThreads.lastMessageAt} end`,
        metadata: {
          ...threadMetadata,
          ...(input.profilePhotoStorageKey
            ? { profilePhoto: { storageKey: input.profilePhotoStorageKey } }
            : {}),
          unreadCount: readCanonicalUnreadCount(threadMetadata) + 1,
        },
        profilePhotoUrl: input.profilePhotoUrl ?? thread.profilePhotoUrl,
        revision: sql`${conversationThreads.revision} + 1`,
        source: input.source ?? thread.source,
        state: "open",
        updatedAt: new Date(),
      })
      .where(scopedCanonicalInboundThread(input, thread.id)),
    db
      .update(conversationCycles)
      .set({
        freshLeadAt: cycle.freshLeadAt ?? input.occurredAt,
        lastMessageAt: sql`case when ${newerCyclePreview} then ${occurredAtSql} else ${conversationCycles.lastMessageAt} end`,
        lastMessageContent: sql`case when ${newerCyclePreview} then ${input.content} else ${conversationCycles.lastMessageContent} end`,
        messageCount: sql`${conversationCycles.messageCount} + 1`,
        metadata: {
          ...cycleMetadata,
          ...(input.leadId ? { leadId: input.leadId } : {}),
          cycleMetadata: {
            ...readCanonicalThreadMetadata(cycleMetadata.cycleMetadata),
            ...input.cycleMetadata,
          },
        },
        revision: sql`${conversationCycles.revision} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(conversationCycles.id, cycle.id),
          eq(conversationCycles.storeId, input.storeId),
          eq(conversationCycles.tenantId, input.tenantId),
        ),
      ),
  ]);
}

export async function readCanonicalInboundAttendanceState(
  db: DrizzleCrmClient,
  input: CanonicalInboundMessageInput,
  cycleId: string,
) {
  const [attendance] = await db
    .select({ state: conversationAttendances.state })
    .from(conversationAttendances)
    .where(
      and(
        eq(conversationAttendances.cycleId, cycleId),
        eq(conversationAttendances.storeId, input.storeId),
        eq(conversationAttendances.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!attendance) throw new Error("Canonical CRM attendance is missing.");
  return attendance.state;
}
