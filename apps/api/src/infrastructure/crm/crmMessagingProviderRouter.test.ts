import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmMessagingGateway } from "../../domains/crm/ports/crmMessagingGateway.js";
import {
  createCrmMessagingProviderRouter,
  isOlxChatRuntimeEnabled,
} from "./crmMessagingProviderRouter.js";

describe("CRM messaging provider router", () => {
  it.each([
    [{ broker: "direct", channel: "whatsapp", provider: "zapi" }, "zapi"],
    [
      { broker: "composio", channel: "whatsapp", provider: "meta_cloud" },
      "composio",
    ],
    [
      { broker: "composio", channel: "instagram", provider: "meta_cloud" },
      "composio",
    ],
    [{ broker: "direct", channel: "olx_chat", provider: "olx" }, "olx"],
  ] as const)("routes %s without fallback", async (identity, expected) => {
    const zapi = createGateway("zapi");
    const composio = createGateway("composio");
    const olx = createGateway("olx");
    const router = createCrmMessagingProviderRouter(zapi, composio, olx, {
      olxChatEnabled: true,
    });

    const result = await router.sendText(createConnection(identity), {
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
    const router = createCrmMessagingProviderRouter(zapi, composio, olx);

    await expect(
      router.sendText(
        createConnection({
          broker: "composio",
          channel: "whatsapp",
          provider: "meta_cloud",
        }),
        {
          phone: "recipient",
          text: "hello",
        },
      ),
    ).rejects.toThrow("official provider failed");
    expect(zapi.sendText).not.toHaveBeenCalled();
    expect(olx.sendText).not.toHaveBeenCalled();
  });

  it("fails closed for OLX without calling its gateway by default", () => {
    const zapi = createGateway("zapi");
    const composio = createGateway("composio");
    const olx = createGateway("olx");
    const router = createCrmMessagingProviderRouter(zapi, composio, olx);

    expect(() =>
      router.sendText(
        createConnection({
          broker: "direct",
          channel: "olx_chat",
          provider: "olx",
        }),
        {
          phone: "recipient",
          text: "hello",
        },
      ),
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
