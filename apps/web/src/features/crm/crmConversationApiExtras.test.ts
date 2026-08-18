import { describe, expect, it } from "vitest";
import { createCrmConversationApi } from "./crmConversationApi";

type FetchCall = {
  init: RequestInit | undefined;
  input: RequestInfo | URL;
};

function createFakeFetch(payloads: unknown[]) {
  const calls: FetchCall[] = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    calls.push({ init, input });
    return new Response(JSON.stringify(payloads.shift() ?? {}), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  };
  return { calls, fetch: fakeFetch };
}

describe("CRM WhatsApp extras API", () => {
  it("loads quick messages through V2", async () => {
    const fake = createFakeFetch([
      [{ id: "greeting", kind: "TEXT", shortcut: "/ola", title: "Saudacao" }],
    ]);
    const api = createCrmConversationApi({ fetch: fake.fetch });

    await expect(api.listQuickMessages()).resolves.toEqual([
      { id: "greeting", kind: "TEXT", shortcut: "/ola", title: "Saudacao" },
    ]);
    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/quick-messages",
      init: { method: "GET" },
    });
  });

  it("manages and sends quick message templates through V2", async () => {
    const fake = createFakeFetch([
      { id: "quick_1", kind: "TEXT" },
      { id: "quick_1", kind: "TEXT", title: "Pix" },
      { id: "message_1" },
      { id: "quick_1" },
    ]);
    const api = createCrmConversationApi({ fetch: fake.fetch });

    await api.createQuickMessage({
      content: "Chave Pix",
      shortcut: "/pix",
      title: "Pix",
    });
    await api.updateQuickMessage("quick_1", { title: "Pix atualizado" });
    await api.sendQuickMessage({
      quickMessageId: "quick_1",
      cycleId: "session_1",
    });
    await api.deleteQuickMessage("quick_1");

    expect(fake.calls.map((call) => call.input)).toEqual([
      "/api/v1/crm/quick-messages",
      "/api/v1/crm/quick-messages/quick_1",
      "/api/v1/crm/quick-messages/quick_1/send",
      "/api/v1/crm/quick-messages/quick_1",
    ]);
    expect(fake.calls.map((call) => call.init?.method)).toEqual([
      "POST",
      "PATCH",
      "POST",
      "DELETE",
    ]);
  });

  it("posts structured WhatsApp extras through V2", async () => {
    const fake = createFakeFetch([
      { id: 200 },
      { id: 201 },
      { id: 202 },
      { id: 203 },
    ]);
    const api = createCrmConversationApi({ fetch: fake.fetch });

    await api.sendLocation({
      address: "Av. Paulista, 1000",
      latitude: -23.56168,
      longitude: -46.65598,
      name: "Loja Veiculos",
      cycleId: "session_1",
      url: "https://maps.example/location",
    });
    await api.sendCatalog({
      catalogUrl: "https://loja.example/catalogo",
      message: "Veja nossas opcoes",
      cycleId: "session_1",
      title: "Catalogo da loja",
    });
    await api.sendCatalogProduct({
      catalogPhone: "5511940231407",
      productId: "prod_1",
      productName: "Honda Civic EXL",
      cycleId: "session_1",
    });
    await api.sendVehicle({
      description: "Completo",
      mileageLabel: "10.000 km",
      priceLabel: "R$ 90.000",
      cycleId: "session_1",
      thumbnailUrl: "https://loja.example/carro.jpg",
      title: "Honda Civic EXL",
      url: "https://loja.example/civic",
      year: "2024",
    });

    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/whatsapp/send/location",
      init: {
        body: JSON.stringify({
          address: "Av. Paulista, 1000",
          latitude: -23.56168,
          longitude: -46.65598,
          name: "Loja Veiculos",
          cycleId: "session_1",
          url: "https://maps.example/location",
        }),
        method: "POST",
      },
    });
    expect(fake.calls[1]).toMatchObject({
      input: "/api/v1/crm/whatsapp/send/catalog",
      init: {
        body: JSON.stringify({
          catalogUrl: "https://loja.example/catalogo",
          message: "Veja nossas opcoes",
          cycleId: "session_1",
          title: "Catalogo da loja",
        }),
        method: "POST",
      },
    });
    expect(fake.calls[2]).toMatchObject({
      input: "/api/v1/crm/whatsapp/send/catalog/product",
      init: {
        body: JSON.stringify({
          catalogPhone: "5511940231407",
          productId: "prod_1",
          productName: "Honda Civic EXL",
          cycleId: "session_1",
        }),
        method: "POST",
      },
    });
    expect(fake.calls[3]).toMatchObject({
      input: "/api/v1/crm/whatsapp/send/vehicle",
      init: {
        body: JSON.stringify({
          description: "Completo",
          mileageLabel: "10.000 km",
          priceLabel: "R$ 90.000",
          cycleId: "session_1",
          thumbnailUrl: "https://loja.example/carro.jpg",
          title: "Honda Civic EXL",
          url: "https://loja.example/civic",
          year: "2024",
        }),
        method: "POST",
      },
    });
  });

  it("lists real catalog products for the active CRM cycle", async () => {
    const fake = createFakeFetch([
      {
        catalogPhone: "5511940231407",
        products: [{ id: "prod_1", images: [], name: "Honda Civic EXL" }],
      },
    ]);
    const api = createCrmConversationApi({ fetch: fake.fetch });

    await expect(
      api.listCatalogProducts({
        nextCursor: "cursor_1",
        cycleId: "session_1",
      }),
    ).resolves.toMatchObject({
      products: [{ id: "prod_1", name: "Honda Civic EXL" }],
    });

    expect(fake.calls[0]).toMatchObject({
      input:
        "/api/v1/crm/whatsapp/catalog/products?nextCursor=cursor_1&cycleId=session_1",
      init: { method: "GET" },
    });
  });

  it("adds and removes real WhatsApp cycle tags through V2", async () => {
    const tagId = "550e8400-e29b-41d4-a716-446655440000";
    const fake = createFakeFetch([
      {
        id: "session_1",
        tags: [{ id: tagId, name: "Quente" }],
      },
      { id: "session_1", tags: [] },
    ]);
    const api = createCrmConversationApi({ fetch: fake.fetch });

    await expect(
      api.addCycleTag("session_1", {
        emoji: null,
        name: "Quente",
      }),
    ).resolves.toMatchObject({
      tags: [{ id: tagId, name: "Quente" }],
    });
    await expect(api.removeCycleTag("session_1", tagId)).resolves.toMatchObject(
      {
        tags: [],
      },
    );

    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/conversation-cycles/session_1/tags",
      init: {
        body: JSON.stringify({
          emoji: null,
          name: "Quente",
        }),
        method: "POST",
      },
    });
    expect(fake.calls[1]).toMatchObject({
      input:
        "/api/v1/crm/conversation-cycles/session_1/tags/550e8400-e29b-41d4-a716-446655440000",
      init: { method: "DELETE" },
    });
  });

  it("lists reusable CRM WhatsApp tags through V2", async () => {
    const fake = createFakeFetch([[{ id: "tag_1", name: "Visita agendada" }]]);
    const api = createCrmConversationApi({ fetch: fake.fetch });

    await expect(
      api.listTags({
        connectionId: "24000000-0000-4000-8000-000000000101",
        search: "visita",
      }),
    ).resolves.toEqual([{ id: "tag_1", name: "Visita agendada" }]);

    expect(fake.calls[0]).toMatchObject({
      input:
        "/api/v1/crm/tags?connectionId=24000000-0000-4000-8000-000000000101&search=visita",
      init: { method: "GET" },
    });
  });

  it("lists store-wide scheduled messages through V2 filters", async () => {
    const fake = createFakeFetch([[{ id: "schedule_1", status: "pending" }]]);
    const api = createCrmConversationApi({ fetch: fake.fetch });

    await expect(
      api.listScheduledMessages({
        connectionId: "24000000-0000-4000-8000-000000000101",
        limit: 100,
        status: "pending",
      }),
    ).resolves.toEqual([{ id: "schedule_1", status: "pending" }]);

    expect(fake.calls[0]).toMatchObject({
      input:
        "/api/v1/crm/scheduled-messages?connectionId=24000000-0000-4000-8000-000000000101&limit=100&status=pending",
      init: { method: "GET" },
    });
  });

  it("lists and retries failed provider events through V2", async () => {
    const fake = createFakeFetch([
      { events: [{ id: "event_1", status: "failed" }] },
      { event: { id: "event_1", status: "processed" }, result: {} },
    ]);
    const api = createCrmConversationApi({ fetch: fake.fetch });

    await expect(api.listProviderEventIssues()).resolves.toEqual({
      events: [{ id: "event_1", status: "failed" }],
    });
    await expect(api.retryProviderEvent("event_1")).resolves.toMatchObject({
      event: { id: "event_1", status: "processed" },
    });

    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/provider-events",
      init: { method: "GET" },
    });
    expect(fake.calls[1]).toMatchObject({
      input: "/api/v1/crm/provider-events/event_1/retry",
      init: { body: JSON.stringify({}), method: "POST" },
    });
  });

  it("loads and updates the external bot integration through V2", async () => {
    const fake = createFakeFetch([
      {
        configuration: externalBotConfiguration({
          enabled: false,
          secretConfigured: false,
        }),
      },
      {
        configuration: externalBotConfiguration({
          enabled: true,
          secretConfigured: true,
        }),
      },
    ]);
    const api = createCrmConversationApi({ fetch: fake.fetch });

    await expect(api.getBotIntegration()).resolves.toMatchObject({
      configuration: { enabled: false },
    });
    await expect(
      api.updateBotIntegration({
        enabled: true,
        webhookSecret: "bot-secret",
        webhookUrl: "https://bot.example.test/webhook",
      }),
    ).resolves.toMatchObject({
      configuration: { enabled: true, secretConfigured: true },
    });

    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/bot/configuration",
      init: { method: "GET" },
    });
    expect(fake.calls[1]).toMatchObject({
      input: "/api/v1/crm/bot/configuration",
      init: {
        body: JSON.stringify({
          enabled: true,
          webhookSecret: "bot-secret",
          webhookUrl: "https://bot.example.test/webhook",
        }),
        method: "PATCH",
      },
    });
  });

  it("loads and updates the typed CRM channel routing policy", async () => {
    const response = {
      channels: [
        {
          externalBot: {
            blocked: null,
            connection: null,
            mode: "disabled",
            ready: false,
            requiredCapabilities: ["text"],
          },
          channel: "instagram",
          storeDefault: {
            blocked: {
              code: "policy_not_configured",
              message: "missing",
              remediation: "select",
            },
            connection: null,
            ready: false,
            requiredCapabilities: ["text"],
          },
        },
      ],
      storeId: "store-1",
      tenantId: "tenant-1",
    };
    const fake = createFakeFetch([response, response]);
    const api = createCrmConversationApi({ fetch: fake.fetch });

    await expect(api.getRoutingPolicy()).resolves.toMatchObject(response);
    await api.updateRoutingPolicy({
      channel: "instagram",
      defaultConnectionId: "connection-1",
      externalBotConnectionId: null,
      externalBotMode: "inherit_store_default",
    });

    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/routing-policy",
      init: { method: "GET" },
    });
    expect(fake.calls[1]).toMatchObject({
      input: "/api/v1/crm/routing-policy",
      init: {
        body: JSON.stringify({
          channel: "instagram",
          defaultConnectionId: "connection-1",
          externalBotConnectionId: null,
          externalBotMode: "inherit_store_default",
        }),
        method: "PATCH",
      },
    });
  });
});

function externalBotConfiguration(
  overrides: Partial<{
    enabled: boolean;
    secretConfigured: boolean;
  }> = {},
) {
  return {
    createdAt: "2026-08-18T12:00:00.000Z",
    enabled: false,
    id: "external-bot-1",
    secretConfigured: false,
    secretUpdatedAt: null,
    updatedAt: "2026-08-18T12:00:00.000Z",
    webhookUrl: "https://bot.example.test/webhook",
    ...overrides,
  };
}
