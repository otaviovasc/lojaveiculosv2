import { and, desc, eq, sql } from "drizzle-orm";
import { crmCampaigns } from "@lojaveiculosv2/db";
import type {
  CreateCrmCampaignInput,
  IncrementCrmCampaignCountsInput,
  ListCrmCampaignsInput,
  UpdateCrmCampaignInput,
} from "../../../domains/crm/ports/crmConversationRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { readRecord } from "./drizzleCrmConversationMappers.js";

export async function createCrmCampaign(
  db: DrizzleCrmClient,
  input: CreateCrmCampaignInput,
) {
  const [row] = await db
    .insert(crmCampaigns)
    .values({
      content: input.content,
      createdByUserId: input.createdByUserId ?? null,
      initialTagId: input.initialTagId ?? null,
      intervalMinutes: input.intervalMinutes,
      mediaType: input.mediaType ?? null,
      mediaUrl: input.mediaUrl ?? null,
      metadata: input.metadata ?? {},
      name: input.name,
      repliedCount: input.repliedCount ?? 0,
      replyTagId: input.replyTagId ?? null,
      scheduledCount: input.scheduledCount,
      scheduledEndAt: input.scheduledEndAt,
      scheduledStartAt: input.scheduledStartAt,
      secondaryContent: input.secondaryContent ?? null,
      secondaryDelayMinutes: input.secondaryDelayMinutes ?? 1,
      secondarySentCount: input.secondarySentCount ?? 0,
      selectedConnectionId: input.selectedConnectionId ?? null,
      sentCount: input.sentCount ?? 0,
      status: input.status,
      storeId: input.storeId,
      tenantId: input.tenantId,
      totalRecipients: input.totalRecipients,
    })
    .returning();
  if (!row) throw new Error("CRM WhatsApp campaign insert failed.");
  return toCrmCampaign(row);
}

export async function findCrmCampaignById(
  db: DrizzleCrmClient,
  input: { campaignId: string; storeId: string; tenantId: string },
) {
  const [row] = await db
    .select()
    .from(crmCampaigns)
    .where(campaignScope(input))
    .limit(1);
  return row ? toCrmCampaign(row) : null;
}

export async function listCrmCampaigns(
  db: DrizzleCrmClient,
  input: ListCrmCampaignsInput,
) {
  const filters = [
    eq(crmCampaigns.storeId, input.storeId),
    eq(crmCampaigns.tenantId, input.tenantId),
  ];
  if (input.status) filters.push(eq(crmCampaigns.status, input.status));
  const rows = await db
    .select()
    .from(crmCampaigns)
    .where(and(...filters))
    .orderBy(desc(crmCampaigns.createdAt))
    .limit(input.limit);
  return rows.map(toCrmCampaign);
}

export async function updateCrmCampaign(
  db: DrizzleCrmClient,
  input: UpdateCrmCampaignInput,
) {
  const [row] = await db
    .update(crmCampaigns)
    .set({
      ...(input.failedCount !== undefined
        ? { failedCount: input.failedCount }
        : {}),
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      ...(input.repliedCount !== undefined
        ? { repliedCount: input.repliedCount }
        : {}),
      ...(input.scheduledCount !== undefined
        ? { scheduledCount: input.scheduledCount }
        : {}),
      ...(input.secondarySentCount !== undefined
        ? { secondarySentCount: input.secondarySentCount }
        : {}),
      ...(input.sentCount !== undefined ? { sentCount: input.sentCount } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      updatedAt: new Date(),
    })
    .where(campaignScope(input))
    .returning();
  return row ? toCrmCampaign(row) : null;
}

export async function incrementCrmCampaignCounts(
  db: DrizzleCrmClient,
  input: IncrementCrmCampaignCountsInput,
) {
  const [row] = await db
    .update(crmCampaigns)
    .set({
      failedCount: sql`${crmCampaigns.failedCount} + ${input.failedDelta ?? 0}`,
      repliedCount: sql`${crmCampaigns.repliedCount} + ${input.repliedDelta ?? 0}`,
      scheduledCount: sql`${crmCampaigns.scheduledCount} + ${input.scheduledDelta ?? 0}`,
      secondarySentCount: sql`${crmCampaigns.secondarySentCount} + ${input.secondarySentDelta ?? 0}`,
      sentCount: sql`${crmCampaigns.sentCount} + ${input.sentDelta ?? 0}`,
      updatedAt: new Date(),
    })
    .where(campaignScope(input))
    .returning();
  return row ? toCrmCampaign(row) : null;
}

function campaignScope(input: {
  campaignId: string;
  storeId: string;
  tenantId: string;
}) {
  return and(
    eq(crmCampaigns.id, input.campaignId),
    eq(crmCampaigns.storeId, input.storeId),
    eq(crmCampaigns.tenantId, input.tenantId),
  );
}

function toCrmCampaign(row: typeof crmCampaigns.$inferSelect) {
  const replyRate = row.sentCount > 0 ? row.repliedCount / row.sentCount : 0;
  return {
    content: row.content,
    createdAt: row.createdAt,
    createdByUserId: row.createdByUserId as never,
    failedCount: row.failedCount,
    id: row.id,
    initialTagId: row.initialTagId,
    intervalMinutes: row.intervalMinutes,
    mediaType: row.mediaType,
    mediaUrl: row.mediaUrl,
    metadata: readRecord(row.metadata),
    name: row.name,
    repliedCount: row.repliedCount,
    replyRate,
    replyTagId: row.replyTagId,
    scheduledCount: row.scheduledCount,
    scheduledEndAt: row.scheduledEndAt,
    scheduledStartAt: row.scheduledStartAt,
    secondaryContent: row.secondaryContent,
    secondaryDelayMinutes: row.secondaryDelayMinutes,
    secondarySentCount: row.secondarySentCount,
    selectedConnectionId: row.selectedConnectionId,
    sentCount: row.sentCount,
    status: row.status,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
    totalRecipients: row.totalRecipients,
    updatedAt: row.updatedAt,
  };
}
