// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StoreSettingsSnapshot } from "../settings/types";
import { WebsiteBuilderDesign } from "./WebsiteBuilderDesign";
import { WebsiteBuilderTemplatePanel } from "./WebsiteBuilderPanelsPrimary";

afterEach(cleanup);

describe("WebsiteBuilderDesign persistence", () => {
  it("keeps the unsaved marker after a failed save and clears it after retry", async () => {
    const user = userEvent.setup();
    const onSave = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    render(
      <WebsiteBuilderDesign
        isSaving={false}
        onSave={onSave}
        settings={settings}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Alternar tema da prévia" }),
    );
    expect(screen.getByLabelText("Alterações não salvas")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^Salvar/ }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Alterações não salvas")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^Salvar/ }));
    await waitFor(() =>
      expect(
        screen.queryByLabelText("Alterações não salvas"),
      ).not.toBeInTheDocument(),
    );
    expect(onSave).toHaveBeenCalledTimes(2);
  });
});

describe("WebsiteBuilderTemplatePanel", () => {
  it("explains that switching templates preserves the current configuration", async () => {
    const user = userEvent.setup();

    render(
      <WebsiteBuilderTemplatePanel onChange={vi.fn()} templateId="quadra" />,
    );
    await user.click(screen.getByRole("button", { name: /Aurora/i }));

    expect(
      screen.getByText(/Seus textos, cores, tipografia e seções são mantidos/i),
    ).toBeVisible();
    expect(screen.queryByText(/redefine cores/i)).not.toBeInTheDocument();
  });
});

const settings: StoreSettingsSnapshot = {
  identity: {
    legalName: "Loja Demo Ltda",
    primaryDomain: null,
    publicSlug: "demo",
    tradingName: "Loja Demo",
  },
  profile: {
    addressCity: null,
    addressLine1: null,
    addressLine2: null,
    addressState: null,
    addressZipCode: null,
    businessHours: {},
    contactEmail: null,
    contactPhone: null,
    documentNumber: null,
    logoImageUrl: null,
    whatsappPhone: null,
  },
  publicSite: {
    customDomain: null,
    customDomainStatus: "not_configured",
    heroImageUrl: null,
    isPublished: true,
    layoutKey: "quadra",
    seoDescription: null,
    seoTitle: null,
    theme: {},
    verificationToken: null,
  },
  storeId: "store_1",
  tenantId: "tenant_1",
};
