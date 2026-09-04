import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmMessagingGateway } from "../../../domains/crm/ports/crmMessagingGateway.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM WhatsApp catalog products", () => {
  it("lists real ZAPI catalog products for the active cycle connection", async () => {
    const whatsappRepository = createMemoryCrmConversationRepository();
    const inbound = await seedCycle(whatsappRepository, "catalog-products");
    const listCatalogProducts = vi.fn(async () => ({
      cartEnabled: true,
      nextCursor: "cursor_2",
      products: [
        {
          availability: "in stock",
          currency: "BRL",
          description: "Completo",
          id: "prod_1",
          images: ["https://cdn.local/civic.jpg"],
          name: "Honda Civic EXL",
          price: "119900",
          quantity: 1,
          retailerId: "CIVIC-1",
          salePrice: null,
        },
      ],
      raw: { products: [] },
    }));
    const app = createApp(whatsappRepository, { listCatalogProducts });

    const response = await app.request(
      `/api/v1/crm/whatsapp/catalog/products?cycleId=${inbound.conversationCycle.id}`,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      catalogPhone: "5511940231407",
      products: [{ id: "prod_1", name: "Honda Civic EXL" }],
    });
    expect(listCatalogProducts).toHaveBeenCalledWith(
      expect.objectContaining({ id: connectionId, provider: "zapi" }),
      { catalogPhone: "5511940231407" },
    );
  });

  it("sends a ZAPI catalog product through the outbound pipeline", async () => {
    const whatsappRepository = createMemoryCrmConversationRepository();
    const inbound = await seedCycle(whatsappRepository, "catalog-product");
    const sendProduct = vi.fn(async () => ({
      externalId: "zapi-product-outbound-1",
      providerTimestamp: new Date("2026-07-02T20:03:00.000Z"),
      raw: { messageId: "zapi-product-outbound-1" },
    }));
    const app = createApp(whatsappRepository, { sendProduct });

    const response = await app.request(
      "/api/v1/crm/whatsapp/send/catalog/product",
      {
        body: JSON.stringify({
          productId: "prod_1",
          productName: "Honda Civic EXL",
          cycleId: inbound.conversationCycle.id,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      content: "Honda Civic EXL",
      externalId: "zapi-product-outbound-1",
      metadata: {
        catalogProduct: {
          catalogPhone: "5511940231407",
          productId: "prod_1",
          productName: "Honda Civic EXL",
        },
        providerTransport: "zapi_product",
      },
      type: "CATALOG",
    });
    expect(sendProduct).toHaveBeenCalledWith(
      expect.objectContaining({ id: connectionId, provider: "zapi" }),
      {
        catalogPhone: "5511940231407",
        phone: "5511999999999",
        productId: "prod_1",
      },
    );
  });
});

function createApp(
  crmConversationRepository: ReturnType<
    typeof createMemoryCrmConversationRepository
  >,
  crmMessagingGateway: Partial<CrmMessagingGateway>,
) {
  const connectionRepository = createMemoryCrmConnectionRepository([
    createZapiConnection({ phone: "5511940231407" }),
  ]);
  return createTestApp({
    crmConnectionRepository: connectionRepository,
    crmRoutingConnectionRepository:
      connectionRepository.routingConnectionRepository,
    crmMessagingGateway,
    crmConversationRepository,
  });
}

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
    externalId: `inbound-catalog-product-${suffix}`,
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
    overrides: {
      ...overrides,
      metadata: {
        capabilities: { catalog: true },
        providerConnected: true,
        ...overrides.metadata,
      },
    },
    storeId,
    tenantId,
  });
}
