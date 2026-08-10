import { DEFAULT_PUBLIC_STOREFRONT_THEME } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import {
  publicSiteThemeSchema,
  updateStoreSettingsSchema,
} from "./settings.controller.schemas.js";

const personalizarTheme = {
  ...DEFAULT_PUBLIC_STOREFRONT_THEME,
  aboutButtonText: "Fale com nossa equipe",
  aboutCuradoriaText: "Cada veículo recebe uma curadoria cuidadosa.",
  aboutFeatures: [
    {
      description: "Procedência e suporte em todas as etapas.",
      title: "Compra segura",
    },
  ],
  aboutWhyText: "Atendimento transparente do primeiro contato à entrega.",
  aboutWhyTitle: "Por que escolher nossa loja?",
  accentColor: "#c9a84c",
  backgroundColor: "#f8f5f0",
  brandColor: "#1a1a1a",
  contact: {
    ...DEFAULT_PUBLIC_STOREFRONT_THEME.contact,
    address: "Avenida Paulista, 1000",
    email: "contato@loja.test",
    mapEmbedUrl: "https://www.google.com/maps/embed?pb=storefront",
    phone: "11999990000",
    phone2: "1130303030",
    phone3: "1140404040",
  },
  corretorCreci: "12345-F",
  corretorName: "Loja Demo",
  corretorPhotoUrl: "https://cdn.example.com/equipe.webp",
  faviconUrl: "https://cdn.example.com/favicon.ico",
  footer: {
    cnpj: "12.345.678/0001-90",
    extra_info: "Informação preservada da migração V1.",
    extraInfo: "Informação editável no formato canônico.",
  },
  fonts: { body: "Inter", heading: "Titillium Web" },
  heroBannerButtonText: "Ver estoque",
  heroBannerDesktopUrl: "https://cdn.example.com/banner-desktop.webp",
  heroBannerMobileUrl: "https://cdn.example.com/banner-mobile.webp",
  heroBannerMode: true,
  heroBannerShowButton: true,
  heroBannerShowText: false,
  heroBannerUrls: ["https://cdn.example.com/banner.webp"],
  heroImageUrl: "https://cdn.example.com/banner.webp",
  leadForm: { showOnLandingPage: true },
  logoUrl: "https://cdn.example.com/logo.webp",
  seo: {
    metaDescription: "Veículos selecionados.",
    metaTitle: "Loja Demo",
    ogImageUrl: "https://cdn.example.com/social.webp",
  },
  socialLinks: {
    facebook: "https://facebook.com/loja",
    instagram: "https://instagram.com/loja",
    tiktok: null,
    whatsapp: "11999990000",
    youtube: null,
  },
};
const strictThemeBlocks = {
  about: personalizarTheme.about,
  contact: personalizarTheme.contact,
  footer: personalizarTheme.footer,
  leadForm: personalizarTheme.leadForm,
};

const migratedModernTheme = {
  banner_button_text: "Conferir estoque",
  banner_mobile_url: "https://cdn.example.com/banner-mobile.webp",
  banner_mode: true,
  banner_pc_url: "https://cdn.example.com/banner-desktop.webp",
  banner_show_button: true,
  banner_show_text: false,
  businessHours: "Segunda a sexta, 9h às 18h",
  configVersion: 1,
  contact: {
    address: "Av. Brasil, 1000",
    business_hours: "Segunda a sexta, 9h às 18h",
    instagram_url: "https://instagram.com/loja",
    phone: "4430303030",
    whatsapp_number: "5544999999999",
  },
  contact_extras: {
    address_full: "Av. Brasil, 1000",
    description1: "Venha nos visitar.",
    phone2: "4431313131",
    phone2_label: "Vendas",
    title: "Fale com a loja",
  },
  cor_primaria: "#ed1d24",
  default_vehicle_images: ["https://cdn.example.com/default.webp", null],
  footer: { cnpj: "12.345.678/0001-90", extra_info: "Desde 1999" },
  hero_banner_autoplay: true,
  hero_banner_speed: 4000,
  hero_banners: ["https://cdn.example.com/banner.webp"],
  hero_image_url: "https://cdn.example.com/hero.webp",
  hero_s3_key: "stores/1/hero.webp",
  hero_subtitle: "Os melhores veículos da região.",
  hero_template: "banner",
  landing_template: "modern",
  layout: {
    order: ["home", "cars", "depoimentos", "about", "contact"],
    visibility: { about: true, cars: true, contact: true, home: true },
  },
  lead_form: { show_on_lp: true, show_on_vehicle: true },
  logo_height: 64,
  logo_s3_key: "stores/1/logo.webp",
  logo_url: "https://cdn.example.com/logo.webp",
  logo_width: 130,
  map_embed_url: "https://www.google.com/maps/embed?pb=storefront",
  map_location: { lat: -23.55, lng: -46.63 },
  settings: {
    business_hours: "Segunda a sexta, 9h às 18h",
    cep: "87000-000",
    cidade: "Maringá",
    estado: "PR",
    instagram_url: "https://instagram.com/loja",
    whatsapp_number: "5544999999999",
  },
  show_fipe_thermometer: false,
  show_map: true,
  testimonials: [
    {
      id: "legacy-testimonial-7",
      imageSrc: null,
      name: "Cliente",
      order: 0,
      quote: "Excelente atendimento.",
      role: "Cliente",
    },
  ],
  texto_cabecalho_ofertas: "Nossas ofertas",
};

describe("Personalizar public site theme contract", () => {
  it("accepts the provisioned theme with its supported legacy about block", () => {
    expect(
      publicSiteThemeSchema.safeParse(DEFAULT_PUBLIC_STOREFRONT_THEME).success,
    ).toBe(true);
  });

  it.each(["quadra", "aurora"])(
    "accepts a representative %s Personalizar save payload",
    (layoutKey) => {
      const parsed = updateStoreSettingsSchema.safeParse({
        publicSite: {
          isPublished: true,
          layoutKey,
          theme: {
            ...personalizarTheme,
            appearanceMode: layoutKey === "quadra" ? "both" : "dark",
          },
        },
      });

      expect(parsed.success).toBe(true);
      expect(parsed.data?.publicSite?.layoutKey).toBe(layoutKey);
    },
  );

  it("accepts the explicit V1 Modern subset preserved by migration", () => {
    expect(publicSiteThemeSchema.safeParse(migratedModernTheme).success).toBe(
      true,
    );
  });

  it.each(["about", "contact", "footer", "leadForm"] as const)(
    "rejects unknown keys inside the supported %s block",
    (key) => {
      expect(
        publicSiteThemeSchema.safeParse({
          [key]: { ...strictThemeBlocks[key], unsupported: true },
        }).success,
      ).toBe(false);
    },
  );

  it("rejects unrelated raw V1 Settings columns", () => {
    expect(
      publicSiteThemeSchema.safeParse({
        settings: {
          business_hours: "Segunda a sexta",
          autoEntriesConfig: { enabled: true },
        },
      }).success,
    ).toBe(false);
  });

  it("rejects map embeds outside the trusted Google HTTPS hosts", () => {
    expect(
      publicSiteThemeSchema.safeParse({
        contact: { mapEmbedUrl: "http://www.google.com/maps/embed?pb=test" },
      }).success,
    ).toBe(false);
    expect(
      publicSiteThemeSchema.safeParse({
        contact: { mapEmbedUrl: "https://example.com/maps/embed?pb=test" },
      }).success,
    ).toBe(false);
  });
});
