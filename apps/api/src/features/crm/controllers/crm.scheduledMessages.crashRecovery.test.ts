import { describe, expect, it, vi } from "vitest";
import {
  campaignConnectionId,
  campaignStoreId,
  campaignTenantId,
  seedCycle,
} from "./crm.campaigns.testSupport.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createMemoryCrmRoutingRepositories } from "../adapters/memory/crmRoutingRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import { CrmOutboundReconciliationPendingError } from "../../../domains/crm/messaging/crmMessagingErrors.js";
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
          externalId: "reply-recovered",
          providerTimestamp: new Date(),
          raw: {},
        })),
    },
    crmConversationRepository: conversationRepository,
  });
}

describe("CRM scheduled message crash recovery and lease expiration", () => {
  it("recovers and sends an abandoned sending message after lease expires", async () => {
    const repository = createMemoryCrmConversationRepository();
    const sendText = vi.fn(async () => ({
      externalId: "reply-crash-recovered",
      providerTimestamp: new Date(),
      raw: {},
    }));
    const app = buildApp(repository, sendText);

    const seeded = await seedCycle(repository, "5511999991101");
    // Create a message that was left in 'sending' state 3 minutes ago
    const scheduled = await repository.createScheduledMessage({
      connectionId: seeded.conversationCycle.connectionId,
      content: "Recovered after crash",
      cycleId: seeded.conversationCycle.id,
      recipientAddress: seeded.conversationCycle.customerPhone,
      scheduledAt: new Date("2030-01-01T10:00:00.000Z"),
      storeId: seeded.conversationCycle.storeId,
      tenantId: seeded.conversationCycle.tenantId,
    });

    // Simulate crash: claim set to sending 3 minutes ago
    const threeMinutesAgo = new Date(Date.now() - 180_000);
    await repository.updateScheduledMessage({
      id: scheduled.id,
      status: "sending",
      storeId: scheduled.storeId,
      tenantId: scheduled.tenantId,
      updatedAt: threeMinutesAgo,
    });

    // Run processDue
    const response = await postProcessDue(app);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      processed: 1,
      sent: 1,
    });

    expect(sendText).toHaveBeenCalledTimes(1);
    expect(sendText).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        text: "Recovered after crash",
      }),
    );

    const [persisted] = await repository.listScheduledMessages({
      limit: 1,
      scheduledMessageId: scheduled.id,
      storeId: scheduled.storeId,
      tenantId: scheduled.tenantId,
    });
    expect(persisted?.status).toBe("sent");
  });

  it("does not steal a sending message whose lease is still active", async () => {
    const repository = createMemoryCrmConversationRepository();
    const sendText = vi.fn();
    const app = buildApp(repository, sendText);

    const seeded = await seedCycle(repository, "5511999991102");
    const scheduled = await repository.createScheduledMessage({
      connectionId: seeded.conversationCycle.connectionId,
      content: "Active sending message",
      cycleId: seeded.conversationCycle.id,
      recipientAddress: seeded.conversationCycle.customerPhone,
      scheduledAt: new Date("2030-01-01T10:00:00.000Z"),
      storeId: seeded.conversationCycle.storeId,
      tenantId: seeded.conversationCycle.tenantId,
    });

    // Set to 'sending' with recent updatedAt (30s ago, lease is 120s)
    const thirtySecondsAgo = new Date(Date.now() - 30_000);
    await repository.updateScheduledMessage({
      id: scheduled.id,
      status: "sending",
      storeId: scheduled.storeId,
      tenantId: scheduled.tenantId,
      updatedAt: thirtySecondsAgo,
    });

    const response = await postProcessDue(app);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      processed: 0,
      sent: 0,
    });

    expect(sendText).not.toHaveBeenCalled();
  });

  it("preserves sending status without marking failed when CrmOutboundReconciliationPendingError occurs", async () => {
    const repository = createMemoryCrmConversationRepository();
    let attempt = 0;
    const sendText = vi.fn(async () => {
      attempt++;
      if (attempt === 1) {
        throw new CrmOutboundReconciliationPendingError();
      }
      return {
        externalId: "reply-eventual",
        providerTimestamp: new Date(),
        raw: {},
      };
    });
    const app = buildApp(repository, sendText);

    const seeded = await seedCycle(repository, "5511999991103");
    const scheduled = await repository.createScheduledMessage({
      connectionId: seeded.conversationCycle.connectionId,
      content: "Pending reconciliation message",
      cycleId: seeded.conversationCycle.id,
      recipientAddress: seeded.conversationCycle.customerPhone,
      scheduledAt: new Date("2030-01-01T10:00:00.000Z"),
      storeId: seeded.conversationCycle.storeId,
      tenantId: seeded.conversationCycle.tenantId,
    });

    // First process: throws CrmOutboundReconciliationPendingError
    const firstRun = await postProcessDue(app);
    const firstBody: unknown = await firstRun.json();
    const [afterFirst] = await repository.listScheduledMessages({
      limit: 1,
      scheduledMessageId: scheduled.id,
      storeId: scheduled.storeId,
      tenantId: scheduled.tenantId,
    });
    expect(firstRun.status).toBe(200);
    expect(firstBody).toMatchObject({
      failed: 0,
      processed: 1,
      sent: 0,
    });
    expect(afterFirst?.status).toBe("sending");

    // Fast-forward lease: simulate 3 minutes elapsed
    await repository.updateScheduledMessage({
      id: scheduled.id,
      status: "sending",
      storeId: scheduled.storeId,
      tenantId: scheduled.tenantId,
      updatedAt: new Date(Date.now() - 180_000),
    });

    // Second process while indeterminate: retry does not blindly resend or mark failed
    const secondRun = await postProcessDue(app);
    expect(secondRun.status).toBe(200);
    expect(await secondRun.json()).toMatchObject({
      failed: 0,
      processed: 0,
      sent: 0,
    });
    // No duplicate provider send
    expect(sendText).toHaveBeenCalledTimes(1);

    const [afterSecond] = await repository.listScheduledMessages({
      limit: 1,
      scheduledMessageId: scheduled.id,
      storeId: scheduled.storeId,
      tenantId: scheduled.tenantId,
    });
    expect(afterSecond?.status).toBe("sending");
  });
});

function postProcessDue(
  app: ReturnType<typeof buildApp>,
  dueAt = "2030-01-01T10:05:00.000Z",
): Promise<Response> {
  return app.request("/api/v1/crm/scheduled-messages/process-due", {
    body: JSON.stringify({ dueAt }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  }) as Promise<Response>;
}
