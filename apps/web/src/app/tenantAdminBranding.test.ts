// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import type { StoreSettingsSnapshot } from "../features/settings/types";
import {
  applyTenantAdminFavicon,
  createTenantAdminBrand,
  createTenantAdminBrandStyle,
} from "./tenantAdminBranding";

describe("tenant admin branding", () => {
  it("reads tenant accent, logo, favicon, and store name from settings", () => {
    const accent = hex("0f766e");
    const settings = createSettings({
      profile: {
        logoImageUrl: "https://cdn.example.com/logo.png",
      },
      theme: {
        accentColor: accent,
        corretorName: "MB Auto Store",
        faviconUrl: "https://cdn.example.com/favicon.png",
      },
    });

    const brand = createTenantAdminBrand(settings);
    const style = createTenantAdminBrandStyle(brand);

    expect(brand.accentColor).toBe(accent);
    expect(brand.logoUrl).toBe("https://cdn.example.com/logo.png");
    expect(brand.faviconUrl).toBe("https://cdn.example.com/favicon.png");
    expect(brand.iconUrl).toBe("https://cdn.example.com/favicon.png");
    expect(brand.storeName).toBe("MB Auto Store");
    expect(style["--color-accent"]).toBe(accent);
    expect(style["--color-accent-soft-foreground"]).toBe(hex("151515"));
    expect(style["--color-accent-strong"]).toMatch(/^#/);
    expect(style["--color-accent-soft"]).toMatch(/^#/);
  });

  it("does not override accent tokens when the stored color is invalid", () => {
    const brand = createTenantAdminBrand(
      createSettings({ theme: { accentColor: "not-a-color" } }),
    );

    expect(brand.accentColor).toBeNull();
    expect(createTenantAdminBrandStyle(brand)).toEqual({});
  });

  it("applies and removes the tenant favicon link", () => {
    const href = "https://cdn.example.com/favicon.png";

    applyTenantAdminFavicon(href);

    expect(
      document.querySelector('link[data-tenant-admin-brand="favicon"]'),
    ).toHaveAttribute("href", href);

    applyTenantAdminFavicon(null);

    expect(
      document.querySelector('link[data-tenant-admin-brand="favicon"]'),
    ).toBeNull();
  });
});

function createSettings({
  profile = {},
  theme = {},
}: {
  profile?: Partial<StoreSettingsSnapshot["profile"]>;
  theme?: Record<string, unknown>;
} = {}): StoreSettingsSnapshot {
  return {
    identity: {
      legalName: "MB Auto legal",
      primaryDomain: null,
      publicSlug: "mb-auto",
      tradingName: "MB Auto",
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
      ...profile,
    },
    publicSite: {
      customDomain: null,
      customDomainStatus: "not_configured",
      heroImageUrl: null,
      isPublished: false,
      layoutKey: "aurora",
      seoDescription: null,
      seoTitle: null,
      theme,
      verificationToken: null,
    },
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}

function hex(value: string) {
  return `${"#"}${value}`;
}
