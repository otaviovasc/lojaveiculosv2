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

describe("CRM scheduled message edit and claim races", () => {
  it("uses claimed snapshot content when content is edited between read and claim", async () => {
    const repository = createMemoryCrmConversationRepository();
    const seeded = await seedCycle(repository, "5511999999301");
    const scheduled = await repository.createScheduledMessage({
      connectionId: seeded.conversationCycle.connectionId,
      recipientAddress: seeded.conversationCycle.customerPhone,
      scheduledAt: new Date("2030-01-01T10:00:00.000Z"),
      cycleId: seeded.conversationCycle.id,
      storeId: seeded.conversationCycle.storeId,
      tenantId: seeded.conversationCycle.tenantId,
      content: "Initial text before edit",
    });

    const findDue = repository.findDueScheduledMessages.bind(repository);
    const dueRead = deferred();
    const releaseClaim = deferred();
    repository.findDueScheduledMessages = vi.fn(async (input) => {
      const messages = await findDue(input);
      dueRead.resolve();
      await releaseClaim.promise;
      return messages;
    });

    const sendText = vi.fn(async () => ({
      externalId: "reply-edited",
      providerTimestamp: new Date(),
      raw: {},
    }));

    const app = buildApp(repository, sendText);

    const processing = processDue(app);
    await dueRead.promise;

    // Concurrent PATCH content
    const patchResponse = await app.request(
      `/api/v1/crm/scheduled-messages/${scheduled.id}`,
      {
        body: JSON.stringify({ content: "Updated content from user edit" }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      },
    );
    expect(patchResponse.status).toBe(200);

    releaseClaim.resolve();
    const processedResponse = await processing;
    expect(processedResponse.status).toBe(200);
    expect(await processedResponse.json()).toMatchObject({
      processed: 0,
      sent: 0,
    });

    // The snapshot CAS rejects the stale claim. The next sweep reads the
    // edited payload and sends it exactly once.
    expect(sendText).not.toHaveBeenCalled();
    const retryResponse = await processDue(app);
    expect(retryResponse.status).toBe(200);
    expect(await retryResponse.json()).toMatchObject({
      processed: 1,
      sent: 1,
    });
    expect(sendText).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        text: "Updated content from user edit",
      }),
    );

    const [persisted] = await repository.listScheduledMessages({
      limit: 1,
      scheduledMessageId: scheduled.id,
      storeId: seeded.conversationCycle.storeId,
      tenantId: seeded.conversationCycle.tenantId,
    });
    expect(persisted).toMatchObject({
      content: "Updated content from user edit",
      status: "sent",
    });
  });

  it("lets future reschedule win between read and claim so stale message is not sent", async () => {
    const repository = createMemoryCrmConversationRepository();
    const seeded = await seedCycle(repository, "5511999999302");
    const scheduled = await repository.createScheduledMessage({
      connectionId: seeded.conversationCycle.connectionId,
      recipientAddress: seeded.conversationCycle.customerPhone,
      scheduledAt: new Date("2030-01-01T10:00:00.000Z"),
      cycleId: seeded.conversationCycle.id,
      storeId: seeded.conversationCycle.storeId,
      tenantId: seeded.conversationCycle.tenantId,
      content: "Message to be rescheduled",
    });

    const findDue = repository.findDueScheduledMessages.bind(repository);
    const dueRead = deferred();
    const releaseClaim = deferred();
    repository.findDueScheduledMessages = vi.fn(async (input) => {
      const messages = await findDue(input);
      dueRead.resolve();
      await releaseClaim.promise;
      return messages;
    });

    const sendText = vi.fn();
    const app = buildApp(repository, sendText);

    const processing = processDue(app);
    await dueRead.promise;

    // Reschedule to a future time beyond dueAt
    const futureDate = new Date("2030-01-02T15:00:00.000Z");
    const patchResponse = await app.request(
      `/api/v1/crm/scheduled-messages/${scheduled.id}`,
      {
        body: JSON.stringify({ scheduledAt: futureDate.toISOString() }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      },
    );
    expect(patchResponse.status).toBe(200);

    releaseClaim.resolve();
    const processedResponse = await processing;
    expect(processedResponse.status).toBe(200);
    expect(await processedResponse.json()).toMatchObject({
      processed: 0,
      sent: 0,
    });

    expect(sendText).not.toHaveBeenCalled();

    const [persisted] = await repository.listScheduledMessages({
      limit: 1,
      scheduledMessageId: scheduled.id,
      storeId: seeded.conversationCycle.storeId,
      tenantId: seeded.conversationCycle.tenantId,
    });
    expect(persisted?.status).toBe("pending");
    expect(persisted?.scheduledAt.toISOString()).toBe(futureDate.toISOString());
  });
});

function processDue(
  app: ReturnType<typeof buildApp>,
  dueAt = "2030-01-01T10:01:00.000Z",
): Promise<Response> {
  return app.request("/api/v1/crm/scheduled-messages/process-due", {
    body: JSON.stringify({ dueAt }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  }) as Promise<Response>;
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
