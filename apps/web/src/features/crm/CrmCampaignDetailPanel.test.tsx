// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CrmCampaignDetailPanel } from "./CrmCampaignDetailPanel";
import { createCampaignDetail } from "./CrmCampaignsPage.testFixtures";

describe("CrmCampaignDetailPanel", () => {
  it("renders the persisted initial image metadata in campaign readback", () => {
    const detail = createCampaignDetail();
    detail.campaign = {
      ...detail.campaign,
      mediaFileName: "oferta.png",
      mediaType: "image/png",
      mediaUrl: "https://storage.example.com/oferta.png",
    };

    render(
      <CrmCampaignDetailPanel
        detail={detail}
        isLoading={false}
        conversationCycles={[]}
        stageOptions={[]}
      />,
    );

    expect(screen.getByAltText("Imagem inicial: oferta.png")).toHaveAttribute(
      "src",
      "https://storage.example.com/oferta.png",
    );
    expect(screen.getByText("oferta.png")).toBeVisible();
    expect(screen.getByText("image/png")).toBeVisible();
  });
});
