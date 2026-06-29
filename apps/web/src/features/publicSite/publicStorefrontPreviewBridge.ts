import type {
  WebsiteBuilderConfig,
  WebsiteBuilderSection,
  WebsiteBuilderTestimonial,
} from "./WebsiteBuilderTypes";
import type { PublicStorefrontPageData } from "./types";

export type WebsiteBuilderPreviewConfig = Partial<WebsiteBuilderConfig>;

export function mergeWebsiteBuilderPreviewPayload(
  current: WebsiteBuilderPreviewConfig | null,
  payload: Record<string, unknown>,
): WebsiteBuilderPreviewConfig {
  const {
    sections: rawSections,
    testimonials: rawTestimonials,
    ...payloadFields
  } = payload;
  const sections = Array.isArray(rawSections)
    ? rawSections.filter(isWebsiteBuilderSection)
    : null;
  const testimonials = Array.isArray(rawTestimonials)
    ? rawTestimonials.filter(isWebsiteBuilderTestimonial)
    : null;

  return {
    ...current,
    ...payloadFields,
    contact: {
      ...toRecord(current?.contact),
      ...toRecord(payload.contact),
    },
    fonts: {
      ...toRecord(current?.fonts),
      ...toRecord(payload.fonts),
    },
    seo: {
      ...toRecord(current?.seo),
      ...toRecord(payload.seo),
    },
    socialLinks: {
      ...toRecord(current?.socialLinks),
      ...toRecord(payload.socialLinks),
    },
    ...(sections ? { sections } : {}),
    ...(testimonials ? { testimonials } : {}),
  } as WebsiteBuilderPreviewConfig;
}

export function applyWebsiteBuilderPreviewToStorefrontData(
  data: PublicStorefrontPageData,
  config: WebsiteBuilderPreviewConfig | null,
): PublicStorefrontPageData {
  if (!config) return data;

  const nextTheme: Record<string, unknown> = {
    ...data.settings.site.theme,
  };
  assignString(nextTheme, "accentColor", config.accentColor);
  assignString(nextTheme, "backgroundColor", config.backgroundColor);
  assignString(nextTheme, "brandColor", config.brandColor);
  assignString(nextTheme, "headline", config.heroTitle);
  assignString(nextTheme, "heroSubtitle", config.heroSubtitle);
  assignString(nextTheme, "corretorName", config.corretorName);
  assignString(nextTheme, "corretorCreci", config.corretorCreci);
  assignString(nextTheme, "corretorPhotoUrl", config.corretorPhotoUrl);
  assignString(nextTheme, "aboutTitle", config.aboutTitle);
  assignString(nextTheme, "aboutText", config.aboutText);
  assignString(nextTheme, "aboutImageUrl", config.aboutImageUrl);

  if (config.contact) nextTheme.contact = config.contact;
  if (config.fonts) nextTheme.fonts = config.fonts;
  if (config.seo) nextTheme.seo = config.seo;
  if (config.socialLinks) nextTheme.socialLinks = config.socialLinks;
  if (config.testimonials) nextTheme.testimonials = config.testimonials;
  if (config.sections) nextTheme.sections = config.sections;

  const whatsappPhone =
    config.socialLinks?.whatsapp ?? data.settings.contact.whatsappPhone;

  return {
    ...data,
    settings: {
      ...data.settings,
      contact: {
        ...data.settings.contact,
        contactEmail:
          config.contact?.email ?? data.settings.contact.contactEmail,
        contactPhone:
          config.contact?.phone ?? data.settings.contact.contactPhone,
        whatsappPhone,
        whatsappUrl:
          createWhatsappUrl(whatsappPhone) ?? data.settings.contact.whatsappUrl,
      },
      site: {
        ...data.settings.site,
        heroImageUrl: config.heroImageUrl ?? data.settings.site.heroImageUrl,
        layoutKey: config.templateId ?? data.settings.site.layoutKey,
        seoDescription:
          config.seo?.metaDescription ??
          config.heroSubtitle ??
          data.settings.site.seoDescription,
        seoTitle: config.seo?.metaTitle ?? data.settings.site.seoTitle,
        theme: nextTheme,
      },
    },
  };
}

function assignString(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
) {
  if (typeof value === "string" && value.trim()) target[key] = value;
}

function createWhatsappUrl(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

function isWebsiteBuilderSection(
  value: unknown,
): value is WebsiteBuilderSection {
  const section = toRecord(value);
  return (
    typeof section.id === "string" &&
    typeof section.order === "number" &&
    typeof section.type === "string" &&
    typeof section.visible === "boolean"
  );
}

function isWebsiteBuilderTestimonial(
  value: unknown,
): value is WebsiteBuilderTestimonial {
  const testimonial = toRecord(value);
  return (
    typeof testimonial.id === "string" &&
    typeof testimonial.name === "string" &&
    typeof testimonial.quote === "string" &&
    typeof testimonial.role === "string"
  );
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
