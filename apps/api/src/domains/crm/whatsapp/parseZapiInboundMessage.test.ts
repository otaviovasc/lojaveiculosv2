import { describe, expect, it } from "vitest";
import { parseZapiInboundMessage } from "./parseZapiInboundMessage.js";

describe("parseZapiInboundMessage", () => {
  it("normalizes inbound image media without duplicating raw payload metadata", () => {
    const parsed = parseZapiInboundMessage({
      image: {
        caption: "Foto do documento",
        height: 720,
        imageUrl: "https://zapi.test/media/image-1.jpg",
        mimeType: "image/jpeg",
        width: 1280,
      },
      messageId: "zapi-image-1",
      phone: "5511999999999",
      senderName: "Ana",
      timestamp: 1783029600,
    });

    expect(parsed).toMatchObject({
      buyerName: "Ana",
      content: "Foto do documento",
      externalId: "zapi-image-1",
      mediaType: "image",
      mediaUrl: "https://zapi.test/media/image-1.jpg",
      phone: "5511999999999",
      type: "IMAGE",
    });
    expect(parsed?.metadata).toMatchObject({
      media: {
        caption: "Foto do documento",
        height: 720,
        mimeType: "image/jpeg",
        width: 1280,
      },
      provider: "zapi",
    });
    expect(parsed?.metadata.raw).toBeUndefined();
    expect(parsed?.metadata.payloadKeys).toEqual([
      "image",
      "messageId",
      "phone",
      "senderName",
      "timestamp",
    ]);
  });

  it("uses document file names as the message preview when no caption exists", () => {
    const parsed = parseZapiInboundMessage({
      document: {
        documentUrl: "https://zapi.test/media/doc-1.pdf",
        fileName: "proposta.pdf",
        mimeType: "application/pdf",
      },
      messageId: "zapi-doc-1",
      phone: "5511888887777",
      timestamp: 1783029600,
    });

    expect(parsed).toMatchObject({
      content: "proposta.pdf",
      mediaUrl: "https://zapi.test/media/doc-1.pdf",
      type: "DOCUMENT",
    });
    expect(parsed?.metadata).toMatchObject({
      media: {
        fileName: "proposta.pdf",
        mimeType: "application/pdf",
      },
    });
  });

  it("normalizes location payloads into message metadata", () => {
    const parsed = parseZapiInboundMessage({
      location: {
        address: "Av. Paulista, Sao Paulo",
        latitude: "-23.5614",
        longitude: "-46.6559",
        name: "Loja",
      },
      messageId: "zapi-location-1",
      phone: "5511777777777",
      timestamp: 1783029600,
    });

    expect(parsed).toMatchObject({
      content: "Loja",
      type: "LOCATION",
    });
    expect(parsed?.metadata).toMatchObject({
      location: {
        address: "Av. Paulista, Sao Paulo",
        latitude: -23.5614,
        longitude: -46.6559,
        name: "Loja",
      },
    });
  });
});
