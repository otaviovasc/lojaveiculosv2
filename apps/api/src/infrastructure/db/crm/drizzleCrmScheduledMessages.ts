import { and, asc, desc, eq, getTableColumns, or, sql } from "drizzle-orm";
import {
  crmCampaigns,
  conversationCycles,
  opportunities,
  crmSpecialDateConfigs,
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
import {
  activeCampaignJoin,
  activeCrmEntitlementJoin,
  activeStoreJoin,
  activeTenantJoin,
  buildScheduledMessageUpdateFilters,
  campaignBookkeepingPendingPredicate,
  dueScheduledPredicate,
  processableScheduledMessagePredicate,
  processableSpecialDatePredicate,
  specialDateConfigJoin,
} from "./drizzleCrmScheduledMessageFilters.js";

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
  if (input.leadId)
    filters.push(sql`exists (
    select 1 from ${conversationCycles} c where c.id = ${crmScheduledMessages.cycleId}
      and c.tenant_id = ${input.tenantId} and c.store_id = ${input.storeId} and c.deleted_at is null
      and (c.metadata->>'leadId' = ${input.leadId} or exists (
        select 1 from ${opportunities} o where o.id = c.opportunity_id
          and o.tenant_id = ${input.tenantId} and o.store_id = ${input.storeId}
          and o.legacy_lead_id = ${input.leadId}::uuid)))`);
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
  if (input.campaignBookkeepingPending !== undefined) {
    filters.push(
      input.campaignBookkeepingPending
        ? campaignBookkeepingPendingPredicate(true, input.now ?? new Date())!
        : campaignBookkeepingPendingPredicate(false)!,
    );
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
  const now = input.now ?? new Date();
  const staleBefore = input.staleBefore ?? new Date(now.getTime() - 120_000);
  const rows = await db
    .select(getTableColumns(crmScheduledMessages))
    .from(crmScheduledMessages)
    .innerJoin(storeEntitlements, activeCrmEntitlementJoin(now))
    .innerJoin(stores, activeStoreJoin())
    .innerJoin(tenants, activeTenantJoin())
    .leftJoin(crmCampaigns, activeCampaignJoin())
    .leftJoin(crmSpecialDateConfigs, specialDateConfigJoin())
    .where(
      and(
        eq(crmScheduledMessages.storeId, input.storeId),
        eq(crmScheduledMessages.tenantId, input.tenantId),
        dueScheduledPredicate(input.dueAt, staleBefore, now),
        processableScheduledMessagePredicate(),
        processableSpecialDatePredicate(input.specialDateConfigs),
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
  const now = input.now ?? new Date();
  const staleBefore = input.staleBefore ?? new Date(now.getTime() - 120_000);
  const due = and(
    dueScheduledPredicate(input.dueAt, staleBefore, now),
    processableScheduledMessagePredicate(),
    processableSpecialDatePredicate(input.specialDateConfigs),
  );
  const rows = await db
    .selectDistinct({
      storeId: crmScheduledMessages.storeId,
      tenantId: crmScheduledMessages.tenantId,
    })
    .from(crmScheduledMessages)
    .innerJoin(storeEntitlements, activeCrmEntitlementJoin(now))
    .innerJoin(stores, activeStoreJoin())
    .innerJoin(tenants, activeTenantJoin())
    .leftJoin(crmCampaigns, activeCampaignJoin())
    .leftJoin(crmSpecialDateConfigs, specialDateConfigJoin())
    .where(or(due, campaignBookkeepingPendingPredicate(true, now)))
    .limit(input.limit);
  return rows.map((row) => ({
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
  }));
}

export async function updateCrmScheduledMessage(
  db: DrizzleCrmClient,
  input: UpdateCrmScheduledMessageInput,
) {
  const filters = buildScheduledMessageUpdateFilters(input);
  const [row] = await db
    .update(crmScheduledMessages)
    .set({
      ...(input.cancelledAt !== undefined
        ? { cancelledAt: input.cancelledAt }
        : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.errorMessage !== undefined
        ? { errorMessage: input.errorMessage }
        : {}),
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      ...(input.sentAt !== undefined ? { sentAt: input.sentAt } : {}),
      ...(input.sentMessageId !== undefined
        ? { sentMessageId: input.sentMessageId }
        : {}),
      ...(input.scheduledAt !== undefined
        ? { scheduledAt: input.scheduledAt }
        : {}),
      status: input.status,
      updatedAt:
        input.updatedAt ??
        sql`greatest(${crmScheduledMessages.updatedAt} + interval '1 millisecond', now())`,
    })
    .where(and(...filters))
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
