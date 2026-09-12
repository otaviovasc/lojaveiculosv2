import { describe, expect, it } from "vitest";
import { parseUazapiInboundMessage } from "./parseUazapiInboundMessage.js";

describe("parseUazapiInboundMessage fromMe identity", () => {
  it("never uses the connected account LID as the buyer identity for fromMe messages", () => {
    // Production-captured payload: on fromMe webhooks the sender/sender_lid
    // identify the connected account, so chatid (the recipient) is the only
    // trustworthy customer identity.
    const parsed = parseUazapiInboundMessage({
      event: "message",
      instance: "inst-1",
      data: {
        chatid: "554497106001@s.whatsapp.net",
        content: { text: "Ignora" },
        fromMe: true,
        messageid: "2AA32726317A640ACD80",
        messageType: "Conversation",
        sender: "190680106279040@lid",
        sender_lid: "190680106279040@lid",
        text: "Ignora",
      },
    });

    expect(parsed).toMatchObject({
      content: "Ignora",
      externalId: "2AA32726317A640ACD80",
      fromMe: true,
      phone: "554497106001",
      type: "TEXT",
    });
    expect(parsed?.chatLid).toBeUndefined();
  });

  it("keys a fromMe message to a LID-only customer through the recipient chatid", () => {
    // The sender/sender_pn/sender_lid here belong to the connected account
    // and must not re-key the conversation to the seller.
    const parsed = parseUazapiInboundMessage({
      event: "message",
      data: {
        chatid: "190680106279040@lid",
        fromMe: true,
        messageid: "2AA32726317A640ACD81",
        messageType: "Conversation",
        sender: "5511990000000@s.whatsapp.net",
        sender_pn: "5511990000000@s.whatsapp.net",
        sender_lid: "104913803677822@lid",
        text: "Ola",
      },
    });

    expect(parsed).toMatchObject({
      chatLid: "190680106279040",
      fromMe: true,
      phone: "190680106279040",
    });
  });
});
