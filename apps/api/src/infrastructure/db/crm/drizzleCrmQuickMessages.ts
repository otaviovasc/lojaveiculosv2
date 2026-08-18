import { and, asc, eq } from "drizzle-orm";
import { crmQuickMessages } from "@lojaveiculosv2/db";
import type {
  CreateCrmQuickMessageInput,
  CrmQuickMessage,
  FindCrmQuickMessageInput,
  ListCrmQuickMessagesInput,
  UpdateCrmQuickMessageInput,
} from "../../../domains/crm/ports/crmConversationRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function createCrmQuickMessage(
  db: DrizzleCrmClient,
  input: CreateCrmQuickMessageInput,
) {
  const [row] = await db
    .insert(crmQuickMessages)
    .values({
      content: input.content,
      createdByUserId: input.createdByUserId,
      kind: input.kind,
      mediaType: input.mediaType ?? null,
      mediaUrl: input.mediaUrl ?? null,
      shortcut: input.shortcut,
      sortOrder: input.sortOrder ?? 0,
      storageKey: input.storageKey ?? null,
      storeId: input.storeId,
      tenantId: input.tenantId,
      title: input.title,
    })
    .returning();
  if (!row) throw new Error("CRM WhatsApp quick message was not persisted.");
  return toCrmQuickMessage(row);
}

export async function deleteCrmQuickMessage(
  db: DrizzleCrmClient,
  input: FindCrmQuickMessageInput,
) {
  const [row] = await db
    .delete(crmQuickMessages)
    .where(quickMessageScope(input))
    .returning();
  return row ? toCrmQuickMessage(row) : null;
}

export async function findCrmQuickMessageById(
  db: DrizzleCrmClient,
  input: FindCrmQuickMessageInput,
) {
  const [row] = await db
    .select()
    .from(crmQuickMessages)
    .where(quickMessageScope(input))
    .limit(1);
  return row ? toCrmQuickMessage(row) : null;
}

export async function listCrmQuickMessages(
  db: DrizzleCrmClient,
  input: ListCrmQuickMessagesInput,
) {
  const filters = [
    eq(crmQuickMessages.storeId, input.storeId),
    eq(crmQuickMessages.tenantId, input.tenantId),
  ];
  if (!input.includeInactive) {
    filters.push(eq(crmQuickMessages.isActive, true));
  }
  const rows = await db
    .select()
    .from(crmQuickMessages)
    .where(and(...filters))
    .orderBy(asc(crmQuickMessages.sortOrder), asc(crmQuickMessages.shortcut));
  return rows.map(toCrmQuickMessage);
}

export async function updateCrmQuickMessage(
  db: DrizzleCrmClient,
  input: UpdateCrmQuickMessageInput,
) {
  const [row] = await db
    .update(crmQuickMessages)
    .set({
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.mediaType !== undefined ? { mediaType: input.mediaType } : {}),
      ...(input.mediaUrl !== undefined ? { mediaUrl: input.mediaUrl } : {}),
      ...(input.shortcut !== undefined ? { shortcut: input.shortcut } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.storageKey !== undefined
        ? { storageKey: input.storageKey }
        : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      updatedAt: new Date(),
    })
    .where(quickMessageScope(input))
    .returning();
  return row ? toCrmQuickMessage(row) : null;
}

function quickMessageScope(input: FindCrmQuickMessageInput) {
  return and(
    eq(crmQuickMessages.id, input.quickMessageId),
    eq(crmQuickMessages.storeId, input.storeId),
    eq(crmQuickMessages.tenantId, input.tenantId),
  );
}

function toCrmQuickMessage(
  row: typeof crmQuickMessages.$inferSelect,
): CrmQuickMessage {
  return {
    content: row.content,
    createdAt: row.createdAt,
    createdByUserId: row.createdByUserId as never,
    id: row.id,
    isActive: row.isActive,
    kind: row.kind,
    mediaType: row.mediaType,
    mediaUrl: row.mediaUrl,
    shortcut: row.shortcut,
    sortOrder: row.sortOrder,
    storageKey: row.storageKey,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
    title: row.title,
    updatedAt: row.updatedAt,
  };
}
