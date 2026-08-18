import {
  canonicalMessages,
  conversationAttendances,
  conversationCycles,
  conversationThreads,
} from "@lojaveiculosv2/db";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type {
  CanonicalInboundMessageInput,
  CanonicalInboundMessageResult,
  CrmCanonicalInboundRepository,
} from "../../../domains/crm/ports/crmCanonicalInboundRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { assertCanonicalInboundConnection } from "./drizzleCrmCanonicalInboundConnection.js";
import {
  lockCanonicalIdentity,
  resolveCanonicalIdentity,
} from "./drizzleCrmCanonicalInboundIdentity.js";
import {
  readCanonicalUnreadCount,
  readCanonicalThreadMetadata,
} from "./drizzleCrmCanonicalInboundSupport.js";

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
  const thread = await resolveThread(db, input, contactId);
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
      metadata: input.metadata,
      occurredAt: input.occurredAt,
      provider: input.provider,
      providerConnectionId: input.connectionId,
      providerMessageId: input.providerMessageId,
      sender: input.sender,
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
  const metadata = readCanonicalThreadMetadata(thread.metadata);
  await db
    .update(conversationThreads)
    .set({
      lastMessageAt: input.occurredAt,
      metadata: {
        ...metadata,
        unreadCount: readCanonicalUnreadCount(metadata) + 1,
      },
      revision: sql`${conversationThreads.revision} + 1`,
      state: "open",
      updatedAt: new Date(),
    })
    .where(scopedThread(input, thread.id));
  return {
    contactId,
    created: true,
    cycleId: cycle.id,
    identityId,
    messageId: inserted.id,
    threadId: thread.id,
  };
}

async function resolveThread(
  db: DrizzleCrmClient,
  input: CanonicalInboundMessageInput,
  contactId: string,
) {
  const externalThreadIds = [
    input.externalThreadId,
    ...input.externalThreadAliases,
  ];
  const [existing] = await db
    .select()
    .from(conversationThreads)
    .where(
      and(
        eq(conversationThreads.providerConnectionId, input.connectionId),
        inArray(conversationThreads.externalThreadId, externalThreadIds),
        eq(conversationThreads.storeId, input.storeId),
        eq(conversationThreads.tenantId, input.tenantId),
      ),
    )
    .orderBy(asc(conversationThreads.createdAt))
    .limit(1);
  if (existing) {
    if (!existing.contactId) {
      await db
        .update(conversationThreads)
        .set({ contactId, updatedAt: new Date() })
        .where(
          and(
            scopedThread(input, existing.id),
            isNull(conversationThreads.contactId),
          ),
        );
      return { ...existing, contactId };
    }
    return existing;
  }
  const [created] = await db
    .insert(conversationThreads)
    .values({
      channel: input.channel,
      contactId,
      externalThreadId: input.externalThreadId,
      metadata: { unreadCount: 0 },
      providerConnectionId: input.connectionId,
      state: "open",
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .returning();
  if (!created) throw new Error("Canonical CRM thread was not persisted.");
  return created;
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
  if (existing) return existing;
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
  return created;
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
    .where(scopedThread(input, message.threadId))
    .limit(1);
  if (!thread?.contactId) {
    throw new Error("Canonical CRM duplicate has incomplete identity scope.");
  }
  const identity = await resolveCanonicalIdentity(db, input);
  return {
    contactId: thread.contactId,
    cycleId: message.cycleId,
    identityId: identity.identityId,
    messageId: message.messageId,
    threadId: message.threadId,
  };
}

function scopedThread(input: CanonicalInboundMessageInput, threadId: string) {
  return and(
    eq(conversationThreads.id, threadId),
    eq(conversationThreads.storeId, input.storeId),
    eq(conversationThreads.tenantId, input.tenantId),
  );
}
