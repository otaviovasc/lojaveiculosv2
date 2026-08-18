import { describe, expect, it } from "vitest";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  createCampaign,
  createCampaignTestApp,
  expectCampaign,
  postZapiReply,
  processDue,
  seedSession,
} from "./crm.whatsapp.campaigns.testSupport.js";

describe("CRM WhatsApp campaign reply attribution", () => {
  it("does not guess when multiple sent campaigns target one conversation", async () => {
    const repository = createMemoryCrmWhatsappRepository();
    const phone = "5511999999910";
    const seeded = await seedSession(repository, phone);
    const app = createCampaignTestApp(repository);
    const first = await createCampaign(app, {
      name: "Primeira campanha",
      recipients: [seeded.session.id],
    });
    const second = await createCampaign(app, {
      name: "Segunda campanha",
      recipients: [seeded.session.id],
    });
    await processDue(app);

    expect((await postZapiReply(app, phone)).status).toBe(201);
    await expectCampaign(repository, first.id, { repliedCount: 0 });
    await expectCampaign(repository, second.id, { repliedCount: 0 });
  });
});
