import {
  conversationCycles,
  conversationThreadTags,
  crmTags,
} from "@lojaveiculosv2/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import type {
  CountCrmConversationCyclesInput,
  UpdateCrmConversationCycleTagInput,
} from "../../../domains/crm/ports/crmConversationRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { findHydratedSessionById } from "./drizzleCrmTagHydration.js";

export async function findSessionIdsByTags(
  db: DrizzleCrmClient,
  input: CountCrmConversationCyclesInput,
) {
  if (!input.tagIds?.length) return null;
  const rows = await db
    .select({ cycleId: conversationThreadTags.threadId })
    .from(conversationThreadTags)
    .where(
      and(
        eq(conversationThreadTags.storeId, input.storeId),
        eq(conversationThreadTags.tenantId, input.tenantId),
        inArray(conversationThreadTags.tagId, input.tagIds),
      ),
    );
  return Array.from(new Set(rows.map((row) => row.cycleId)));
}

export function mutateConversationCycleTagWithTransaction(
  db: DrizzleCrmClient,
  input: UpdateCrmConversationCycleTagInput,
  operation: "add" | "remove",
  disableTransactions: boolean,
) {
  const execute = (client: DrizzleCrmClient) =>
    mutateSessionTag(client, input, operation);
  return disableTransactions
    ? execute(db)
    : db.transaction(async (tx) => execute(tx as DrizzleCrmClient));
}

async function mutateSessionTag(
  db: DrizzleCrmClient,
  input: UpdateCrmConversationCycleTagInput,
  operation: "add" | "remove",
) {
  const conversationCycle = await findHydratedSessionById(
    db,
    input.cycleId,
    input,
  );
  if (!conversationCycle) return null;
  const threadId = await findThreadId(db, input);
  if (!threadId) return null;
  if (operation === "add" && !(await hasScopedTag(db, input)))
    return conversationCycle;
  const changed =
    operation === "add"
      ? await addTag(db, input, threadId)
      : await removeTag(db, input, threadId);
  if (!changed) return conversationCycle;
  await db
    .update(conversationCycles)
    .set({
      revision: sql`${conversationCycles.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(conversationCycles.id, input.cycleId),
        eq(conversationCycles.storeId, input.storeId),
        eq(conversationCycles.tenantId, input.tenantId),
      ),
    );
  return findHydratedSessionById(db, input.cycleId, input);
}

async function addTag(
  db: DrizzleCrmClient,
  input: UpdateCrmConversationCycleTagInput,
  threadId: string,
) {
  const [row] = await db
    .insert(conversationThreadTags)
    .values({
      threadId,
      storeId: input.storeId,
      tagId: input.tagId,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing({
      target: [conversationThreadTags.threadId, conversationThreadTags.tagId],
    })
    .returning({ id: conversationThreadTags.id });
  return Boolean(row);
}

async function removeTag(
  db: DrizzleCrmClient,
  input: UpdateCrmConversationCycleTagInput,
  threadId: string,
) {
  const [row] = await db
    .delete(conversationThreadTags)
    .where(
      and(
        eq(conversationThreadTags.threadId, threadId),
        eq(conversationThreadTags.tagId, input.tagId),
        eq(conversationThreadTags.storeId, input.storeId),
        eq(conversationThreadTags.tenantId, input.tenantId),
      ),
    )
    .returning({ id: conversationThreadTags.id });
  return Boolean(row);
}

async function findThreadId(
  db: DrizzleCrmClient,
  input: UpdateCrmConversationCycleTagInput,
) {
  const [row] = await db
    .select({ threadId: conversationCycles.threadId })
    .from(conversationCycles)
    .where(
      and(
        eq(conversationCycles.id, input.cycleId),
        eq(conversationCycles.storeId, input.storeId),
        eq(conversationCycles.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return row?.threadId ?? null;
}

async function hasScopedTag(
  db: DrizzleCrmClient,
  input: UpdateCrmConversationCycleTagInput,
) {
  const [row] = await db
    .select({ id: crmTags.id })
    .from(crmTags)
    .where(
      and(
        eq(crmTags.id, input.tagId),
        eq(crmTags.storeId, input.storeId as never),
        eq(crmTags.tenantId, input.tenantId as never),
      ),
    )
    .limit(1);
  return Boolean(row);
}
