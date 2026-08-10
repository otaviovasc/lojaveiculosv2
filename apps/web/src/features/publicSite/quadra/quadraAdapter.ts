import type {
  PublicStorefrontPageData,
  PublicVehicleListing,
  PublicVehicleMedia,
} from "../types";
import {
  DEFAULT_PUBLIC_STOREFRONT_THEME,
  DEFAULT_STOREFRONT_ABOUT_FEATURES,
  DEFAULT_STOREFRONT_ABOUT_IMAGES,
  DEFAULT_STOREFRONT_TESTIMONIALS,
} from "@lojaveiculosv2/shared";
import { resolvePublicStorefrontHeroMedia } from "../PublicStorefrontHeroMedia";

export type QuadraFeature = { description: string; title: string };

export type QuadraTestimonial = {
  id: string;
  imageUrl: string | null;
  name: string;
  quote: string;
  role: string;
};

export type QuadraStorefrontModel = {
  about: {
    buttonText: string;
    curadoriaText: string;
    description: string;
    features: readonly QuadraFeature[];
    image1Url: string;
    image2Url: string;
    title: string;
    visualSubtitle: string;
    visualTitle: string;
    whyText: string;
    whyTitle: string;
  };
  contact: {
    address: string | null;
    businessHours: string | null;
    description1: string;
    description2: string;
    email: string | null;
    instagramUrl: string | null;
    mapEmbedUrl: string | null;
    phone: string | null;
    phone2: string | null;
    phone2Label: string;
    phone3: string | null;
    phone3Label: string;
    phoneLabel: string;
    showMap: boolean;
    title: string;
    whatsappUrl: string | null;
  };
  footer: {
    cnpj: string | null;
    extraInfo: string | null;
  };
  hero: {
    autoplay: boolean;
    bannerButtonText: string;
    bannerMobileUrl: string | null;
    bannerMode: boolean;
    bannerShowButton: boolean;
    bannerShowText: boolean;
    bannerUrls: readonly string[];
    imageKind: "image" | "video";
    imageUrl: string | null;
    mediaSource: "auto" | "banners" | "vehicles";
    speed: number;
    subtitle: string;
    title: string;
    vehicles: readonly PublicVehicleListing[];
  };
  leadForm: {
    showOnLandingPage: boolean;
  };
  logoUrl: string | null;
  logoWidth: number;
  storeName: string;
  testimonials: readonly QuadraTestimonial[];
};

const defaultFeatures: readonly QuadraFeature[] =
  DEFAULT_STOREFRONT_ABOUT_FEATURES;

export function adaptQuadraStorefront(
  data: PublicStorefrontPageData,
): QuadraStorefrontModel {
  const theme = record(data.settings.site.theme);
  const about = record(theme.about);
  const contact = record(theme.contact);
  const contactExtras = record(theme.contact_extras);
  const footer = record(theme.footer);
  const legacySettings = record(theme.settings);
  const leadForm = record(theme.lead_form);
  const modernLeadForm = record(theme.leadForm);
  const socialLinks = record(theme.socialLinks);
  const configuredTestimonials = Array.isArray(theme.testimonials)
    ? theme.testimonials.flatMap(readTestimonial)
    : [];
  const testimonials =
    configuredTestimonials.length || Array.isArray(theme.testimonials)
      ? configuredTestimonials
      : DEFAULT_STOREFRONT_TESTIMONIALS.flatMap(readTestimonial);
  const featureSource = Array.isArray(theme.aboutFeatures)
    ? theme.aboutFeatures
    : about.features;
  const configuredFeatures = Array.isArray(featureSource)
    ? featureSource.flatMap(readFeature)
    : [];
  const heroBannerUrls = firstStrings(theme.heroBannerUrls, theme.hero_banners);
  const heroBannerDesktopUrl =
    text(theme.heroBannerDesktopUrl) ?? text(theme.banner_pc_url);
  const heroBannerMobileUrl =
    text(theme.heroBannerMobileUrl) ?? text(theme.banner_mobile_url);
  const heroBannerMode =
    boolean(theme.heroBannerMode) ?? boolean(theme.banner_mode) ?? false;
  const heroImageUrl =
    data.settings.site.heroImageUrl ?? text(theme.hero_image_url);
  const configuredHeroMediaSource = readConfiguredMediaSource(
    theme.heroMediaSource,
  );
  const legacyHeroTemplateIsBanner = theme.hero_template === "banner";
  const heroMediaSource =
    configuredHeroMediaSource ??
    (heroBannerMode || legacyHeroTemplateIsBanner ? "banners" : "auto");
  const desktopBannerUrls = heroBannerUrls.length
    ? heroBannerUrls
    : heroBannerDesktopUrl
      ? [heroBannerDesktopUrl]
      : [];
  const heroMedia = resolvePublicStorefrontHeroMedia({
    heroImageUrl,
    listings: data.listings,
    theme: {
      ...theme,
      heroBannerUrls: desktopBannerUrls,
      heroMediaSource,
    },
  });
  const primaryHeroMedia = heroMedia[0] ?? null;

  return {
    about: {
      buttonText:
        text(theme.aboutButtonText) ??
        text(about.button_text) ??
        DEFAULT_PUBLIC_STOREFRONT_THEME.about.button_text,
      curadoriaText:
        text(theme.aboutCuradoriaText) ??
        text(about.curadoria_text) ??
        DEFAULT_PUBLIC_STOREFRONT_THEME.about.curadoria_text,
      description:
        text(theme.aboutText) ??
        text(about.description) ??
        DEFAULT_PUBLIC_STOREFRONT_THEME.about.description,
      features: Array.isArray(featureSource)
        ? configuredFeatures
        : defaultFeatures,
      image1Url:
        text(theme.aboutImageUrl) ??
        text(about.image1_url) ??
        DEFAULT_STOREFRONT_ABOUT_IMAGES.primary,
      image2Url:
        text(theme.aboutImage2Url) ??
        text(about.image2_url) ??
        DEFAULT_STOREFRONT_ABOUT_IMAGES.secondary,
      title:
        text(theme.aboutTitle) ??
        text(about.title) ??
        DEFAULT_PUBLIC_STOREFRONT_THEME.about.title,
      visualSubtitle: text(about.visual_subtitle) ?? "Carros, motos e SUVs",
      visualTitle: text(about.visual_title) ?? "Do Clássico ao Moderno",
      whyText:
        text(theme.aboutWhyText) ??
        text(about.why_text) ??
        DEFAULT_PUBLIC_STOREFRONT_THEME.about.why_text,
      whyTitle:
        text(theme.aboutWhyTitle) ??
        text(about.why_title) ??
        DEFAULT_PUBLIC_STOREFRONT_THEME.about.why_title,
    },
    contact: {
      address:
        text(contact.address) ??
        text(contactExtras.address_full) ??
        formatProfileAddress(data.settings.contact) ??
        data.settings.contact.city,
      businessHours:
        formatBusinessHours(data.settings.contact.businessHours) ??
        text(contact.businessHours) ??
        text(theme.businessHours) ??
        text(theme.business_hours) ??
        text(legacySettings.business_hours) ??
        DEFAULT_PUBLIC_STOREFRONT_THEME.contact.businessHours,
      description1:
        text(contact.description1) ??
        text(contactExtras.description1) ??
        DEFAULT_PUBLIC_STOREFRONT_THEME.contact.description1,
      description2:
        text(contact.description2) ??
        text(contactExtras.description2) ??
        DEFAULT_PUBLIC_STOREFRONT_THEME.contact.description2,
      email: text(contact.email) ?? data.settings.contact.contactEmail,
      instagramUrl:
        text(socialLinks.instagram) ??
        text(theme.instagram_url) ??
        text(legacySettings.instagram_url),
      mapEmbedUrl: safeMapEmbedUrl(
        text(contact.mapEmbedUrl) ??
          text(theme.mapEmbedUrl) ??
          text(theme.map_embed_url),
      ),
      phone:
        data.settings.contact.whatsappPhone ??
        data.settings.contact.contactPhone ??
        text(theme.whatsapp_number) ??
        text(legacySettings.whatsapp_number) ??
        text(contact.phone),
      phone2: text(contact.phone2) ?? text(contactExtras.phone2),
      phone2Label:
        text(contact.phone2Label) ??
        text(contactExtras.phone2_label) ??
        DEFAULT_PUBLIC_STOREFRONT_THEME.contact.phone2Label,
      phone3: text(contact.phone3) ?? text(contactExtras.phone3),
      phone3Label:
        text(contact.phone3Label) ??
        text(contactExtras.phone3_label) ??
        DEFAULT_PUBLIC_STOREFRONT_THEME.contact.phone3Label,
      phoneLabel:
        text(contact.phoneLabel) ??
        text(contactExtras.phone_label) ??
        DEFAULT_PUBLIC_STOREFRONT_THEME.contact.phoneLabel,
      showMap:
        typeof contact.showMap === "boolean"
          ? contact.showMap
          : typeof theme.show_map === "boolean"
            ? theme.show_map
            : true,
      title: text(contact.title) ?? text(contactExtras.title) ?? "Contato",
      whatsappUrl: data.settings.contact.whatsappUrl,
    },
    footer: {
      cnpj: text(footer.cnpj),
      extraInfo: text(footer.extraInfo) ?? text(footer.extra_info),
    },
    hero: {
      autoplay:
        typeof theme.hero_banner_autoplay === "boolean"
          ? theme.hero_banner_autoplay
          : true,
      bannerButtonText:
        text(theme.heroBannerButtonText) ??
        text(theme.banner_button_text) ??
        "Ver estoque",
      bannerMobileUrl: heroBannerMobileUrl,
      bannerMode: heroBannerMode,
      bannerShowButton:
        boolean(theme.heroBannerShowButton) ??
        boolean(theme.banner_show_button) ??
        !heroBannerMode,
      bannerShowText:
        boolean(theme.heroBannerShowText) ??
        boolean(theme.banner_show_text) ??
        !heroBannerMode,
      bannerUrls:
        heroMediaSource !== "vehicles" && desktopBannerUrls.length
          ? desktopBannerUrls
          : [],
      imageKind: primaryHeroMedia?.kind ?? "image",
      imageUrl: primaryHeroMedia?.url ?? null,
      mediaSource: heroMediaSource,
      speed: positiveNumber(theme.hero_banner_speed) ?? 4000,
      subtitle:
        text(theme.heroSubtitle) ??
        text(theme.hero_subtitle) ??
        data.settings.site.seoDescription ??
        `Encontre o veículo dos seus sonhos em ${data.settings.store.name}`,
      title:
        text(theme.heroTitle) ??
        text(theme.texto_cabecalho_ofertas) ??
        text(theme.headline) ??
        DEFAULT_PUBLIC_STOREFRONT_THEME.heroTitle,
      vehicles: heroVehicles(data.listings),
    },
    leadForm: {
      showOnLandingPage:
        boolean(modernLeadForm.showOnLandingPage) ??
        boolean(leadForm.show_on_lp) ??
        false,
    },
    logoUrl: text(theme.logoUrl) ?? text(theme.logo_url),
    logoWidth: positiveNumber(theme.logoWidth ?? theme.logo_width) ?? 130,
    storeName: text(theme.corretorName) ?? data.settings.store.name,
    testimonials,
  };
}

export function quadraListingMedia(
  listing: PublicVehicleListing,
): readonly PublicVehicleMedia[] {
  const withMedia = listing as PublicVehicleListing & {
    media?: readonly PublicVehicleMedia[];
  };
  const candidates = [
    ...(withMedia.media ?? []).filter((item) => item.kind === "photo"),
    ...(listing.heroMedia?.kind === "photo" ? [listing.heroMedia] : []),
  ];
  const seen = new Set<string>();
  const media = candidates.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
  if (listing.thumbnailUrl && !seen.has(listing.thumbnailUrl)) {
    media.push({
      altText: listing.title,
      displayOrder: media.length,
      kind: "photo",
      unitColorName: null,
      unitId: listing.slug,
      url: listing.thumbnailUrl,
    });
  }
  return media;
}

function readFeature(value: unknown): QuadraFeature[] {
  const item = record(value);
  const title = text(item.title);
  const description = text(item.description);
  return title && description ? [{ description, title }] : [];
}

function heroVehicles(listings: readonly PublicVehicleListing[]) {
  const withMedia = listings.filter(
    (listing) => quadraListingMedia(listing).length > 0,
  );
  return [...withMedia]
    .sort((left, right) => featuredScore(right) - featuredScore(left))
    .slice(0, 5);
}

function featuredScore(listing: PublicVehicleListing) {
  return listing.commercialTags.some((tag) =>
    tag.toLocaleLowerCase("pt-BR").includes("destaque"),
  )
    ? 1
    : 0;
}

function safeMapEmbedUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLocaleLowerCase("en-US");
    const isGoogle =
      hostname === "google.com" ||
      hostname === "maps.google.com" ||
      hostname === "www.google.com" ||
      hostname.endsWith(".google.com.br");
    return url.protocol === "https:" && isGoogle ? url.toString() : null;
  } catch {
    return null;
  }
}

function readTestimonial(value: unknown): QuadraTestimonial[] {
  const item = record(value);
  const id = scalarText(item.id);
  const name = text(item.name) ?? text(item.titulo);
  const quote = text(item.quote) ?? text(item.descricao);
  if (!id || !name || !quote) return [];
  return [
    {
      id,
      imageUrl: text(item.imageSrc) ?? text(item.imagem_url),
      name,
      quote,
      role: text(item.role) ?? text(item.cargo) ?? "Cliente",
    },
  ];
}

function readConfiguredMediaSource(value: unknown) {
  return value === "auto" || value === "banners" || value === "vehicles"
    ? value
    : null;
}

function formatProfileAddress(
  contact: PublicStorefrontPageData["settings"]["contact"],
): string | null {
  const street = [contact.addressLine1, contact.addressLine2]
    .filter(isText)
    .join(", ");
  const cityAndState = [contact.addressCity, contact.addressState]
    .filter(isText)
    .join(" - ");
  const parts = [street, cityAndState, contact.addressZipCode].filter(isText);
  return parts.length ? parts.join(", ") : null;
}

function formatBusinessHours(value: Record<string, unknown>): string | null {
  const configuredText = text(value.text);
  if (configuredText) return configuredText;
  const lines = Array.isArray(value.lines)
    ? value.lines.filter(isText).join("\n")
    : businessDayLines(value).join("\n");
  return text(lines);
}

function businessDayLines(value: Record<string, unknown>): string[] {
  return Object.entries(businessDayLabels).flatMap(([key, label]) => {
    const schedule = value[key];
    if (isText(schedule)) return [`${label}: ${schedule.trim()}`];
    const range = record(schedule);
    const open = text(range.open);
    const close = text(range.close);
    return open && close ? [`${label}: ${open} - ${close}`] : [];
  });
}

const businessDayLabels: Record<string, string> = {
  friday: "Sexta",
  monday: "Segunda",
  saturday: "Sabado",
  sunday: "Domingo",
  thursday: "Quinta",
  tuesday: "Terca",
  wednesday: "Quarta",
};

function isText(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap((item) => (text(item) ? [text(item)!] : []))
    : [];
}

function firstStrings(...values: unknown[]) {
  for (const value of values) {
    const result = strings(value);
    if (result.length) return result;
  }
  return [];
}

function positiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function scalarText(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : text(value);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function boolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}
