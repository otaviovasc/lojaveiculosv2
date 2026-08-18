import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmMessagingSendTextInput } from "../../../domains/crm/ports/crmMessagingGateway.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM WhatsApp extras", () => {
  it("lists quick messages for the composer", async () => {
    const app = createTestApp();

    const response = await app.request("/api/v1/crm/quick-messages");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });

  it("sends location through the audited text fallback", async () => {
    const whatsappRepository = createMemoryCrmConversationRepository();
    const inbound = await seedCycle(whatsappRepository, "location");
    const sendText = vi.fn(
      async (
        _connection: CrmConnection,
        _input: CrmMessagingSendTextInput,
      ) => ({
        externalId: "zapi-location-outbound-1",
        providerTimestamp: new Date("2026-07-02T20:01:00.000Z"),
        raw: { messageId: "zapi-location-outbound-1" },
      }),
    );
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmMessagingGateway: {
        getConnectionStatus: vi.fn(),
        sendMedia: vi.fn(),
        sendText,
      },
      crmConversationRepository: whatsappRepository,
    });

    const response = await app.request("/api/v1/crm/whatsapp/send/location", {
      body: JSON.stringify({
        address: "Av. Paulista, 1000",
        latitude: -23.56168,
        longitude: -46.65598,
        name: "Loja Veiculos",
        cycleId: inbound.conversationCycle.id,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      content: "Loja Veiculos",
      direction: "OUTBOUND",
      externalId: "zapi-location-outbound-1",
      metadata: {
        fallbackTransport: "text",
        location: {
          address: "Av. Paulista, 1000",
          latitude: -23.56168,
          longitude: -46.65598,
          name: "Loja Veiculos",
        },
      },
      type: "LOCATION",
    });
    expect(sendText).toHaveBeenCalledWith(
      expect.objectContaining({ id: connectionId, provider: "zapi" }),
      expect.objectContaining({ phone: "5511999999999" }),
    );
    expect(
      readMockInput<CrmMessagingSendTextInput>(sendText, 0, 1).text,
    ).toContain("Av. Paulista, 1000");
  });

  it("sends catalog through the ZAPI catalog gateway", async () => {
    const whatsappRepository = createMemoryCrmConversationRepository();
    const inbound = await seedCycle(whatsappRepository, "catalog");
    const sendCatalog = vi.fn(async () => ({
      externalId: "zapi-catalog-outbound-1",
      providerTimestamp: new Date("2026-07-02T20:02:00.000Z"),
      raw: { messageId: "zapi-catalog-outbound-1" },
    }));
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection({ phone: "5511940231407" }),
      ]),
      crmMessagingGateway: {
        sendCatalog,
      },
      crmConversationRepository: whatsappRepository,
    });

    const response = await app.request("/api/v1/crm/whatsapp/send/catalog", {
      body: JSON.stringify({
        message: "Veja nosso catalogo",
        cycleId: inbound.conversationCycle.id,
        title: "Catalogo da loja",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      content: "Catalogo da loja",
      direction: "OUTBOUND",
      externalId: "zapi-catalog-outbound-1",
      metadata: {
        catalog: {
          catalogPhone: "5511940231407",
          message: "Veja nosso catalogo",
          title: "Catalogo da loja",
        },
        providerTransport: "zapi_catalog",
      },
      type: "CATALOG",
    });
    expect(sendCatalog).toHaveBeenCalledWith(
      expect.objectContaining({ id: connectionId, provider: "zapi" }),
      {
        catalogPhone: "5511940231407",
        message: "Veja nosso catalogo",
        phone: "5511999999999",
        title: "Catalogo da loja",
        translation: "PT",
      },
    );
  });
});

function seedCycle(
  whatsappRepository: ReturnType<typeof createMemoryCrmConversationRepository>,
  suffix: string,
) {
  return whatsappRepository.ingestMessage({
    customerDisplayName: "Ana",
    customerPhone: "5511999999999",
    channel: "WHATSAPP",
    connectionId,
    content: "Ola",
    direction: "INBOUND",
    externalId: `inbound-extras-${suffix}`,
    metadata: {},
    providerTimestamp: new Date("2026-07-02T20:00:00.000Z"),
    senderOrigin: "customer",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    storeId,
    tenantId,
    type: "TEXT",
  });
}

function createZapiConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  return createConfiguredZapiTestConnection({
    id: connectionId,
    overrides,
    storeId,
    tenantId,
  });
}

function readMockInput<T>(
  mock: { mock: { calls: readonly (readonly unknown[])[] } },
  callIndex: number,
  inputIndex: number,
) {
  return mock.mock.calls[callIndex]?.[inputIndex] as T;
}
