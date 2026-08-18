import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  gt,
  isNull,
  lte,
  or,
} from "drizzle-orm";
import {
  crmScheduledMessages,
  storeEntitlements,
  stores,
  tenants,
} from "@lojaveiculosv2/db";
import type {
  CreateCrmScheduledMessageInput,
  FindDueCrmScheduledMessageScopesInput,
  FindDueCrmScheduledMessagesInput,
  ListCrmScheduledMessagesInput,
  UpdateCrmScheduledMessageInput,
} from "../../../domains/crm/ports/crmConversationRepository.js";
import { findCanonicalThreadIdForCycle } from "./drizzleCrmCanonicalWorkflowReferences.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { toScheduledMessage } from "./drizzleCrmScheduledMessageMapper.js";

export async function createCrmScheduledMessage(
  db: DrizzleCrmClient,
  input: CreateCrmScheduledMessageInput,
) {
  const threadId = await findCanonicalThreadIdForCycle(db, {
    connectionId: input.connectionId,
    cycleId: input.cycleId,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
  const [row] = await db
    .insert(crmScheduledMessages)
    .values({
      campaignId: input.campaignId ?? null,
      campaignMessageType: input.campaignMessageType ?? null,
      campaignRecipientKey: input.campaignRecipientKey ?? null,
      campaignSequence: input.campaignSequence ?? null,
      connectionId: input.connectionId,
      cycleId: input.cycleId,
      createdByUserId: input.createdByUserId ?? null,
      metadata: input.metadata ?? {},
      recipientAddress: input.recipientAddress,
      scheduledAt: input.scheduledAt,
      storeId: input.storeId,
      tenantId: input.tenantId,
      content: input.content,
      threadId,
    })
    .returning();
  if (!row) throw new Error("CRM WhatsApp scheduled message insert failed.");
  return toScheduledMessage(row);
}

export async function listCrmScheduledMessages(
  db: DrizzleCrmClient,
  input: ListCrmScheduledMessagesInput,
) {
  const filters = [
    eq(crmScheduledMessages.storeId, input.storeId),
    eq(crmScheduledMessages.tenantId, input.tenantId),
  ];
  if (input.connectionId) {
    filters.push(eq(crmScheduledMessages.connectionId, input.connectionId));
  }
  if (input.campaignId) {
    filters.push(eq(crmScheduledMessages.campaignId, input.campaignId));
  }
  if (input.scheduledMessageId) {
    filters.push(eq(crmScheduledMessages.id, input.scheduledMessageId));
  }
  if (input.cycleId) {
    filters.push(eq(crmScheduledMessages.cycleId, input.cycleId));
  }
  if (input.status) {
    filters.push(eq(crmScheduledMessages.status, input.status));
  }
  const rows = await db
    .select()
    .from(crmScheduledMessages)
    .where(and(...filters))
    .orderBy(desc(crmScheduledMessages.scheduledAt))
    .limit(input.limit);
  return hydrateScheduledMessages(db, rows);
}

export async function findDueCrmScheduledMessages(
  db: DrizzleCrmClient,
  input: FindDueCrmScheduledMessagesInput,
) {
  const now = new Date();
  const rows = await db
    .select(getTableColumns(crmScheduledMessages))
    .from(crmScheduledMessages)
    .innerJoin(storeEntitlements, activeCrmEntitlementJoin(now))
    .innerJoin(stores, activeStoreJoin())
    .innerJoin(tenants, activeTenantJoin())
    .where(
      and(
        eq(crmScheduledMessages.storeId, input.storeId),
        eq(crmScheduledMessages.tenantId, input.tenantId),
        eq(crmScheduledMessages.status, "pending"),
        lte(crmScheduledMessages.scheduledAt, input.dueAt),
      ),
    )
    .orderBy(asc(crmScheduledMessages.scheduledAt))
    .limit(input.limit);
  return hydrateScheduledMessages(db, rows);
}

export async function findDueCrmScheduledMessageScopes(
  db: DrizzleCrmClient,
  input: FindDueCrmScheduledMessageScopesInput,
) {
  const now = new Date();
  const rows = await db
    .selectDistinct({
      storeId: crmScheduledMessages.storeId,
      tenantId: crmScheduledMessages.tenantId,
    })
    .from(crmScheduledMessages)
    .innerJoin(storeEntitlements, activeCrmEntitlementJoin(now))
    .innerJoin(stores, activeStoreJoin())
    .innerJoin(tenants, activeTenantJoin())
    .where(
      and(
        eq(crmScheduledMessages.status, "pending"),
        lte(crmScheduledMessages.scheduledAt, input.dueAt),
      ),
    )
    .limit(input.limit);
  return rows.map((row) => ({
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
  }));
}

function activeCrmEntitlementJoin(now: Date) {
  return and(
    eq(storeEntitlements.storeId, crmScheduledMessages.storeId),
    eq(storeEntitlements.tenantId, crmScheduledMessages.tenantId),
    eq(storeEntitlements.featureKey, "crm"),
    or(
      eq(storeEntitlements.status, "active"),
      eq(storeEntitlements.status, "trialing"),
    ),
    or(
      isNull(storeEntitlements.startsAt),
      lte(storeEntitlements.startsAt, now),
    ),
    or(isNull(storeEntitlements.endsAt), gt(storeEntitlements.endsAt, now)),
  );
}

function activeStoreJoin() {
  return and(
    eq(stores.id, crmScheduledMessages.storeId),
    eq(stores.tenantId, crmScheduledMessages.tenantId),
    eq(stores.isDeleted, false),
    isNull(stores.deletedAt),
  );
}

function activeTenantJoin() {
  return and(
    eq(tenants.id, crmScheduledMessages.tenantId),
    eq(tenants.isDeleted, false),
    isNull(tenants.deletedAt),
  );
}

export async function updateCrmScheduledMessage(
  db: DrizzleCrmClient,
  input: UpdateCrmScheduledMessageInput,
) {
  const [row] = await db
    .update(crmScheduledMessages)
    .set({
      ...(input.cancelledAt !== undefined
        ? { cancelledAt: input.cancelledAt }
        : {}),
      ...(input.errorMessage !== undefined
        ? { errorMessage: input.errorMessage }
        : {}),
      ...(input.sentAt !== undefined ? { sentAt: input.sentAt } : {}),
      ...(input.sentMessageId !== undefined
        ? { sentMessageId: input.sentMessageId }
        : {}),
      status: input.status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(crmScheduledMessages.id, input.id),
        eq(crmScheduledMessages.storeId, input.storeId),
        eq(crmScheduledMessages.tenantId, input.tenantId),
        ...(input.expectedStatus
          ? [eq(crmScheduledMessages.status, input.expectedStatus)]
          : []),
      ),
    )
    .returning();
  if (!row) return null;
  const [scheduled] = await hydrateScheduledMessages(db, [row]);
  return scheduled ?? null;
}

async function hydrateScheduledMessages(
  _db: DrizzleCrmClient,
  rows: readonly (typeof crmScheduledMessages.$inferSelect)[],
) {
  return rows.map((row) => toScheduledMessage(row));
}
