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
  crmWhatsappScheduledMessages,
  storeEntitlements,
  stores,
  tenants,
} from "@lojaveiculosv2/db";
import type {
  CreateCrmWhatsappScheduledMessageInput,
  FindDueCrmWhatsappScheduledMessageScopesInput,
  FindDueCrmWhatsappScheduledMessagesInput,
  ListCrmWhatsappScheduledMessagesInput,
  UpdateCrmWhatsappScheduledMessageInput,
} from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function createWhatsappScheduledMessage(
  db: DrizzleCrmClient,
  input: CreateCrmWhatsappScheduledMessageInput,
) {
  const [row] = await db
    .insert(crmWhatsappScheduledMessages)
    .values({
      campaignId: input.campaignId ?? null,
      campaignMessageType: input.campaignMessageType ?? null,
      campaignRecipientKey: input.campaignRecipientKey ?? null,
      campaignSequence: input.campaignSequence ?? null,
      connectionId: input.connectionId,
      createdByUserId: input.createdByUserId ?? null,
      metadata: input.metadata ?? {},
      phone: input.phone,
      scheduledAt: input.scheduledAt,
      sessionId: input.sessionId,
      storeId: input.storeId,
      tenantId: input.tenantId,
      text: input.text,
    })
    .returning();
  if (!row) throw new Error("CRM WhatsApp scheduled message insert failed.");
  return toScheduledMessage(row);
}

export async function listWhatsappScheduledMessages(
  db: DrizzleCrmClient,
  input: ListCrmWhatsappScheduledMessagesInput,
) {
  const filters = [
    eq(crmWhatsappScheduledMessages.storeId, input.storeId),
    eq(crmWhatsappScheduledMessages.tenantId, input.tenantId),
  ];
  if (input.connectionId) {
    filters.push(
      eq(crmWhatsappScheduledMessages.connectionId, input.connectionId),
    );
  }
  if (input.campaignId) {
    filters.push(eq(crmWhatsappScheduledMessages.campaignId, input.campaignId));
  }
  if (input.sessionId) {
    filters.push(eq(crmWhatsappScheduledMessages.sessionId, input.sessionId));
  }
  if (input.status) {
    filters.push(eq(crmWhatsappScheduledMessages.status, input.status));
  }
  const rows = await db
    .select()
    .from(crmWhatsappScheduledMessages)
    .where(and(...filters))
    .orderBy(desc(crmWhatsappScheduledMessages.scheduledAt))
    .limit(input.limit);
  return rows.map(toScheduledMessage);
}

export async function findDueWhatsappScheduledMessages(
  db: DrizzleCrmClient,
  input: FindDueCrmWhatsappScheduledMessagesInput,
) {
  const now = new Date();
  const rows = await db
    .select(getTableColumns(crmWhatsappScheduledMessages))
    .from(crmWhatsappScheduledMessages)
    .innerJoin(storeEntitlements, activeCrmEntitlementJoin(now))
    .innerJoin(stores, activeStoreJoin())
    .innerJoin(tenants, activeTenantJoin())
    .where(
      and(
        eq(crmWhatsappScheduledMessages.storeId, input.storeId),
        eq(crmWhatsappScheduledMessages.tenantId, input.tenantId),
        eq(crmWhatsappScheduledMessages.status, "pending"),
        lte(crmWhatsappScheduledMessages.scheduledAt, input.dueAt),
      ),
    )
    .orderBy(asc(crmWhatsappScheduledMessages.scheduledAt))
    .limit(input.limit);
  return rows.map(toScheduledMessage);
}

export async function findDueWhatsappScheduledMessageScopes(
  db: DrizzleCrmClient,
  input: FindDueCrmWhatsappScheduledMessageScopesInput,
) {
  const now = new Date();
  const rows = await db
    .selectDistinct({
      storeId: crmWhatsappScheduledMessages.storeId,
      tenantId: crmWhatsappScheduledMessages.tenantId,
    })
    .from(crmWhatsappScheduledMessages)
    .innerJoin(storeEntitlements, activeCrmEntitlementJoin(now))
    .innerJoin(stores, activeStoreJoin())
    .innerJoin(tenants, activeTenantJoin())
    .where(
      and(
        eq(crmWhatsappScheduledMessages.status, "pending"),
        lte(crmWhatsappScheduledMessages.scheduledAt, input.dueAt),
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
    eq(storeEntitlements.storeId, crmWhatsappScheduledMessages.storeId),
    eq(storeEntitlements.tenantId, crmWhatsappScheduledMessages.tenantId),
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
    eq(stores.id, crmWhatsappScheduledMessages.storeId),
    eq(stores.tenantId, crmWhatsappScheduledMessages.tenantId),
    eq(stores.isDeleted, false),
    isNull(stores.deletedAt),
  );
}

function activeTenantJoin() {
  return and(
    eq(tenants.id, crmWhatsappScheduledMessages.tenantId),
    eq(tenants.isDeleted, false),
    isNull(tenants.deletedAt),
  );
}

export async function updateWhatsappScheduledMessage(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappScheduledMessageInput,
) {
  const [row] = await db
    .update(crmWhatsappScheduledMessages)
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
        eq(crmWhatsappScheduledMessages.id, input.id),
        eq(crmWhatsappScheduledMessages.storeId, input.storeId),
        eq(crmWhatsappScheduledMessages.tenantId, input.tenantId),
        ...(input.expectedStatus
          ? [eq(crmWhatsappScheduledMessages.status, input.expectedStatus)]
          : []),
      ),
    )
    .returning();
  return row ? toScheduledMessage(row) : null;
}

function toScheduledMessage(
  row: typeof crmWhatsappScheduledMessages.$inferSelect,
) {
  return {
    cancelledAt: row.cancelledAt,
    campaignId: row.campaignId,
    campaignMessageType: row.campaignMessageType,
    campaignRecipientKey: row.campaignRecipientKey,
    campaignSequence: row.campaignSequence,
    connectionId: row.connectionId,
    createdAt: row.createdAt,
    createdByUserId: row.createdByUserId as never,
    errorMessage: row.errorMessage,
    id: row.id,
    metadata: readRecord(row.metadata),
    phone: row.phone,
    scheduledAt: row.scheduledAt,
    sentAt: row.sentAt,
    sentMessageId: row.sentMessageId,
    sessionId: row.sessionId,
    status: row.status,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
    text: row.text,
    updatedAt: row.updatedAt,
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
