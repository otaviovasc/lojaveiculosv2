import type { StoreSettingsSnapshot } from "../settings/types";
import type {
  WebsiteBuilderConfig,
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
    description: "Elegante e refinado - ideal para veículos de alto padrão",
    name: "Aurora",
  },
  quadra: {
    description: "Moderno e acolhedor - perfeito para sua marca pessoal",
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
    tagline: "Alto padrão",
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

export const defaultWebsiteSections: WebsiteBuilderSection[] = [
  { id: "hero", order: 0, type: "hero", visible: true },
  { id: "featured", order: 1, type: "featured", visible: true },
  { id: "about", order: 2, type: "about", visible: true },
  { id: "testimonials", order: 3, type: "testimonials", visible: false },
  { id: "contact", order: 4, type: "contact", visible: true },
  { id: "search", order: 5, type: "search", visible: false },
  { id: "all_properties", order: 6, type: "all_properties", visible: false },
];

export function normalizeWebsiteTemplateId(
  value: string | null | undefined,
): WebsiteBuilderTemplateId {
  return value === "quadra" ? "quadra" : "aurora";
}

export function createWebsiteConfigFromSettings(
  settings: StoreSettingsSnapshot,
): WebsiteBuilderConfig {
  const theme = toRecord(settings.publicSite.theme);
  const socialLinks = toRecord(theme.socialLinks);
  const contact = toRecord(theme.contact);
  const seo = toRecord(theme.seo);
  const fonts = toRecord(theme.fonts);
  return {
    aboutImageUrl: stringOrNull(theme.aboutImageUrl),
    aboutText: stringOrNull(theme.aboutText),
    aboutTitle: stringOrNull(theme.aboutTitle),
    accentColor: stringOrDefault(theme.accentColor, hex("C9A84C")),
    backgroundColor: stringOrDefault(theme.backgroundColor, hex("F8F5F0")),
    brandColor: stringOrDefault(theme.brandColor, hex("1A1A1A")),
    contact: {
      address: stringOrNull(contact.address) ?? formatAddress(settings.profile),
      email: stringOrNull(contact.email) ?? settings.profile.contactEmail,
      phone: stringOrNull(contact.phone) ?? settings.profile.contactPhone,
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
    fonts: {
      body: stringOrNull(fonts.body) ?? "Inter",
      heading: stringOrNull(fonts.heading) ?? "Bricolage Grotesque",
    },
    heroBannerUrls: readHeroBannerUrls(
      theme.heroBannerUrls,
      settings.publicSite.heroImageUrl,
    ),
    heroImageUrl: settings.publicSite.heroImageUrl,
    heroMediaSource: readHeroMediaSource(theme.heroMediaSource),
    heroSubtitle:
      stringOrNull(theme.heroSubtitle) ?? settings.publicSite.seoDescription,
    heroTitle:
      stringOrNull(theme.heroTitle) ??
      stringOrNull(theme.headline) ??
      "Encontre o veículo ideal para sua garagem",
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
    templateId: normalizeWebsiteTemplateId(settings.publicSite.layoutKey),
    testimonials: readTestimonials(theme.testimonials),
  };
}

export function applyWebsiteConfigToSettings(
  settings: StoreSettingsSnapshot,
  config: WebsiteBuilderConfig,
  templateId: WebsiteBuilderTemplateId,
): StoreSettingsSnapshot {
  const nextTheme = {
    ...settings.publicSite.theme,
    ...config,
    templateId,
  };
  return {
    ...settings,
    profile: {
      ...settings.profile,
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
  return value.filter((item): item is WebsiteBuilderTestimonial => {
    const testimonial = toRecord(item);
    return (
      typeof testimonial.id === "string" &&
      typeof testimonial.quote === "string" &&
      typeof testimonial.name === "string" &&
      typeof testimonial.role === "string"
    );
  });
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
