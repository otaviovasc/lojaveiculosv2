import { canonicalMessages } from "@lojaveiculosv2/db";
import type { providerConnections } from "@lojaveiculosv2/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import type {
  IngestCrmWhatsappMessageInput,
  UpsertCrmWhatsappSessionContextInput,
} from "../../../domains/crm/ports/crmWhatsappRepository.js";
import { reconciledOutboundEchoSender as reconcileDomainOutboundEchoSender } from "../../../domains/crm/whatsapp/reconcileWhatsappOutboundEcho.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  toWhatsappMessage,
  toWhatsappSession,
  type CanonicalWhatsappSessionRow,
} from "./drizzleCrmWhatsappMappers.js";
import { countUnreadMessages } from "./drizzleCrmWhatsappQueries.js";
import {
  findWhatsappMessageByConnectionExternalId,
  findWhatsappMessageBySessionExternalId,
  toCanonicalDirection,
  toCanonicalMessageStatus,
  toCanonicalSender,
  toCanonicalSenderOrigin,
} from "./drizzleCrmWhatsappMessages.js";
import {
  createCanonicalCycle,
  updateSessionPreview,
} from "./drizzleCrmWhatsappSessionPreview.js";
import {
  findWhatsappSessionByIdentity,
  insertCanonicalSessionContext,
  requireCanonicalConnection,
  updateWhatsappSessionIdentity,
} from "./drizzleCrmWhatsappSessionIdentity.js";
import { findCanonicalSessionById } from "./drizzleCrmWhatsappTagHydration.js";

export async function ingestMessageInDatabase(
  db: DrizzleCrmClient,
  input: IngestCrmWhatsappMessageInput,
) {
  const connection = await requireCanonicalConnection(db, input);
  const duplicate = await findWhatsappMessageByConnectionExternalId(db, {
    connectionId: input.connectionId,
    externalId: input.externalId,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
  if (duplicate) return duplicateIngestResult(db, input, duplicate);
  const session = await findOrCreateSession(db, input);
  const inserted = await insertMessage(db, input, session, connection.provider);
  const createdMessage = Boolean(inserted);
  let message =
    inserted ??
    (await findWhatsappMessageBySessionExternalId(
      db,
      session.cycle.id,
      input.externalId,
    ));
  if (!message) throw new Error("Canonical CRM message was not persisted.");
  if (!createdMessage)
    message = await reconcileOutboundEchoSender(db, message, input);
  if (createdMessage) await updateSessionPreview(db, input, session);

  const updatedSession = await findCanonicalSessionById(
    db,
    session.cycle.id,
    input,
  );
  if (!updatedSession)
    throw new Error("Canonical CRM conversation cycle was not found.");
  return {
    createdMessage,
    createdSession: session.created,
    message: toWhatsappMessage(message),
    session: toWhatsappSession(
      updatedSession,
      await countUnreadMessages(db, updatedSession),
    ),
  };
}

async function duplicateIngestResult(
  db: DrizzleCrmClient,
  input: IngestCrmWhatsappMessageInput,
  duplicate: NonNullable<
    Awaited<ReturnType<typeof findWhatsappMessageByConnectionExternalId>>
  >,
) {
  const message = await reconcileOutboundEchoSender(db, duplicate, input);
  const session = await findCanonicalSessionById(db, message.cycleId, input);
  if (!session)
    throw new Error("Canonical CRM duplicate message cycle was not found.");
  return {
    createdMessage: false,
    createdSession: false,
    message: toWhatsappMessage(message),
    session: toWhatsappSession(session, await countUnreadMessages(db, session)),
  };
}

export function ingestMessageWithTransaction(
  db: DrizzleCrmClient,
  input: IngestCrmWhatsappMessageInput,
  disableTransactions: boolean,
) {
  const execute = (client: DrizzleCrmClient) =>
    ingestMessageInDatabase(client, input);
  return disableTransactions
    ? execute(db)
    : db.transaction(async (tx) => execute(tx as DrizzleCrmClient));
}

export async function upsertSessionContextInDatabase(
  db: DrizzleCrmClient,
  input: UpsertCrmWhatsappSessionContextInput,
) {
  await requireCanonicalConnection(db, input);
  const existing = await findWhatsappSessionByIdentity(db, input);
  const updated = existing
    ? await updateWhatsappSessionIdentity(db, existing, input)
    : null;
  const row = updated
    ? updated.cycle.state === "active"
      ? updated
      : await createCanonicalCycle(db, input, updated.thread)
    : await insertCanonicalSessionContext(db, input);
  return toWhatsappSession(row, await countUnreadMessages(db, row));
}

export function upsertSessionContextWithTransaction(
  db: DrizzleCrmClient,
  input: UpsertCrmWhatsappSessionContextInput,
  disableTransactions: boolean,
) {
  const execute = (client: DrizzleCrmClient) =>
    upsertSessionContextInDatabase(client, input);
  return disableTransactions
    ? execute(db)
    : db.transaction(async (tx) => execute(tx as DrizzleCrmClient));
}

async function findOrCreateSession(
  db: DrizzleCrmClient,
  input: IngestCrmWhatsappMessageInput,
) {
  const existing = await findWhatsappSessionByIdentity(db, input);
  if (existing?.cycle.state === "active") {
    const updated = await updateWhatsappSessionIdentity(db, existing, input);
    return { ...updated, created: false };
  }
  if (existing) {
    const updated = await updateWhatsappSessionIdentity(db, existing, input);
    return {
      ...(await createCanonicalCycle(db, input, updated.thread)),
      created: true,
    };
  }
  return { ...(await insertCanonicalSessionContext(db, input)), created: true };
}

async function insertMessage(
  db: DrizzleCrmClient,
  input: IngestCrmWhatsappMessageInput,
  session: CanonicalWhatsappSessionRow & { created: boolean },
  provider: typeof providerConnections.$inferSelect.provider,
) {
  const [row] = await db
    .insert(canonicalMessages)
    .values({
      content: input.content,
      cycleId: session.cycle.id,
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
      threadId: session.thread.id,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing({
      target: [
        canonicalMessages.providerConnectionId,
        canonicalMessages.providerMessageId,
      ],
      where: sql`${canonicalMessages.providerMessageId} IS NOT NULL`,
    })
    .returning();
  return row ? { ...row, channel: session.thread.channel } : undefined;
}

async function reconcileOutboundEchoSender(
  db: DrizzleCrmClient,
  message: NonNullable<
    Awaited<ReturnType<typeof findWhatsappMessageBySessionExternalId>>
  >,
  input: IngestCrmWhatsappMessageInput,
) {
  const reconciled = reconcileDomainOutboundEchoSender(
    toWhatsappMessage(message),
    input,
  );
  if (!reconciled) return message;
  const [updated] = await db
    .update(canonicalMessages)
    .set({
      sender: toCanonicalSender(reconciled.senderType),
      senderOrigin: toCanonicalSenderOrigin(reconciled.senderOrigin),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(canonicalMessages.id, message.id),
        eq(canonicalMessages.direction, "outbound"),
        inArray(canonicalMessages.senderOrigin, ["unknown", "human_channel"]),
        eq(canonicalMessages.storeId, input.storeId),
        eq(canonicalMessages.tenantId, input.tenantId),
      ),
    )
    .returning();
  return updated ? { ...updated, channel: message.channel } : message;
}
