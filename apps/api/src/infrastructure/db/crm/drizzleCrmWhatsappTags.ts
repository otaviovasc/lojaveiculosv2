import { and, asc, eq, ilike, isNull } from "drizzle-orm";
import { crmTags, crmWhatsappSessionTags } from "@lojaveiculosv2/db";
import type {
  CreateCrmWhatsappTagInput,
  DeleteCrmWhatsappTagInput,
  FindOrCreateCrmWhatsappTagInput,
  ListCrmWhatsappTagsInput,
  ReorderCrmWhatsappTagsInput,
  UpdateCrmWhatsappTagInput,
  UpdateCrmWhatsappSessionTagInput,
} from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  findHydratedSessionById,
  hydrateWhatsappSession,
  toCrmWhatsappTag,
} from "./drizzleCrmWhatsappTagHydration.js";

export { hydrateWhatsappSession };
export async function addWhatsappSessionTag(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappSessionTagInput,
) {
  const tag = await findScopedTagById(db, input);
  if (!tag) return findHydratedSessionById(db, input.sessionId, input);
  await db
    .insert(crmWhatsappSessionTags)
    .values({
      sessionId: input.sessionId,
      storeId: input.storeId,
      tagId: input.tagId,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing({
      target: [crmWhatsappSessionTags.sessionId, crmWhatsappSessionTags.tagId],
    });
  return findHydratedSessionById(db, input.sessionId, input);
}
export async function removeWhatsappSessionTag(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappSessionTagInput,
) {
  await db
    .delete(crmWhatsappSessionTags)
    .where(
      and(
        eq(crmWhatsappSessionTags.sessionId, input.sessionId),
        eq(crmWhatsappSessionTags.tagId, input.tagId),
        eq(crmWhatsappSessionTags.storeId, input.storeId),
        eq(crmWhatsappSessionTags.tenantId, input.tenantId),
      ),
    );
  return findHydratedSessionById(db, input.sessionId, input);
}
export async function findOrCreateWhatsappTag(
  db: DrizzleCrmClient,
  input: FindOrCreateCrmWhatsappTagInput,
) {
  return createOrFindWhatsappTag(db, input);
}
export async function createWhatsappTag(
  db: DrizzleCrmClient,
  input: CreateCrmWhatsappTagInput,
) {
  return createOrFindWhatsappTag(db, input);
}
export async function updateWhatsappTag(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappTagInput,
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
  return row ? toCrmWhatsappTag(row) : null;
}
export async function deleteWhatsappTag(
  db: DrizzleCrmClient,
  input: DeleteCrmWhatsappTagInput,
) {
  await db
    .delete(crmWhatsappSessionTags)
    .where(
      and(
        eq(crmWhatsappSessionTags.tagId, input.id),
        eq(crmWhatsappSessionTags.storeId, input.storeId as never),
        eq(crmWhatsappSessionTags.tenantId, input.tenantId as never),
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
  return row ? toCrmWhatsappTag(row) : null;
}
export async function reorderWhatsappTags(
  db: DrizzleCrmClient,
  input: ReorderCrmWhatsappTagsInput,
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
export async function listWhatsappTags(
  db: DrizzleCrmClient,
  input: ListCrmWhatsappTagsInput,
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
  return rows.map(toCrmWhatsappTag);
}
async function createOrFindWhatsappTag(
  db: DrizzleCrmClient,
  input: CreateCrmWhatsappTagInput,
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
  if (inserted) return toCrmWhatsappTag(inserted);
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
  return rows.map(toCrmWhatsappTag);
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
  return row ? toCrmWhatsappTag(row) : null;
}
async function findScopedTagById(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappSessionTagInput,
) {
  const [row] = await db
    .select()
    .from(crmTags)
    .where(
      and(
        eq(crmTags.id, input.tagId),
        eq(crmTags.storeId, input.storeId as never),
        eq(crmTags.tenantId, input.tenantId as never),
      ),
    )
    .limit(1);
  return row ? toCrmWhatsappTag(row) : null;
}
