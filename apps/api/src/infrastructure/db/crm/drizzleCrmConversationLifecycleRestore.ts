import { conversationCycles } from "@lojaveiculosv2/db";
import { and, eq, sql } from "drizzle-orm";
import type { IngestCrmMessageInput } from "../../../domains/crm/ports/crmConversationRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import type { CanonicalConversationCycleRow } from "./drizzleCrmConversationMappers.js";

/**
 * WhatsApp-like semantics: a new inbound message resurfaces archived cycles
 * and restores soft-deleted ones instead of black-holing into a hidden cycle.
 */
export async function restoreSessionLifecycle(
  db: DrizzleCrmClient,
  conversationCycle: CanonicalConversationCycleRow,
  input: IngestCrmMessageInput,
) {
  if (!conversationCycle.cycle.deletedAt && !conversationCycle.cycle.archivedAt)
    return conversationCycle;
  const [restored] = await db
    .update(conversationCycles)
    .set({
      archivedAt: null,
      deletedAt: null,
      revision: sql`${conversationCycles.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(conversationCycles.id, conversationCycle.cycle.id),
        eq(conversationCycles.storeId, input.storeId),
        eq(conversationCycles.tenantId, input.tenantId),
      ),
    )
    .returning();
  if (!restored)
    throw new Error("Canonical CRM conversation cycle was not found.");
  return { ...conversationCycle, cycle: restored };
}
