import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmMessageDirection } from "../../../domains/crm/ports/crmConversationRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";

const connectionId = "26000000-0000-4000-8000-000000000101";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("official messaging customer service window", () => {
  it.each([
    ["whatsapp", "WHATSAPP"],
    ["instagram", "INSTAGRAM"],
  ] as const)(
    "rejects %s free-form sends without a recent customer message",
    async (connectionChannel, channel) => {
      const repository = createMemoryCrmConversationRepository();
      const seeded = await seedMessage(repository, {
        channel,
        direction: "OUTBOUND",
        providerTimestamp: new Date(),
      });
      const sendText = vi.fn();
      const app = createTestApp({
        crmConnectionRepository: createMemoryCrmConnectionRepository([
          createConnection(connectionChannel),
        ]),
        crmMessagingGateway: { sendText },
        crmConversationRepository: repository,
      });

      const response = await send(app, seeded.conversationCycle.id);

      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toMatchObject({
        code: "CRM_MESSAGING_PROVIDER_CAPABILITY_UNAVAILABLE",
      });
      expect(sendText).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["whatsapp", "WHATSAPP"],
    ["instagram", "INSTAGRAM"],
  ] as const)(
    "allows %s text inside the 24-hour customer window",
    async (connectionChannel, channel) => {
      const repository = createMemoryCrmConversationRepository();
      const seeded = await seedMessage(repository, {
        channel,
        direction: "INBOUND",
        providerTimestamp: new Date(),
      });
      const sendText = vi.fn(async () => ({
        externalId: "wamid.service-window-1",
        providerTimestamp: new Date(),
        raw: { messages: [{ id: "wamid.service-window-1" }] },
      }));
      const app = createTestApp({
        crmConnectionRepository: createMemoryCrmConnectionRepository([
          createConnection(connectionChannel),
        ]),
        crmMessagingGateway: { sendText },
        crmConversationRepository: repository,
      });

      const response = await send(app, seeded.conversationCycle.id);

      expect(response.status).toBe(201);
      expect(sendText).toHaveBeenCalledOnce();
    },
  );

  it.each([
    ["whatsapp", "WHATSAPP"],
    ["instagram", "INSTAGRAM"],
  ] as const)(
    "rejects %s text after the customer window expires",
    async (connectionChannel, channel) => {
      const repository = createMemoryCrmConversationRepository();
      const seeded = await seedMessage(repository, {
        channel,
        direction: "INBOUND",
        providerTimestamp: new Date(Date.now() - 25 * 60 * 60 * 1_000),
      });
      const sendText = vi.fn();
      const app = createTestApp({
        crmConnectionRepository: createMemoryCrmConnectionRepository([
          createConnection(connectionChannel),
        ]),
        crmMessagingGateway: { sendText },
        crmConversationRepository: repository,
      });

      const response = await send(app, seeded.conversationCycle.id);

      expect(response.status).toBe(409);
      expect(sendText).not.toHaveBeenCalled();
    },
  );
});

function send(app: ReturnType<typeof createTestApp>, cycleId: string) {
  return app.request(`/api/v1/crm/conversation-cycles/${cycleId}/messages`, {
    body: JSON.stringify({ content: "Resposta da loja" }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

function seedMessage(
  repository: ReturnType<typeof createMemoryCrmConversationRepository>,
  input: {
    channel: "INSTAGRAM" | "WHATSAPP";
    direction: CrmMessageDirection;
    providerTimestamp: Date;
  },
) {
  return repository.ingestMessage({
    customerPhone:
      input.channel === "INSTAGRAM" ? "ig-scoped-user-1" : "5511999999999",
    channel: input.channel,
    ...(input.channel === "INSTAGRAM"
      ? { externalThreadId: "ig-scoped-user-1" }
      : {}),
    connectionId,
    content: "Mensagem inicial",
    direction: input.direction,
    externalId: `seed-${input.direction}-${input.providerTimestamp.getTime()}`,
    metadata: {},
    providerTimestamp: input.providerTimestamp,
    senderOrigin: input.direction === "INBOUND" ? "customer" : "human_crm",
    senderType: input.direction === "INBOUND" ? "CUSTOMER" : "HUMAN",
    status: input.direction === "INBOUND" ? "DELIVERED" : "SENT",
    storeId,
    tenantId,
    type: "TEXT",
  });
}

function createConnection(channel: "instagram" | "whatsapp"): CrmConnection {
  return {
    broker: "composio",
    channel,
    credentialsRef: {},
    displayName: channel,
    externalConnectionId: "meta-sender-1",
    externalInstanceId: null,
    id: connectionId,
    metadata: {
      capabilities: { inbound: true, outbound: true, text: true },
      connected: true,
      providerConnected: true,
    },
    phone: null,
    provider: "meta_cloud",
    status: "active",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}
