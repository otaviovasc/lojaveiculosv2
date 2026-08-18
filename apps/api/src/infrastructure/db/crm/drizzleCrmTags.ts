import { and, asc, eq, ilike, isNull } from "drizzle-orm";
import { conversationThreadTags, crmTags } from "@lojaveiculosv2/db";
import type {
  CreateCrmTagInput,
  DeleteCrmTagInput,
  FindOrCreateCrmTagInput,
  ListCrmTagsInput,
  ReorderCrmTagsInput,
  UpdateCrmTagInput,
} from "../../../domains/crm/ports/crmConversationRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  hydrateConversationCycle,
  toCrmTag,
} from "./drizzleCrmTagHydration.js";

export { hydrateConversationCycle };
export async function findOrCreateWhatsappTag(
  db: DrizzleCrmClient,
  input: FindOrCreateCrmTagInput,
) {
  return createOrFindWhatsappTag(db, input);
}
export async function createWhatsappTag(
  db: DrizzleCrmClient,
  input: CreateCrmTagInput,
) {
  return createOrFindWhatsappTag(db, input);
}
export async function updateWhatsappTag(
  db: DrizzleCrmClient,
  input: UpdateCrmTagInput,
) {
  const [row] = await db
    .update(crmTags)
    .set({
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.emoji !== undefined ? { emoji: input.emoji } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(crmTags.id, input.id),
        eq(crmTags.storeId, input.storeId as never),
        eq(crmTags.tenantId, input.tenantId as never),
      ),
    )
    .returning();
  return row ? toCrmTag(row) : null;
}
export async function deleteWhatsappTag(
  db: DrizzleCrmClient,
  input: DeleteCrmTagInput,
) {
  await db
    .delete(conversationThreadTags)
    .where(
      and(
        eq(conversationThreadTags.tagId, input.id),
        eq(conversationThreadTags.storeId, input.storeId as never),
        eq(conversationThreadTags.tenantId, input.tenantId as never),
      ),
    );
  const [row] = await db
    .delete(crmTags)
    .where(
      and(
        eq(crmTags.id, input.id),
        eq(crmTags.storeId, input.storeId as never),
        eq(crmTags.tenantId, input.tenantId as never),
      ),
    )
    .returning();
  return row ? toCrmTag(row) : null;
}
export async function reorderWhatsappTags(
  db: DrizzleCrmClient,
  input: ReorderCrmTagsInput,
) {
  for (const [sortOrder, tagId] of input.tagIds.entries()) {
    await db
      .update(crmTags)
      .set({ sortOrder, updatedAt: new Date() })
      .where(
        and(
          eq(crmTags.id, tagId),
          eq(crmTags.storeId, input.storeId as never),
          eq(crmTags.tenantId, input.tenantId as never),
        ),
      );
  }
  return listAllScopedTags(db, input);
}
export async function listCrmTags(
  db: DrizzleCrmClient,
  input: ListCrmTagsInput,
) {
  const filters = [
    eq(crmTags.storeId, input.storeId as never),
    eq(crmTags.tenantId, input.tenantId as never),
  ];
  if (input.connectionId !== undefined) {
    filters.push(
      input.connectionId
        ? eq(crmTags.connectionId, input.connectionId)
        : isNull(crmTags.connectionId),
    );
  }
  if (input.search) filters.push(ilike(crmTags.name, `%${input.search}%`));
  const rows = await db
    .select()
    .from(crmTags)
    .where(and(...filters))
    .orderBy(asc(crmTags.sortOrder), asc(crmTags.name))
    .limit(input.limit);
  return rows.map(toCrmTag);
}
async function createOrFindWhatsappTag(
  db: DrizzleCrmClient,
  input: CreateCrmTagInput,
) {
  const existing = await findTagByName(db, input);
  if (existing) return existing;
  const [inserted] = await db
    .insert(crmTags)
    .values({
      color: input.color ?? "#64748b",
      connectionId: input.connectionId ?? null,
      emoji: input.emoji ?? null,
      name: input.name,
      sortOrder: input.sortOrder ?? 0,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing({
      target: [crmTags.storeId, crmTags.connectionId, crmTags.name],
    })
    .returning();
  if (inserted) return toCrmTag(inserted);
  const persisted = await findTagByName(db, input);
  if (!persisted) throw new Error("CRM WhatsApp tag was not persisted.");
  return persisted;
}
async function listAllScopedTags(
  db: DrizzleCrmClient,
  input: { storeId: string; tenantId: string },
) {
  const rows = await db
    .select()
    .from(crmTags)
    .where(
      and(
        eq(crmTags.storeId, input.storeId as never),
        eq(crmTags.tenantId, input.tenantId as never),
      ),
    )
    .orderBy(asc(crmTags.sortOrder), asc(crmTags.name));
  return rows.map(toCrmTag);
}
async function findTagByName(
  db: DrizzleCrmClient,
  input: {
    connectionId?: string | null;
    name: string;
    storeId: string;
    tenantId: string;
  },
) {
  const connectionId = input.connectionId ?? null;
  const connectionFilter = connectionId
    ? eq(crmTags.connectionId, connectionId)
    : isNull(crmTags.connectionId);
  const [row] = await db
    .select()
    .from(crmTags)
    .where(
      and(
        eq(crmTags.storeId, input.storeId as never),
        eq(crmTags.tenantId, input.tenantId as never),
        connectionFilter,
        eq(crmTags.name, input.name),
      ),
    )
    .limit(1);
  return row ? toCrmTag(row) : null;
}
