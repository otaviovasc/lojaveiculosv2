import { describe, expect, it } from "vitest";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  campaignStoreId,
  campaignTenantId,
  createCampaign,
  createCampaignBody,
  createCampaignTestApp,
  createTag,
  expectCampaign,
  expectScheduledCount,
  jsonPost,
  postZapiReply,
  processDue,
  seedSession,
} from "./crm.whatsapp.campaigns.testSupport.js";
import { expectApiError } from "./crm.whatsapp.controller.testSupport.js";

describe("CRM WhatsApp campaigns", () => {
  it("creates campaigns with linked scheduled messages and cancels pending sends", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const first = await seedSession(whatsappRepository, "5511999999901");
    const second = await seedSession(whatsappRepository, "5511999999902");
    const app = createCampaignTestApp(whatsappRepository);

    const createResponse = await app.request(
      "/api/v1/crm/whatsapp/campaigns",
      jsonPost(createCampaignBody([first.session.id, second.session.id])),
    );

    expect(createResponse.status).toBe(201);
    const campaign = (await createResponse.json()) as { id: string };
    await expectCampaign(whatsappRepository, campaign.id, {
      scheduledCount: 2,
      status: "scheduled",
      totalRecipients: 2,
    });
    await expectScheduledCount(whatsappRepository, campaign.id, "pending", 2);

    const detailResponse = await app.request(
      `/api/v1/crm/whatsapp/campaigns/${campaign.id}`,
    );
    expect(detailResponse.status).toBe(200);
    const detail = (await detailResponse.json()) as {
      campaign: { id: string };
      recipients: unknown[];
    };
    expect(detail.campaign.id).toBe(campaign.id);
    expect(detail.recipients).toHaveLength(2);

    const cancelResponse = await app.request(
      `/api/v1/crm/whatsapp/campaigns/${campaign.id}/cancel`,
      { method: "POST" },
    );

    expect(cancelResponse.status).toBe(200);
    await expectCampaign(whatsappRepository, campaign.id, {
      status: "cancelled",
    });
    await expectScheduledCount(whatsappRepository, campaign.id, "cancelled", 2);
  });

  it("requires campaign manage permission for creation", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const seeded = await seedSession(whatsappRepository, "5511999999903");
    const app = createCampaignTestApp(whatsappRepository, [
      "crm.whatsapp.campaigns.read",
    ]);

    const response = await app.request(
      "/api/v1/crm/whatsapp/campaigns",
      jsonPost(createCampaignBody([seeded.session.id])),
    );

    expect(response.status).toBe(403);
    await expectApiError(response, {
      code: "AUTHORIZATION_DENIED",
      message: "Missing permission: crm.whatsapp.campaigns.manage",
    });
  });

  it("tracks replies, moves tags, and schedules secondary messages", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const seeded = await seedSession(whatsappRepository, "5511999999904");
    const initialTag = await createTag(whatsappRepository, "Oferta enviada");
    const replyTag = await createTag(whatsappRepository, "Respondeu campanha");
    const app = createCampaignTestApp(whatsappRepository);
    const campaign = await createCampaign(app, {
      initialTagId: initialTag.id,
      recipients: [seeded.session.id],
      replyTagId: replyTag.id,
      secondaryContent: "Obrigado pela resposta, {nome}.",
    });

    await processDue(app);
    await expectCampaign(whatsappRepository, campaign.id, { sentCount: 1 });

    const reply = await postZapiReply(app, "5511999999904");

    expect(reply.status).toBe(201);
    await expectCampaign(whatsappRepository, campaign.id, {
      repliedCount: 1,
      scheduledCount: 2,
    });
    const [recipient] = await whatsappRepository.listCampaignRecipients({
      campaignId: campaign.id,
      limit: 1,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    expect(recipient).toMatchObject({
      replyContentPreview: "Tenho interesse",
      status: "secondary_scheduled",
    });
    await expectScheduledCount(whatsappRepository, campaign.id, "pending", 1);
    const [session] = await whatsappRepository.listSessions({
      limit: 1,
      offset: 0,
      sessionId: seeded.session.id,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    expect(session?.sessionTags.map((tag) => tag.id)).toEqual([replyTag.id]);
  });
});
