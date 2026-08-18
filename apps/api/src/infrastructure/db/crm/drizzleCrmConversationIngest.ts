import { crmMessages } from "@lojaveiculosv2/db";
import type { crmChannelConnections } from "@lojaveiculosv2/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import type {
  IngestCrmMessageInput,
  UpsertCrmConversationCycleContextInput,
} from "../../../domains/crm/ports/crmConversationRepository.js";
import { reconciledOutboundEchoSender as reconcileDomainOutboundEchoSender } from "../../../domains/crm/whatsapp/reconcileWhatsappOutboundEcho.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  toCrmMessage,
  toConversationCycle,
  type CanonicalConversationCycleRow,
} from "./drizzleCrmConversationMappers.js";
import { countUnreadMessages } from "./drizzleCrmConversationQueries.js";
import {
  findCrmMessageDtoByConnectionExternalId,
  findCrmMessageDtoBySessionExternalId,
  toCanonicalDirection,
  toCanonicalMessageStatus,
  toCanonicalSender,
  toCanonicalSenderOrigin,
} from "./drizzleCrmMessages.js";
import {
  createCanonicalCycle,
  updateConversationCyclePreview,
} from "./drizzleCrmConversationCyclePreview.js";
import {
  findConversationCycleByIdentity,
  insertCanonicalSessionContext,
  requireCanonicalConnection,
  updateConversationCycleIdentity,
} from "./drizzleCrmConversationCycleIdentity.js";
import { findCanonicalSessionById } from "./drizzleCrmTagHydration.js";

export async function ingestMessageInDatabase(
  db: DrizzleCrmClient,
  input: IngestCrmMessageInput,
) {
  const connection = await requireCanonicalConnection(db, input);
  const duplicate = await findCrmMessageDtoByConnectionExternalId(db, {
    connectionId: input.connectionId,
    externalId: input.externalId,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
  if (duplicate) return duplicateIngestResult(db, input, duplicate);
  const conversationCycle = await findOrCreateSession(db, input);
  const inserted = await insertMessage(
    db,
    input,
    conversationCycle,
    connection.provider,
  );
  const createdMessage = Boolean(inserted);
  let message =
    inserted ??
    (await findCrmMessageDtoBySessionExternalId(
      db,
      conversationCycle.cycle.id,
      input.externalId,
    ));
  if (!message) throw new Error("Canonical CRM message was not persisted.");
  if (!createdMessage)
    message = await reconcileOutboundEchoSender(db, message, input);
  if (createdMessage)
    await updateConversationCyclePreview(db, input, conversationCycle);

  const updatedSession = await findCanonicalSessionById(
    db,
    conversationCycle.cycle.id,
    input,
  );
  if (!updatedSession)
    throw new Error("Canonical CRM conversation cycle was not found.");
  return {
    createdMessage,
    createdConversationCycle: conversationCycle.created,
    message: toCrmMessage(message),
    conversationCycle: toConversationCycle(
      updatedSession,
      await countUnreadMessages(db, updatedSession),
    ),
  };
}

async function duplicateIngestResult(
  db: DrizzleCrmClient,
  input: IngestCrmMessageInput,
  duplicate: NonNullable<
    Awaited<ReturnType<typeof findCrmMessageDtoByConnectionExternalId>>
  >,
) {
  const message = await reconcileOutboundEchoSender(db, duplicate, input);
  const conversationCycle = await findCanonicalSessionById(
    db,
    message.cycleId,
    input,
  );
  if (!conversationCycle)
    throw new Error("Canonical CRM duplicate message cycle was not found.");
  return {
    createdMessage: false,
    createdConversationCycle: false,
    message: toCrmMessage(message),
    conversationCycle: toConversationCycle(
      conversationCycle,
      await countUnreadMessages(db, conversationCycle),
    ),
  };
}

export function ingestMessageWithTransaction(
  db: DrizzleCrmClient,
  input: IngestCrmMessageInput,
  disableTransactions: boolean,
) {
  const execute = (client: DrizzleCrmClient) =>
    ingestMessageInDatabase(client, input);
  return disableTransactions
    ? execute(db)
    : db.transaction(async (tx) => execute(tx as DrizzleCrmClient));
}

export async function upsertConversationCycleContextInDatabase(
  db: DrizzleCrmClient,
  input: UpsertCrmConversationCycleContextInput,
) {
  await requireCanonicalConnection(db, input);
  const existing = await findConversationCycleByIdentity(db, input);
  const updated = existing
    ? await updateConversationCycleIdentity(db, existing, input)
    : null;
  const row = updated
    ? updated.cycle.state === "active"
      ? updated
      : await createCanonicalCycle(db, input, updated.thread)
    : await insertCanonicalSessionContext(db, input);
  return toConversationCycle(row, await countUnreadMessages(db, row));
}

export function upsertConversationCycleContextWithTransaction(
  db: DrizzleCrmClient,
  input: UpsertCrmConversationCycleContextInput,
  disableTransactions: boolean,
) {
  const execute = (client: DrizzleCrmClient) =>
    upsertConversationCycleContextInDatabase(client, input);
  return disableTransactions
    ? execute(db)
    : db.transaction(async (tx) => execute(tx as DrizzleCrmClient));
}

async function findOrCreateSession(
  db: DrizzleCrmClient,
  input: IngestCrmMessageInput,
) {
  const existing = await findConversationCycleByIdentity(db, input);
  if (existing?.cycle.state === "active") {
    const updated = await updateConversationCycleIdentity(db, existing, input);
    return { ...updated, created: false };
  }
  if (existing) {
    const updated = await updateConversationCycleIdentity(db, existing, input);
    return {
      ...(await createCanonicalCycle(db, input, updated.thread)),
      created: true,
    };
  }
  return { ...(await insertCanonicalSessionContext(db, input)), created: true };
}

async function insertMessage(
  db: DrizzleCrmClient,
  input: IngestCrmMessageInput,
  conversationCycle: CanonicalConversationCycleRow & { created: boolean },
  provider: typeof crmChannelConnections.$inferSelect.provider,
) {
  const [row] = await db
    .insert(crmMessages)
    .values({
      content: input.content,
      cycleId: conversationCycle.cycle.id,
      direction: toCanonicalDirection(input.direction),
      mediaType: input.mediaType ?? null,
      mediaUrl: input.mediaUrl ?? null,
      messageType: input.type,
      metadata: {
        ...(input.channelMessageId
          ? { channelMessageId: input.channelMessageId }
          : {}),
        providerMetadata: input.metadata,
      },
      occurredAt: input.providerTimestamp,
      provider,
      providerConnectionId: input.connectionId,
      providerMessageId: input.externalId,
      sender: toCanonicalSender(input.senderType),
      senderOrigin: toCanonicalSenderOrigin(input.senderOrigin),
      status: toCanonicalMessageStatus(input.status),
      threadId: conversationCycle.thread.id,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing({
      target: [crmMessages.providerConnectionId, crmMessages.providerMessageId],
      where: sql`${crmMessages.providerMessageId} IS NOT NULL`,
    })
    .returning();
  return row
    ? { ...row, channel: conversationCycle.thread.channel }
    : undefined;
}

async function reconcileOutboundEchoSender(
  db: DrizzleCrmClient,
  message: NonNullable<
    Awaited<ReturnType<typeof findCrmMessageDtoBySessionExternalId>>
  >,
  input: IngestCrmMessageInput,
) {
  const reconciled = reconcileDomainOutboundEchoSender(
    toCrmMessage(message),
    input,
  );
  if (!reconciled) return message;
  const [updated] = await db
    .update(crmMessages)
    .set({
      sender: toCanonicalSender(reconciled.senderType),
      senderOrigin: toCanonicalSenderOrigin(reconciled.senderOrigin),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(crmMessages.id, message.id),
        eq(crmMessages.direction, "outbound"),
        inArray(crmMessages.senderOrigin, ["unknown", "human_channel"]),
        eq(crmMessages.storeId, input.storeId),
        eq(crmMessages.tenantId, input.tenantId),
      ),
    )
    .returning();
  return updated ? { ...updated, channel: message.channel } : message;
}
