// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StorefrontCustomPage } from "@lojaveiculosv2/shared";
import {
  readCustomPageIdFromHash,
  StorefrontCustomizationModule,
} from "./StorefrontCustomizationModule";

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

describe("StorefrontCustomizationModule page deep link", () => {
  it("opens the requested custom page editor after loading", async () => {
    window.location.hash = "#/custom-pages?page=page_1";
    render(
      <StorefrontCustomizationModule
        initialTab="pages"
        mediaApi={{
          listAssets: vi.fn(async () => []),
          uploadImage: vi.fn(),
        }}
        pagesApi={{
          createOrReuseVehicleVitrine: vi.fn(async () => page),
          createPage: vi.fn(async () => page),
          deletePage: vi.fn(async () => undefined),
          getPage: vi.fn(async () => page),
          listPages: vi.fn(async () => [page]),
          updatePage: vi.fn(async () => page),
        }}
        settingsApi={
          {
            getStoreSettings: vi.fn(async () => settings),
            updateStoreSettings: vi.fn(async () => settings),
          } as never
        }
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Vitrine do Sedan" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Voltar para páginas" }),
    ).toBeVisible();
  });

  it("reads only the encoded page query parameter", () => {
    expect(
      readCustomPageIdFromHash("#/custom-pages?tab=pages&page=page%2F1"),
    ).toBe("page/1");
    expect(readCustomPageIdFromHash("#/custom-pages")).toBeNull();
  });

  it("loads the design editor when optional custom pages are unavailable", async () => {
    render(
      <StorefrontCustomizationModule
        initialTab="design"
        mediaApi={mediaApiStub()}
        pagesApi={pagesApiStub({
          listPages: vi.fn().mockRejectedValue("down"),
        })}
        settingsApi={settingsApiStub()}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Personalizar" }),
    ).toBeVisible();
  });

  it("retries a failed initial settings load", async () => {
    const user = userEvent.setup();
    const getStoreSettings = vi
      .fn()
      .mockRejectedValueOnce(new Error("settings unavailable"))
      .mockResolvedValue(settings);

    render(
      <StorefrontCustomizationModule
        initialTab="design"
        mediaApi={mediaApiStub()}
        pagesApi={pagesApiStub()}
        settingsApi={settingsApiStub({ getStoreSettings })}
      />,
    );

    expect(
      await screen.findByText("Não foi possível carregar o site"),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(
      await screen.findByRole("heading", { name: "Personalizar" }),
    ).toBeVisible();
    expect(getStoreSettings).toHaveBeenCalledTimes(2);
  });
});

function mediaApiStub() {
  return {
    listAssets: vi.fn(async () => []),
    uploadImage: vi.fn(),
  };
}

function pagesApiStub(overrides: Record<string, unknown> = {}) {
  return {
    createOrReuseVehicleVitrine: vi.fn(async () => page),
    createPage: vi.fn(async () => page),
    deletePage: vi.fn(async () => undefined),
    getPage: vi.fn(async () => page),
    listPages: vi.fn(async () => [page]),
    updatePage: vi.fn(async () => page),
    ...overrides,
  };
}

function settingsApiStub(overrides: Record<string, unknown> = {}) {
  return {
    getStoreSettings: vi.fn(async () => settings),
    updateStoreSettings: vi.fn(async () => settings),
    ...overrides,
  } as never;
}

const page: StorefrontCustomPage = {
  components: [],
  id: "page_1",
  order: 0,
  slug: "vitrine-sedan",
  title: "Vitrine do Sedan",
  visible: true,
};

const settings = {
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
    customDomainStatus: "not_configured" as const,
    heroImageUrl: null,
    isPublished: true,
    layoutKey: "classic",
    seoDescription: null,
    seoTitle: null,
    theme: {},
    verificationToken: null,
  },
  storeId: "store_1",
  tenantId: "tenant_1",
};
