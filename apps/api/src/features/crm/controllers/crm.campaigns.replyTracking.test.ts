import { describe, expect, it } from "vitest";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import {
  campaignStoreId,
  campaignTenantId,
  createCampaign,
  createCampaignTestApp,
  expectCampaign,
  expectScheduledCount,
  postZapiReply,
  processDue,
  seedCycle,
} from "./crm.campaigns.testSupport.js";

describe("CRM campaign reply tracking", () => {
  it("claims a campaign recipient once when replies arrive concurrently", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const phone = "5511999999905";
    const seeded = await seedCycle(conversationRepository, phone);
    const app = createCampaignTestApp(conversationRepository);
    const campaign = await createCampaign(app, {
      recipients: [seeded.conversationCycle.id],
      secondaryContent: "Obrigado pela resposta, {nome}.",
    });
    await processDue(app);

    const responses = await Promise.all([
      postZapiReply(app, phone, {
        content: "Primeira resposta",
        messageId: "reply-concurrent-first",
      }),
      postZapiReply(app, phone, {
        content: "Segunda resposta",
        messageId: "reply-concurrent-second",
      }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    await expectCampaign(conversationRepository, campaign.id, {
      repliedCount: 1,
      scheduledCount: 2,
    });
    await expectScheduledCount(
      conversationRepository,
      campaign.id,
      "pending",
      1,
    );
    const [recipient] = await conversationRepository.listCampaignRecipients({
      campaignId: campaign.id,
      limit: 1,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    expect(recipient?.replyContentPreview).toMatch(
      /^(Primeira|Segunda) resposta$/,
    );
  });

  it("increments metrics for different recipients replying concurrently", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const firstPhone = "5511999999908";
    const secondPhone = "5511999999909";
    const first = await seedCycle(conversationRepository, firstPhone);
    const second = await seedCycle(conversationRepository, secondPhone);
    const app = createCampaignTestApp(conversationRepository);
    const campaign = await createCampaign(app, {
      recipients: [first.conversationCycle.id, second.conversationCycle.id],
      secondaryContent: "Obrigado pela resposta, {nome}.",
    });
    await processDue(app);

    const responses = await Promise.all([
      postZapiReply(app, firstPhone),
      postZapiReply(app, secondPhone),
    ]);

    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    await expectCampaign(conversationRepository, campaign.id, {
      repliedCount: 2,
      scheduledCount: 4,
      sentCount: 2,
    });
    await expectScheduledCount(
      conversationRepository,
      campaign.id,
      "pending",
      2,
    );
  });

  it("tracks replies while paused and keeps the secondary send queued", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const phone = "5511999999906";
    const seeded = await seedCycle(conversationRepository, phone);
    const app = createCampaignTestApp(conversationRepository);
    const campaign = await createCampaign(app, {
      recipients: [seeded.conversationCycle.id],
      secondaryContent: "Retorno pausado para {nome}.",
    });
    await processDue(app);

    const pause = await app.request(
      `/api/v1/crm/campaigns/${campaign.id}/pause`,
      {
        method: "POST",
      },
    );
    expect(pause.status).toBe(200);
    expect((await postZapiReply(app, phone)).status).toBe(201);

    await expectCampaign(conversationRepository, campaign.id, {
      repliedCount: 1,
      scheduledCount: 2,
      status: "paused",
    });
    await expectScheduledCount(
      conversationRepository,
      campaign.id,
      "pending",
      1,
    );
  });

  it("ignores replies received after a campaign is cancelled", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const phone = "5511999999907";
    const seeded = await seedCycle(conversationRepository, phone);
    const app = createCampaignTestApp(conversationRepository);
    const campaign = await createCampaign(app, {
      recipients: [seeded.conversationCycle.id],
      secondaryContent: "Nao deve ser agendado.",
    });
    await processDue(app);

    const cancel = await app.request(
      `/api/v1/crm/campaigns/${campaign.id}/cancel`,
      {
        method: "POST",
      },
    );
    expect(cancel.status).toBe(200);
    expect((await postZapiReply(app, phone)).status).toBe(201);

    await expectCampaign(conversationRepository, campaign.id, {
      repliedCount: 0,
      scheduledCount: 1,
      status: "cancelled",
    });
    await expectScheduledCount(
      conversationRepository,
      campaign.id,
      "pending",
      0,
    );
  });
});
