import {
  conversationAttendances,
  conversationCycles,
  conversationThreads,
} from "@lojaveiculosv2/db";
import { and, eq } from "drizzle-orm";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { toConversationCycle } from "./drizzleCrmConversationMappers.js";
import {
  canonicalConversationCycleSelection,
  countUnreadMessages,
} from "./drizzleCrmConversationQueries.js";

export async function findHydratedSessionById(
  db: DrizzleCrmClient,
  cycleId: string,
  scope: { storeId: string; tenantId: string },
) {
  const row = await findCanonicalSessionById(db, cycleId, scope);
  if (!row) return null;
  return toConversationCycle(row, await countUnreadMessages(db, row));
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
