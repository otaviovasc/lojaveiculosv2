import {
  conversationCycles,
  conversationThreadTags,
  crmTags,
} from "@lojaveiculosv2/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import type {
  CountCrmWhatsappSessionsInput,
  UpdateCrmWhatsappSessionTagInput,
} from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { findHydratedSessionById } from "./drizzleCrmWhatsappTagHydration.js";

export async function findSessionIdsByTags(
  db: DrizzleCrmClient,
  input: CountCrmWhatsappSessionsInput,
) {
  if (!input.tagIds?.length) return null;
  const rows = await db
    .select({ sessionId: conversationThreadTags.threadId })
    .from(conversationThreadTags)
    .where(
      and(
        eq(conversationThreadTags.storeId, input.storeId),
        eq(conversationThreadTags.tenantId, input.tenantId),
        inArray(conversationThreadTags.tagId, input.tagIds),
      ),
    );
  return Array.from(new Set(rows.map((row) => row.sessionId)));
}

export function mutateWhatsappSessionTagWithTransaction(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappSessionTagInput,
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
  input: UpdateCrmWhatsappSessionTagInput,
  operation: "add" | "remove",
) {
  const session = await findHydratedSessionById(db, input.sessionId, input);
  if (!session) return null;
  const threadId = await findThreadId(db, input);
  if (!threadId) return null;
  if (operation === "add" && !(await hasScopedTag(db, input))) return session;
  const changed =
    operation === "add"
      ? await addTag(db, input, threadId)
      : await removeTag(db, input, threadId);
  if (!changed) return session;
  await db
    .update(conversationCycles)
    .set({
      revision: sql`${conversationCycles.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(conversationCycles.id, input.sessionId),
        eq(conversationCycles.storeId, input.storeId),
        eq(conversationCycles.tenantId, input.tenantId),
      ),
    );
  return findHydratedSessionById(db, input.sessionId, input);
}

async function addTag(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappSessionTagInput,
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
  input: UpdateCrmWhatsappSessionTagInput,
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
  input: UpdateCrmWhatsappSessionTagInput,
) {
  const [row] = await db
    .select({ threadId: conversationCycles.threadId })
    .from(conversationCycles)
    .where(
      and(
        eq(conversationCycles.id, input.sessionId),
        eq(conversationCycles.storeId, input.storeId),
        eq(conversationCycles.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return row?.threadId ?? null;
}

async function hasScopedTag(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappSessionTagInput,
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
