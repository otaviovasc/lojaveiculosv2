import { describe, expect, it, vi } from "vitest";
import {
  extractScheduledMediaMetadata,
  prepareScheduledOutboundPayload,
} from "./crmScheduledMediaDispatch.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { CrmMessagingGateway } from "../ports/crmMessagingGateway.js";

const mockConnection: CrmConnection = {
  broker: "direct",
  channel: "whatsapp",
  credentialsRef: {},
  displayName: "Test Connection",
  externalConnectionId: "ext-conn-1",
  externalInstanceId: "inst-1",
  id: "conn-1",
  metadata: {},
  phone: "+5511999999999",
  provider: "uazapi",
  status: "active",
  storeId: "store-1" as never,
  tenantId: "tenant-1" as never,
  webhookUrl: null,
};

describe("crmScheduledMediaDispatch", () => {
  it("extracts media metadata correctly", () => {
    expect(extractScheduledMediaMetadata(null)).toBeNull();
    expect(extractScheduledMediaMetadata({})).toBeNull();
    expect(
      extractScheduledMediaMetadata({
        mediaUrl: "https://example.com/photo.jpg",
        mediaType: "image/jpeg",
        mediaFileName: "photo.jpg",
      }),
    ).toEqual({
      mediaFileName: "photo.jpg",
      mediaType: "image",
      mediaUrl: "https://example.com/photo.jpg",
      mimeType: "image/jpeg",
    });

    expect(
      extractScheduledMediaMetadata({
        media: {
          mediaUrl: "https://example.com/nested.png",
          mediaType: "image",
        },
      }),
    ).toEqual({
      mediaFileName: null,
      mediaType: "image",
      mediaUrl: "https://example.com/nested.png",
      mimeType: null,
    });
  });

  it("prepares outbound text payload with uppercase TEXT and preserves providerTimestamp", async () => {
    const providerTimestamp = new Date("2026-09-07T14:00:00.000Z");
    const sendText = vi.fn().mockResolvedValue({
      externalId: "ext-1",
      providerTimestamp,
    });
    const sendMedia = vi.fn();
    const gateway = { sendText, sendMedia } as unknown as CrmMessagingGateway;

    const result = await prepareScheduledOutboundPayload(
      gateway,
      mockConnection,
      {
        content: "Hello customer",
        metadata: { campaignId: "camp-1" },
        recipientAddress: "5511988887777",
      },
    );

    expect(sendText).toHaveBeenCalledWith(mockConnection, {
      phone: "5511988887777",
      text: "Hello customer",
    });
    expect(sendMedia).not.toHaveBeenCalled();
    expect(result.type).toBe("TEXT");
    expect(result.sent.externalId).toBe("ext-1");
    expect(result.sent.providerTimestamp).toBe(providerTimestamp);
  });

  it("prepares outbound media payload with uppercase DOCUMENT and preserves providerTimestamp", async () => {
    const providerTimestamp = new Date("2026-09-07T14:05:00.000Z");
    const sendMedia = vi.fn().mockResolvedValue({
      externalId: "media-ext-1",
      providerTimestamp,
    });
    const sendText = vi.fn();
    const gateway = { sendText, sendMedia } as unknown as CrmMessagingGateway;

    const result = await prepareScheduledOutboundPayload(
      gateway,
      mockConnection,
      {
        content: "Special offer document",
        id: "msg-1",
        metadata: {
          campaignId: "camp-1",
          mediaUrl: "https://storage.example.com/brochure.pdf",
          mediaType: "document",
          mediaFileName: "brochure.pdf",
        },
        recipientAddress: "5511988887777",
      },
    );

    expect(sendMedia).toHaveBeenCalledWith(mockConnection, {
      caption: "Special offer document",
      fileName: "brochure.pdf",
      mediaType: "document",
      mediaUrl: "https://storage.example.com/brochure.pdf",
      phone: "5511988887777",
    });
    expect(sendText).not.toHaveBeenCalled();
    expect(result.type).toBe("DOCUMENT");
    expect(result.sent.externalId).toBe("media-ext-1");
    expect(result.sent.providerTimestamp).toBe(providerTimestamp);
  });

  it("rejects malformed media metadata and redacts raw URLs in error messages", () => {
    // Non-http URL: error message must NOT leak signed tokens/URL
    try {
      extractScheduledMediaMetadata({
        mediaUrl: "ftp://example.com/bad.png?token=secret123",
      });
      expect.unreachable();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toBe(
        "Scheduled message mediaUrl must be a valid HTTP(S) URL.",
      );
      expect(message).not.toContain("secret123");
    }

    // Empty nested media object: must throw rather than silently dropping
    expect(() =>
      extractScheduledMediaMetadata({
        media: {},
      }),
    ).toThrow(
      "Scheduled message indicates media attachment but media metadata is empty.",
    );

    // hasMedia flag but empty mediaUrl
    expect(() =>
      extractScheduledMediaMetadata({
        hasMedia: true,
        mediaUrl: "",
      }),
    ).toThrow("mediaUrl is missing or empty");

    // Unsupported mediaType
    expect(() =>
      extractScheduledMediaMetadata({
        mediaUrl: "https://example.com/test.xyz",
        mediaType: "unknown_executable",
      }),
    ).toThrow("unsupported mediaType");

    expect(() =>
      extractScheduledMediaMetadata({
        mediaUrl: "https://example.com/image.png",
        mediaStorageKey: "https://storage.example/secret",
      }),
    ).toThrow("managed media storage reference");
  });
});
