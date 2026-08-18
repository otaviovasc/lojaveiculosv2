import { canonicalMessages, conversationThreads } from "@lojaveiculosv2/db";
import { and, desc, eq, getTableColumns } from "drizzle-orm";
import type {
  FindCrmWhatsappMessageByExternalIdInput,
  FindCrmWhatsappMessageByIdInput,
  ListCrmWhatsappMessagesInput,
  CrmWhatsappMessageDirection,
  CrmWhatsappMessageSenderOrigin,
  CrmWhatsappMessageSenderType,
  CrmWhatsappMessageStatus,
  UpdateCrmWhatsappMessageInput,
} from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { readRecord, toWhatsappMessage } from "./drizzleCrmWhatsappMappers.js";

export function toCanonicalDirection(direction: CrmWhatsappMessageDirection) {
  return direction === "INBOUND" ? ("inbound" as const) : ("outbound" as const);
}

export function toCanonicalMessageStatus(status: CrmWhatsappMessageStatus) {
  return status.toLowerCase() as Lowercase<CrmWhatsappMessageStatus>;
}

export function toCanonicalSender(sender: CrmWhatsappMessageSenderType) {
  switch (sender) {
    case "AI":
      return "bot" as const;
    case "CUSTOMER":
      return "customer" as const;
    case "HUMAN":
      return "human" as const;
    case "SYSTEM":
      return "system" as const;
  }
}

export function toCanonicalSenderOrigin(
  origin: CrmWhatsappMessageSenderOrigin,
) {
  switch (origin) {
    case "bot_api":
      return "external_bot" as const;
    case "customer":
      return "customer" as const;
    case "human_crm":
      return "human_crm" as const;
    case "human_whatsapp":
      return "human_channel" as const;
    case "system":
      return "system" as const;
    case "unknown":
      return "unknown" as const;
  }
}

export async function findWhatsappMessageBySessionExternalId(
  db: DrizzleCrmClient,
  sessionId: string,
  externalId: string,
) {
  const [row] = await messageQuery(db)
    .where(
      and(
        eq(canonicalMessages.cycleId, sessionId),
        eq(canonicalMessages.providerMessageId, externalId),
      ),
    )
    .limit(1);
  return row;
}

export async function findWhatsappMessageByConnectionExternalId(
  db: DrizzleCrmClient,
  input: FindCrmWhatsappMessageByExternalIdInput,
) {
  const [row] = await messageQuery(db)
    .where(
      and(
        eq(canonicalMessages.providerConnectionId, input.connectionId),
        eq(canonicalMessages.providerMessageId, input.externalId),
        eq(canonicalMessages.storeId, input.storeId),
        eq(canonicalMessages.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return row;
}

export async function findWhatsappMessageByExternalId(
  db: DrizzleCrmClient,
  input: FindCrmWhatsappMessageByExternalIdInput,
) {
  const row = await findWhatsappMessageByConnectionExternalId(db, input);
  return row ? toWhatsappMessage(row) : null;
}

export async function findWhatsappMessageById(
  db: DrizzleCrmClient,
  input: FindCrmWhatsappMessageByIdInput,
) {
  const [row] = await messageQuery(db)
    .where(
      and(
        eq(canonicalMessages.id, input.messageId),
        eq(canonicalMessages.storeId, input.storeId),
        eq(canonicalMessages.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return row ? toWhatsappMessage(row) : null;
}

export async function listWhatsappMessages(
  db: DrizzleCrmClient,
  input: ListCrmWhatsappMessagesInput,
) {
  const filters = [
    eq(canonicalMessages.storeId, input.storeId),
    eq(canonicalMessages.tenantId, input.tenantId),
    eq(canonicalMessages.cycleId, input.sessionId),
  ];
  if (input.direction)
    filters.push(
      eq(canonicalMessages.direction, toCanonicalDirection(input.direction)),
    );
  const rows = await messageQuery(db)
    .where(and(...filters))
    .orderBy(
      desc(canonicalMessages.occurredAt),
      desc(canonicalMessages.createdAt),
    )
    .offset(input.offset)
    .limit(input.limit);
  return rows.map(toWhatsappMessage);
}

export async function updateWhatsappMessage(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappMessageInput,
) {
  const existing = await findCanonicalMessageById(db, input);
  if (!existing) return null;
  const metadata = readRecord(existing.metadata);
  const updatedMetadata = {
    ...metadata,
    ...(input.metadata ? { providerMetadata: input.metadata } : {}),
    ...(input.providerTimestamp !== undefined
      ? { providerTimestampCleared: input.providerTimestamp === null }
      : {}),
  };
  const [updated] = await db
    .update(canonicalMessages)
    .set({
      ...(input.deletedAt !== undefined ? { deletedAt: input.deletedAt } : {}),
      ...(input.externalId !== undefined
        ? { providerMessageId: input.externalId }
        : {}),
      ...(input.metadata || input.providerTimestamp !== undefined
        ? { metadata: updatedMetadata }
        : {}),
      ...(input.providerTimestamp !== undefined
        ? { occurredAt: input.providerTimestamp ?? existing.occurredAt }
        : {}),
      ...(input.status
        ? { status: toCanonicalMessageStatus(input.status) }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(canonicalMessages.id, input.messageId),
        eq(canonicalMessages.storeId, input.storeId),
        eq(canonicalMessages.tenantId, input.tenantId),
      ),
    )
    .returning();
  if (!updated) return null;
  const [thread] = await db
    .select({ channel: conversationThreads.channel })
    .from(conversationThreads)
    .where(eq(conversationThreads.id, updated.threadId))
    .limit(1);
  if (!thread) throw new Error("Canonical CRM message thread was not found.");
  return toWhatsappMessage({ ...updated, channel: thread.channel });
}

function messageQuery(db: DrizzleCrmClient) {
  return db
    .select({
      ...getTableColumns(canonicalMessages),
      channel: conversationThreads.channel,
    })
    .from(canonicalMessages)
    .innerJoin(
      conversationThreads,
      eq(canonicalMessages.threadId, conversationThreads.id),
    );
}

async function findCanonicalMessageById(
  db: DrizzleCrmClient,
  input: FindCrmWhatsappMessageByIdInput,
) {
  const [row] = await db
    .select()
    .from(canonicalMessages)
    .where(
      and(
        eq(canonicalMessages.id, input.messageId),
        eq(canonicalMessages.storeId, input.storeId),
        eq(canonicalMessages.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return row;
}
