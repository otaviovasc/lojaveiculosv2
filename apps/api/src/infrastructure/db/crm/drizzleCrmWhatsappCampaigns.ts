import { and, desc, eq, sql } from "drizzle-orm";
import { crmWhatsappCampaigns } from "@lojaveiculosv2/db";
import type {
  CreateCrmWhatsappCampaignInput,
  IncrementCrmWhatsappCampaignCountsInput,
  ListCrmWhatsappCampaignsInput,
  UpdateCrmWhatsappCampaignInput,
} from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { readRecord } from "./drizzleCrmWhatsappMappers.js";

export async function createWhatsappCampaign(
  db: DrizzleCrmClient,
  input: CreateCrmWhatsappCampaignInput,
) {
  const [row] = await db
    .insert(crmWhatsappCampaigns)
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
  return toWhatsappCampaign(row);
}

export async function findWhatsappCampaignById(
  db: DrizzleCrmClient,
  input: { campaignId: string; storeId: string; tenantId: string },
) {
  const [row] = await db
    .select()
    .from(crmWhatsappCampaigns)
    .where(campaignScope(input))
    .limit(1);
  return row ? toWhatsappCampaign(row) : null;
}

export async function listWhatsappCampaigns(
  db: DrizzleCrmClient,
  input: ListCrmWhatsappCampaignsInput,
) {
  const filters = [
    eq(crmWhatsappCampaigns.storeId, input.storeId),
    eq(crmWhatsappCampaigns.tenantId, input.tenantId),
  ];
  if (input.status) filters.push(eq(crmWhatsappCampaigns.status, input.status));
  const rows = await db
    .select()
    .from(crmWhatsappCampaigns)
    .where(and(...filters))
    .orderBy(desc(crmWhatsappCampaigns.createdAt))
    .limit(input.limit);
  return rows.map(toWhatsappCampaign);
}

export async function updateWhatsappCampaign(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappCampaignInput,
) {
  const [row] = await db
    .update(crmWhatsappCampaigns)
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
  return row ? toWhatsappCampaign(row) : null;
}

export async function incrementWhatsappCampaignCounts(
  db: DrizzleCrmClient,
  input: IncrementCrmWhatsappCampaignCountsInput,
) {
  const [row] = await db
    .update(crmWhatsappCampaigns)
    .set({
      failedCount: sql`${crmWhatsappCampaigns.failedCount} + ${input.failedDelta ?? 0}`,
      repliedCount: sql`${crmWhatsappCampaigns.repliedCount} + ${input.repliedDelta ?? 0}`,
      scheduledCount: sql`${crmWhatsappCampaigns.scheduledCount} + ${input.scheduledDelta ?? 0}`,
      secondarySentCount: sql`${crmWhatsappCampaigns.secondarySentCount} + ${input.secondarySentDelta ?? 0}`,
      sentCount: sql`${crmWhatsappCampaigns.sentCount} + ${input.sentDelta ?? 0}`,
      updatedAt: new Date(),
    })
    .where(campaignScope(input))
    .returning();
  return row ? toWhatsappCampaign(row) : null;
}

function campaignScope(input: {
  campaignId: string;
  storeId: string;
  tenantId: string;
}) {
  return and(
    eq(crmWhatsappCampaigns.id, input.campaignId),
    eq(crmWhatsappCampaigns.storeId, input.storeId),
    eq(crmWhatsappCampaigns.tenantId, input.tenantId),
  );
}

function toWhatsappCampaign(row: typeof crmWhatsappCampaigns.$inferSelect) {
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
