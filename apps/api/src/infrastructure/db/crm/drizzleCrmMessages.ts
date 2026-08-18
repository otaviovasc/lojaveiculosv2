import { crmMessages, conversationThreads } from "@lojaveiculosv2/db";
import { and, desc, eq, getTableColumns } from "drizzle-orm";
import type {
  FindCrmMessageByExternalIdInput,
  FindCrmMessageByIdInput,
  ListCrmMessagesInput,
  CrmMessageDirection,
  CrmMessageSenderOrigin,
  CrmMessageSenderType,
  CrmMessageStatus,
  UpdateCrmMessageInput,
} from "../../../domains/crm/ports/crmConversationRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { readRecord, toCrmMessage } from "./drizzleCrmConversationMappers.js";

export function toCanonicalDirection(direction: CrmMessageDirection) {
  return direction === "INBOUND" ? ("inbound" as const) : ("outbound" as const);
}

export function toCanonicalMessageStatus(status: CrmMessageStatus) {
  return status.toLowerCase() as Lowercase<CrmMessageStatus>;
}

export function toCanonicalSender(sender: CrmMessageSenderType) {
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
  origin: CrmMessageSenderOrigin | CanonicalMessageOrigin,
) {
  if (isCanonicalMessageOrigin(origin)) return origin;
  throw new Error("CRM message sender origin is not canonical.");
}

type CanonicalMessageOrigin = NonNullable<
  typeof crmMessages.$inferInsert.senderOrigin
>;

function isCanonicalMessageOrigin(
  origin: string,
): origin is CanonicalMessageOrigin {
  switch (origin) {
    case "customer":
    case "external_bot":
    case "human_channel":
    case "human_crm":
    case "system":
    case "unknown":
      return true;
    default:
      return false;
  }
}

export async function findCrmMessageDtoBySessionExternalId(
  db: DrizzleCrmClient,
  cycleId: string,
  externalId: string,
) {
  const [row] = await messageQuery(db)
    .where(
      and(
        eq(crmMessages.cycleId, cycleId),
        eq(crmMessages.providerMessageId, externalId),
      ),
    )
    .limit(1);
  return row;
}

export async function findCrmMessageDtoByConnectionExternalId(
  db: DrizzleCrmClient,
  input: FindCrmMessageByExternalIdInput,
) {
  const [row] = await messageQuery(db)
    .where(
      and(
        eq(crmMessages.providerConnectionId, input.connectionId),
        eq(crmMessages.providerMessageId, input.externalId),
        eq(crmMessages.storeId, input.storeId),
        eq(crmMessages.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return row;
}

export async function findCrmMessageDtoByExternalId(
  db: DrizzleCrmClient,
  input: FindCrmMessageByExternalIdInput,
) {
  const row = await findCrmMessageDtoByConnectionExternalId(db, input);
  return row ? toCrmMessage(row) : null;
}

export async function findCrmMessageDtoById(
  db: DrizzleCrmClient,
  input: FindCrmMessageByIdInput,
) {
  const [row] = await messageQuery(db)
    .where(
      and(
        eq(crmMessages.id, input.messageId),
        eq(crmMessages.storeId, input.storeId),
        eq(crmMessages.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return row ? toCrmMessage(row) : null;
}

export async function listMessages(
  db: DrizzleCrmClient,
  input: ListCrmMessagesInput,
) {
  const filters = [
    eq(crmMessages.storeId, input.storeId),
    eq(crmMessages.tenantId, input.tenantId),
    eq(crmMessages.cycleId, input.cycleId),
  ];
  if (input.direction)
    filters.push(
      eq(crmMessages.direction, toCanonicalDirection(input.direction)),
    );
  const rows = await messageQuery(db)
    .where(and(...filters))
    .orderBy(desc(crmMessages.occurredAt), desc(crmMessages.createdAt))
    .offset(input.offset)
    .limit(input.limit);
  return rows.map(toCrmMessage);
}

export async function updateCrmMessage(
  db: DrizzleCrmClient,
  input: UpdateCrmMessageInput,
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
    .update(crmMessages)
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
        eq(crmMessages.id, input.messageId),
        eq(crmMessages.storeId, input.storeId),
        eq(crmMessages.tenantId, input.tenantId),
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
  return toCrmMessage({ ...updated, channel: thread.channel });
}

function messageQuery(db: DrizzleCrmClient) {
  return db
    .select({
      ...getTableColumns(crmMessages),
      channel: conversationThreads.channel,
    })
    .from(crmMessages)
    .innerJoin(
      conversationThreads,
      eq(crmMessages.threadId, conversationThreads.id),
    );
}

async function findCanonicalMessageById(
  db: DrizzleCrmClient,
  input: FindCrmMessageByIdInput,
) {
  const [row] = await db
    .select()
    .from(crmMessages)
    .where(
      and(
        eq(crmMessages.id, input.messageId),
        eq(crmMessages.storeId, input.storeId),
        eq(crmMessages.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return row;
}
