import * as schema from "@lojaveiculosv2/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { loadLocalEnv } from "../../config/loadLocalEnv.js";
import type { ClaimCrmCampaignReplyInput } from "../../../domains/crm/ports/crmCampaignRepositoryInputs.js";
import { claimCrmCampaignReply } from "./drizzleCrmCampaignReply.js";
import { recordCrmCampaignDelivery } from "./drizzleCrmCampaignDelivery.js";
import {
  seedRawCrmConversationFixture,
  seedRawCrmMessage,
  withRawCrmTransaction,
} from "./drizzleCrmConversationConsistency.rawDbTestSupport.js";
import { createDrizzleCrmConversationRepository } from "./drizzleCrmConversationRepository.js";
import {
  seedCampaign,
  seedRecipient,
  seedScheduledMessage,
} from "./drizzleCrmCampaignReply.rawDbTestSupport.js";

loadLocalEnv();
const runRawDb = process.env.RUN_RAW_CRM_DB_TESTS === "true";

describe.skipIf(!runRawDb)("CRM campaign reply Postgres consistency", () => {
  it("claims confirmed pending reply, schedules secondary atomically, and survives delivery replay", async () => {
    await withRawCrmTransaction(async (transaction) => {
      const fixture = await seedRawCrmConversationFixture(transaction);
      const repository = createDrizzleCrmConversationRepository(transaction, {
        disableTransactions: true,
      });
      const seeded = await seedRawCrmMessage(repository, fixture.primary, {
        customerPhone: "5511999000051",
      });
      const campaign = await seedCampaign(transaction, fixture.primary);
      const threadId = seeded.conversationCycle.threadId;
      if (!threadId) throw new Error("Raw CRM campaign thread is missing.");
      const initial = await seedScheduledMessage(
        transaction,
        fixture.primary,
        campaign.id,
        seeded.conversationCycle.id,
        threadId,
        "initial",
        "sent",
      );
      const recipient = await seedRecipient(
        transaction,
        fixture.primary,
        campaign.id,
        threadId,
        initial.id,
      );
      const input: ClaimCrmCampaignReplyInput = {
        campaignId: campaign.id,
        recipientId: recipient.id,
        replyContentPreview: "Tenho interesse",
        replyMessageId: seeded.message.id,
        replyReceivedAt: new Date("2030-01-01T10:02:00.000Z"),
        secondarySchedule: {
          campaignRecipientKey: seeded.conversationCycle.id,
          campaignSequence: recipient.sequence,
          connectionId: fixture.primary.connectionId,
          content: "Obrigado pelo retorno.",
          createdByUserId: null,
          cycleId: seeded.conversationCycle.id,
          metadata: { campaignId: campaign.id, sequence: recipient.sequence },
          recipientAddress: recipient.recipientAddress,
          scheduledAt: new Date("2030-01-01T10:03:00.000Z"),
        },
        storeId: fixture.primary.storeId,
        tenantId: fixture.primary.tenantId,
      };

      const claimed = await claimCrmCampaignReply(transaction, input, true);
      expect(claimed).toMatchObject({ repliedCount: 1, scheduledCount: 2 });
      expect(await claimCrmCampaignReply(transaction, input, true)).toBeNull();

      await recordCrmCampaignDelivery(
        transaction,
        {
          campaignId: campaign.id,
          campaignMessageType: "initial",
          campaignRecipientKey: seeded.conversationCycle.id,
          campaignSequence: recipient.sequence,
          sentAt: new Date("2030-01-01T10:01:00.000Z"),
          sentMessageId: null,
          storeId: fixture.primary.storeId,
          tenantId: fixture.primary.tenantId,
        },
        true,
      );

      const [persistedCampaign] = await transaction
        .select({
          repliedCount: schema.crmCampaigns.repliedCount,
          scheduledCount: schema.crmCampaigns.scheduledCount,
          sentCount: schema.crmCampaigns.sentCount,
        })
        .from(schema.crmCampaigns)
        .where(eq(schema.crmCampaigns.id, campaign.id));
      const [persistedRecipient] = await transaction
        .select({
          initialSentAt: schema.crmCampaignRecipients.initialSentAt,
          replyReceivedAt: schema.crmCampaignRecipients.replyReceivedAt,
          status: schema.crmCampaignRecipients.status,
        })
        .from(schema.crmCampaignRecipients)
        .where(eq(schema.crmCampaignRecipients.id, recipient.id));
      const secondaryRows = await transaction
        .select({ id: schema.crmScheduledMessages.id })
        .from(schema.crmScheduledMessages)
        .where(eq(schema.crmScheduledMessages.campaignId, campaign.id));

      expect(persistedCampaign).toEqual({
        repliedCount: 1,
        scheduledCount: 2,
        sentCount: 1,
      });
      expect(persistedRecipient).toMatchObject({
        status: "secondary_scheduled",
      });
      expect(persistedRecipient?.replyReceivedAt).toEqual(
        input.replyReceivedAt,
      );
      expect(persistedRecipient?.initialSentAt).toEqual(
        new Date("2030-01-01T10:01:00.000Z"),
      );
      expect(secondaryRows).toHaveLength(2);
    });
  });

  it("does not claim pending reply when the initial schedule is not sent", async () => {
    await withRawCrmTransaction(async (transaction) => {
      const fixture = await seedRawCrmConversationFixture(transaction);
      const repository = createDrizzleCrmConversationRepository(transaction, {
        disableTransactions: true,
      });
      const seeded = await seedRawCrmMessage(repository, fixture.primary, {
        customerPhone: "5511999000052",
      });
      const campaign = await seedCampaign(transaction, fixture.primary);
      const threadId = seeded.conversationCycle.threadId;
      if (!threadId) throw new Error("Raw CRM campaign thread is missing.");
      const initial = await seedScheduledMessage(
        transaction,
        fixture.primary,
        campaign.id,
        seeded.conversationCycle.id,
        threadId,
        "initial",
        "pending",
      );
      const recipient = await seedRecipient(
        transaction,
        fixture.primary,
        campaign.id,
        threadId,
        initial.id,
      );
      const claimed = await claimCrmCampaignReply(
        transaction,
        {
          campaignId: campaign.id,
          recipientId: recipient.id,
          replyContentPreview: "Tenho interesse",
          replyMessageId: seeded.message.id,
          replyReceivedAt: new Date("2030-01-01T10:02:00.000Z"),
          storeId: fixture.primary.storeId,
          tenantId: fixture.primary.tenantId,
        },
        true,
      );
      expect(claimed).toBeNull();
    });
  });
});
