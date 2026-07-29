import { describe, expect, it } from "vitest";
import {
  findFreeTextStartConnection,
  readConversationStartCapability,
} from "./crmWhatsappConnectionSelection";
import type {
  CrmWhatsappProvider,
  CrmWhatsappProviderConnection,
} from "./crmWhatsappTypes";

describe("CRM messaging connection selection", () => {
  it("keeps lead free-text initiation on Z-API when official channels coexist", () => {
    const official = createConnection("composio_whatsapp", "official");
    const zapi = createConnection("zapi", "zapi");

    expect(findFreeTextStartConnection([official, zapi])).toBe(zapi);
    expect(findFreeTextStartConnection([official])).toBeNull();
  });

  it("maps provider-specific conversation initiation rules", () => {
    expect(
      readConversationStartCapability(
        createConnection("composio_whatsapp", "official"),
      ),
    ).toMatchObject({
      canStart: true,
      mode: "template",
      provider: "composio_whatsapp",
    });
    expect(
      readConversationStartCapability(
        createConnection("composio_instagram", "instagram"),
      ),
    ).toMatchObject({
      canStart: false,
      mode: null,
      provider: "composio_instagram",
      unavailableReason:
        "No Instagram, o cliente precisa enviar a primeira mensagem.",
    });
    expect(
      readConversationStartCapability(createConnection("zapi", "zapi")),
    ).toMatchObject({
      canStart: true,
      mode: "text",
      provider: "zapi",
    });
  });
});

function createConnection(
  provider: CrmWhatsappProvider,
  id: string,
): CrmWhatsappProviderConnection {
  return {
    displayName: id,
    externalConnectionId: id,
    externalInstanceId: null,
    id,
    live: {
      checkedAt: "2026-07-27T12:00:00.000Z",
      connected: true,
      connectedPhone: null,
      providerStatus: "connected",
      smartphoneConnected: null,
    },
    phone: null,
    provider,
    status: "active",
    webhookUrl: null,
  };
}
