import { randomUUID } from "node:crypto";
import * as schema from "@lojaveiculosv2/db";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function seedCampaign(
  transaction: DrizzleCrmClient,
  scope: { storeId: string; tenantId: string },
) {
  const [campaign] = await transaction
    .insert(schema.crmCampaigns)
    .values({
      content: "Raw CRM campaign",
      id: randomUUID(),
      intervalMinutes: 1,
      name: "Raw CRM campaign",
      scheduledCount: 1,
      scheduledEndAt: new Date("2030-01-01T10:01:00.000Z"),
      scheduledStartAt: new Date("2030-01-01T10:00:00.000Z"),
      status: "scheduled",
      storeId: scope.storeId,
      tenantId: scope.tenantId,
      totalRecipients: 1,
    })
    .returning();
  if (!campaign) throw new Error("Raw CRM campaign insert failed.");
  return campaign;
}

export async function seedScheduledMessage(
  transaction: DrizzleCrmClient,
  scope: { connectionId: string; storeId: string; tenantId: string },
  campaignId: string,
  cycleId: string,
  threadId: string,
  type: "initial" | "secondary",
  status: "pending" | "sent",
) {
  const [message] = await transaction
    .insert(schema.crmScheduledMessages)
    .values({
      campaignId,
      campaignMessageType: type,
      campaignRecipientKey: cycleId,
      campaignSequence: 0,
      connectionId: scope.connectionId,
      cycleId,
      content: "Raw CRM scheduled message",
      metadata: {},
      recipientAddress: "5511999000051",
      scheduledAt: new Date("2030-01-01T10:00:00.000Z"),
      sentAt: status === "sent" ? new Date("2030-01-01T10:01:00.000Z") : null,
      status,
      storeId: scope.storeId,
      tenantId: scope.tenantId,
      threadId,
    })
    .returning({ id: schema.crmScheduledMessages.id });
  if (!message) throw new Error("Raw CRM scheduled message insert failed.");
  return message;
}

export async function seedRecipient(
  transaction: DrizzleCrmClient,
  scope: { connectionId: string; storeId: string; tenantId: string },
  campaignId: string,
  threadId: string,
  initialScheduledMessageId: string,
) {
  const [recipient] = await transaction
    .insert(schema.crmCampaignRecipients)
    .values({
      campaignId,
      connectionId: scope.connectionId,
      id: randomUUID(),
      initialScheduledMessageId,
      recipientAddress: "5511999000051",
      sequence: 0,
      status: "pending",
      storeId: scope.storeId,
      tenantId: scope.tenantId,
      threadId,
      variables: {},
    })
    .returning();
  if (!recipient) throw new Error("Raw CRM recipient insert failed.");
  return recipient;
}
