import { randomUUID } from "node:crypto";
import * as schema from "@lojaveiculosv2/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { loadLocalEnv } from "../../config/loadLocalEnv.js";
import { recordCrmCampaignDelivery } from "./drizzleCrmCampaignDelivery.js";
import {
  seedRawCrmConversationFixture,
  seedRawCrmMessage,
  withRawCrmTransaction,
} from "./drizzleCrmConversationConsistency.rawDbTestSupport.js";
import { createDrizzleCrmConversationRepository } from "./drizzleCrmConversationRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

loadLocalEnv();
const runRawDb = process.env.RUN_RAW_CRM_DB_TESTS === "true";

describe.skipIf(!runRawDb)("CRM campaign delivery Postgres consistency", () => {
  it("repairs a lost counter after a reply and remains exactly once on replay", async () => {
    await withRawCrmTransaction(async (transaction) => {
      const fixture = await seedRawCrmConversationFixture(transaction);
      const repository = createDrizzleCrmConversationRepository(transaction, {
        disableTransactions: true,
      });
      const seeded = await seedRawCrmMessage(repository, fixture.primary, {
        customerPhone: "5511999000041",
      });
      const campaign = await seedCampaign(transaction, fixture.primary, 1);
      const threadId = seeded.conversationCycle.threadId;
      expect(threadId).toBeTruthy();
      if (!threadId) throw new Error("Raw CRM campaign thread is missing.");
      const recipient = await seedRecipient(
        transaction,
        fixture.primary,
        campaign.id,
        threadId,
        0,
      );
      const input = {
        campaignId: campaign.id,
        campaignMessageType: "initial",
        campaignRecipientKey: seeded.conversationCycle.id,
        campaignSequence: recipient.sequence,
        sentAt: new Date("2030-01-01T10:01:00.000Z"),
        sentMessageId: null,
        storeId: fixture.primary.storeId,
        tenantId: fixture.primary.tenantId,
      };

      await recordCrmCampaignDelivery(transaction, input, true);
      await transaction
        .update(schema.crmCampaigns)
        .set({ sentCount: 0 })
        .where(eq(schema.crmCampaigns.id, campaign.id));
      await transaction
        .update(schema.crmCampaignRecipients)
        .set({
          replyMessageId: null,
          replyReceivedAt: new Date("2030-01-01T10:02:00.000Z"),
          status: "replied",
        })
        .where(eq(schema.crmCampaignRecipients.id, recipient.id));

      await recordCrmCampaignDelivery(transaction, input, true);
      await recordCrmCampaignDelivery(transaction, input, true);

      const [persistedCampaign] = await transaction
        .select({
          sentCount: schema.crmCampaigns.sentCount,
        })
        .from(schema.crmCampaigns)
        .where(eq(schema.crmCampaigns.id, campaign.id));
      const [persistedRecipient] = await transaction
        .select({
          initialSentAt: schema.crmCampaignRecipients.initialSentAt,
          status: schema.crmCampaignRecipients.status,
        })
        .from(schema.crmCampaignRecipients)
        .where(eq(schema.crmCampaignRecipients.id, recipient.id));

      expect(persistedCampaign?.sentCount).toBe(1);
      expect(persistedRecipient).toMatchObject({ status: "replied" });
      expect(persistedRecipient?.initialSentAt).toEqual(
        new Date("2030-01-01T10:01:00.000Z"),
      );

      await transaction
        .update(schema.crmCampaignRecipients)
        .set({
          secondaryScheduledMessageId: randomUUID(),
          status: "replied",
        })
        .where(eq(schema.crmCampaignRecipients.id, recipient.id));
      const secondaryInput = {
        ...input,
        campaignMessageType: "secondary",
      };
      await recordCrmCampaignDelivery(
        transaction,
        { ...secondaryInput, errorMessage: "secondary provider unavailable" },
        true,
      );
      await recordCrmCampaignDelivery(transaction, input, true);
      await recordCrmCampaignDelivery(transaction, secondaryInput, true);

      const [postSecondaryCampaign] = await transaction
        .select({
          failedCount: schema.crmCampaigns.failedCount,
          secondarySentCount: schema.crmCampaigns.secondarySentCount,
          sentCount: schema.crmCampaigns.sentCount,
        })
        .from(schema.crmCampaigns)
        .where(eq(schema.crmCampaigns.id, campaign.id));
      const [postSecondaryRecipient] = await transaction
        .select({ status: schema.crmCampaignRecipients.status })
        .from(schema.crmCampaignRecipients)
        .where(eq(schema.crmCampaignRecipients.id, recipient.id));
      expect(postSecondaryCampaign).toEqual({
        failedCount: 1,
        secondarySentCount: 1,
        sentCount: 1,
      });
      expect(postSecondaryRecipient?.status).toBe("secondary_sent");
    });
  });

  it("counts a SQL failure once and does not turn confirmed delivery back into failure", async () => {
    await withRawCrmTransaction(async (transaction) => {
      const fixture = await seedRawCrmConversationFixture(transaction);
      const repository = createDrizzleCrmConversationRepository(transaction, {
        disableTransactions: true,
      });
      const seeded = await seedRawCrmMessage(repository, fixture.primary, {
        customerPhone: "5511999000042",
      });
      const campaign = await seedCampaign(transaction, fixture.primary, 1);
      const threadId = seeded.conversationCycle.threadId;
      expect(threadId).toBeTruthy();
      if (!threadId) throw new Error("Raw CRM campaign thread is missing.");
      const recipient = await seedRecipient(
        transaction,
        fixture.primary,
        campaign.id,
        threadId,
        0,
      );
      const input = {
        campaignId: campaign.id,
        campaignMessageType: "initial",
        campaignRecipientKey: seeded.conversationCycle.id,
        campaignSequence: recipient.sequence,
        storeId: fixture.primary.storeId,
        tenantId: fixture.primary.tenantId,
      };

      await recordCrmCampaignDelivery(
        transaction,
        {
          ...input,
          errorMessage: "provider unavailable",
        },
        true,
      );
      await recordCrmCampaignDelivery(
        transaction,
        {
          ...input,
          errorMessage: "provider unavailable",
        },
        true,
      );
      await recordCrmCampaignDelivery(
        transaction,
        {
          ...input,
          sentAt: new Date("2030-01-01T10:01:00.000Z"),
          sentMessageId: null,
        },
        true,
      );

      const [persistedCampaign] = await transaction
        .select({
          failedCount: schema.crmCampaigns.failedCount,
          sentCount: schema.crmCampaigns.sentCount,
        })
        .from(schema.crmCampaigns)
        .where(eq(schema.crmCampaigns.id, campaign.id));
      const [persistedRecipient] = await transaction
        .select({ status: schema.crmCampaignRecipients.status })
        .from(schema.crmCampaignRecipients)
        .where(eq(schema.crmCampaignRecipients.id, recipient.id));

      expect(persistedCampaign).toEqual({ failedCount: 1, sentCount: 1 });
      expect(persistedRecipient?.status).toBe("sent");
    });
  });
});

async function seedCampaign(
  transaction: DrizzleCrmClient,
  scope: { storeId: string; tenantId: string },
  totalRecipients: number,
) {
  const [campaign] = await transaction
    .insert(schema.crmCampaigns)
    .values({
      content: "Raw CRM campaign",
      id: randomUUID(),
      intervalMinutes: 1,
      name: "Raw CRM campaign",
      scheduledCount: totalRecipients,
      scheduledEndAt: new Date("2030-01-01T10:01:00.000Z"),
      scheduledStartAt: new Date("2030-01-01T10:00:00.000Z"),
      status: "scheduled",
      storeId: scope.storeId,
      tenantId: scope.tenantId,
      totalRecipients,
    })
    .returning();
  if (!campaign) throw new Error("Raw CRM campaign insert failed.");
  return campaign;
}

async function seedRecipient(
  transaction: DrizzleCrmClient,
  scope: { connectionId: string; storeId: string; tenantId: string },
  campaignId: string,
  threadId: string,
  sequence: number,
) {
  const [recipient] = await transaction
    .insert(schema.crmCampaignRecipients)
    .values({
      campaignId,
      connectionId: scope.connectionId,
      id: randomUUID(),
      recipientAddress: "5511999000041",
      sequence,
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
