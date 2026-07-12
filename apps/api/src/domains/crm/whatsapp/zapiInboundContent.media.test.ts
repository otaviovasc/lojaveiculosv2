import { describe, expect, it } from "vitest";
import { extractZapiInboundContent } from "./zapiInboundContent.js";

describe("extractZapiInboundContent media", () => {
  it("prefers trimmed text over lower-priority media", () => {
    expect(
      extractZapiInboundContent({
        image: { imageUrl: "https://zapi.test/image.jpg" },
        text: { message: "  mensagem principal  " },
      }),
    ).toEqual({
      content: "mensagem principal",
      metadata: {},
      type: "TEXT",
    });
  });

  it("normalizes the supported media metadata without raw provider data", () => {
    expect(
      extractZapiInboundContent({
        image: {
          caption: "  Foto do veiculo  ",
          duration: "2",
          fileName: " frente.jpg ",
          fileSha256: " checksum ",
          height: "720",
          imageUrl: " https://zapi.test/frente.jpg ",
          jpegThumbnail: " https://zapi.test/thumb.jpg ",
          mimetype: " image/jpeg ",
          viewOnce: true,
          width: 0,
        },
      }),
    ).toEqual({
      content: "Foto do veiculo",
      mediaType: "image",
      mediaUrl: "https://zapi.test/frente.jpg",
      metadata: {
        media: {
          caption: "Foto do veiculo",
          fileName: "frente.jpg",
          height: 720,
          mimeType: "image/jpeg",
          seconds: 2,
          sha256: "checksum",
          thumbnailUrl: "https://zapi.test/thumb.jpg",
          viewOnce: true,
          width: 0,
        },
      },
      type: "IMAGE",
    });
  });

  it.each([
    {
      expected: {
        content: "Audio do cliente",
        mediaType: "audio",
        mediaUrl: "https://zapi.test/audio.ogg",
        metadata: { media: { caption: "Audio do cliente" } },
        type: "AUDIO",
      },
      label: "audio",
      payload: {
        audio: {
          audioUrl: "https://zapi.test/audio.ogg",
          caption: "Audio do cliente",
        },
      },
    },
    {
      expected: {
        content: "Video da vistoria",
        mediaType: "video",
        mediaUrl: "https://zapi.test/video.mp4",
        metadata: { media: { caption: "Video da vistoria" } },
        type: "VIDEO",
      },
      label: "video through mediaUrl",
      payload: {
        video: {
          mediaUrl: "https://zapi.test/video.mp4",
          message: "Video da vistoria",
        },
      },
    },
    {
      expected: {
        content: "proposta.pdf",
        mediaType: "document",
        mediaUrl: "https://zapi.test/proposta.pdf",
        metadata: { media: { fileName: "proposta.pdf" } },
        type: "DOCUMENT",
      },
      label: "document title fallback",
      payload: {
        document: {
          documentUrl: "https://zapi.test/proposta.pdf",
          title: "proposta.pdf",
        },
      },
    },
    {
      expected: {
        content: "[sticker]",
        mediaType: "sticker",
        mediaUrl: "https://zapi.test/sticker.webp",
        metadata: { media: {} },
        type: "STICKER",
      },
      label: "sticker placeholder",
      payload: {
        sticker: { stickerUrl: "https://zapi.test/sticker.webp" },
      },
    },
  ])("normalizes $label", ({ expected, payload }) => {
    expect(extractZapiInboundContent(payload)).toEqual(expected);
  });

  it("falls through malformed higher-priority media records", () => {
    expect(
      extractZapiInboundContent({
        image: { imageUrl: 42 },
        video: {
          url: "https://zapi.test/fallback.mp4",
        },
      }),
    ).toMatchObject({
      mediaUrl: "https://zapi.test/fallback.mp4",
      type: "VIDEO",
    });
  });

  it("rejects media records without a non-empty URL", () => {
    expect(
      extractZapiInboundContent({
        audio: { audioUrl: "  " },
        document: { documentUrl: null },
        image: { imageUrl: 42 },
        sticker: { stickerUrl: {} },
        video: { videoUrl: false },
      }),
    ).toBeNull();
  });
});
