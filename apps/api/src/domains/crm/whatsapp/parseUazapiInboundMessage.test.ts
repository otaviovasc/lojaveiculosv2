import { describe, expect, it } from "vitest";
import {
  parseUazapiContactIdentity,
  parseUazapiInboundMessage,
} from "./parseUazapiInboundMessage.js";

describe("parseUazapiInboundMessage", () => {
  it("parses a documented envelope text message", () => {
    const parsed = parseUazapiInboundMessage({
      event: "message",
      instance: "instance-1",
      data: {
        chatid: "5511999999999@s.whatsapp.net",
        fromMe: false,
        isGroup: false,
        messageTimestamp: 1_783_029_600_000,
        messageType: "conversation",
        messageid: "3EB0538DA65A59F6D8A251",
        sender: "5511999999999@s.whatsapp.net",
        senderName: "Ana",
        text: "Ola",
      },
    });

    expect(parsed).toMatchObject({
      content: "Ola",
      customerDisplayName: "Ana",
      externalId: "3EB0538DA65A59F6D8A251",
      fromMe: false,
      phone: "5511999999999",
      providerTimestamp: new Date(1_783_029_600_000),
      type: "TEXT",
    });
    expect(parsed?.metadata).toMatchObject({ provider: "uazapi" });
  });

  it("parses image media with fileURL and caption", () => {
    const parsed = parseUazapiInboundMessage({
      event: "message",
      data: {
        caption: "Foto do carro",
        chatid: "5511888887777@s.whatsapp.net",
        fileURL: "https://uazapi.test/media/photo.jpg",
        messageTimestamp: 1_783_029_600_000,
        messageType: "imageMessage",
        messageid: "uazapi-image-1",
        mimetype: "image/jpeg",
      },
    });

    expect(parsed).toMatchObject({
      content: "Foto do carro",
      mediaType: "image",
      mediaUrl: "https://uazapi.test/media/photo.jpg",
      phone: "5511888887777",
      type: "IMAGE",
    });
    expect(parsed?.metadata).toMatchObject({
      media: { caption: "Foto do carro", mimeType: "image/jpeg" },
    });
  });

  it("parses raw Baileys content when flat fields are absent", () => {
    const parsed = parseUazapiInboundMessage({
      event: "message",
      data: {
        chatid: "5511777776666@s.whatsapp.net",
        content: {
          extendedTextMessage: {
            contextInfo: { stanzaId: "quoted-1" },
            text: "Tenho interesse",
          },
        },
        messageTimestamp: 1_783_029_600_000,
        messageid: "uazapi-extended-1",
      },
    });

    expect(parsed).toMatchObject({
      content: "Tenho interesse",
      type: "TEXT",
    });
    expect(parsed?.metadata.quotedMessageId).toBe("quoted-1");
  });

  it("accepts the legacy flattened message/chat shape", () => {
    const parsed = parseUazapiInboundMessage({
      chat: { wa_chatid: "5511666665555@s.whatsapp.net", wa_name: "Bruno" },
      message: {
        body: "Legado",
        messageid: "uazapi-legacy-1",
        timestamp: 1_783_029_600,
      },
    });

    expect(parsed).toMatchObject({
      content: "Legado",
      customerDisplayName: "Bruno",
      externalId: "uazapi-legacy-1",
      phone: "5511666665555",
    });
  });

  it("skips group messages", () => {
    expect(
      parseUazapiInboundMessage({
        event: "message",
        data: {
          chatid: "123@g.us",
          isGroup: true,
          messageid: "uazapi-group-1",
          text: "grupo",
        },
      }),
    ).toBeNull();
  });

  it("ignores non-message envelope events", () => {
    expect(
      parseUazapiInboundMessage({
        event: "connection",
        data: { connected: true },
      }),
    ).toBeNull();
  });

  it("never falls back to the internal r+hex id", () => {
    expect(
      parseUazapiInboundMessage({
        event: "message",
        data: {
          chatid: "5511999999999@s.whatsapp.net",
          id: "r7d750393d64bc9",
          text: "sem id externo",
        },
      }),
    ).toBeNull();
  });

  it("resolves the recipient chatid as identity for fromMe messages", () => {
    const parsed = parseUazapiInboundMessage({
      event: "message",
      data: {
        chatid: "5511999999999@s.whatsapp.net",
        chatName: "Cliente",
        fromMe: true,
        messageTimestamp: 1_783_029_600_000,
        messageid: "uazapi-fromme-1",
        sender: "5511000000000@s.whatsapp.net",
        text: "Resposta do vendedor",
      },
    });

    expect(parsed).toMatchObject({
      fromMe: true,
      phone: "5511999999999",
      type: "TEXT",
    });
  });

  it("keeps LID identity when only a @lid chatid exists", () => {
    const parsed = parseUazapiInboundMessage({
      event: "message",
      data: {
        chatid: "12345678901234567890@lid",
        messageTimestamp: 1_783_029_600_000,
        messageid: "uazapi-lid-1",
        text: "Lid message",
      },
    });

    expect(parsed).toMatchObject({
      chatLid: "12345678901234567890",
      phone: "12345678901234567890",
    });
  });

  it("parses reactions as interactive messages", () => {
    const parsed = parseUazapiInboundMessage({
      event: "message",
      data: {
        chatid: "5511999999999@s.whatsapp.net",
        content: {
          reactionMessage: { key: { id: "target-1" }, text: "👍" },
        },
        messageTimestamp: 1_783_029_600_000,
        messageType: "reactionMessage",
        messageid: "uazapi-reaction-1",
      },
    });

    expect(parsed).toMatchObject({
      content: "Reaction: 👍",
      metadata: {
        interactive: { kind: "reaction", messageId: "target-1", value: "👍" },
      },
      type: "INTERACTIVE",
    });
  });

  it("parses audio voice notes from the legacy ptt messageType", () => {
    const parsed = parseUazapiInboundMessage({
      event: "message",
      data: {
        chatid: "5511999999999@s.whatsapp.net",
        fileURL: "https://uazapi.test/media/audio.ogg",
        messageTimestamp: 1_783_029_600_000,
        messageType: "ptt",
        messageid: "uazapi-ptt-1",
        mimetype: "audio/ogg",
      },
    });

    expect(parsed).toMatchObject({
      mediaType: "audio",
      mediaUrl: "https://uazapi.test/media/audio.ogg",
      type: "AUDIO",
    });
  });
});

describe("parseUazapiContactIdentity", () => {
  it("prefers sender_pn for LID senders", () => {
    const identity = parseUazapiContactIdentity({
      event: "message",
      data: {
        chatid: "12345678901234567890@lid",
        messageid: "uazapi-lid-pn",
        sender: "12345678901234567890@lid",
        sender_pn: "5511999999999@s.whatsapp.net",
      },
    });

    expect(identity).toMatchObject({ phone: "5511999999999" });
  });
});
