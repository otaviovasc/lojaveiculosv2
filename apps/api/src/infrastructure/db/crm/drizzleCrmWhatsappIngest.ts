import { and, desc, eq, or } from "drizzle-orm";
import { crmWhatsappMessages, crmWhatsappSessions } from "@lojaveiculosv2/db";
import type { IngestCrmWhatsappMessageInput } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  toWhatsappMessage,
  toWhatsappSession,
} from "./drizzleCrmWhatsappMappers.js";
import { countUnreadMessages } from "./drizzleCrmWhatsappQueries.js";
import { findWhatsappMessageBySessionExternalId } from "./drizzleCrmWhatsappMessages.js";
import { updateSessionPreview } from "./drizzleCrmWhatsappSessionPreview.js";

export async function ingestMessageInDatabase(
  db: DrizzleCrmClient,
  input: IngestCrmWhatsappMessageInput,
) {
  const session = await findOrCreateSession(db, input);
  const insertedMessage = await insertMessage(db, input, session.id);
  const createdMessage = Boolean(insertedMessage);
  const message =
    insertedMessage ??
    (await findWhatsappMessageBySessionExternalId(
      db,
      session.id,
      input.externalId,
    ));

  if (!message) throw new Error("CRM WhatsApp message was not persisted.");
  if (createdMessage) await updateSessionPreview(db, input, session);

  const updatedSession = await findSessionById(db, session.id);
  if (!updatedSession) throw new Error("CRM WhatsApp session was not found.");

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

async function findOrCreateSession(
  db: DrizzleCrmClient,
  input: IngestCrmWhatsappMessageInput,
) {
  const existing = await findSessionForInbound(db, input);
  if (existing) return { ...existing, created: false };

  const [inserted] = await db
    .insert(crmWhatsappSessions)
    .values({
      buyerChatLid: input.buyerChatLid ?? null,
      buyerName: input.buyerName ?? null,
      buyerPhone: input.buyerPhone,
      channel: input.channel,
      connectionId: input.connectionId,
      firstHandledAt: input.firstHandledAt ?? null,
      freshLeadAt: input.freshLeadAt ?? null,
      lastMessageAt: input.providerTimestamp,
      lastMessageContent: input.content,
      leadId: input.leadId ?? null,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing({
      target: [
        crmWhatsappSessions.connectionId,
        crmWhatsappSessions.buyerPhone,
      ],
    })
    .returning();

  if (inserted) return { ...inserted, created: true };
  const raced = await findSessionForInbound(db, input);
  if (!raced) throw new Error("CRM WhatsApp session was not persisted.");
  return { ...raced, created: false };
}

async function findSessionForInbound(
  db: DrizzleCrmClient,
  input: IngestCrmWhatsappMessageInput,
) {
  const identityFilter = input.buyerChatLid
    ? or(
        eq(crmWhatsappSessions.buyerPhone, input.buyerPhone),
        eq(crmWhatsappSessions.buyerChatLid, input.buyerChatLid),
      )
    : eq(crmWhatsappSessions.buyerPhone, input.buyerPhone);
  const [row] = await db
    .select()
    .from(crmWhatsappSessions)
    .where(
      and(
        eq(crmWhatsappSessions.connectionId, input.connectionId),
        eq(crmWhatsappSessions.storeId, input.storeId),
        eq(crmWhatsappSessions.tenantId, input.tenantId),
        identityFilter,
      ),
    )
    .orderBy(desc(crmWhatsappSessions.updatedAt))
    .limit(1);
  return row;
}

async function insertMessage(
  db: DrizzleCrmClient,
  input: IngestCrmWhatsappMessageInput,
  sessionId: string,
) {
  const [row] = await db
    .insert(crmWhatsappMessages)
    .values({
      channel: input.channel,
      connectionId: input.connectionId,
      content: input.content,
      direction: input.direction,
      externalId: input.externalId,
      mediaType: input.mediaType ?? null,
      mediaUrl: input.mediaUrl ?? null,
      metadata: input.metadata,
      providerTimestamp: input.providerTimestamp,
      senderType: input.senderType,
      sessionId,
      status: input.status,
      storeId: input.storeId,
      tenantId: input.tenantId,
      type: input.type,
    })
    .onConflictDoNothing({
      target: [crmWhatsappMessages.sessionId, crmWhatsappMessages.externalId],
    })
    .returning();
  return row;
}

async function findSessionById(db: DrizzleCrmClient, sessionId: string) {
  const [row] = await db
    .select()
    .from(crmWhatsappSessions)
    .where(eq(crmWhatsappSessions.id, sessionId))
    .limit(1);
  return row;
}
