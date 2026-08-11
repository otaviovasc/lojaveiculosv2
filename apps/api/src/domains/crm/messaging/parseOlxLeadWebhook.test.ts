import { describe, expect, it } from "vitest";
import { parseOlxLeadWebhook } from "./parseOlxLeadWebhook.js";

describe("parseOlxLeadWebhook", () => {
  it("accepts the official contract and discards buyer history", () => {
    const parsed = parseOlxLeadWebhook({
      ...validPayload(),
      adsInfo: { body: "large ad body", subject: "Honda Civic" },
      buyerHistory: { buyer: { interactingWithAds: 42 } },
      externalId: "lead-1",
      phone: "11999999999",
    });

    expect(parsed).toMatchObject({
      adsInfo: { subject: "Honda Civic" },
      buyerPhone: "11999999999",
      externalId: "lead-1",
    });
    expect(parsed).not.toHaveProperty("buyerHistory");
  });

  it.each([
    ["omitted", undefined],
    ["null", null],
    ["empty", ""],
    ["whitespace", "  \t "],
  ])("normalizes an %s phone to null", (_label, phone) => {
    expect(
      parseOlxLeadWebhook({ ...validPayload(), phone })?.buyerPhone,
    ).toBeNull();
  });

  it.each([
    ["missing required field", { message: undefined }],
    ["invalid phone", { phone: "+55 11 99999-9999" }],
    ["invalid date", { createdAt: "yesterday" }],
    ["invalid source", { source: "instagram" }],
    ["invalid external id", { externalId: 42 }],
    ["unknown field", { rawPayload: {} }],
  ])("rejects %s", (_label, patch) => {
    expect(parseOlxLeadWebhook({ ...validPayload(), ...patch })).toBeNull();
  });
});

function validPayload() {
  return {
    createdAt: "2026-08-10T12:00:00.000Z",
    email: "ana@example.com",
    linkAd: "https://www.olx.com.br/vi/123",
    listId: "123",
    message: "Tenho interesse",
    name: "Ana",
    source: "chat",
  };
}
