import {
  conversationAttendances,
  conversationCycles,
  conversationThreads,
  conversationThreadTags,
  crmTags,
} from "@lojaveiculosv2/db";
import { and, asc, eq } from "drizzle-orm";
import type { CrmWhatsappSession } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { toWhatsappSession } from "./drizzleCrmWhatsappMappers.js";
import {
  canonicalSessionSelection,
  countUnreadMessages,
} from "./drizzleCrmWhatsappQueries.js";

export async function hydrateWhatsappSession(
  db: DrizzleCrmClient,
  session: CrmWhatsappSession,
) {
  return {
    ...session,
    sessionTags: await listTagsForThread(
      db,
      await threadIdForCycle(db, session.id, session),
    ),
  };
}

export async function findHydratedSessionById(
  db: DrizzleCrmClient,
  sessionId: string,
  scope: { storeId: string; tenantId: string },
) {
  const row = await findCanonicalSessionById(db, sessionId, scope);
  if (!row) return null;
  const session = toWhatsappSession(row, await countUnreadMessages(db, row));
  return {
    ...session,
    sessionTags: await listTagsForThread(db, row.thread.id),
  };
}

export async function findCanonicalSessionById(
  db: DrizzleCrmClient,
  sessionId: string,
  scope: { storeId: string; tenantId: string },
) {
  const [row] = await db
    .select(canonicalSessionSelection())
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
        eq(conversationCycles.id, sessionId),
        eq(conversationCycles.storeId, scope.storeId as never),
        eq(conversationCycles.tenantId, scope.tenantId as never),
      ),
    )
    .limit(1);
  return row;
}

export function toCrmWhatsappTag(row: typeof crmTags.$inferSelect) {
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
  return rows.map((row) => toCrmWhatsappTag(row.tag));
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
