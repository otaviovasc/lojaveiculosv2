import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmMessagingGateway } from "../../domains/crm/ports/crmMessagingGateway.js";
import { createCrmMessagingProviderRouter } from "./crmMessagingProviderRouter.js";

describe("CRM messaging provider router — uazapi dispatch", () => {
  it("routes direct whatsapp uazapi connections to the uazapi gateway", async () => {
    const zapi = createGateway("zapi");
    const composio = createGateway("composio");
    const olx = createGateway("olx");
    const uazapi = createGateway("uazapi");
    const router = createCrmMessagingProviderRouter(
      zapi,
      composio,
      olx,
      { olxChatEnabled: true },
      uazapi,
    );

    const result = await router.sendText(
      createConnection({
        broker: "direct",
        channel: "whatsapp",
        provider: "uazapi",
      }),
      { phone: "recipient", text: "hello" },
    );

    expect(result.externalId).toBe("uazapi");
    expect(uazapi.sendText).toHaveBeenCalledTimes(1);
    expect(zapi.sendText).not.toHaveBeenCalled();
  });

  it("blocks non-normalized uazapi WhatsApp audio at the provider boundary", async () => {
    const uazapi = createGateway("uazapi");
    const router = createCrmMessagingProviderRouter(
      createGateway("zapi"),
      createGateway("composio"),
      createGateway("olx"),
      { olxChatEnabled: false },
      uazapi,
    );

    await expect(
      router.sendMedia(
        createConnection({
          broker: "direct",
          channel: "whatsapp",
          provider: "uazapi",
        }),
        {
          mediaType: "audio",
          mediaUrl: "https://cdn.example.com/legacy.webm",
          mimeType: "audio/webm",
          phone: "5511999999999",
        },
      ),
    ).rejects.toMatchObject({ code: "provider_rejected", status: 409 });
    expect(uazapi.sendMedia).not.toHaveBeenCalled();
  });

  it("fails closed when the uazapi gateway is not wired", () => {
    const router = createCrmMessagingProviderRouter(
      createGateway("zapi"),
      createGateway("composio"),
      createGateway("olx"),
    );

    expect(() =>
      router.sendText(
        createConnection({
          broker: "direct",
          channel: "whatsapp",
          provider: "uazapi",
        }),
        { phone: "recipient", text: "hello" },
      ),
    ).toThrow("UAZAPI is not configured");
  });
});

function createGateway(externalId: string): CrmMessagingGateway {
  const unsupported = vi.fn(async () => {
    throw new Error("unsupported test operation");
  });
  return {
    configureWebhooks: unsupported,
    deleteMessage: unsupported,
    disconnectConnection: unsupported,
    getConnectionStatus: unsupported,
    listCatalogProducts: unsupported,
    removeReaction: unsupported,
    sendCatalog: unsupported,
    sendMedia: unsupported,
    sendProduct: unsupported,
    sendReaction: unsupported,
    sendText: vi.fn(async () => ({
      externalId,
      providerTimestamp: new Date("2026-07-27T12:00:00.000Z"),
    })),
    sendTemplate: unsupported,
  };
}

function createConnection(
  identity: Pick<CrmConnection, "broker" | "channel" | "provider">,
): CrmConnection {
  return {
    ...identity,
    credentialsRef: {},
    displayName: identity.provider,
    externalConnectionId: null,
    externalInstanceId: null,
    id: "25000000-0000-4000-8000-000000000102",
    metadata: {},
    phone: null,
    status: "active",
    storeId: "store_1" as StoreId,
    tenantId: "tenant_1" as TenantId,
    webhookUrl: null,
  };
}
