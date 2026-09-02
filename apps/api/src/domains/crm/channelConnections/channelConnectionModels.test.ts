import { describe, expect, it } from "vitest";
import {
  setupProviderForConnection,
  toCrmChannelConnection,
} from "./channelConnectionModels.js";
import { createTestCrmConnectionRepository } from "../testSupportConnections.js";
import { providerCapabilities } from "../whatsapp/whatsappProviderCapabilities.js";

describe("CRM provider capabilities", () => {
  it("maps canonical Meta connections back to their channel setup flow", () => {
    expect(
      setupProviderForConnection({
        broker: "composio",
        channel: "instagram",
        provider: "meta_cloud",
      }),
    ).toBe("instagram:meta_cloud:composio");
    expect(
      setupProviderForConnection({
        broker: "composio",
        channel: "whatsapp",
        provider: "meta_cloud",
      }),
    ).toBe("whatsapp:meta_cloud:composio");
  });

  it.each([
    [
      { channel: "whatsapp", provider: "zapi" },
      {
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
      },
    ],
    [
      { channel: "whatsapp", provider: "meta_cloud" },
      {
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
      },
    ],
    [
      { channel: "instagram", provider: "meta_cloud" },
      {
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
      },
    ],
    [
      { channel: "olx_chat", provider: "olx" },
      {
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
      },
    ],
  ] as const)("reports the complete %s action matrix", (provider, expected) => {
    expect(providerCapabilities(provider)).toEqual(expected);
  });
});

describe("toCrmChannelConnection DTO mapping", () => {
  it("surfaces phoneNumber and memberUserIds", async () => {
    const repository = createTestCrmConnectionRepository();
    const created = await repository.createConnection({
      broker: "direct",
      channel: "whatsapp",
      displayName: "WhatsApp UAZAPI",
      metadata: {
        capabilities: { inbound: true, outbound: true, text: true },
        connected: false,
        degraded: false,
        errorCode: null,
      },
      phone: "+55 11 99999-0000",
      provider: "uazapi",
      status: "sandbox",
      storeId: "11111111-1111-4111-8111-111111111111" as never,
      tenantId: "22222222-2222-4222-8222-222222222222" as never,
    });
    const live = {
      checkedAt: new Date(),
      connected: false,
      connectedPhone: null,
      providerStatus: "disconnected" as const,
      smartphoneConnected: null,
    };

    const mapped = toCrmChannelConnection(created, live, {
      memberUserIds: ["user_1", "user_2"],
    });

    expect(mapped.phoneNumber).toBe("+55 11 99999-0000");
    expect(mapped.memberUserIds).toEqual(["user_1", "user_2"]);
  });

  it("prefers the canonical phoneNumber column when present", async () => {
    const repository = createTestCrmConnectionRepository();
    const created = await repository.createConnection({
      broker: "direct",
      channel: "whatsapp",
      displayName: "WhatsApp UAZAPI",
      metadata: {},
      phone: null,
      provider: "uazapi",
      status: "sandbox",
      storeId: "11111111-1111-4111-8111-111111111111" as never,
      tenantId: "22222222-2222-4222-8222-222222222222" as never,
    });
    const live = {
      checkedAt: new Date(),
      connected: false,
      connectedPhone: null,
      providerStatus: "disconnected" as const,
      smartphoneConnected: null,
    };

    const mapped = toCrmChannelConnection(
      { ...created, phoneNumber: "5511998887777" },
      live,
    );

    expect(mapped.phoneNumber).toBe("5511998887777");
    expect(mapped.memberUserIds).toBeUndefined();
  });

  it("maps the uazapi direct identity back to its setup flow", () => {
    expect(
      setupProviderForConnection({
        broker: "direct",
        channel: "whatsapp",
        provider: "uazapi",
      }),
    ).toBe("whatsapp:uazapi:direct");
  });
});
