import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  crmMessages,
  conversationCycles,
  conversationThreads,
} from "@lojaveiculosv2/db";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

type CanonicalScope = {
  connectionId?: string;
  storeId: string;
  tenantId: string;
};

export async function findCanonicalThreadIdForCycle(
  db: DrizzleCrmClient,
  input: CanonicalScope & { cycleId: string },
) {
  const [row] = await db
    .select({ threadId: conversationCycles.threadId })
    .from(conversationCycles)
    .innerJoin(
      conversationThreads,
      eq(conversationThreads.id, conversationCycles.threadId),
    )
    .where(
      and(
        eq(conversationCycles.id, input.cycleId),
        eq(conversationCycles.storeId, input.storeId),
        eq(conversationCycles.tenantId, input.tenantId),
        ...(input.connectionId
          ? [eq(conversationThreads.providerConnectionId, input.connectionId)]
          : []),
      ),
    )
    .limit(1);
  if (!row) throw new Error("Canonical CRM cycle was not found.");
  return row.threadId;
}

export async function findCanonicalMessageContext(
  db: DrizzleCrmClient,
  input: CanonicalScope & {
    connectionId: string;
    cycleId: string;
    messageId: string;
  },
) {
  const [row] = await db
    .select({ threadId: crmMessages.threadId })
    .from(crmMessages)
    .where(
      and(
        eq(crmMessages.id, input.messageId),
        eq(crmMessages.cycleId, input.cycleId),
        eq(crmMessages.providerConnectionId, input.connectionId),
        eq(crmMessages.storeId, input.storeId),
        eq(crmMessages.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!row) throw new Error("Canonical CRM message was not found.");
  return row;
}

export async function findCanonicalCycleIdsByThread(
  db: DrizzleCrmClient,
  input: {
    storeId: string;
    tenantId: string;
    threadIds: readonly string[];
  },
) {
  const rows = await db
    .select({
      id: conversationCycles.id,
      threadId: conversationCycles.threadId,
    })
    .from(conversationCycles)
    .where(
      and(
        eq(conversationCycles.storeId, input.storeId),
        eq(conversationCycles.tenantId, input.tenantId),
        inArray(
          conversationCycles.threadId,
          Array.from(new Set(input.threadIds)),
        ),
      ),
    )
    .orderBy(
      sql`${conversationCycles.state} = 'active' desc`,
      desc(conversationCycles.createdAt),
    );
  const cycleIdByThread = new Map<string, string>();
  for (const cycle of rows) {
    if (!cycleIdByThread.has(cycle.threadId)) {
      cycleIdByThread.set(cycle.threadId, cycle.id);
    }
  }
  return cycleIdByThread;
}
