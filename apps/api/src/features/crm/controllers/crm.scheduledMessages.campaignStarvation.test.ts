import { describe, expect, it, vi } from "vitest";
import {
  campaignConnectionId,
  campaignStoreId,
  campaignTenantId,
  createCampaign,
  createCampaignBody,
  seedCycle,
} from "./crm.campaigns.testSupport.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRoutingRepositories } from "../adapters/memory/crmRoutingRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import type { CrmMessagingGateway } from "../../../domains/crm/ports/crmMessagingGateway.js";

function buildApp(
  conversationRepository: ReturnType<
    typeof createMemoryCrmConversationRepository
  >,
  sendText?: CrmMessagingGateway["sendText"],
) {
  const connections = createMemoryCrmConnectionRepository([
    createConfiguredZapiTestConnection({
      id: campaignConnectionId,
      overrides: { metadata: { providerConnected: true } },
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    }),
  ]);
  const routing = createMemoryCrmRoutingRepositories({
    policies: [
      {
        externalBotConnectionId: null,
        externalBotMode: "disabled",
        channel: "whatsapp",
        defaultConnectionId: campaignConnectionId,
        id: "campaign-whatsapp-default",
        storeId: campaignStoreId,
        tenantId: campaignTenantId,
      },
    ],
  });
  return createTestApp({
    crmConnectionRepository: connections,
    crmRoutingConnectionRepository: connections.routingConnectionRepository,
    crmRoutingPolicyRepository: routing.policyRepository,
    crmMessagingGateway: {
      sendText:
        sendText ??
        vi.fn(async () => ({
          externalId: "reply-1",
          providerTimestamp: new Date(),
          raw: {},
        })),
    },
    crmConversationRepository: conversationRepository,
  });
}

describe("CRM scheduled message paused campaign starvation", () => {
  it("does not starve standalone or later active sends behind 30 paused due rows", async () => {
    const repository = createMemoryCrmConversationRepository();
    const sendText = vi.fn(async () => ({
      externalId: "reply-standalone",
      providerTimestamp: new Date(),
      raw: {},
    }));
    const app = buildApp(repository, sendText);

    // 1. Create a campaign with 30 recipients scheduled at 10:00
    const cycleIds: string[] = [];
    for (let i = 1; i <= 30; i++) {
      const phone = `551198000${String(i).padStart(4, "0")}`;
      const seeded = await seedCycle(repository, phone);
      cycleIds.push(seeded.conversationCycle.id);
    }

    const campaign = await createCampaign(app, {
      recipients: cycleIds,
      scheduledStartAt: "2030-01-01T10:00:00.000Z",
    });

    const beforePause = await repository.findDueScheduledMessages({
      dueAt: new Date("2030-01-01T11:00:00.000Z"),
      limit: 100,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    expect(
      beforePause.filter((message) => message.campaignId === campaign.id),
    ).toHaveLength(30);

    // 2. Pause the campaign
    const pauseResponse = await app.request(
      `/api/v1/crm/campaigns/${campaign.id}/pause`,
      {
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    expect(pauseResponse.status).toBe(200);

    // 3. Create a standalone scheduled message scheduled slightly later (10:01)
    const standaloneCycle = await seedCycle(repository, "5511999990099");
    const standaloneMessage = await repository.createScheduledMessage({
      connectionId: standaloneCycle.conversationCycle.connectionId,
      content: "Standalone important message",
      cycleId: standaloneCycle.conversationCycle.id,
      recipientAddress: standaloneCycle.conversationCycle.customerPhone,
      scheduledAt: new Date("2030-01-01T10:01:00.000Z"),
      storeId: standaloneCycle.conversationCycle.storeId,
      tenantId: standaloneCycle.conversationCycle.tenantId,
    });

    const activeCycle = await seedCycle(repository, "5511999990088");
    const activeCampaign = await createCampaign(app, {
      recipients: [activeCycle.conversationCycle.id],
      scheduledStartAt: "2030-01-01T10:10:00.000Z",
    });

    // 4. Check that findDueScheduledMessages with limit 25 does NOT return paused messages
    const dueMessages = await repository.findDueScheduledMessages({
      dueAt: new Date("2030-01-01T11:00:00.000Z"),
      limit: 25,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    expect(dueMessages).toHaveLength(2);
    expect(dueMessages.map((message) => message.id)).toEqual(
      expect.arrayContaining([standaloneMessage.id]),
    );
    expect(
      dueMessages.some((message) => message.campaignId === activeCampaign.id),
    ).toBe(true);

    // 5. Run processDue - only standalone should be sent
    const processResponse = (await app.request(
      "/api/v1/crm/scheduled-messages/process-due",
      {
        body: JSON.stringify({ dueAt: "2030-01-01T11:00:00.000Z" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    )) as Response;
    expect(processResponse.status).toBe(200);
    expect(await processResponse.json()).toMatchObject({
      processed: 2,
      sent: 2,
    });

    expect(sendText).toHaveBeenCalledTimes(2);
    expect(sendText).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        text: "Standalone important message",
      }),
    );
    expect(sendText).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        text: expect.stringContaining("Ola") as unknown as string,
      }),
    );
  });

  it("excludes paused campaign from listDueScheduledMessageScopes when no other due messages exist", async () => {
    const repository = createMemoryCrmConversationRepository();
    const app = buildApp(repository);

    const seeded = await seedCycle(repository, "5511977770001");
    const campaign = await createCampaign(app, {
      recipients: [seeded.conversationCycle.id],
      scheduledStartAt: "2030-01-01T10:00:00.000Z",
    });

    const pauseResponse = await app.request(
      `/api/v1/crm/campaigns/${campaign.id}/pause`,
      {
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    expect(pauseResponse.status).toBe(200);

    const scopes = await repository.findDueScheduledMessageScopes({
      dueAt: new Date("2030-01-01T11:00:00.000Z"),
      limit: 10,
    });
    expect(scopes).toEqual([]);
  });
});
