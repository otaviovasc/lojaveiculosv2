import { describe, expect, it } from "vitest";
import { parseOlxChatWebhook } from "./parseOlxChatWebhook.js";

describe("parseOlxChatWebhook", () => {
  it("accepts the official sample with senderType buyer", () => {
    expect(
      parseOlxChatWebhook({
        chatId: "chat-1",
        email: "buyer@example.com",
        listId: "listing-1",
        message: "Tenho interesse",
        messageId: "message-1",
        messageTimestamp: "2026-08-10T12:00:00.000Z",
        name: "Buyer",
        origin: "buyer",
        phone: "(11) 99999-9999",
        senderType: "buyer",
      }),
    ).toMatchObject({
      customerPhone: "5511999999999",
      chatId: "chat-1",
      externalMessageId: "message-1",
      message: "Tenho interesse",
      origin: "buyer",
      senderType: "buyer",
    });
  });

  it.each(["account", "system"])(
    "accepts the documented %s sender type without changing buyer origin",
    (senderType) => {
      expect(
        parseOlxChatWebhook({ ...validPayload(), senderType }),
      ).toMatchObject({ origin: "buyer", senderType });
    },
  );

  it("preserves a seller echo so ingestion can ignore it as non-buyer", () => {
    expect(
      parseOlxChatWebhook({ ...validPayload(), origin: "seller" }),
    ).toMatchObject({ origin: "seller", senderType: "account" });
  });

  it("rejects the sample-only buyer sender type when origin says seller", () => {
    expect(
      parseOlxChatWebhook({
        ...validPayload(),
        origin: "seller",
        senderType: "buyer",
      }),
    ).toBeNull();
  });

  it.each([
    ["legacy ad identifier", { adId: "ad-1" }],
    ["legacy source discriminator", { source: "OLX_CHAT" }],
    ["media-like unknown field", { imageUrl: "https://example.test/image" }],
    ["invalid timestamp", { messageTimestamp: "not-a-date" }],
    ["invalid optional identity", { email: 42 }],
    ["legacy seller sender type", { senderType: "seller" }],
  ])("fails closed for %s", (_label, patch) => {
    expect(parseOlxChatWebhook({ ...validPayload(), ...patch })).toBeNull();
  });
});

function validPayload() {
  return {
    chatId: "chat-1",
    listId: "listing-1",
    message: "Tenho interesse",
    messageId: "message-1",
    messageTimestamp: "2026-08-10T12:00:00.000Z",
    origin: "buyer",
    senderType: "account",
  };
}
