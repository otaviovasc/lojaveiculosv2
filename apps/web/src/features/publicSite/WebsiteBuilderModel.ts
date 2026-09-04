import {
  DEFAULT_PUBLIC_STOREFRONT_THEME,
  DEFAULT_STOREFRONT_ABOUT_FEATURES,
  DEFAULT_STOREFRONT_ABOUT_IMAGES,
  DEFAULT_STOREFRONT_SECTIONS,
} from "@lojaveiculosv2/shared";
import {
  businessHoursToText,
  textToBusinessHours,
} from "../settings/settingsBusinessHours";
import type { StoreSettingsSnapshot } from "../settings/types";
import type {
  WebsiteBuilderAboutFeature,
  WebsiteBuilderConfig,
  WebsiteBuilderAppearanceMode,
  WebsiteBuilderHeroMediaSource,
  WebsiteBuilderSection,
  WebsiteBuilderTemplateId,
  WebsiteBuilderTestimonial,
} from "./WebsiteBuilderTypes";

const hash = "#";
const hex = (value: string) => `${hash}${value}`;

export const websiteBuilderTemplateIds = ["aurora", "quadra"] as const;

export const websiteBuilderTemplateInfo: Record<
  WebsiteBuilderTemplateId,
  { description: string; name: string }
> = {
  aurora: {
    description: "Vitrine editorial moderna, premium e responsiva",
    name: "Aurora",
  },
  quadra: {
    description: "Template Modern original, usado pelas lojas da plataforma",
    name: "Quadra",
  },
};

export const websiteBuilderTemplateBranding: Record<
  WebsiteBuilderTemplateId,
  { gradient: string; icon: string; tagline: string }
> = {
  aurora: {
    gradient:
      "from-amber-500/20 via-orange-400/10 to-rose-400/15 dark:from-amber-500/15 dark:via-orange-400/8 dark:to-rose-400/10",
    icon: "*",
    tagline: "Editorial moderno",
  },
  quadra: {
    gradient:
      "from-blue-500/15 via-violet-400/10 to-cyan-400/15 dark:from-blue-500/12 dark:via-violet-400/8 dark:to-cyan-400/10",
    icon: "o",
    tagline: "Sua marca",
  },
};

export const websiteBuilderColorPalettes = [
  {
    colors: {
      accentColor: hex("C9A84C"),
      backgroundColor: hex("F8F5F0"),
      brandColor: hex("1A1A1A"),
    },
    name: "Elegância Clássica",
  },
  {
    colors: {
      accentColor: hex("3B82F6"),
      backgroundColor: hex("F0F4FF"),
      brandColor: hex("1E3A5F"),
    },
    name: "Moderno Azul",
  },
  {
    colors: {
      accentColor: hex("2D5A3D"),
      backgroundColor: hex("FFFCF7"),
      brandColor: hex("C4622D"),
    },
    name: "Terra & Natureza",
  },
  {
    colors: {
      accentColor: hex("B76E79"),
      backgroundColor: hex("FAFAFA"),
      brandColor: hex("2D2D2D"),
    },
    name: "Luxo Minimalista",
  },
  {
    colors: {
      accentColor: hex("14B8A6"),
      backgroundColor: hex("F8FAFC"),
      brandColor: hex("334155"),
    },
    name: "Urbano",
  },
  {
    colors: {
      accentColor: hex("D4A847"),
      backgroundColor: hex("FDF8ED"),
      brandColor: hex("1C1917"),
    },
    name: "Dourado Imperial",
  },
] as const;

export const defaultWebsiteSections: WebsiteBuilderSection[] =
  DEFAULT_STOREFRONT_SECTIONS.map((section) => ({ ...section }));

export function normalizeWebsiteTemplateId(
  value: string | null | undefined,
): WebsiteBuilderTemplateId {
  return value === "quadra" ? "quadra" : "aurora";
}

export function createWebsiteConfigFromSettings(
  settings: StoreSettingsSnapshot,
): WebsiteBuilderConfig {
  const theme = toRecord(settings.publicSite.theme);
  const legacyAbout = toRecord(theme.about);
  const socialLinks = toRecord(theme.socialLinks);
  const contact = toRecord(theme.contact);
  const footer = toRecord(theme.footer);
  const seo = toRecord(theme.seo);
  const fonts = toRecord(theme.fonts);
  return {
    aboutButtonText:
      stringOrNull(theme.aboutButtonText) ??
      stringOrNull(legacyAbout.button_text) ??
      DEFAULT_PUBLIC_STOREFRONT_THEME.about.button_text,
    aboutCuradoriaText:
      stringOrNull(theme.aboutCuradoriaText) ??
      stringOrNull(legacyAbout.curadoria_text) ??
      DEFAULT_PUBLIC_STOREFRONT_THEME.about.curadoria_text,
    aboutFeatures: readAboutFeatures(
      theme.aboutFeatures ?? legacyAbout.features,
    ),
    aboutImage2Url:
      stringOrNull(theme.aboutImage2Url) ??
      stringOrNull(legacyAbout.image2_url) ??
      DEFAULT_STOREFRONT_ABOUT_IMAGES.secondary,
    aboutImageUrl:
      stringOrNull(theme.aboutImageUrl) ??
      stringOrNull(legacyAbout.image1_url) ??
      DEFAULT_STOREFRONT_ABOUT_IMAGES.primary,
    aboutText:
      stringOrNull(theme.aboutText) ??
      stringOrNull(legacyAbout.description) ??
      DEFAULT_PUBLIC_STOREFRONT_THEME.about.description,
    aboutTitle:
      stringOrNull(theme.aboutTitle) ??
      stringOrNull(legacyAbout.title) ??
      DEFAULT_PUBLIC_STOREFRONT_THEME.about.title,
    aboutWhyText:
      stringOrNull(theme.aboutWhyText) ??
      stringOrNull(legacyAbout.why_text) ??
      DEFAULT_PUBLIC_STOREFRONT_THEME.about.why_text,
    aboutWhyTitle:
      stringOrNull(theme.aboutWhyTitle) ??
      stringOrNull(legacyAbout.why_title) ??
      DEFAULT_PUBLIC_STOREFRONT_THEME.about.why_title,
    accentColor: stringOrDefault(theme.accentColor, hex("C9A84C")),
    appearanceMode: readAppearanceMode(theme.appearanceMode),
    backgroundColor: stringOrDefault(theme.backgroundColor, hex("F8F5F0")),
    brandColor: stringOrDefault(theme.brandColor, hex("1A1A1A")),
    contact: {
      address: stringOrNull(contact.address) ?? formatAddress(settings.profile),
      businessHours:
        stringOrNull(contact.businessHours) ??
        stringOrNull(businessHoursToText(settings.profile.businessHours)) ??
        DEFAULT_PUBLIC_STOREFRONT_THEME.contact.businessHours,
      description1:
        stringOrNull(contact.description1) ??
        DEFAULT_PUBLIC_STOREFRONT_THEME.contact.description1,
      description2:
        stringOrNull(contact.description2) ??
        DEFAULT_PUBLIC_STOREFRONT_THEME.contact.description2,
      email: stringOrNull(contact.email) ?? settings.profile.contactEmail,
      mapEmbedUrl: stringOrNull(contact.mapEmbedUrl),
      phone: stringOrNull(contact.phone) ?? settings.profile.contactPhone,
      phone2: stringOrNull(contact.phone2),
      phone2Label:
        stringOrNull(contact.phone2Label) ??
        DEFAULT_PUBLIC_STOREFRONT_THEME.contact.phone2Label,
      phone3: stringOrNull(contact.phone3),
      phone3Label:
        stringOrNull(contact.phone3Label) ??
        DEFAULT_PUBLIC_STOREFRONT_THEME.contact.phone3Label,
      phoneLabel:
        stringOrNull(contact.phoneLabel) ??
        DEFAULT_PUBLIC_STOREFRONT_THEME.contact.phoneLabel,
      showMap: contact.showMap !== false,
      title:
        stringOrNull(contact.title) ??
        DEFAULT_PUBLIC_STOREFRONT_THEME.contact.title,
    },
    corretorCreci: stringOrNull(theme.corretorCreci),
    corretorName:
      stringOrNull(theme.corretorName) ?? settings.identity.tradingName,
    corretorPhotoUrl: stringOrNull(theme.corretorPhotoUrl),
    faviconUrl:
      stringOrNull(theme.faviconUrl) ??
      stringOrNull(theme.favicon_url) ??
      stringOrNull(theme.logoIconUrl) ??
      stringOrNull(theme.logo_icon_url),
    footer: {
      cnpj: stringOrNull(footer.cnpj) ?? settings.profile.documentNumber,
      extraInfo:
        stringOrNull(footer.extraInfo) ?? stringOrNull(footer.extra_info),
    },
    fonts: {
      body: stringOrNull(fonts.body) ?? "Inter",
      heading: stringOrNull(fonts.heading) ?? "Bricolage Grotesque",
    },
    heroBannerUrls: readHeroBannerUrls(
      theme.heroBannerUrls,
      stringOrNull(theme.heroBannerDesktopUrl) ??
        stringOrNull(theme.banner_pc_url) ??
        settings.publicSite.heroImageUrl,
    ),
    heroBannerMobileUrl:
      stringOrNull(theme.heroBannerMobileUrl) ??
      stringOrNull(theme.banner_mobile_url),
    heroImageUrl: settings.publicSite.heroImageUrl,
    heroMediaSource: readHeroMediaSource(
      theme.heroMediaSource ?? DEFAULT_PUBLIC_STOREFRONT_THEME.heroMediaSource,
    ),
    heroSubtitle:
      stringOrNull(theme.heroSubtitle) ??
      settings.publicSite.seoDescription ??
      DEFAULT_PUBLIC_STOREFRONT_THEME.heroSubtitle,
    heroTitle:
      stringOrNull(theme.heroTitle) ??
      stringOrNull(theme.headline) ??
      DEFAULT_PUBLIC_STOREFRONT_THEME.heroTitle,
    logoUrl: settings.profile.logoImageUrl ?? stringOrNull(theme.logoUrl),
    sections: readSections(theme.sections),
    seo: {
      metaDescription:
        stringOrNull(seo.metaDescription) ?? settings.publicSite.seoDescription,
      metaTitle: stringOrNull(seo.metaTitle) ?? settings.publicSite.seoTitle,
      ogImageUrl: stringOrNull(seo.ogImageUrl),
    },
    socialLinks: {
      facebook: stringOrNull(socialLinks.facebook),
      instagram: stringOrNull(socialLinks.instagram),
      tiktok: stringOrNull(socialLinks.tiktok),
      whatsapp:
        settings.profile.whatsappPhone ?? stringOrNull(socialLinks.whatsapp),
      youtube: stringOrNull(socialLinks.youtube),
    },
    templateId: normalizeWebsiteTemplateId(
      settings.publicSite.layoutKey ?? stringOrNull(theme.templateId),
    ),
    testimonials: readTestimonials(theme.testimonials),
  };
}

function readAppearanceMode(value: unknown): WebsiteBuilderAppearanceMode {
  return value === "dark" || value === "both" ? value : "light";
}

export function applyWebsiteConfigToSettings(
  settings: StoreSettingsSnapshot,
  config: WebsiteBuilderConfig,
  templateId: WebsiteBuilderTemplateId,
): StoreSettingsSnapshot {
  const { templateId: _templateId, ...configTheme } = config;
  const nextTheme = {
    ...settings.publicSite.theme,
    ...configTheme,
    banner_mobile_url: null,
    banner_pc_url: null,
    heroBannerDesktopUrl:
      config.heroBannerUrls[0] ?? config.heroImageUrl ?? null,
    heroBannerMobileUrl: config.heroBannerMobileUrl ?? null,
  };
  return {
    ...settings,
    profile: {
      ...settings.profile,
      businessHours: textToBusinessHours(config.contact.businessHours ?? ""),
      contactEmail: config.contact.email ?? null,
      contactPhone: config.contact.phone ?? null,
      logoImageUrl: config.logoUrl ?? null,
      whatsappPhone: config.socialLinks.whatsapp ?? null,
    },
    publicSite: {
      ...settings.publicSite,
      heroImageUrl: config.heroBannerUrls[0] ?? config.heroImageUrl ?? null,
      layoutKey: templateId,
      seoDescription: config.seo.metaDescription ?? config.heroSubtitle ?? null,
      seoTitle: config.seo.metaTitle ?? null,
      theme: nextTheme,
    },
  };
}

function readHeroMediaSource(value: unknown): WebsiteBuilderHeroMediaSource {
  return value === "banners" || value === "vehicles" ? value : "auto";
}

function readHeroBannerUrls(value: unknown, fallback: string | null) {
  const urls = readStringArray(value);
  return urls.length || !fallback ? urls : [fallback];
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && Boolean(item.trim()),
  );
}

function readSections(value: unknown): WebsiteBuilderSection[] {
  if (!Array.isArray(value)) return defaultWebsiteSections;
  const sections = value.filter(isWebsiteSection);
  return sections.length ? sections : defaultWebsiteSections;
}

function isWebsiteSection(value: unknown): value is WebsiteBuilderSection {
  const section = toRecord(value);
  return (
    typeof section.id === "string" &&
    typeof section.type === "string" &&
    typeof section.visible === "boolean" &&
    typeof section.order === "number"
  );
}

function readTestimonials(value: unknown): WebsiteBuilderTestimonial[] {
  if (!Array.isArray(value)) return [];
  const testimonials = value.filter(
    (item): item is WebsiteBuilderTestimonial => {
      const testimonial = toRecord(item);
      return (
        typeof testimonial.id === "string" &&
        typeof testimonial.quote === "string" &&
        typeof testimonial.name === "string" &&
        typeof testimonial.role === "string"
      );
    },
  );
  return testimonials;
}

function readAboutFeatures(value: unknown): WebsiteBuilderAboutFeature[] {
  if (!Array.isArray(value)) {
    return DEFAULT_STOREFRONT_ABOUT_FEATURES.map((feature) => ({ ...feature }));
  }
  const features = value.flatMap((item) => {
    const feature = toRecord(item);
    const title = stringOrNull(feature.title);
    const description = stringOrNull(feature.description);
    return title && description ? [{ description, title }] : [];
  });
  return features;
}

function formatAddress(profile: StoreSettingsSnapshot["profile"]) {
  const parts = [
    profile.addressLine1,
    profile.addressLine2,
    profile.addressCity,
    profile.addressState,
    profile.addressZipCode,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function stringOrDefault(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
