import { describe, expect, it } from "vitest";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import {
  createCampaignTestApp,
  seedCycle,
} from "./crm.campaigns.testSupport.js";

describe("lead scheduled message query", () => {
  it("filters linked cycles before the limit and requires schedule read permission", async () => {
    const repo = createMemoryCrmConversationRepository();
    const leadId = "11111111-1111-4111-8111-111111111111";
    for (let index = 0; index < 3; index++) {
      const { conversationCycle: cycle } = await seedCycle(
        repo,
        `551199999930${index}`,
      );
      await repo.updateConversationCycle({
        cycleId: cycle.id,
        storeId: cycle.storeId,
        tenantId: cycle.tenantId,
        metadata: { leadId: index === 0 ? leadId : "other-lead" },
      });
      await repo.createScheduledMessage({
        connectionId: cycle.connectionId,
        cycleId: cycle.id,
        storeId: cycle.storeId,
        tenantId: cycle.tenantId,
        recipientAddress: cycle.customerPhone,
        content: `Reminder ${index}`,
        scheduledAt: new Date(`2030-01-0${index + 1}T12:00:00Z`),
      });
    }
    const app = createCampaignTestApp(repo);
    const response = await app.request(
      `/api/v1/crm/scheduled-messages?leadId=${leadId}&limit=1`,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      expect.objectContaining({ content: "Reminder 0" }),
    ]);
    const unknown = await app.request(
      "/api/v1/crm/scheduled-messages?leadId=22222222-2222-4222-8222-222222222222",
    );
    expect(await unknown.json()).toEqual([]);
    const denied = await createCampaignTestApp(repo, []).request(
      `/api/v1/crm/scheduled-messages?leadId=${leadId}`,
    );
    expect(denied.status).toBe(403);
  });
});
