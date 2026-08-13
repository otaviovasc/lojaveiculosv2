import { describe, expect, it } from "vitest";
import {
  findConnectedConnection,
  findFreeTextStartConnection,
  readConversationStartCapability,
} from "./crmWhatsappConnectionSelection";
import type {
  CrmWhatsappProvider,
  CrmWhatsappProviderConnection,
} from "./crmWhatsappTypes";

describe("CRM messaging connection selection", () => {
  it("prefers a connected conversation-start channel over Instagram", () => {
    const instagram = createConnection("composio_instagram", "instagram");
    const official = createConnection("composio_whatsapp", "official");

    expect(findConnectedConnection([instagram, official])).toBe(official);
  });

  it("keeps lead free-text initiation on Z-API when official channels coexist", () => {
    const official = createConnection("composio_whatsapp", "official");
    const zapi = createConnection("zapi", "zapi");

    expect(findFreeTextStartConnection([official, zapi])).toBe(zapi);
    expect(findFreeTextStartConnection([official])).toBeNull();
  });

  it("prefers an active official connection over a connected but paused Z-API", () => {
    const pausedZapi = {
      ...createConnection("zapi", "zapi"),
      status: "paused" as const,
    };
    const official = createConnection("composio_whatsapp", "official");

    expect(findConnectedConnection([pausedZapi, official])).toBe(official);
    expect(findFreeTextStartConnection([pausedZapi])).toBeNull();
    expect(readConversationStartCapability(pausedZapi)).toMatchObject({
      canStart: false,
      mode: null,
      provider: "zapi",
    });
  });

  it("does not offer OLX Chat as a new-conversation channel", () => {
    const olx = createConnection("olx_chat", "olx");

    expect(findFreeTextStartConnection([olx])).toBeNull();
    expect(readConversationStartCapability(olx)).toMatchObject({
      canStart: false,
      mode: null,
      provider: "olx_chat",
    });
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
    capabilities: capabilitiesForProvider(provider),
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

function capabilitiesForProvider(provider: CrmWhatsappProvider) {
  if (provider === "composio_whatsapp") {
    return {
      audio: true,
      catalog: false,
      conversationStart: true,
      delete: false,
      documents: true,
      imageCaption: true,
      images: true,
      location: true,
      quickMessages: true,
      reactions: false,
      reply: true,
      scheduling: false,
      templates: true,
      text: true,
      vehicle: true,
      video: true,
    } as const;
  }
  if (provider === "composio_instagram") {
    return {
      audio: false,
      catalog: false,
      conversationStart: false,
      delete: false,
      documents: false,
      imageCaption: false,
      images: true,
      location: false,
      quickMessages: false,
      reactions: false,
      reply: false,
      scheduling: false,
      templates: false,
      text: true,
      vehicle: false,
      video: false,
    } as const;
  }
  if (provider === "olx_chat") {
    return {
      audio: false,
      catalog: false,
      conversationStart: false,
      delete: false,
      documents: false,
      imageCaption: false,
      images: false,
      location: false,
      quickMessages: false,
      reactions: false,
      reply: false,
      scheduling: false,
      templates: false,
      text: true,
      vehicle: false,
      video: false,
    } as const;
  }
  return {
    audio: true,
    catalog: true,
    conversationStart: true,
    delete: true,
    documents: true,
    imageCaption: true,
    images: true,
    location: true,
    quickMessages: true,
    reactions: true,
    reply: true,
    scheduling: true,
    templates: false,
    text: true,
    vehicle: true,
    video: true,
  } as const;
}
