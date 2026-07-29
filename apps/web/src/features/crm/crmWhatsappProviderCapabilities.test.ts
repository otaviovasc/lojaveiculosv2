import { describe, expect, it } from "vitest";
import { readCrmWhatsappProviderCapabilities } from "./crmWhatsappProviderCapabilities";

describe("readCrmWhatsappProviderCapabilities", () => {
  it("preserves the complete Z-API action surface", () => {
    expect(readCrmWhatsappProviderCapabilities("zapi")).toMatchObject({
      allowAudio: true,
      allowCatalog: true,
      allowDelete: true,
      allowDocuments: true,
      allowImages: true,
      allowReactions: true,
      allowReply: true,
      allowScheduling: true,
      allowVideo: true,
      provider: "zapi",
    });
  });

  it("keeps supported official WhatsApp sends and hides unsupported actions", () => {
    expect(
      readCrmWhatsappProviderCapabilities("composio_whatsapp"),
    ).toMatchObject({
      allowAudio: true,
      allowCatalog: false,
      allowDelete: false,
      allowDocuments: true,
      allowImages: true,
      allowReactions: false,
      allowReply: true,
      allowScheduling: false,
      allowVideo: true,
      provider: "composio_whatsapp",
    });
  });

  it("limits official Instagram to verified text and image behavior", () => {
    expect(
      readCrmWhatsappProviderCapabilities("composio_instagram"),
    ).toMatchObject({
      allowAudio: false,
      allowCatalog: false,
      allowDelete: false,
      allowDocuments: false,
      allowImageCaption: false,
      allowImages: true,
      allowLocation: false,
      allowQuickMessages: false,
      allowReactions: false,
      allowReply: false,
      allowScheduling: false,
      allowVehicle: false,
      allowVideo: false,
      provider: "composio_instagram",
    });
  });

  it("treats legacy connections without a provider as Z-API", () => {
    expect(readCrmWhatsappProviderCapabilities(undefined).provider).toBe(
      "zapi",
    );
  });
});
