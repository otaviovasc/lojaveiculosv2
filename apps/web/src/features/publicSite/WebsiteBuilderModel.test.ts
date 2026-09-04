import { describe, expect, it } from "vitest";
import type { StoreSettingsSnapshot } from "../settings/types";
import {
  applyWebsiteConfigToSettings,
  createWebsiteConfigFromSettings,
} from "./WebsiteBuilderModel";

describe("WebsiteBuilderModel storefront defaults", () => {
  it("fills a new storefront with editable Modern content", () => {
    const config = createWebsiteConfigFromSettings(emptySettings());

    expect(config.templateId).toBe("quadra");
    expect(config.heroMediaSource).toBe("vehicles");
    expect(config.aboutImageUrl).toBe("/images/storefront/about-store.webp");
    expect(config.aboutImage2Url).toBe(
      "/images/storefront/about-showroom.webp",
    );
    expect(config.aboutFeatures).toHaveLength(4);
    expect(config.testimonials).toHaveLength(0);
    expect(config.contact.showMap).toBe(true);
    expect(config.contact.businessHours).toContain("Segunda a sexta");
    expect(config.sections.filter((section) => section.visible)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "hero" }),
        expect.objectContaining({ type: "featured" }),
        expect.objectContaining({ type: "testimonials" }),
        expect.objectContaining({ type: "about" }),
        expect.objectContaining({ type: "contact" }),
      ]),
    );
  });

  it("persists map, contact, testimonials and business hours", () => {
    const settings = emptySettings();
    const config = createWebsiteConfigFromSettings(settings);
    config.contact.mapEmbedUrl = "https://www.google.com/maps/embed?pb=test";
    config.contact.phone2 = "1130303030";
    config.contact.title = "Visite a loja";
    config.footer = {
      cnpj: "12.345.678/0001-90",
      extraInfo: "Desde 1999",
    };

    const saved = applyWebsiteConfigToSettings(settings, config, "quadra");

    expect(saved.publicSite.isPublished).toBe(true);
    expect(saved.publicSite.layoutKey).toBe("quadra");
    expect(saved.publicSite.theme).toMatchObject({
      contact: {
        mapEmbedUrl: "https://www.google.com/maps/embed?pb=test",
        phone2: "1130303030",
        showMap: true,
        title: "Visite a loja",
      },
      footer: {
        cnpj: "12.345.678/0001-90",
        extraInfo: "Desde 1999",
      },
      testimonials: config.testimonials,
    });
    expect(saved.profile.businessHours).toEqual({
      text: "Segunda a sexta, das 9h às 18h; sábado, das 9h às 13h",
    });
  });

  it("preserves intentionally cleared seeded content", () => {
    const settings = emptySettings();
    settings.publicSite.theme = { aboutFeatures: [], testimonials: [] };

    const config = createWebsiteConfigFromSettings(settings);

    expect(config.aboutFeatures).toEqual([]);
    expect(config.testimonials).toEqual([]);
  });

  it("round-trips migrated responsive Modern banners through Personalizar", () => {
    const settings = emptySettings();
    settings.publicSite.theme = {
      banner_mobile_url: "https://cdn.test/mobile.webp",
      banner_pc_url: "https://cdn.test/desktop.webp",
      heroBannerMode: true,
    };

    const config = createWebsiteConfigFromSettings(settings);

    expect(config.heroBannerUrls).toEqual(["https://cdn.test/desktop.webp"]);
    expect(config.heroBannerMobileUrl).toBe("https://cdn.test/mobile.webp");

    config.heroBannerUrls = ["https://cdn.test/new-desktop.webp"];
    config.heroBannerMobileUrl = "https://cdn.test/new-mobile.webp";
    const saved = applyWebsiteConfigToSettings(settings, config, "quadra");

    expect(saved.publicSite.theme).toMatchObject({
      banner_mobile_url: null,
      banner_pc_url: null,
      heroBannerDesktopUrl: "https://cdn.test/new-desktop.webp",
      heroBannerMobileUrl: "https://cdn.test/new-mobile.webp",
    });
  });
});

function emptySettings(): StoreSettingsSnapshot {
  return {
    identity: {
      legalName: "Loja Ltda",
      primaryDomain: null,
      publicSlug: "demo",
      tradingName: "Loja Demo",
    },
    profile: {
      addressCity: null,
      addressDistrict: null,
      addressLine1: null,
      addressLine2: null,
      addressNumber: null,
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
}
