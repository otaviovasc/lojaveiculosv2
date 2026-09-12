import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import {
  campaignStoreId,
  campaignTenantId,
  createCampaign,
  createCampaignTestApp,
  expectCampaign,
  postZapiReply,
  processDue,
  seedCycle,
} from "./crm.campaigns.testSupport.js";

describe("CRM campaign reply tracking recovery", () => {
  it("claims a reply while delivery bookkeeping is pending, then repairs sent evidence", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const phone = "5511999999910";
    const seeded = await seedCycle(conversationRepository, phone);
    const app = createCampaignTestApp(conversationRepository);
    const campaign = await createCampaign(app, {
      recipients: [seeded.conversationCycle.id],
      secondaryContent: "Obrigado pelo retorno, {nome}.",
    });
    const originalRecord = conversationRepository.recordCampaignDelivery.bind(
      conversationRepository,
    );
    let failBookkeeping = true;
    conversationRepository.recordCampaignDelivery = vi.fn(async (input) => {
      if (failBookkeeping) {
        throw new Error("Transient campaign bookkeeping failure");
      }
      return originalRecord(input);
    });

    await processDue(app);
    const [sentSchedule] = await conversationRepository.listScheduledMessages({
      campaignId: campaign.id,
      limit: 1,
      status: "sent",
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    expect(sentSchedule?.metadata.campaignBookkeepingPending).toBe(true);

    expect(
      (
        await postZapiReply(app, phone, {
          content: "Pode me passar os detalhes?",
          messageId: "reply-before-bookkeeping-retry",
        })
      ).status,
    ).toBe(201);
    await expectCampaign(conversationRepository, campaign.id, {
      repliedCount: 1,
      scheduledCount: 2,
      sentCount: 0,
    });
    const [replied] = await conversationRepository.listCampaignRecipients({
      campaignId: campaign.id,
      limit: 1,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    expect(replied).toMatchObject({
      initialSentAt: null,
      status: "secondary_scheduled",
    });
    expect(replied?.replyMessageId).toBeTruthy();

    // Bypass retry backoff so this regression exercises reconciliation in one
    // test turn after the inbound claim has already committed.
    failBookkeeping = false;
    const [pending] = (
      await conversationRepository.listScheduledMessages({
        campaignId: campaign.id,
        limit: 10,
        storeId: campaignStoreId,
        tenantId: campaignTenantId,
      })
    ).filter((message) => message.metadata.campaignBookkeepingPending === true);
    expect(pending).toBeDefined();
    if (!pending) throw new Error("Pending campaign schedule is missing.");
    const retryMetadata = { ...pending.metadata };
    delete retryMetadata.campaignBookkeepingAttempts;
    delete retryMetadata.campaignBookkeepingNextAttemptAt;
    await conversationRepository.updateScheduledMessage({
      expectedUpdatedAt: pending.updatedAt,
      id: pending.id,
      metadata: retryMetadata,
      status: pending.status,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });

    await processDue(app);
    await expectCampaign(conversationRepository, campaign.id, {
      repliedCount: 1,
      scheduledCount: 2,
      sentCount: 1,
    });
    const [reconciled] = await conversationRepository.listCampaignRecipients({
      campaignId: campaign.id,
      limit: 1,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    expect(reconciled?.status).toBe("secondary_scheduled");
    expect(reconciled?.initialSentAt).toBeTruthy();
  });

  it("does not attribute a reply timestamped before the initial provider send", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const phone = "5511999999911";
    const seeded = await seedCycle(conversationRepository, phone);
    const app = createCampaignTestApp(conversationRepository);
    const campaign = await createCampaign(app, {
      recipients: [seeded.conversationCycle.id],
    });
    await processDue(app);

    expect(
      (
        await postZapiReply(app, phone, {
          content: "Mensagem atrasada",
          messageId: "reply-before-provider-send",
          timestamp: 1_609_459_200,
        })
      ).status,
    ).toBe(201);
    await expectCampaign(conversationRepository, campaign.id, {
      repliedCount: 0,
      sentCount: 1,
    });
  });
});
