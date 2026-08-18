import {
  conversationAttendances,
  conversationCycles,
  conversationThreads,
  conversationThreadTags,
  crmTags,
} from "@lojaveiculosv2/db";
import { and, asc, eq } from "drizzle-orm";
import type { CrmConversationCycle } from "../../../domains/crm/ports/crmConversationRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { toConversationCycle } from "./drizzleCrmConversationMappers.js";
import {
  canonicalConversationCycleSelection,
  countUnreadMessages,
} from "./drizzleCrmConversationQueries.js";

export async function hydrateConversationCycle(
  db: DrizzleCrmClient,
  conversationCycle: CrmConversationCycle,
) {
  return {
    ...conversationCycle,
    tags: await listTagsForThread(
      db,
      await threadIdForCycle(db, conversationCycle.id, conversationCycle),
    ),
  };
}

export async function findHydratedSessionById(
  db: DrizzleCrmClient,
  cycleId: string,
  scope: { storeId: string; tenantId: string },
) {
  const row = await findCanonicalSessionById(db, cycleId, scope);
  if (!row) return null;
  const conversationCycle = toConversationCycle(
    row,
    await countUnreadMessages(db, row),
  );
  return {
    ...conversationCycle,
    tags: await listTagsForThread(db, row.thread.id),
  };
}

export async function findCanonicalSessionById(
  db: DrizzleCrmClient,
  cycleId: string,
  scope: { storeId: string; tenantId: string },
) {
  const [row] = await db
    .select(canonicalConversationCycleSelection())
    .from(conversationCycles)
    .innerJoin(
      conversationThreads,
      eq(conversationCycles.threadId, conversationThreads.id),
    )
    .innerJoin(
      conversationAttendances,
      eq(conversationAttendances.cycleId, conversationCycles.id),
    )
    .where(
      and(
        eq(conversationCycles.id, cycleId),
        eq(conversationCycles.storeId, scope.storeId as never),
        eq(conversationCycles.tenantId, scope.tenantId as never),
      ),
    )
    .limit(1);
  return row;
}

export function toCrmTag(row: typeof crmTags.$inferSelect) {
  return {
    color: row.color,
    connectionId: row.connectionId,
    emoji: row.emoji,
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
  };
}

async function listTagsForThread(db: DrizzleCrmClient, threadId: string) {
  const rows = await db
    .select({ tag: crmTags })
    .from(conversationThreadTags)
    .innerJoin(crmTags, eq(conversationThreadTags.tagId, crmTags.id))
    .where(eq(conversationThreadTags.threadId, threadId))
    .orderBy(asc(crmTags.sortOrder), asc(crmTags.name));
  return rows.map((row) => toCrmTag(row.tag));
}

async function threadIdForCycle(
  db: DrizzleCrmClient,
  cycleId: string,
  scope: { storeId: string; tenantId: string },
) {
  const [row] = await db
    .select({ threadId: conversationCycles.threadId })
    .from(conversationCycles)
    .where(
      and(
        eq(conversationCycles.id, cycleId),
        eq(conversationCycles.storeId, scope.storeId as never),
        eq(conversationCycles.tenantId, scope.tenantId as never),
      ),
    )
    .limit(1);
  if (!row) throw new Error("Canonical CRM conversation cycle was not found.");
  return row.threadId;
}
