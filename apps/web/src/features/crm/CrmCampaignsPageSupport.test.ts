import { describe, expect, it } from "vitest";
import { buildCampaignInput } from "./CrmCampaignsPageSupport";
import type { CampaignRecipientReviewRow } from "./CrmCampaignRecipientReview";

describe("buildCampaignInput", () => {
  it("includes the initial image metadata and base64 while keeping follow-up text only", () => {
    const recipient = {
      cycleId: "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
      id: "cycle:4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
      included: true,
      issues: [],
      name: "Ana",
      phone: "5511999999999",
      rawPhone: "5511999999999",
      cycle: null,
      source: "conversation",
      status: "ready",
    } satisfies CampaignRecipientReviewRow;

    expect(
      buildCampaignInput({
        campaignName: "  Oferta de janeiro  ",
        firstDate: new Date("2099-01-01T10:00:00.000Z"),
        initialTagId: "none",
        intervalMinutes: 2,
        mediaBase64: "iVBORw0KGgo=",
        mediaFileName: "oferta.png",
        mediaType: "image/png",
        replyTagId: "none",
        secondaryContent: "  Obrigado pelo retorno.  ",
        secondaryDelayMinutes: 60,
        text: "Confira esta oferta, {nome}.",
        validRecipients: [recipient],
      }),
    ).toEqual({
      content: "Confira esta oferta, {nome}.",
      intervalMinutes: 2,
      mediaBase64: "iVBORw0KGgo=",
      mediaFileName: "oferta.png",
      mediaType: "image/png",
      name: "Oferta de janeiro",
      recipients: [
        {
          cycleId: "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
          variables: { nome: "Ana" },
        },
      ],
      scheduledStartAt: "2099-01-01T10:00:00.000Z",
      secondaryContent: "Obrigado pelo retorno.",
      secondaryDelayMinutes: 60,
    });
  });
});
