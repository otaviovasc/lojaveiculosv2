import { describe, expect, it } from "vitest";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import {
  createCampaign,
  createCampaignTestApp,
  expectCampaign,
  postZapiReply,
  processDue,
  seedCycle,
} from "./crm.campaigns.testSupport.js";

describe("CRM campaign reply attribution", () => {
  it("does not guess when multiple sent campaigns target one conversation", async () => {
    const repository = createMemoryCrmConversationRepository();
    const phone = "5511999999910";
    const seeded = await seedCycle(repository, phone);
    const app = createCampaignTestApp(repository);
    const first = await createCampaign(app, {
      name: "Primeira campanha",
      recipients: [seeded.conversationCycle.id],
    });
    const second = await createCampaign(app, {
      name: "Segunda campanha",
      recipients: [seeded.conversationCycle.id],
    });
    await processDue(app);

    expect((await postZapiReply(app, phone)).status).toBe(201);
    await expectCampaign(repository, first.id, { repliedCount: 0 });
    await expectCampaign(repository, second.id, { repliedCount: 0 });
  });
});
