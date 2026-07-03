import { and, asc, eq } from "drizzle-orm";
import { crmWhatsappQuickMessages } from "@lojaveiculosv2/db";
import type {
  CreateCrmWhatsappQuickMessageInput,
  CrmWhatsappQuickMessage,
  FindCrmWhatsappQuickMessageInput,
  ListCrmWhatsappQuickMessagesInput,
  UpdateCrmWhatsappQuickMessageInput,
} from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function createWhatsappQuickMessage(
  db: DrizzleCrmClient,
  input: CreateCrmWhatsappQuickMessageInput,
) {
  const [row] = await db
    .insert(crmWhatsappQuickMessages)
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
  return toWhatsappQuickMessage(row);
}

export async function deleteWhatsappQuickMessage(
  db: DrizzleCrmClient,
  input: FindCrmWhatsappQuickMessageInput,
) {
  const [row] = await db
    .delete(crmWhatsappQuickMessages)
    .where(quickMessageScope(input))
    .returning();
  return row ? toWhatsappQuickMessage(row) : null;
}

export async function findWhatsappQuickMessageById(
  db: DrizzleCrmClient,
  input: FindCrmWhatsappQuickMessageInput,
) {
  const [row] = await db
    .select()
    .from(crmWhatsappQuickMessages)
    .where(quickMessageScope(input))
    .limit(1);
  return row ? toWhatsappQuickMessage(row) : null;
}

export async function listWhatsappQuickMessages(
  db: DrizzleCrmClient,
  input: ListCrmWhatsappQuickMessagesInput,
) {
  const filters = [
    eq(crmWhatsappQuickMessages.storeId, input.storeId),
    eq(crmWhatsappQuickMessages.tenantId, input.tenantId),
  ];
  if (!input.includeInactive) {
    filters.push(eq(crmWhatsappQuickMessages.isActive, true));
  }
  const rows = await db
    .select()
    .from(crmWhatsappQuickMessages)
    .where(and(...filters))
    .orderBy(
      asc(crmWhatsappQuickMessages.sortOrder),
      asc(crmWhatsappQuickMessages.shortcut),
    );
  return rows.map(toWhatsappQuickMessage);
}

export async function updateWhatsappQuickMessage(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappQuickMessageInput,
) {
  const [row] = await db
    .update(crmWhatsappQuickMessages)
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
  return row ? toWhatsappQuickMessage(row) : null;
}

function quickMessageScope(input: FindCrmWhatsappQuickMessageInput) {
  return and(
    eq(crmWhatsappQuickMessages.id, input.quickMessageId),
    eq(crmWhatsappQuickMessages.storeId, input.storeId),
    eq(crmWhatsappQuickMessages.tenantId, input.tenantId),
  );
}

function toWhatsappQuickMessage(
  row: typeof crmWhatsappQuickMessages.$inferSelect,
): CrmWhatsappQuickMessage {
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
