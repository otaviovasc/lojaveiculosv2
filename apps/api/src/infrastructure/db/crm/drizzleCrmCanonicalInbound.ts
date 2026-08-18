import {
  canonicalMessages,
  conversationAttendances,
  conversationCycles,
  conversationThreads,
} from "@lojaveiculosv2/db";
import { and, desc, eq } from "drizzle-orm";
import type {
  CanonicalInboundMessageInput,
  CanonicalInboundMessageResult,
  CrmCanonicalInboundRepository,
} from "../../../domains/crm/ports/crmCanonicalInboundRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { assertCanonicalInboundConnection } from "./drizzleCrmCanonicalInboundConnection.js";
import {
  findCanonicalIdentity,
  lockCanonicalIdentity,
  resolveCanonicalIdentity,
} from "./drizzleCrmCanonicalInboundIdentity.js";
import {
  readCanonicalInboundAttendanceState,
  updateCanonicalInboundState,
} from "./drizzleCrmCanonicalInboundState.js";
import { scopedCanonicalInboundThread } from "./drizzleCrmCanonicalInboundSupport.js";
import { resolveCanonicalInboundThread } from "./drizzleCrmCanonicalInboundThread.js";

export function createDrizzleCrmCanonicalInboundRepository(
  db: DrizzleCrmClient,
): CrmCanonicalInboundRepository {
  return {
    ingestInboundMessage: (input) => ingestCanonicalInbound(db, input),
  };
}

async function ingestCanonicalInbound(
  db: DrizzleCrmClient,
  input: CanonicalInboundMessageInput,
): Promise<CanonicalInboundMessageResult> {
  await lockCanonicalIdentity(db, input);
  await assertCanonicalInboundConnection(db, input);
  const duplicate = await findMessage(db, input);
  if (duplicate) return { ...duplicate, created: false };

  const { contactId, identityId } = await resolveCanonicalIdentity(db, input);
  const thread = await resolveCanonicalInboundThread(db, input, contactId);
  const cycle = await resolveCycle(db, input, thread.id);
  const [inserted] = await db
    .insert(canonicalMessages)
    .values({
      content: input.content,
      cycleId: cycle.id,
      direction: "inbound",
      mediaType: input.mediaType,
      mediaUrl: input.mediaUrl,
      messageType: input.messageType,
      metadata: { providerMetadata: input.metadata },
      occurredAt: input.occurredAt,
      provider: input.provider,
      providerConnectionId: input.connectionId,
      providerMessageId: input.providerMessageId,
      sender: input.sender,
      senderOrigin: input.senderOrigin,
      status: "delivered",
      threadId: thread.id,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing()
    .returning({ id: canonicalMessages.id });
  if (!inserted) {
    const raced = await findMessage(db, input);
    if (!raced) throw new Error("Canonical CRM message was not persisted.");
    return { ...raced, created: false };
  }
  await updateCanonicalInboundState(db, input, thread, cycle);
  const attendanceState = await readCanonicalInboundAttendanceState(
    db,
    input,
    cycle.id,
  );
  return {
    attendanceState,
    contactId,
    created: true,
    createdSession: cycle.created,
    cycleId: cycle.id,
    identityId,
    messageId: inserted.id,
    threadId: thread.id,
  };
}

async function resolveCycle(
  db: DrizzleCrmClient,
  input: CanonicalInboundMessageInput,
  threadId: string,
) {
  const [existing] = await db
    .select()
    .from(conversationCycles)
    .where(
      and(
        eq(conversationCycles.threadId, threadId),
        eq(conversationCycles.state, "active"),
        eq(conversationCycles.storeId, input.storeId),
        eq(conversationCycles.tenantId, input.tenantId),
      ),
    )
    .orderBy(desc(conversationCycles.createdAt))
    .limit(1);
  if (existing) return { ...existing, created: false };
  const [previous] = await db
    .select({ id: conversationCycles.id })
    .from(conversationCycles)
    .where(
      and(
        eq(conversationCycles.threadId, threadId),
        eq(conversationCycles.storeId, input.storeId),
        eq(conversationCycles.tenantId, input.tenantId),
      ),
    )
    .orderBy(desc(conversationCycles.createdAt))
    .limit(1);
  const [created] = await db
    .insert(conversationCycles)
    .values({
      threadId,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .returning();
  if (!created) throw new Error("Canonical CRM cycle was not persisted.");
  await db.insert(conversationAttendances).values({
    cycleId: created.id,
    // A provider message may start a new cycle, but it cannot silently hand a
    // previously completed human/bot attendance back to automation.
    state: previous ? "handback_pending" : "bot_active",
    threadId,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
  return { ...created, created: true };
}

async function findMessage(
  db: DrizzleCrmClient,
  input: CanonicalInboundMessageInput,
) {
  const [message] = await db
    .select({
      cycleId: canonicalMessages.cycleId,
      messageId: canonicalMessages.id,
      threadId: canonicalMessages.threadId,
    })
    .from(canonicalMessages)
    .where(
      and(
        eq(canonicalMessages.providerConnectionId, input.connectionId),
        eq(canonicalMessages.providerMessageId, input.providerMessageId),
        eq(canonicalMessages.storeId, input.storeId),
        eq(canonicalMessages.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!message) return null;
  const [thread] = await db
    .select({ contactId: conversationThreads.contactId })
    .from(conversationThreads)
    .where(scopedCanonicalInboundThread(input, message.threadId))
    .limit(1);
  if (!thread?.contactId) {
    throw new Error("Canonical CRM duplicate has incomplete identity scope.");
  }
  const identity = await findCanonicalIdentity(db, input);
  if (!identity || identity.contactId !== thread.contactId) {
    throw new Error(
      "Canonical CRM duplicate identity does not match the original message.",
    );
  }
  const attendanceState = await readCanonicalInboundAttendanceState(
    db,
    input,
    message.cycleId,
  );
  return {
    attendanceState,
    contactId: thread.contactId,
    cycleId: message.cycleId,
    createdSession: false,
    identityId: identity.identityId,
    messageId: message.messageId,
    threadId: message.threadId,
  };
}
