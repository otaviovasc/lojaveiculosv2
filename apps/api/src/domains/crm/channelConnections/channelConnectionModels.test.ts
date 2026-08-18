import { describe, expect, it } from "vitest";
import { setupProviderForConnection } from "./channelConnectionModels.js";
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
