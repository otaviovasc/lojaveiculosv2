import { describe, expect, it, vi } from "vitest";
import {
  campaignConnectionId,
  campaignStoreId,
  campaignTenantId,
  createCampaign,
  expectCampaign,
  seedCycle,
} from "./crm.campaigns.testSupport.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createMemoryCrmRoutingRepositories } from "../adapters/memory/crmRoutingRepository.js";
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
          externalId: "reply-bookkeeping",
          providerTimestamp: new Date(),
          raw: {},
        })),
    },
    crmConversationRepository: conversationRepository,
  });
}

describe("CRM scheduled message bookkeeping isolation and replay reconciliation", () => {
  it("marks message sent and isolates bookkeeping error with campaignBookkeepingPending", async () => {
    const repository = createMemoryCrmConversationRepository();
    const sendText = vi.fn(async () => ({
      externalId: "reply-isolated",
      providerTimestamp: new Date(),
      raw: {},
    }));
    const app = buildApp(repository, sendText);

    const seeded = await seedCycle(repository, "5511999992001");
    const campaign = await createCampaign(app, {
      recipients: [seeded.conversationCycle.id],
      scheduledStartAt: "2030-01-01T10:00:00.000Z",
    });

    // Make the atomic campaign delivery operation throw once to simulate a
    // transient bookkeeping failure after the provider has accepted the send.
    const originalRecordCampaignDelivery =
      repository.recordCampaignDelivery.bind(repository);
    let failBookkeeping = true;
    repository.recordCampaignDelivery = vi.fn(async (input) => {
      if (failBookkeeping) {
        throw new Error("Transient DB deadlock during campaign bookkeeping");
      }
      return originalRecordCampaignDelivery(input);
    });

    // Process due scheduled messages
    const response = await app.request(
      "/api/v1/crm/scheduled-messages/process-due",
      {
        body: JSON.stringify({ dueAt: "2030-01-01T10:05:00.000Z" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    expect(response.status).toBe(200);
    // Verified: delivery succeeded, so processed: 1, sent: 1, failed: 0
    expect(await response.json()).toMatchObject({
      failed: 0,
      processed: 1,
      sent: 1,
    });

    // Provider was called
    expect(sendText).toHaveBeenCalledTimes(1);

    // Scheduled message is 'sent', NOT 'failed', with pending bookkeeping flag
    const [persisted] = await repository.listScheduledMessages({
      campaignId: campaign.id,
      limit: 1,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    expect(persisted).toBeDefined();
    expect(persisted?.status).toBe("sent");
    expect(persisted?.sentMessageId).toBeDefined();
    expect(persisted?.metadata?.campaignBookkeepingPending).toBe(true);
    expect(persisted?.metadata?.campaignBookkeepingError).toContain(
      "Transient DB deadlock",
    );

    // Campaign count has NOT been updated yet
    await expectCampaign(repository, campaign.id, {
      sentCount: 0,
    });

    // Now heal the transient failure and run process-due again
    failBookkeeping = false;
    const pendingBeforeRetry = await repository.listScheduledMessages({
      campaignId: campaign.id,
      limit: 1,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    const pendingMessage = pendingBeforeRetry[0];
    if (!pendingMessage) throw new Error("Expected pending bookkeeping.");
    await repository.updateScheduledMessage({
      expectedUpdatedAt: pendingMessage.updatedAt,
      id: pendingMessage.id,
      metadata: {
        ...pendingMessage.metadata,
        campaignBookkeepingNextAttemptAt: new Date(0).toISOString(),
      },
      status: pendingMessage.status,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    const secondResponse = await app.request(
      "/api/v1/crm/scheduled-messages/process-due",
      {
        body: JSON.stringify({ dueAt: "2030-01-01T10:05:00.000Z" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    expect(secondResponse.status).toBe(200);

    // Provider was NOT called a second time (reconciliation does not resend!)
    expect(sendText).toHaveBeenCalledTimes(1);

    // Bookkeeping metadata is cleaned up
    const [reconciled] = await repository.listScheduledMessages({
      campaignId: campaign.id,
      limit: 1,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    expect(reconciled?.status).toBe("sent");
    expect(reconciled?.metadata?.campaignBookkeepingPending).toBeUndefined();
    expect(reconciled?.metadata?.campaignBookkeepingError).toBeUndefined();

    // Campaign metrics now reflect delivery exactly once
    await expectCampaign(repository, campaign.id, {
      sentCount: 1,
    });
  });

  it("reconcilePendingCampaignBookkeeping is idempotent and does not double-count", async () => {
    const repository = createMemoryCrmConversationRepository();
    const app = buildApp(repository);

    const seeded = await seedCycle(repository, "5511999992002");
    const campaign = await createCampaign(app, {
      recipients: [seeded.conversationCycle.id],
      scheduledStartAt: "2030-01-01T10:00:00.000Z",
    });

    // Normal successful process
    const firstRun = await app.request(
      "/api/v1/crm/scheduled-messages/process-due",
      {
        body: JSON.stringify({ dueAt: "2030-01-01T10:05:00.000Z" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    expect(firstRun.status).toBe(200);
    await expectCampaign(repository, campaign.id, {
      sentCount: 1,
    });

    // Running process-due again does not double-count
    const secondRun = await app.request(
      "/api/v1/crm/scheduled-messages/process-due",
      {
        body: JSON.stringify({ dueAt: "2030-01-01T10:05:00.000Z" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    expect(secondRun.status).toBe(200);
    await expectCampaign(repository, campaign.id, {
      sentCount: 1,
    });
  });
});
