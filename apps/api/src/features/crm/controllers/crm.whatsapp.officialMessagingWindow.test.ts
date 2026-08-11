import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmWhatsappMessageDirection } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

const connectionId = "26000000-0000-4000-8000-000000000101";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("official messaging customer service window", () => {
  it.each([
    ["composio_whatsapp", "WHATSAPP"],
    ["composio_instagram", "INSTAGRAM"],
  ] as const)(
    "rejects %s free-form sends without a recent customer message",
    async (provider, channel) => {
      const repository = createMemoryCrmWhatsappRepository();
      const seeded = await seedMessage(repository, {
        channel,
        direction: "OUTBOUND",
        providerTimestamp: new Date(),
      });
      const sendText = vi.fn();
      const app = createTestApp({
        crmConnectionRepository: createMemoryCrmConnectionRepository([
          createConnection(provider),
        ]),
        crmWhatsappGateway: { sendText },
        crmWhatsappRepository: repository,
      });

      const response = await send(app, seeded.session.id);

      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toMatchObject({
        code: "CRM_MESSAGING_PROVIDER_CAPABILITY_UNAVAILABLE",
      });
      expect(sendText).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["composio_whatsapp", "WHATSAPP"],
    ["composio_instagram", "INSTAGRAM"],
  ] as const)(
    "allows %s text inside the 24-hour customer window",
    async (provider, channel) => {
      const repository = createMemoryCrmWhatsappRepository();
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
          createConnection(provider),
        ]),
        crmWhatsappGateway: { sendText },
        crmWhatsappRepository: repository,
      });

      const response = await send(app, seeded.session.id);

      expect(response.status).toBe(201);
      expect(sendText).toHaveBeenCalledOnce();
    },
  );

  it.each([
    ["composio_whatsapp", "WHATSAPP"],
    ["composio_instagram", "INSTAGRAM"],
  ] as const)(
    "rejects %s text after the customer window expires",
    async (provider, channel) => {
      const repository = createMemoryCrmWhatsappRepository();
      const seeded = await seedMessage(repository, {
        channel,
        direction: "INBOUND",
        providerTimestamp: new Date(Date.now() - 25 * 60 * 60 * 1_000),
      });
      const sendText = vi.fn();
      const app = createTestApp({
        crmConnectionRepository: createMemoryCrmConnectionRepository([
          createConnection(provider),
        ]),
        crmWhatsappGateway: { sendText },
        crmWhatsappRepository: repository,
      });

      const response = await send(app, seeded.session.id);

      expect(response.status).toBe(409);
      expect(sendText).not.toHaveBeenCalled();
    },
  );
});

function send(app: ReturnType<typeof createTestApp>, sessionId: string) {
  return app.request("/api/v1/crm/whatsapp/send/text", {
    body: JSON.stringify({ sessionId, text: "Resposta da loja" }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

function seedMessage(
  repository: ReturnType<typeof createMemoryCrmWhatsappRepository>,
  input: {
    channel: "INSTAGRAM" | "WHATSAPP";
    direction: CrmWhatsappMessageDirection;
    providerTimestamp: Date;
  },
) {
  return repository.ingestMessage({
    buyerPhone:
      input.channel === "INSTAGRAM" ? "ig-scoped-user-1" : "5511999999999",
    channel: input.channel,
    ...(input.channel === "INSTAGRAM"
      ? { channelExternalId: "ig-scoped-user-1" }
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

function createConnection(provider: CrmConnection["provider"]): CrmConnection {
  return {
    credentialsRef: {},
    displayName: provider,
    externalConnectionId: "meta-sender-1",
    externalInstanceId: null,
    id: connectionId,
    metadata: {},
    phone: null,
    provider,
    status: "active",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}
