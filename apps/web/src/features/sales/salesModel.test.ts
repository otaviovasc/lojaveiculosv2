/* @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import { createDraftFromContext, parseSaleStartContext } from "./salesModel";

describe("sales model start context", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("propagates vehicle media and identifiers into draft creation", () => {
    const mediaUrl = "https://cdn.example.com/vehicles/civic.jpg";
    window.location.hash =
      `#/sales?leadId=lead_1&listingId=listing_1&unitId=unit_1` +
      `&listingTitle=${encodeURIComponent("Honda Civic Touring")}` +
      `&unitLabel=EST-42&placa=TRD1E23&cor=Preto` +
      `&primaryMediaUrl=${encodeURIComponent(mediaUrl)}&priceCents=12990000`;

    const context = parseSaleStartContext();
    const draft = createDraftFromContext(context);

    expect(context).toMatchObject({
      colorName: "Preto",
      leadId: "lead_1",
      listingId: "listing_1",
      plate: "TRD1E23",
      primaryMediaUrl: mediaUrl,
      unitId: "unit_1",
    });
    expect(draft).toMatchObject({
      documentPolicySnapshot: { requiredDocumentKinds: [] },
      leadId: "lead_1",
      listingId: "listing_1",
      listingSnapshot: {
        colorName: "Preto",
        plate: "TRD1E23",
        primaryMediaUrl: mediaUrl,
        title: "Honda Civic Touring",
        unitLabel: "EST-42",
      },
      salePriceCents: 12990000,
      selectedDocumentKinds: [
        "sale_contract",
        "sale_receipt",
        "delivery_term",
        "power_of_attorney",
      ],
      unitId: "unit_1",
    });
  });
});
