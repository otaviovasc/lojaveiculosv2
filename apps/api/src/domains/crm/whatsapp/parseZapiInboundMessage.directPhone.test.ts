import { describe, expect, it } from "vitest";
import { parseZapiInboundMessage } from "./parseZapiInboundMessage.js";

const basePayload = {
  messageId: "message-1",
  text: { message: "Ola" },
};

describe("parseZapiInboundMessage direct-phone identity", () => {
  it("keys LID-only fromMe identities by chatLid instead of the connected phone", () => {
    // connectedPhone identifies the seller account on fromMe payloads and
    // must never become the customer identity.
    expect(
      parseZapiInboundMessage({
        ...basePayload,
        chatLid: "223344556677889@lid",
        connectedPhone: "5511966660000",
        fromMe: true,
        phone: "223344556677889@lid",
      }),
    ).toMatchObject({
      chatLid: "223344556677889@lid",
      phone: "223344556677889@lid",
    });
  });

  it("resolves a fromMe payload without a phone field through its chatLid", () => {
    expect(
      parseZapiInboundMessage({
        ...basePayload,
        chatLid: "223344556677889@lid",
        fromMe: true,
        phone: undefined,
      }),
    ).toMatchObject({
      chatLid: "223344556677889@lid",
      phone: "223344556677889@lid",
    });
  });
});
