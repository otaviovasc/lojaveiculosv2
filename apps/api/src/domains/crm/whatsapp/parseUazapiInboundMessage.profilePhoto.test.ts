import { describe, expect, it } from "vitest";
import { parseUazapiInboundMessage } from "./parseUazapiInboundMessage.js";

describe("parseUazapiInboundMessage profile photo", () => {
  it("captures the contact profile photo from the documented fallbacks", () => {
    const parsed = parseUazapiInboundMessage({
      event: "message",
      data: {
        chatid: "5511999999999@s.whatsapp.net",
        messageTimestamp: 1_783_029_600_000,
        messageid: "uazapi-photo-1",
        profilePicUrl: "https://pps.whatsapp.net/v/t61.24694-24/pic.jpg",
        text: "Ola",
      },
    });

    expect(parsed?.profilePhotoUrl).toBe(
      "https://pps.whatsapp.net/v/t61.24694-24/pic.jpg",
    );
  });

  it("never uses the connected account photo on fromMe echoes", () => {
    const parsed = parseUazapiInboundMessage({
      event: "message",
      data: {
        chatid: "5511999999999@s.whatsapp.net",
        fromMe: true,
        messageTimestamp: 1_783_029_600_000,
        messageid: "uazapi-photo-2",
        profilePhoto: "https://pps.whatsapp.net/own.jpg",
        text: "echo",
      },
    });

    expect(parsed?.profilePhotoUrl).toBeUndefined();
  });
});
