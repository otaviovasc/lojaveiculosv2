import {
  conversationAttendances,
  conversationCycles,
  conversationThreads,
  providerConnections,
} from "@lojaveiculosv2/db";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import type {
  IngestCrmWhatsappMessageInput,
  UpsertCrmWhatsappSessionContextInput,
} from "../../../domains/crm/ports/crmWhatsappRepository.js";
import { shouldBackfillWhatsappPhone } from "../../../domains/crm/whatsapp/whatsappContactIdentity.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  canonicalSessionSelection,
  countUnreadMessages,
} from "./drizzleCrmWhatsappQueries.js";
import { createCanonicalCycle } from "./drizzleCrmWhatsappSessionPreview.js";
import {
  readRecord,
  toCanonicalChannel,
  toWhatsappSession,
  type CanonicalWhatsappSessionRow,
} from "./drizzleCrmWhatsappMappers.js";

export async function requireCanonicalConnection(
  db: DrizzleCrmClient,
  input: UpsertCrmWhatsappSessionContextInput,
) {
  const channel = toCanonicalChannel(input.channel);
  const [connection] = await db
    .select()
    .from(providerConnections)
    .where(
      and(
        eq(providerConnections.id, input.connectionId),
        eq(providerConnections.channel, channel),
        eq(providerConnections.storeId, input.storeId),
        eq(providerConnections.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!connection) {
    throw new Error(
      "Canonical CRM connection does not match the requested channel and scope.",
    );
  }
  return connection;
}

export async function insertCanonicalSessionContext(
  db: DrizzleCrmClient,
  input: UpsertCrmWhatsappSessionContextInput,
): Promise<CanonicalWhatsappSessionRow> {
  const [thread] = await db
    .insert(conversationThreads)
    .values({
      channel: toCanonicalChannel(input.channel),
      customerChatId: input.buyerChatLid ?? null,
      customerDisplayName: input.buyerName ?? null,
      customerPhone: input.buyerPhone,
      externalThreadId: input.channelExternalId ?? null,
      metadata: input.profilePhotoStorageKey
        ? { profilePhoto: { storageKey: input.profilePhotoStorageKey } }
        : {},
      profilePhotoUrl: input.profilePhotoUrl ?? null,
      providerConnectionId: input.connectionId,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing()
    .returning();
  if (thread) return createCanonicalCycle(db, input, thread);
  const raced = await findWhatsappSessionByIdentity(db, input);
  if (!raced)
    throw new Error("Canonical CRM conversation context was not persisted.");
  return updateWhatsappSessionIdentity(db, raced, input);
}

type SessionIdentityInput =
  IngestCrmWhatsappMessageInput | UpsertCrmWhatsappSessionContextInput;

export function createSessionIdentityFinder(db: DrizzleCrmClient) {
  return async (input: UpsertCrmWhatsappSessionContextInput) => {
    const row = await findWhatsappSessionByIdentity(db, input);
    return row
      ? toWhatsappSession(row, await countUnreadMessages(db, row))
      : null;
  };
}

export async function findWhatsappSessionByIdentity(
  db: DrizzleCrmClient,
  input: SessionIdentityInput,
) {
  const canonicalChannel = toCanonicalChannel(input.channel);
  if (input.channelExternalId) {
    const row = await findScopedSession(
      db,
      input,
      canonicalChannel,
      eq(conversationThreads.externalThreadId, input.channelExternalId),
    );
    if (row) return row;
  }
  if (input.buyerPhone) {
    const row = await findScopedSession(
      db,
      input,
      canonicalChannel,
      eq(conversationThreads.customerPhone, input.buyerPhone),
    );
    if (row) return row;
  }
  if (!input.buyerChatLid) return null;
  return findScopedSession(
    db,
    input,
    canonicalChannel,
    eq(conversationThreads.customerChatId, input.buyerChatLid),
  );
}

export async function updateWhatsappSessionIdentity(
  db: DrizzleCrmClient,
  session: CanonicalWhatsappSessionRow,
  input: SessionIdentityInput,
) {
  const thread = session.thread;
  const matchedByChatLid = Boolean(
    input.buyerChatLid && thread.customerChatId === input.buyerChatLid,
  );
  const customerPhone = shouldBackfillWhatsappPhone(
    thread.customerPhone ?? "",
    input.buyerPhone,
    matchedByChatLid,
  )
    ? input.buyerPhone
    : thread.customerPhone;
  const customerChatId = thread.customerChatId ?? input.buyerChatLid ?? null;
  const customerDisplayName =
    thread.customerDisplayName ?? input.buyerName ?? null;
  const externalThreadId =
    thread.externalThreadId ?? input.channelExternalId ?? null;
  const profilePhotoUrl = input.profilePhotoUrl ?? thread.profilePhotoUrl;
  const metadata = input.profilePhotoStorageKey
    ? {
        ...readRecord(thread.metadata),
        profilePhoto: { storageKey: input.profilePhotoStorageKey },
      }
    : thread.metadata;
  if (
    customerPhone === thread.customerPhone &&
    customerChatId === thread.customerChatId &&
    customerDisplayName === thread.customerDisplayName &&
    externalThreadId === thread.externalThreadId &&
    profilePhotoUrl === thread.profilePhotoUrl &&
    metadata === thread.metadata
  )
    return session;

  const [updated] = await db
    .update(conversationThreads)
    .set({
      customerChatId,
      customerDisplayName,
      customerPhone,
      externalThreadId,
      metadata,
      profilePhotoUrl,
      revision: sql`${conversationThreads.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(conversationThreads.id, thread.id),
        eq(conversationThreads.providerConnectionId, input.connectionId),
        eq(conversationThreads.storeId, input.storeId),
        eq(conversationThreads.tenantId, input.tenantId),
      ),
    )
    .returning();
  if (!updated)
    throw new Error("Canonical CRM conversation context was not found.");
  return { ...session, thread: updated };
}

async function findScopedSession(
  db: DrizzleCrmClient,
  input: SessionIdentityInput,
  channel: ReturnType<typeof toCanonicalChannel>,
  identity: SQL,
) {
  const [row] = await db
    .select(canonicalSessionSelection())
    .from(conversationCycles)
    .innerJoin(
      conversationThreads,
      eq(conversationCycles.threadId, conversationThreads.id),
    )
    .innerJoin(
      conversationAttendances,
      eq(conversationAttendances.cycleId, conversationCycles.id),
    )
    .where(
      and(
        eq(conversationThreads.channel, channel),
        eq(conversationThreads.providerConnectionId, input.connectionId),
        eq(conversationThreads.storeId, input.storeId),
        eq(conversationThreads.tenantId, input.tenantId),
        identity,
      ),
    )
    .orderBy(
      desc(sql`${conversationCycles.state} = 'active'`),
      desc(conversationCycles.updatedAt),
    )
    .limit(1);
  return row;
}
