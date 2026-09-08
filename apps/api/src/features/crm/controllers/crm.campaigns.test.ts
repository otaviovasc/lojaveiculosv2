import { describe, expect, it } from "vitest";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createMemoryCrmPipelineRepository } from "../adapters/memory/crmPipelineRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import {
  campaignStoreId,
  campaignTenantId,
  createCampaign,
  createCampaignBody,
  createCampaignStages,
  createCampaignTestApp,
  expectCampaign,
  expectScheduledCount,
  jsonPost,
  postZapiReply,
  processDue,
  seedCycle,
} from "./crm.campaigns.testSupport.js";
import { expectApiError } from "./crm.controller.testSupport.js";

describe("CRM campaigns", () => {
  it("creates campaigns with linked scheduled messages and cancels pending sends", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const first = await seedCycle(conversationRepository, "5511999999901");
    const second = await seedCycle(conversationRepository, "5511999999902");
    const app = createCampaignTestApp(conversationRepository);

    const createResponse = await app.request(
      "/api/v1/crm/campaigns",
      jsonPost(
        createCampaignBody([
          first.conversationCycle.id,
          second.conversationCycle.id,
        ]),
      ),
    );

    expect(createResponse.status).toBe(201);
    const campaign = (await createResponse.json()) as { id: string };
    await expectCampaign(conversationRepository, campaign.id, {
      scheduledCount: 2,
      status: "scheduled",
      totalRecipients: 2,
    });
    await expectScheduledCount(
      conversationRepository,
      campaign.id,
      "pending",
      2,
    );

    const detailResponse = await app.request(
      `/api/v1/crm/campaigns/${campaign.id}`,
    );
    expect(detailResponse.status).toBe(200);
    const detail = (await detailResponse.json()) as {
      campaign: { id: string };
      recipients: unknown[];
    };
    expect(detail.campaign.id).toBe(campaign.id);
    expect(detail.recipients).toHaveLength(2);

    const cancelResponse = await app.request(
      `/api/v1/crm/campaigns/${campaign.id}/cancel`,
      { method: "POST" },
    );

    expect(cancelResponse.status).toBe(200);
    await expectCampaign(conversationRepository, campaign.id, {
      status: "cancelled",
    });
    await expectScheduledCount(
      conversationRepository,
      campaign.id,
      "cancelled",
      2,
    );
  });

  it("requires campaign manage permission for creation", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const seeded = await seedCycle(conversationRepository, "5511999999903");
    const app = createCampaignTestApp(conversationRepository, [
      "crm.campaigns.read",
    ]);

    const response = await app.request(
      "/api/v1/crm/campaigns",
      jsonPost(createCampaignBody([seeded.conversationCycle.id])),
    );

    expect(response.status).toBe(403);
    await expectApiError(response, {
      code: "AUTHORIZATION_DENIED",
      message: "Missing permission: crm.campaigns.manage",
    });
  });

  it("tracks replies, moves the lead pipeline stage, and schedules secondary messages", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const pipelineRepository = createMemoryCrmPipelineRepository();
    const crmRepository = createMemoryCrmRepository();
    const { initialStage, replyStage } =
      await createCampaignStages(pipelineRepository);
    const lead = await crmRepository.createLead({
      buyerName: "Ana",
      buyerPhone: "5511999999904",
      source: "manual",
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    const seeded = await seedCycle(conversationRepository, "5511999999904");
    await conversationRepository.updateConversationCycle({
      cycleId: seeded.conversationCycle.id,
      leadId: lead.id,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    const app = createCampaignTestApp(conversationRepository, undefined, {
      crmPipelineRepository: pipelineRepository,
      crmRepository,
    });
    const campaign = await createCampaign(app, {
      initialStageId: initialStage.id,
      recipients: [seeded.conversationCycle.id],
      replyStageId: replyStage.id,
      secondaryContent: "Obrigado pela resposta, {nome}.",
    });

    await processDue(app);
    await expectCampaign(conversationRepository, campaign.id, { sentCount: 1 });
    const afterSend = await crmRepository.findLeadById({
      leadId: lead.id,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    expect(afterSend?.pipelineStageId).toBe(initialStage.id);

    const reply = await postZapiReply(app, "5511999999904");

    expect(reply.status).toBe(201);
    await expectCampaign(conversationRepository, campaign.id, {
      repliedCount: 1,
      scheduledCount: 2,
    });
    const [recipient] = await conversationRepository.listCampaignRecipients({
      campaignId: campaign.id,
      limit: 1,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    expect(recipient).toMatchObject({
      replyContentPreview: "Tenho interesse",
      status: "secondary_scheduled",
    });
    await expectScheduledCount(
      conversationRepository,
      campaign.id,
      "pending",
      1,
    );
    const afterReply = await crmRepository.findLeadById({
      leadId: lead.id,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    expect(afterReply?.pipelineStageId).toBe(replyStage.id);
    expect(afterReply?.pipelineId).toBe(replyStage.pipelineId);
  });

  it("keeps the send recorded when the configured stage no longer exists", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const pipelineRepository = createMemoryCrmPipelineRepository();
    const crmRepository = createMemoryCrmRepository();
    const { initialStage } = await createCampaignStages(pipelineRepository);
    const lead = await crmRepository.createLead({
      buyerName: "Ana",
      buyerPhone: "5511999999905",
      source: "manual",
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    const seeded = await seedCycle(conversationRepository, "5511999999905");
    await conversationRepository.updateConversationCycle({
      cycleId: seeded.conversationCycle.id,
      leadId: lead.id,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    const app = createCampaignTestApp(conversationRepository, undefined, {
      crmPipelineRepository: pipelineRepository,
      crmRepository,
    });
    const campaign = await createCampaign(app, {
      initialStageId: initialStage.id,
      recipients: [seeded.conversationCycle.id],
    });
    await pipelineRepository.deletePipeline({
      pipelineId: initialStage.pipelineId,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });

    await processDue(app);

    await expectCampaign(conversationRepository, campaign.id, {
      failedCount: 0,
      sentCount: 1,
    });
    const [recipient] = await conversationRepository.listCampaignRecipients({
      campaignId: campaign.id,
      limit: 1,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    expect(recipient?.status).toBe("sent");
    const afterSend = await crmRepository.findLeadById({
      leadId: lead.id,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    expect(afterSend?.pipelineStageId).toBeNull();
  });
});
