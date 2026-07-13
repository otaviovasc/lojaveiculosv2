import { describe, expect, it, vi } from "vitest";
import { parseZapiInboundMessage } from "./parseZapiInboundMessage.js";
import { parseZapiAdAttribution } from "./zapiAdAttribution.js";

describe("parseZapiAdAttribution", () => {
  it("normalizes allowlisted external ad reply fields", () => {
    const detectedAt = new Date("2026-07-13T12:00:00.000Z");

    expect(
      parseZapiAdAttribution(
        {
          externalAdReply: {
            body: "Civic com baixa quilometragem",
            ctwaClid: "ctwa-123",
            mediaType: 1,
            renderLargerThumbnail: true,
            showAdAttribution: true,
            sourceApp: "facebook",
            sourceId: "ad-123",
            sourceType: "ad",
            sourceUrl: "https://facebook.example.test/ad-123",
            thumbnailUrl: "https://cdn.example.test/ad-123.jpg",
            title: "Civic Touring",
            unsafeProviderField: "must-not-be-copied",
          },
        },
        { detectedAt, notification: false },
      ),
    ).toEqual({
      adBody: "Civic com baixa quilometragem",
      adConversationType: "ad",
      adDetectedAt: "2026-07-13T12:00:00.000Z",
      adDetectionMethod: "external_ad_reply",
      adMediaType: 1,
      adSourceApp: "facebook",
      adSourceId: "ad-123",
      adSourceUrl: "https://facebook.example.test/ad-123",
      adThumbnailUrl: "https://cdn.example.test/ad-123.jpg",
      adTitle: "Civic Touring",
      ctwaClid: "ctwa-123",
      isAdInitiated: true,
      renderLargerThumbnail: true,
      showAdAttribution: true,
    });
  });

  it("captures CTWA notification attribution without raw referral data", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T13:00:00.000Z"));

    expect(
      parseZapiAdAttribution(
        {
          ctwaContext: {
            conversationType: "CLICK_TO_WHATSAPP_AD",
            referral: {
              body: "Oferta Compass",
              headline: "Compass Longitude",
              sourceId: "ad-compass-9",
              sourceType: "ad",
              sourceUrl: "https://instagram.example.test/ad-compass-9",
              thumbnailUrl: "https://cdn.example.test/ad-compass-9.jpg",
            },
          },
        },
        { notification: true },
      ),
    ).toMatchObject({
      adBody: "Oferta Compass",
      adConversationType: "CLICK_TO_WHATSAPP_AD",
      adDetectionMethod: "notification_webhook",
      adSourceId: "ad-compass-9",
      adTitle: "Compass Longitude",
      isAdInitiated: true,
    });

    vi.useRealTimers();
  });

  it("preserves the Repasses LID ad fallback for received messages", () => {
    expect(
      parseZapiAdAttribution(
        {
          chatLid: "12345678901234567890@lid",
          phone: "12345678901234567890@lid",
        },
        {
          detectedAt: new Date("2026-07-13T14:00:00.000Z"),
          notification: false,
        },
      ),
    ).toMatchObject({
      adDetectionMethod: "lid_fallback",
      isAdInitiated: true,
    });
  });

  it("uses chatLid as the stable identity when an ad has no real phone", () => {
    const parsed = parseZapiInboundMessage({
      chatLid: "12345678901234567890@lid",
      externalAdReply: { sourceId: "ad-raw", sourceType: "ad" },
      messageId: "lid-ad-message-1",
      phone: "12345678901234567890@lid",
      text: { message: "Vi o anuncio" },
    });
    expect(parsed).toMatchObject({
      chatLid: "12345678901234567890@lid",
      phone: "12345678901234567890@lid",
    });
    expect(parsed?.metadata).not.toHaveProperty("externalAdReply");
  });

  it("ignores non-ad external replies and ordinary messages", () => {
    expect(
      parseZapiAdAttribution(
        { externalAdReply: { sourceType: "product" } },
        { notification: false },
      ),
    ).toBeNull();
    expect(
      parseZapiAdAttribution(
        { phone: "5511999999999" },
        { notification: false },
      ),
    ).toBeNull();
  });
});
