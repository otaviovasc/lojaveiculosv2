import {
  conversationAttendances,
  conversationCycles,
  conversationThreads,
  crmChannelConnections,
} from "@lojaveiculosv2/db";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import type {
  IngestCrmMessageInput,
  UpsertCrmConversationCycleContextInput,
} from "../../../domains/crm/ports/crmConversationRepository.js";
import { shouldBackfillCrmMessagingPhone } from "../../../domains/crm/messaging/contactIdentity.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  canonicalConversationCycleSelection,
  countUnreadMessages,
} from "./drizzleCrmConversationQueries.js";
import { createCanonicalCycle } from "./drizzleCrmConversationCyclePreview.js";
import {
  readRecord,
  toCanonicalChannel,
  toConversationCycle,
  type CanonicalConversationCycleRow,
} from "./drizzleCrmConversationMappers.js";

export async function requireCanonicalConnection(
  db: DrizzleCrmClient,
  input: UpsertCrmConversationCycleContextInput,
) {
  const channel = toCanonicalChannel(input.channel);
  const [connection] = await db
    .select()
    .from(crmChannelConnections)
    .where(
      and(
        eq(crmChannelConnections.id, input.connectionId),
        eq(crmChannelConnections.channel, channel),
        eq(crmChannelConnections.storeId, input.storeId),
        eq(crmChannelConnections.tenantId, input.tenantId),
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
  input: UpsertCrmConversationCycleContextInput,
): Promise<CanonicalConversationCycleRow> {
  const [thread] = await db
    .insert(conversationThreads)
    .values({
      channel: toCanonicalChannel(input.channel),
      customerChatId: input.customerChatId ?? null,
      customerDisplayName: input.customerDisplayName ?? null,
      customerPhone: input.customerPhone,
      externalThreadId: input.externalThreadId ?? null,
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
  const raced = await findConversationCycleByIdentity(db, input);
  if (!raced)
    throw new Error("Canonical CRM conversation context was not persisted.");
  return updateConversationCycleIdentity(db, raced, input);
}

type SessionIdentityInput =
  IngestCrmMessageInput | UpsertCrmConversationCycleContextInput;

export function createSessionIdentityFinder(db: DrizzleCrmClient) {
  return async (input: UpsertCrmConversationCycleContextInput) => {
    const row = await findConversationCycleByIdentity(db, input);
    return row
      ? toConversationCycle(row, await countUnreadMessages(db, row))
      : null;
  };
}

export async function findConversationCycleByIdentity(
  db: DrizzleCrmClient,
  input: SessionIdentityInput,
) {
  const canonicalChannel = toCanonicalChannel(input.channel);
  if (input.externalThreadId) {
    const row = await findScopedSession(
      db,
      input,
      canonicalChannel,
      eq(conversationThreads.externalThreadId, input.externalThreadId),
    );
    if (row) return row;
  }
  if (input.customerPhone) {
    const row = await findScopedSession(
      db,
      input,
      canonicalChannel,
      eq(conversationThreads.customerPhone, input.customerPhone),
    );
    if (row) return row;
  }
  if (!input.customerChatId) return null;
  return findScopedSession(
    db,
    input,
    canonicalChannel,
    eq(conversationThreads.customerChatId, input.customerChatId),
  );
}

export async function updateConversationCycleIdentity(
  db: DrizzleCrmClient,
  conversationCycle: CanonicalConversationCycleRow,
  input: SessionIdentityInput,
) {
  const thread = conversationCycle.thread;
  const matchedByChatLid = Boolean(
    input.customerChatId && thread.customerChatId === input.customerChatId,
  );
  const customerPhone = shouldBackfillCrmMessagingPhone(
    thread.customerPhone ?? "",
    input.customerPhone,
    matchedByChatLid,
  )
    ? input.customerPhone
    : thread.customerPhone;
  const customerChatId = thread.customerChatId ?? input.customerChatId ?? null;
  const customerDisplayName =
    thread.customerDisplayName ?? input.customerDisplayName ?? null;
  const externalThreadId =
    thread.externalThreadId ?? input.externalThreadId ?? null;
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
    return conversationCycle;

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
  return { ...conversationCycle, thread: updated };
}

async function findScopedSession(
  db: DrizzleCrmClient,
  input: SessionIdentityInput,
  channel: ReturnType<typeof toCanonicalChannel>,
  identity: SQL,
) {
  const [row] = await db
    .select(canonicalConversationCycleSelection())
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
