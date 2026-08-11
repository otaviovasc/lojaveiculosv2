import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmWhatsappGateway } from "../../domains/crm/ports/crmWhatsappGateway.js";
import {
  createCrmWhatsappProviderRouter,
  isOlxChatRuntimeEnabled,
} from "./crmWhatsappProviderRouter.js";

describe("CRM messaging provider router", () => {
  it.each([
    ["zapi", "zapi"],
    ["composio_whatsapp", "composio"],
    ["composio_instagram", "composio"],
    ["olx_chat", "olx"],
  ] as const)("routes %s without fallback", async (provider, expected) => {
    const zapi = createGateway("zapi");
    const composio = createGateway("composio");
    const olx = createGateway("olx");
    const router = createCrmWhatsappProviderRouter(zapi, composio, olx, {
      olxChatEnabled: true,
    });

    const result = await router.sendText(createConnection(provider), {
      phone: "recipient",
      text: "hello",
    });

    expect(result.externalId).toBe(expected);
    expect(zapi.sendText).toHaveBeenCalledTimes(expected === "zapi" ? 1 : 0);
    expect(composio.sendText).toHaveBeenCalledTimes(
      expected === "composio" ? 1 : 0,
    );
    expect(olx.sendText).toHaveBeenCalledTimes(expected === "olx" ? 1 : 0);
  });

  it("does not fall back to Z-API when Composio fails", async () => {
    const zapi = createGateway("zapi");
    const composio = createGateway("composio");
    const olx = createGateway("olx");
    vi.mocked(composio.sendText).mockRejectedValueOnce(
      new Error("official provider failed"),
    );
    const router = createCrmWhatsappProviderRouter(zapi, composio, olx);

    await expect(
      router.sendText(createConnection("composio_whatsapp"), {
        phone: "recipient",
        text: "hello",
      }),
    ).rejects.toThrow("official provider failed");
    expect(zapi.sendText).not.toHaveBeenCalled();
    expect(olx.sendText).not.toHaveBeenCalled();
  });

  it("fails closed for OLX without calling its gateway by default", () => {
    const zapi = createGateway("zapi");
    const composio = createGateway("composio");
    const olx = createGateway("olx");
    const router = createCrmWhatsappProviderRouter(zapi, composio, olx);

    expect(() =>
      router.sendText(createConnection("olx_chat"), {
        phone: "recipient",
        text: "hello",
      }),
    ).toThrow("OLX Chat is disabled");
    expect(olx.sendText).not.toHaveBeenCalled();
  });

  it.each([undefined, "TRUE", "1", "yes"])(
    "keeps OLX disabled for non-canonical runtime value %s",
    (value) => {
      expect(isOlxChatRuntimeEnabled({ CRM_OLX_CHAT_ENABLED: value })).toBe(
        false,
      );
    },
  );

  it("enables OLX only for the canonical true runtime value", () => {
    expect(isOlxChatRuntimeEnabled({ CRM_OLX_CHAT_ENABLED: "true" })).toBe(
      true,
    );
  });
});

function createGateway(externalId: string): CrmWhatsappGateway {
  const unsupported = vi.fn(async () => {
    throw new Error("unsupported test operation");
  });
  return {
    configureWebhooks: unsupported,
    deleteMessage: unsupported,
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

function createConnection(provider: CrmConnection["provider"]): CrmConnection {
  return {
    credentialsRef: {},
    displayName: provider,
    externalConnectionId: null,
    externalInstanceId: null,
    id: "25000000-0000-4000-8000-000000000102",
    metadata: {},
    phone: null,
    provider,
    status: "active",
    storeId: "store_1" as StoreId,
    tenantId: "tenant_1" as TenantId,
    webhookUrl: null,
  };
}
