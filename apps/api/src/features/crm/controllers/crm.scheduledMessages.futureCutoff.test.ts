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
          externalId: "reply-future-cutoff",
          providerTimestamp: new Date(),
          raw: {},
        })),
    },
    crmConversationRepository: conversationRepository,
  });
}

describe("CRM scheduled message future cutoff concurrency", () => {
  it("does not recover a fresh sending row in concurrent future-cutoff runs", async () => {
    const repository = createMemoryCrmConversationRepository();
    const seeded = await seedCycle(repository, "5511999999306");
    const scheduled = await repository.createScheduledMessage({
      connectionId: seeded.conversationCycle.connectionId,
      recipientAddress: seeded.conversationCycle.customerPhone,
      scheduledAt: new Date("2030-01-01T10:00:00.000Z"),
      cycleId: seeded.conversationCycle.id,
      storeId: seeded.conversationCycle.storeId,
      tenantId: seeded.conversationCycle.tenantId,
      content: "Fresh sending row",
    });
    await repository.updateScheduledMessage({
      expectedStatus: "pending",
      id: scheduled.id,
      status: "sending",
      storeId: seeded.conversationCycle.storeId,
      tenantId: seeded.conversationCycle.tenantId,
    });

    const sendText = vi.fn();
    const app = buildApp(repository, sendText);
    const findDue = repository.findDueScheduledMessages.bind(repository);
    const reads = deferred();
    let readCount = 0;
    repository.findDueScheduledMessages = vi.fn(async (input) => {
      const messages = await findDue(input);
      readCount += 1;
      if (readCount === 2) reads.resolve();
      await reads.promise;
      return messages;
    });

    const first = processDue(app);
    const second = processDue(app);
    await reads.promise;
    reads.resolve();
    const [firstResponse, secondResponse] = await Promise.all([first, second]);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(await firstResponse.json()).toMatchObject({
      processed: 0,
      sent: 0,
    });
    expect(await secondResponse.json()).toMatchObject({
      processed: 0,
      sent: 0,
    });
    expect(sendText).not.toHaveBeenCalled();
  });
});

function processDue(app: ReturnType<typeof buildApp>): Promise<Response> {
  return app.request("/api/v1/crm/scheduled-messages/process-due", {
    body: JSON.stringify({ dueAt: "2030-01-01T11:00:00.000Z" }),
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
